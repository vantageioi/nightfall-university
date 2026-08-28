import crypto from "node:crypto";
// Lazy-loaded: mammoth is only needed for DOCX intake; avoids a hard boot dependency.
// Lazy-loaded: pdf-parse is only needed for PDF intake; avoids a hard boot dependency.
import * as XLSX from "xlsx";

export const ADMIN_INTAKE_MAX_BYTES = 8_000_000;
export const ADMIN_INTAKE_MAX_ROWS = 250;

export type AdminIntakeSourceKind = "cv" | "spreadsheet";

export type AdminIntakeSourceRow = {
  sourceRowNumber: number;
  sourceText: string;
};

export function sha256(value: Buffer | string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function classifyAdminIntakeFile(fileName: string, mimeType: string): AdminIntakeSourceKind | null {
  const lowerName = fileName.toLowerCase();
  if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || lowerName.endsWith(".xlsx")) return "spreadsheet";
  if (mimeType === "application/pdf" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType === "text/plain" || lowerName.endsWith(".pdf") || lowerName.endsWith(".docx") || lowerName.endsWith(".txt")) return "cv";
  return null;
}

function compactText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export async function extractCvText(input: { fileName: string; mimeType: string; bytes: Buffer }) {
  const lowerName = input.fileName.toLowerCase();
  if (input.mimeType === "text/plain" || lowerName.endsWith(".txt")) return compactText(input.bytes.toString("utf8"));
  if (input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || lowerName.endsWith(".docx")) {
    // Dynamic import: DOCX intake is admin-only and rare, so mammoth is not
    // required at boot. A clear error surfaces if the package is unavailable.
    const mammoth = await import("mammoth").catch(() => null);
    if (!mammoth) throw new Error("DOCX support is temporarily unavailable. Upload this CV as PDF or TXT.");
    const result = await mammoth.extractRawText({ buffer: input.bytes });
    return compactText(result.value);
  }
  // Dynamic import: PDF intake is admin-only, so pdf-parse is not required
  // at boot. A clear error surfaces if the package is unavailable.
  const { PDFParse } = await import("pdf-parse").catch(() => ({ PDFParse: null }));
  if (!PDFParse) throw new Error("PDF support is temporarily unavailable. Upload this CV as TXT.");
  const parser = new PDFParse({ data: input.bytes });
  try {
    const result = await parser.getText();
    return compactText(result.text);
  } finally {
    await parser.destroy();
  }
}

export function extractSpreadsheetRows(bytes: Buffer): AdminIntakeSourceRow[] {
  const workbook = XLSX.read(bytes, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("The spreadsheet needs at least one worksheet.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false }).slice(0, ADMIN_INTAKE_MAX_ROWS);
  return rows.map((row, index) => ({
    sourceRowNumber: index + 2,
    sourceText: Object.entries(row).map(([key, value]) => `${compactText(key)}: ${compactText(value)}`).filter((entry) => !entry.endsWith(":" )).join("\n"),
  })).filter((row) => row.sourceText.length > 0);
}

export async function extractAdminIntakeSource(input: { fileName: string; mimeType: string; bytes: Buffer; sourceKind: AdminIntakeSourceKind }) {
  if (input.bytes.byteLength > ADMIN_INTAKE_MAX_BYTES) throw new Error("Keep each CV or spreadsheet under 8 MB.");
  if (input.sourceKind === "spreadsheet") {
    const rows = extractSpreadsheetRows(input.bytes);
    if (!rows.length) throw new Error("No usable rows were found in the first spreadsheet worksheet.");
    return { extractedText: rows.map((row) => `ROW ${row.sourceRowNumber}\n${row.sourceText}`).join("\n\n").slice(0, 120_000), rows };
  }
  const text = await extractCvText(input);
  if (text.length < 24) throw new Error("The CV did not contain enough readable text. Please use a text-based PDF, DOCX, or TXT file.");
  return { extractedText: text.slice(0, 40_000), rows: [{ sourceRowNumber: 1, sourceText: text.slice(0, 40_000) }] };
}

export function buildSourceDigest(uploadHash: string, sourceRowNumber: number, sourceText: string) {
  return sha256(`${uploadHash}:${sourceRowNumber}:${sourceText.trim().toLocaleLowerCase()}`);
}