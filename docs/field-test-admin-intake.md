# Field test #166 — Admin CV / `.xlsx` intake (human, one-click kit)

Goal: prove the admin intake loop end-to-end — sign in as admin, upload a
**non-sensitive** fixture, review the AI-extracted drafts, explicitly commit a
record, and confirm duplicate protection. Nothing becomes a candidate record
until an administrator reviews and commits it.

Env var names below are verified against `.env.example`, `server/routers.ts`
(`adminIntake.*` procedures), `server/adminIntake.ts`, and `server/db.ts`.

---

## 0. Preconditions

### Environment variables (`.env`)

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | Stores uploads, drafts, committed prospective students |
| `COOKIE_SECRET` | Admin session |
| `GEMINI_API_KEY` | Real AI extraction (`extractAdminIntakeDrafts`); without it the app boots but extraction quality/shape differs |
| `DATA_DIR` | Local private storage of the original file (default `./data/uploads`) |

### Test fixture (safe, fake data)

- `scripts/fixtures/admin-intake-sample.xlsx` — 2-row spreadsheet with invented
  candidates (Rania Demo / Omar Demo, `@example.com`). Regenerate or customise:
  any `.xlsx` works; keep rows small and fictional.
- Optional CV path: `scripts/fixtures/sample-cv.txt` (plain text ≥ 24 chars).
- Limits to respect: file < 8 MB; accepted types are PDF, DOCX, TXT, XLSX
  (`server/adminIntake.ts:classifyAdminIntakeFile`).

### The first registered account is admin

Per `.env.example`: **the FIRST account you register on a fresh database
becomes the admin** and only admins can open `/admin/intake`
(`adminProcedure`; non-admins see “This workspace is for Nightfall
administrators.”). If your DB already has an admin, use that account.

Start the app:

```powershell
$env:NODE_ENV="development"; npx tsx watch server/_core/index.ts
```

---

## 1. Click-path

### Step A — Sign in as admin & open intake

1. `/login` with the admin account.
2. Navigate to **/admin/intake** (header shows *NIGHTFALL / ADMIN INTAKE*).

**Observe:** *Source files* sidebar starts empty (“No intake files yet…”).

### Step B — Upload the fixture

3. Click **Upload source**, choose `scripts/fixtures/admin-intake-sample.xlsx`.
4. Wait for “Preparing review” to finish.

**Observe:**
- Sidebar shows the file with “2 source records” and status
  **ready_for_review**.
- Review queue lists SOURCE ROW 2 and SOURCE ROW 3 (row 1 is the header),
  each with extraction confidence (`HIGH`/`MEDIUM`/`LOW`) and the proposed
  profile fields (name, direction, academics, background).
- Extraction note reads: “Structured drafts prepared. An administrator must
  review each row before it is committed.”

### Step C — Review drafts

5. For row 2: verify extracted fields against the sheet, then **Approve**
   (optionally add a review note).
6. For row 3: click **Reject** instead.

**Observe:** statuses change to `approved` / `rejected`; reviewer id +
timestamp recorded (`reviewAdminIntakeRecord`).

### Step D — Explicit commit

7. On the approved row, click **Commit record**.

**Observe:** status becomes `committed`; a new row exists in
`prospective_students` linked via `prospective_student_id`. Committing is
per-record and never creates a login account.
**Fail signs:** commit button on a rejected/pending row errors with
“Review and approve this intake draft before committing it.”

### Step E — Duplicate protection

8. Upload the **same xlsx again**.

**Observe:** no second entry appears and no re-extraction runs — the server
hashes content (sha256) and returns the existing upload with
`duplicate: true` (`createAdminIntakeUpload`); the UI just re-selects the
existing source file and its records. Per-row fingerprints
(`buildSourceDigest(contentHash, rowNumber, text)`) plus the unique
`(uploadId, sourceRowNumber)` constraint mean re-ingestion cannot create
duplicate candidate rows either.

9. Optional: upload a different file whose rows repeat the same text as the
   first upload → new upload is created (different content hash), but the
   per-row digest still guards candidate duplication at commit level.

---

## 2. Pass/fail criteria

| # | Criterion | Pass |
| --- | --- | --- |
| P1 | Non-admin account cannot open `/admin/intake` data (lock screen) | ✅ |
| P2 | 2-row xlsx produces exactly 2 reviewable draft rows with confidence labels | ✅ |
| P3 | No candidate record exists before explicit commit | ✅ |
| P4 | Reject blocks commit; approved row commits once into `prospective_students` | ✅ |
| P5 | Re-uploading the identical file is detected as duplicate (no new upload/extraction) | ✅ |
| P6 | Original file stored privately under `DATA_DIR`/`admin-intake/<adminId>/…`, not publicly readable (`/files/admin-intake/*` requires admin session) | ✅ |

## 3. Evidence capture

- Screenshot: empty sidebar → uploaded file card with “2 source records”.
- Screenshot: review queue showing both rows pre-review and after approve/reject.
- Screenshot: committed row status + (if comfortable) DB row of
  `prospective_students` with fake data visible.
- Screenshot of the duplicate re-upload attempt (same single source file,
  unchanged count).
- Note date/time, commit hash, `GEMINI_API_KEY` present yes/no (affects
  extraction), and any error banners.

Do **not** upload real CVs or personal data for this test.
