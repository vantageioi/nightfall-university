import { invokeLLM } from "../integrations/llm";
import { storageGetSignedUrl } from "../storage";
import { getStudentDocument, saveTranscriptExtraction, setTranscriptExtractionFailed, setTranscriptExtractionProcessing } from "../db";
type UserId = Parameters<typeof getStudentDocument>[0];


const transcriptExtractionSchema = {
  type: "object",
  properties: {
    academicAverage: { type: ["string", "null"] },
    gradeScale: { type: ["string", "null"] },
    academicSummary: { type: ["string", "null"] },
    courses: { type: "array", maxItems: 12, items: { type: "object", properties: { name: { type: "string" }, grade: { type: ["string", "null"] } }, required: ["name", "grade"], additionalProperties: false } },
    confidenceNote: { type: "string" },
  },
  required: ["academicAverage", "gradeScale", "academicSummary", "courses", "confidenceNote"],
  additionalProperties: false,
} as const;

export async function extractTranscriptSnapshot(userId: UserId, documentId: number) {
  const document = await getStudentDocument(userId, documentId);
  if (!document) throw new Error("Transcript not found.");
  await setTranscriptExtractionProcessing(userId, documentId);
  try {
    const fileUrl = await storageGetSignedUrl(document.storageKey);
    const filePart = document.mimeType === "application/pdf"
      ? { type: "file_url" as const, file_url: { url: fileUrl, mime_type: "application/pdf" as const } }
      : { type: "image_url" as const, image_url: { url: fileUrl, detail: "high" as const } };
    const response = await invokeLLM({
      model: "gemini-3-flash-preview",
      max_tokens: 2200,
      messages: [
        { role: "system", content: "Extract only information visibly present in a student transcript. Do not infer missing grades. Preserve grade notation exactly. Return concise structured JSON." },
        { role: "user", content: [{ type: "text", text: "Read this transcript. Extract the stated academic average or GPA, the stated grading scale, a concise factual summary, and up to twelve listed courses with their grades. If a value is not visible, return null." }, filePart] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "transcript_extraction", strict: true, schema: transcriptExtractionSchema } },
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("The transcript analysis returned no structured result.");
    const extraction = JSON.parse(content) as { academicAverage: string | null; gradeScale: string | null; academicSummary: string | null; courses: Array<{ name: string; grade: string | null }>; confidenceNote: string };
    return saveTranscriptExtraction(userId, documentId, extraction);
  } catch (error) {
    await setTranscriptExtractionFailed(userId, documentId);
    throw error;
  }
}
