# Germany Public-Agency Census v5 — Nightfall Integration Record

The user supplied `germany_public_state_funded_agency_census_v5_package.zip` on 2026-08-27 and confirmed that Germany, rather than Italy, is the priority country for this data. The archive is a Germany-only source package and must never be represented as Italian data.

## Source and scope

The supplied workbook is `germany_public_state_funded_agency_census_v5.xlsx`, retrieved on 2026-08-22. Its **Agency Programmes** sheet contains 19,967 programme rows. Every prepared row has `public_control_hrk = öffentlich-rechtlich` and a HIGH or MEDIUM mapping confidence. Programme identity and public-institution control are drawn from the HRK registry; programme-detail routes are DAAD catalogue URLs.

| Source field | Nightfall Germany index mapping | Boundary |
|---|---|---|
| `programme_id` | `programme_id` | Retained as the stable source identifier. |
| `programme_name`, `official_name`, `city`, `state` | Programme, institution, city, region fields | Search and evidence context only. |
| `subject_cluster`, `degree`, `study_mode` | `broad_subject_categories`, `field_match_basis`, `admission_mode` | Explicitly labelled as source data; not an eligibility judgement. |
| `programme_detail_url` | `programme_evidence_url` | Must be a DAAD HTTPS detail URL. |
| `official_programme_website_hrk` | `official_programme_url` | Preserved only when the supplied URL is HTTPS; otherwise null. |
| `catalogue_retrieval_date` | `last_verified` | Source-catalogue retrieval date, not a guarantee of current eligibility or availability. |

## Quality and gaps

The package’s included quality-control file reports 250 public-law institutions, 19,967 mapped programmes, no non-public programme records, and 2 public institutions without a programme mapping. The included coverage audit specifically warns that an automatic zero match is **not** evidence that an institution offers no relevant programme. Nightfall preserves this as a source-coverage limitation rather than turning it into negative advice.

## Import record

After deterministic validation, 19,967 source rows were prepared in 40 idempotent database batches of 500 rows. Each row requires a public-law HRK control, HIGH or MEDIUM mapping confidence, a unique programme identifier, required identity fields, and a DAAD HTTPS detail URL. The import uses the source layer `HRK public-law / DAAD catalogue v5`.

Post-import verification returned 19,969 total Germany-index records, 19,967 census-layer rows, and 19,969 unique programme identifiers. The imported records include 99 programme names matching biotech/biotechnology and 43 matching anthropology. These counts demonstrate searchable catalogue coverage only; they are not claims about admission, language eligibility, tuition, visas, funding, capacity, or a student’s likelihood of acceptance.

Consulting receives at most six source-labelled Germany catalogue records relevant to the stored study direction, and only when the student explicitly asks a Consulting question. The user interface must keep changed-direction and rejection moments conversational and must not present this dataset as an automatic menu of recommendations.
