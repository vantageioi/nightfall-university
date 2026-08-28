import { invokeLLM } from "./integrations/llm";
import type { AdminIntakeProposedProfile } from "./db";
import type { AdminIntakeSourceRow } from "./adminIntake";

const BATCH_SIZE = 20;

export type IntakeDraft = {
  sourceRowNumber: number;
  proposedProfile: AdminIntakeProposedProfile;
  extractionConfidence: "low" | "medium" | "high";
};

const nullableText = { type: ["string", "null"] } as const;
const profileSchema = {
  type: "object",
  properties: {
    preferredName: nullableText, contactEmail: nullableText, phoneNumber: nullableText, nationality: nullableText,
    highSchoolDiplomaOrigin: nullableText, studyDirection: nullableText, academicAverage: nullableText, gradeScale: nullableText,
    qualifications: nullableText, sourceSummary: nullableText,
  },
  required: ["preferredName", "contactEmail", "phoneNumber", "nationality", "highSchoolDiplomaOrigin", "studyDirection", "academicAverage", "gradeScale", "qualifications", "sourceSummary"],
  additionalProperties: false,
} as const;

const extractionSchema = {
  type: "object",
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceRowNumber: { type: "number" },
          proposedProfile: profileSchema,
          extractionConfidence: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["sourceRowNumber", "proposedProfile", "extractionConfidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["records"],
  additionalProperties: false,
} as const;

function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

export async function extractAdminIntakeDrafts(rows: AdminIntakeSourceRow[]): Promise<IntakeDraft[]> {
  const batches = chunk(rows, BATCH_SIZE);
  if (batches.length > 5) throw new Error("For cost control, split spreadsheets into batches of 100 rows or fewer.");
  const drafts: IntakeDraft[] = [];
  for (const batch of batches) {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      max_completion_tokens: 1600,
      messages: [
        { role: "system", content: "Extract only facts explicitly present in each supplied CV or spreadsheet row. Do not infer eligibility, admission prospects, ethnicity, religion, health, or any missing value. Use null when a field is absent. Preserve each sourceRowNumber exactly. The sourceSummary must be concise and factual. This output is an admin review draft, not a student account update." },
        { role: "user", content: JSON.stringify({ records: batch }) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "admin_intake_drafts", strict: true, schema: extractionSchema } },
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("The intake extractor returned no structured draft.");
    const parsed = JSON.parse(content) as { records: IntakeDraft[] };
    const allowedRows = new Set(batch.map((row) => row.sourceRowNumber));
    drafts.push(...parsed.records.filter((record) => allowedRows.has(record.sourceRowNumber)));
  }
  if (!drafts.length) throw new Error("The intake extractor could not produce any reviewable records.");
  return drafts;
}
