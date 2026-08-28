// One-off ingestion script for the Germany and Italy programme directories.
// Run with: npx tsx scripts/ingest-programme-directories.ts
//
// Germany: full replace. germany_public_discovery_directory_v4.xlsx's
// "Programme Search Index" sheet is column-for-column identical to the
// existing germany_programme_index table, and was confirmed (per product
// decision) to supersede whatever is currently loaded — not a merge/upsert.
//
// Italy: new table. italy_universitaly_directory_v1.xlsx's "Programme Search
// Index" sheet has no existing table; italy_programme_index (see
// drizzle/schema.ts) was designed to hold its richer shape, including the
// deliberate absence of a per-programme fee field (Italian tuition is
// institution/income/residency/cycle-specific — the source data itself
// marks fee_basis as NOT_COLLECTED on every row).
//
// Both loads are chunked and wrapped in delete-then-insert per table, not a
// row-by-row upsert, since these are "the current published directory" full
// snapshots rather than incrementally-updated data.

import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as XLSX from "xlsx";
import { germanyProgrammeIndex, italyProgrammeIndex } from "../drizzle/schema";

const GERMANY_PATH = process.env.GERMANY_DIRECTORY_PATH ?? "./germany_public_discovery_directory_v4.xlsx";
const ITALY_PATH = process.env.ITALY_DIRECTORY_PATH ?? "./italy_universitaly_directory_v1.xlsx";
const CHUNK_SIZE = 500;

function readSheetRows(filePath: string, sheetName: string): Record<string, unknown>[] {
  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found in ${filePath}. Available sheets: ${workbook.SheetNames.join(", ")}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function asString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function asNullableString(value: unknown): string | null {
  const s = asString(value);
  return s.length ? s : null;
}

async function ingestGermany(db: ReturnType<typeof drizzle>) {
  const rows = readSheetRows(GERMANY_PATH, "Programme Search Index");
  console.log(`[Germany] Read ${rows.length} rows from "Programme Search Index".`);

  const values = rows.map((row) => ({
    programmeId: asString(row.programme_id),
    officialName: asString(row.official_name),
    city: asString(row.city),
    region: asString(row.region),
    programmeName: asString(row.programme_name),
    broadSubjectCategories: asString(row.broad_subject_categories),
    fieldMatchBasis: asNullableString(row.field_match_basis),
    programmeEvidenceUrl: asString(row.programme_evidence_url),
    officialProgrammeUrl: asNullableString(row.official_programme_url),
    programmeLanguage: asNullableString(row.programme_language),
    admissionSemester: asNullableString(row.admission_semester),
    admissionMode: asNullableString(row.admission_mode),
    sourceLayer: asString(row.source_layer),
    reputationTier: asNullableString(row.reputation_tier),
    securityInfrastructure: asNullableString(row.has_named_security_institute),
    feeRiskCategory: asNullableString(row.fee_risk_category),
    syrianBaccalaureateAnabinCondition: asNullableString(row.syrian_baccalaureate_anabin_condition),
    lastVerified: asNullableString(row.last_verified),
  }));

  const missingRequired = values.filter((v) => !v.programmeId || !v.officialName || !v.city || !v.region || !v.programmeName || !v.broadSubjectCategories || !v.programmeEvidenceUrl || !v.sourceLayer);
  if (missingRequired.length) throw new Error(`[Germany] ${missingRequired.length} rows are missing a required field — aborting before any write. First offender: ${JSON.stringify(missingRequired[0])}`);

  const ids = new Set(values.map((v) => v.programmeId));
  if (ids.size !== values.length) throw new Error(`[Germany] Duplicate programme_id values found (${values.length} rows, ${ids.size} unique) — aborting before any write.`);

  console.log("[Germany] Validation passed. Replacing table contents...");
  await db.delete(germanyProgrammeIndex);
  for (const batch of chunk(values, CHUNK_SIZE)) {
    await db.insert(germanyProgrammeIndex).values(batch);
  }
  console.log(`[Germany] Inserted ${values.length} rows into germany_programme_index.`);
}

async function ingestItaly(db: ReturnType<typeof drizzle>) {
  const rows = readSheetRows(ITALY_PATH, "Programme Search Index");
  console.log(`[Italy] Read ${rows.length} rows from "Programme Search Index".`);

  const values = rows.map((row) => ({
    // Namespaced with an "it-" prefix so Italy's numeric course IDs can
    // never collide with Germany's "g"-prefixed IDs in any shared table
    // (programmeResearchBriefings is keyed only by programmeId, not country).
    programmeId: `it-${asString(row.universitaly_course_id)}`,
    institutionName: asString(row.institution_name),
    city: asString(row.city),
    region: asString(row.region),
    legalStatus: asNullableString(row.legal_status),
    publicOnlyComparable: asString(row.public_only_comparable).toUpperCase() === "YES",
    programmeNameEn: asNullableString(row.programme_name_en),
    programmeNameIt: asNullableString(row.programme_name_it),
    programmeNameDisplay: asString(row.programme_name_display),
    degreeLevelEn: asNullableString(row.degree_level_en),
    degreeClassCode: asNullableString(row.degree_class_code),
    cunArea: asNullableString(row.cun_area),
    durationYears: asNullableString(row.duration_years),
    programmeLanguage: asNullableString(row.programme_language),
    admissionsAccessTypeEn: asNullableString(row.admissions_access_type_en),
    // official_programme_url had ~106 nulls in the source data; fall back to
    // the always-populated Universitaly reference URL rather than leaving a
    // broken/missing evidence link.
    officialProgrammeUrl: asNullableString(row.official_programme_url) ?? asNullableString(row.universitaly_reference_url),
    universitalyReferenceUrl: asString(row.universitaly_reference_url),
    healthCategory: asNullableString(row.health_category),
    technologyEngineeringCategory: asNullableString(row.technology_engineering_category),
    priorityScope: asNullableString(row.priority_scope),
    feeBasis: asNullableString(row.fee_basis),
    scholarshipStatus: asNullableString(row.scholarship_status),
    internationalStudentNote: asNullableString(row.international_student_note),
    lastVerifiedUtc: asNullableString(row.last_verified_utc),
  }));

  const missingRequired = values.filter((v) => !v.programmeId || v.programmeId === "it-" || !v.institutionName || !v.city || !v.region || !v.programmeNameDisplay || !v.universitalyReferenceUrl);
  if (missingRequired.length) throw new Error(`[Italy] ${missingRequired.length} rows are missing a required field — aborting before any write. First offender: ${JSON.stringify(missingRequired[0])}`);

  const ids = new Set(values.map((v) => v.programmeId));
  if (ids.size !== values.length) throw new Error(`[Italy] Duplicate programme_id values found (${values.length} rows, ${ids.size} unique) — aborting before any write.`);

  console.log("[Italy] Validation passed. Replacing table contents...");
  await db.delete(italyProgrammeIndex);
  for (const batch of chunk(values, CHUNK_SIZE)) {
    await db.insert(italyProgrammeIndex).values(batch);
  }
  console.log(`[Italy] Inserted ${values.length} rows into italy_programme_index.`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. This script must be run against a real database connection.");
  const db = drizzle(postgres(process.env.DATABASE_URL!, { prepare: false }));
  await ingestGermany(db);
  await ingestItaly(db);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
