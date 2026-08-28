import { invokeLLM } from "../integrations/llm";

import { getCachedGermanyProgrammeBriefing, getGermanyProgrammeBriefingContext, listGermanyProgrammeBriefings, saveGermanyProgrammeBriefing } from "../db";

import { assertAiWithinPlan, recordAiCall } from "./planLimits";

import { isProgrammeBriefingFresh, parseProgrammeBriefing, programmeBriefingJsonSchema, programmeBriefingSourceHash } from "../programmeBriefing";

type UserId = Parameters<typeof getGermanyProgrammeBriefingContext>[0];

export type BriefingRequest = { programmeId: string; language: "en" | "ar" };

export async function listParsedBriefings(userId: UserId, language: "en" | "ar") {
  return (await listGermanyProgrammeBriefings(userId, language)).flatMap((record) => {
    const parsed = parseProgrammeBriefing(record.briefingJson);
    return parsed.success ? [{ programmeId: record.programmeId, ...parsed.data, sourceUrl: record.sourceUrl, generatedAt: record.generatedAt }] : [];
  });
}

export async function generateProgrammeBriefing(userId: UserId, input: BriefingRequest) {
  await assertAiWithinPlan(Number(userId));
  const programme = await getGermanyProgrammeBriefingContext(userId, input.programmeId);
  if (!programme) throw new Error("Save this active programme before asking Nightfall to brief its public research record.");
  const sourceUrl = programme.officialProgrammeUrl || programme.programmeEvidenceUrl;
  const source = { ...programme, sourceUrl };
  const contentHash = programmeBriefingSourceHash(source, input.language);
  const cached = await getCachedGermanyProgrammeBriefing(userId, input.programmeId, input.language);
  if (cached && isProgrammeBriefingFresh(cached.generatedAt, cached.contentHash, contentHash)) {
    const parsed = parseProgrammeBriefing(cached.briefingJson);
    if (parsed.success) return { programmeId: input.programmeId, ...parsed.data, sourceUrl: cached.sourceUrl, generatedAt: cached.generatedAt, cached: true };
  }
  await recordAiCall(Number(userId));
  const response = await invokeLLM({
    userId: Number(userId),
    model: "gemini-3-flash-preview",
    max_tokens: 1100,
    messages: [
      { role: "system", content: `You are a research assistant. Do NOT determine eligibility, admission chances, or make any admissions decision. Never advise filing an application. Only summarize publicly available information from the provided source data. Do not invent facts or imply that information is current beyond the supplied record. If a detail is absent, say it is not stated in the supplied source data. Write in ${input.language === "ar" ? "clear Shami Arabic" : "clear English"}. Keep every field concise and practical. The reviewNote must explicitly tell the student to verify the official source before relying on any detail.` },
      { role: "user", content: `Create a structured student research brief from this supplied public programme index record. This is evidence orientation, not a fit prediction.\n\n${JSON.stringify(source)}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "programme_research_briefing", strict: true, schema: programmeBriefingJsonSchema } },
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("The research briefing returned no structured result.");
  const parsed = parseProgrammeBriefing(content);
  if (!parsed.success) throw new Error("The research briefing could not be validated. Please try again.");
  const saved = await saveGermanyProgrammeBriefing(userId, input.programmeId, input.language, sourceUrl, contentHash, JSON.stringify(parsed.data));
  return { programmeId: input.programmeId, ...parsed.data, sourceUrl, generatedAt: saved?.generatedAt ?? new Date(), cached: false };
}