import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { ADMIN_INTAKE_MAX_BYTES, buildSourceDigest, classifyAdminIntakeFile, extractAdminIntakeSource, extractSpreadsheetRows } from "./adminIntake";

function workbookBytes(rows: Array<Record<string, string>>) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Candidates");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("admin intake source parsing", () => {
  it("only accepts requested CV and spreadsheet formats", () => {
    expect(classifyAdminIntakeFile("rana.pdf", "application/pdf")).toBe("cv");
    expect(classifyAdminIntakeFile("candidates.xlsx", "application/octet-stream")).toBe("spreadsheet");
    expect(classifyAdminIntakeFile("upload.exe", "application/octet-stream")).toBeNull();
  });

  it("turns a spreadsheet into explicit, reviewable source rows", async () => {
    const bytes = workbookBytes([{ Name: "Rania", Email: "rania@example.com", Direction: "Architecture" }, { Name: "Omar", Email: "omar@example.com", Direction: "Medicine" }]);
    const rows = extractSpreadsheetRows(bytes);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ sourceRowNumber: 2 });
    expect(rows[0]?.sourceText).toContain("Name: Rania");
    const extracted = await extractAdminIntakeSource({ fileName: "candidates.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes, sourceKind: "spreadsheet" });
    expect(extracted.rows).toHaveLength(2);
    expect(extracted.extractedText).toContain("ROW 3");
  });

  it("makes duplicate fingerprints stable per source row and rejects oversized sources", async () => {
    expect(buildSourceDigest("abc", 2, "Name: Rania")).toBe(buildSourceDigest("abc", 2, "Name: Rania"));
    expect(buildSourceDigest("abc", 2, "Name: Rania")).not.toBe(buildSourceDigest("abc", 3, "Name: Rania"));
    await expect(extractAdminIntakeSource({ fileName: "large.txt", mimeType: "text/plain", bytes: Buffer.alloc(ADMIN_INTAKE_MAX_BYTES + 1), sourceKind: "cv" })).rejects.toThrow("under 8 MB");
  });
});
