# Nightfall Multi-Country Programme Research Expansion Plan

**Purpose.** This plan describes how Nightfall can reproduce the useful parts of the Germany research index across additional study destinations without turning discovery data into an admissions recommendation, eligibility verdict, or automated application action. The end state is a student-controlled research layer: every material claim is source-linked, every deadline is review-first, and every consequential decision remains with the student.

> **Product principle.** Nightfall can monitor, organize, analyse, prepare, and remind. The student still owns choices, approvals, submissions, and decisions.

## 1. What Germany proved—and what should be reused

Germany established the correct operating pattern: a shared **public research index** holds canonical programme evidence; student-owned tables hold saved items, private notes, pins, archival state, and student-confirmed calendar dates. The country index is not copied into every student record. That separation should be non-negotiable in every new country.

| Layer | Reusable responsibility | Never claim automatically |
|---|---|---|
| National discovery layer | Find programmes, providers, fields, study language, and official URLs. | That a programme is currently open, affordable, or a fit for a student. |
| Official provider page | Confirm live tuition, intake, requirements, scholarship, and date wording. | That a student meets an entry requirement. |
| Student workspace | Save, pin, archive, compare, write notes, and hand a reviewed date to the calendar. | That a student has applied, qualifies, or will be admitted. |
| Change watch | Cache a source snapshot, compare changed text, and present a reviewable alert. | A legal, visa, or admissions interpretation. |

The target cross-country data contract is deliberately smaller than a full admissions CRM. It should contain the provider’s stable identity, programme title, study level, city/region, language as written, programme URL, official evidence URL, source tier, observed date/fee text, timestamp, and a content hash. Optional fields remain `unknown` when a source does not support them; they must not be guessed or backfilled from marketing copy.

## 2. Country selection and rollout order

Nightfall should launch countries in **source-pattern cohorts**, not in alphabetical order. This lowers implementation cost because one importer and validation strategy can serve several destinations with similar national search or application infrastructure.

| Cohort | Countries | Why this is a practical first wave | Primary discovery / verification stack |
|---|---|---|---|
| **A — national application catalogues** | Netherlands, Sweden, Finland, Italy, France | These destinations offer national or national-facing programme discovery and/or application infrastructure; they are closest to the Germany workflow. | Studyfinder; Universityadmissions.se; Studyinfo; Universitaly; Campus France catalogues. [1] [2] [3] [4] [5] |
| **B — government international-study indexes** | Canada, Australia, New Zealand, Türkiye | These provide a useful country-wide overseas-study source, but provider pages remain essential for a live programme record. | EduCanada; CRICOS; Study with New Zealand / NZQA; Study in Türkiye. [6] [7] [8] [9] |
| **C — federated systems** | United Kingdom, United States, Ireland | Discovery exists, but source truth is more fragmented across universities, application services, regulators, and institutional pages. | UCAS + Discover Uni; NCES College Navigator; Education in Ireland + immigration eligibility sources. [10] [11] [12] |
| **D — research-first later lanes** | Denmark, Norway, Spain, Portugal, Japan, South Korea, UAE, Qatar, Malaysia, Singapore | Add only after a documented official-source map, language handling, and legal/eligibility boundary exist for each country. | Country-specific official catalogue and provider-page verification, chosen during country discovery. |

The first production implementation should be **one country from Cohort A**, ideally the Netherlands or Sweden, followed by Canada. This tests three important patterns: a national English-language study finder, a centralised application portal, and a government international-study finder with costs. It is intentionally safer than opening ten partially verified countries at once.

## 3. Verified source map for the first launch cohort

The following sources have been checked as planning inputs. Their role is described narrowly; Nightfall must still confirm technical access, licence terms, robots policy, and current field availability before building an importer.

| Destination | Planning source | What the source supports | Nightfall treatment |
|---|---|---|---|
| Netherlands | Study in NL’s Studyfinder describes itself as an official starting point and offers English-taught programme discovery. [1] | Initial discovery for English-taught options. | Build a discovery importer only after access review; link students back to the live programme page for requirements and dates. |
| Sweden | Universityadmissions.se exposes courses and programmes across Sweden with semester selection and search. [2] | Programme discovery plus semester-based application context. | Model intake as a semester object; never convert its central workflow into an automatic application action. |
| Finland | Study in Finland directs students to Studyinfo as the national application portal database. [3] | Degree discovery and national application context. | Treat Studyinfo’s programme record as the discovery source and preserve each intake/source URL. |
| Italy | Universitaly directs international students to select a programme among Italian higher-education offerings. [4] | National programme selection and related pre-enrolment context. | Keep programme discovery separate from student-specific visa/pre-enrolment interpretation. |
| France | Campus France publishes distinct licence, master’s, English-taught, doctoral, short-course, and online catalogues. [5] | Structured multi-catalogue discovery. | Maintain source-family provenance; do not merge English-taught and general-catalogue coverage into a false completeness claim. |
| Canada | EduCanada offers a Canada-wide programme search and cost-oriented study information. [6] | Programme/institution discovery and broad cost planning. | Import discovery fields only; verify programme tuition and deadlines on the institution page before showing a calendar handoff. |
| Australia | CRICOS is the Australian Government register of providers and courses for overseas students. [7] | Provider/course registration verification for overseas-study context. | Use CRICOS as an eligibility/registration evidence layer, not a substitute for a university’s intake page. |
| New Zealand | Study with New Zealand presents a course search; NZQA offers qualification search and qualification-recognition information. [8] | Discovery plus qualification-system context. | Keep qualification-framework evidence distinct from admissions eligibility. |
| Türkiye | Study in Türkiye promotes a Study Finder for programme and university selection. [9] | National-facing discovery. | Pilot with programme URLs and language fields only until institutional deadlines are independently verified. |
| United Kingdom | UCAS offers course search; Discover Uni is the official source for undergraduate course information and comparison. [10] | Course discovery and public comparison information. | Treat provider pages and UCAS cycle dates as separate, dated source objects. |
| United States | NCES College Navigator provides federal consumer information on institutions, programmes, prices, aid, and related data. [11] | Institution/programme-major discovery and comparable institutional attributes. | Launch institution-first; supplement with official programme pages before presenting dates, prerequisites, or international tuition. |
| Ireland | Education in Ireland provides the national study destination surface; Irish immigration identifies eligible-programme requirements for longer study. [12] | Destination discovery and an independent eligibility constraint. | Do not conflate a programme listing with immigration eligibility; preserve both source links and wording. |

## 4. Standard country-build workflow

Every country follows the same gated process. A country may not progress to student-visible search merely because a useful directory exists.

| Gate | Required work | Exit evidence |
|---|---|---|
| **0. Source charter** | Name the official discovery, regulator, national application, qualification-recognition, scholarship, and visa-information sources. Record owner, URL, language, update cadence, access terms, and intended use. | Approved country source map with a named owner. |
| **1. Field mapping** | Map raw fields to the universal data contract; identify fields that are missing, country-specific, or unsafe to normalise. | Published field map and `unknown` policy. |
| **2. Access review** | Prefer documented APIs, open data, feeds, exports, or permitted manual imports. Do not bypass rate limits, login walls, robots restrictions, or source terms. | Technical access decision and refresh policy. |
| **3. Small pilot** | Import 100–300 programmes or one bounded region/degree level. Preserve raw source URLs and source timestamps. | Pilot index plus importer report and error log. |
| **4. Quality review** | Run deterministic validation and human sample review before publishing. | Quality-control report and approval to expand. |
| **5. Student research release** | Enable search, source links, private saves, pins, notes, comparison, and review-first date handoff. | Release checklist, accessibility review, and rollback path. |
| **6. Freshness operation** | Cache first; refresh by source cadence; use AI only after a substantive source change; queue ambiguous changes for review. | Change log, stale-record policy, and alert wording. |

## 5. Quality-control standard

The Germany quality-control approach should become a reusable scorecard, not a one-off script. Each country importer must report total rows processed, accepted rows, rejected rows, duplicate keys, missing official URLs, missing provider identity, invalid dates, unsupported languages, and records awaiting manual review.

| Validation | Release threshold | Handling when it fails |
|---|---|---|
| Stable programme/provider identity | 100% of published rows | Quarantine unkeyed records. |
| Official URL present | 100% for a student-visible record | Keep as internal candidate only, or reject. |
| Field provenance | Every displayed fee, deadline, requirement, or language label has a source URL and observed timestamp. | Render `not yet verified`; never infer. |
| Deduplication | No duplicate canonical provider-programme-intake key in published index. | Merge only after a reviewable matching decision. |
| Date integrity | Raw text retained; parsed date only when date and year are unambiguous. | Show raw source wording, suppress calendar handoff. |
| Human sampling | At least 30 rows or 2% of each release, whichever is larger. | Block expansion if material source drift or field mis-mapping is found. |
| Freshness | Country-specific stale threshold, displayed to the student. | Mark stale; do not silently present as current. |

## 6. Universal data model and country adapters

The shared Nightfall programme table should remain country-neutral. Country adapters transform a source into this table, while raw documents and country-only metadata remain in an evidence payload rather than creating dozens of nullable global columns.

| Universal field | Example | Notes |
|---|---|---|
| `countryCode`, `programmeKey`, `providerKey` | `SE`, national/provider keys | Keys must remain stable across refreshes where possible. |
| `officialName`, `programmeName`, `level`, `city`, `region` | Provider and course titles as published | Store the source language as well as a display translation if one is curated. |
| `teachingLanguageRaw`, `durationRaw`, `studyModeRaw` | `English`, `2 years`, `full-time` | Preserve original text; do not create false precision. |
| `programmeUrl`, `sourceUrl`, `sourceTier` | Official page and national finder | A record is not publishable without a resolvable source. |
| `feeTextRaw`, `deadlineTextRaw`, `requirementsTextRaw` | Exact observed wording | Parsed values are optional derivatives with source and timestamp. |
| `observedAt`, `contentHash`, `freshnessStatus` | Cache metadata | Powers safe change watching and visible freshness. |
| `countryEvidenceJson` | CRICOS code, Universitaly category, UCAS cycle | Adapter-specific evidence; never shown as a universal ranking. |

## 7. Student experience and AI boundaries

The interface should repeat Germany’s student-owned pattern across countries. Students can save a programme, pin it, archive it, write private decision notes, compare selected programmes, open cited evidence, and add a date they personally reviewed to their calendar. The AI may summarise a changed page or identify text differences after caching, but it should never manufacture a deadline, rank a programme as “best,” determine admission chances, file an application, or submit a decision.

> **Operational rule.** A calendar item created from programme research is always labelled **student-confirmed** and retains its official evidence link. It is editable and removable by the student at any time.

For the landing and product language, the lunar system should communicate a changing application state, not mysticism. Every phase needs a text label, a plain-language description, and a next action. The product must remain understandable if the lunar element is hidden or motion is reduced.

## 8. Delivery plan and staffing model

| Period | Deliverable | Decision point |
|---|---|---|
| **Weeks 1–2** | Reusable country-source charter, adapter template, QC report template, data glossary, and provenance UI contract. | Approve the universal schema and source-tier policy. |
| **Weeks 3–5** | Netherlands or Sweden pilot: bounded import, QA sample, saved-programme flow, and source-linked comparison. | Expand only if source access and quality thresholds pass. |
| **Weeks 6–8** | Canada pilot using a different source pattern; add cost-context adapter and country-specific freshness rules. | Confirm that adapter reuse outweighs maintenance cost. |
| **Weeks 9–12** | Finland, Italy, France as Cohort A continuation; launch one country at a time with separate QC reports. | Pause any country with ambiguous/unstable dates or unclear source rights. |
| **Quarter 2** | Australia, New Zealand, Türkiye; then UK/US/Ireland with federated-source handling. | Decide whether to staff dedicated country research owners. |
| **Ongoing** | Source monitoring, stale-data review, student feedback, and quarterly source-charter recertification. | Retire or narrow any source that no longer supports accurate public discovery. |

## 9. Practical next step

Start with a **Netherlands source charter and 200-programme pilot**. It provides a clean comparison against the Germany workflow while keeping data volume, source variation, and review load controlled. Sweden is the appropriate second pilot because its semester-based national application context will validate Nightfall’s intake and deadline model. Canada should follow to verify the government discovery-plus-provider verification pattern.

## References

[1]: https://www.studyinnl.org/dutch-education/studies "Studyfinder — Study in NL"
[2]: https://www.universityadmissions.se/ "Universityadmissions.se — Apply to Swedish universities"
[3]: https://www.studyinfinland.fi/admissions "Admissions — Study in Finland"
[4]: https://www.universitaly.it/first-steps "Find a programme — Universitaly"
[5]: https://www.campusfrance.org/en/finding-a-university-programme-France "Finding the programme for you — Campus France"
[6]: https://www.educanada.ca/programs-programmes/index.aspx?lang=eng "Find programs and costs for international students in Canada — EduCanada"
[7]: https://cricos.education.gov.au/ "CRICOS — Australian Government"
[8]: https://www.studywithnewzealand.govt.nz/en/study-options/course/results "Find Study Courses in New Zealand" 
[9]: https://www.studyinturkiye.gov.tr/ "Study in Türkiye"
[10]: https://www.ucas.com/explore/search/courses https://discoveruni.gov.uk/ "UCAS course search and Discover Uni"
[11]: https://nces.ed.gov/collegenavigator/ "College Navigator — NCES"
[12]: https://www.educationinireland.com/en/ https://www.irishimmigration.ie/coming-to-study-in-ireland/what-are-my-study-options/a-third-level-course-or-a-language-course/ "Education in Ireland and Irish immigration study options"
