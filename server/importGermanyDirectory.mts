import mysql from "mysql2/promise";
import XLSX from "xlsx";

const workbookPath = process.argv[2] ?? "/home/ubuntu/upload/germany_public_discovery_directory_v3.xlsx";
const workbook = XLSX.readFile(workbookPath, { cellDates: false });
const sheet = workbook.Sheets["Programme Search Index"];

if (!sheet) throw new Error("Programme Search Index worksheet is missing");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the one-time Germany directory import");

type SourceRow = Record<string, unknown>;
type ImportRecord = Array<string | null>;

const rows = XLSX.utils.sheet_to_json<SourceRow>(sheet, { defval: null });
const limit = (value: unknown, max: number) => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text ? text.slice(0, max) : null;
};
const required = (row: SourceRow, field: string, max: number) => {
  const value = limit(row[field], max);
  if (!value) throw new Error(`Required workbook field is missing: ${field}`);
  return value;
};

const records: ImportRecord[] = rows.map((row) => [
  required(row, "programme_id", 80),
  required(row, "official_name", 280),
  required(row, "city", 180),
  required(row, "region", 180),
  required(row, "programme_name", 320),
  required(row, "broad_subject_categories", 420),
  limit(row["field_match_basis"], 60_000),
  required(row, "programme_evidence_url", 700),
  limit(row["official_programme_url"], 700),
  limit(row["programme_language"], 180),
  limit(row["admission_semester"], 180),
  limit(row["admission_mode"], 240),
  required(row, "source_layer", 120),
  limit(row["reputation_tier"], 64),
  limit(row["has_named_security_institute"], 60_000),
  limit(row["fee_risk_category"], 60_000),
  limit(row["syrian_baccalaureate_anabin_condition"], 60_000),
  limit(row["last_verified"], 32),
]).filter((record) => !/private/i.test(record[1] ?? ""));

const distinctProgrammeIds = new Set(records.map((record) => record[0]));
if (distinctProgrammeIds.size !== records.length) throw new Error("Programme identifiers must be unique before import");

async function main() {
  const pool = mysql.createPool(process.env.DATABASE_URL!);
  const fields = ["programme_id", "official_name", "city", "region", "programme_name", "broad_subject_categories", "field_match_basis", "programme_evidence_url", "official_programme_url", "programme_language", "admission_semester", "admission_mode", "source_layer", "reputation_tier", "security_infrastructure", "fee_risk_category", "syrian_baccalaureate_anabin_condition", "last_verified"];
  const updateFields = fields.slice(1).map((field) => `\`${field}\` = VALUES(\`${field}\`)`).join(", ");
  const statement = `INSERT INTO germany_programme_index (${fields.map((field) => `\`${field}\``).join(", ")}) VALUES ? ON DUPLICATE KEY UPDATE ${updateFields}`;

  try {
    for (let start = 0; start < records.length; start += 200) {
      await pool.query(statement, [records.slice(start, start + 200)]);
    }
    const [summary] = await pool.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS total_programmes, COUNT(DISTINCT official_name) AS institutions, COUNT(DISTINCT programme_language) AS languages FROM germany_programme_index");
    console.log(JSON.stringify({ importedWorkbookRows: records.length, uniqueProgrammeIds: distinctProgrammeIds.size, summary: summary[0] }, null, 2));
  } finally {
    await pool.end();
  }
}

void main();
