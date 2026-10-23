# PAPER_CONTEXT.md — SIMANTAP-TL

Context for co-authors of an academic paper about this system. Everything here is taken from
the code, configuration, `CHANGELOG.md` and `DEPLOY.md` in this repository, as of 2026-10-19.
Statements I could not verify directly in code are marked **[INFERRED]**. File references use
`path:line` so claims can be traced.

Snapshot caveat: the QR letter-verification feature (§5.3) exists only in the working tree
(uncommitted: `functions/verifikasiSurat.js`, `src/utils/qrVerifikasi.js`,
`src/pages/VerifikasiSurat.jsx` are untracked; the last commit is `47ade92`, 2026-10-15).
Its changelog entry says it is being deployed, but I cannot confirm from the repo that it is live.

---

## 0. Glossary (Indonesian domain terms used in code)

| Term | Meaning |
|---|---|
| Mahasiswa / Dosen / Admin | Student / Lecturer / Department administrative staff |
| Pengajuan | One student's application/enrolment in one program (one Firestore doc in `mahasiswa/`) |
| Program: TA, KP, CAP, MG (Magang/MKT), S2 | Final thesis (Tugas Akhir), Practical internship (Kerja Praktik), Capstone Design, Internship / "Mata Kuliah Terapan" (applied course), Master's thesis |
| Tahap | Workflow stage (e.g. KP: Pendaftaran → Bimbingan → Pembukuan → Lulus = Registration → Supervision → Archiving/"bookkeeping" of final report → Graduated) |
| Pembimbing / Penguji / Dosen Wali | Supervisor / Examiner / Academic advisor |
| Verifikasi: baru / terverifikasi / perbaikan | "Awaiting verification" / "Verified" / "Needs correction" |
| Surat, Nomor surat | Official letter; official letter number (agenda number) |
| Surat Tugas (ST), Berita Acara (BA), Perpanjangan | Assignment letter, minutes/official report, extension |
| Surat balasan perusahaan | Company acceptance letter (KP/Magang) |
| Jadwal, Ruang, Booking | Schedule, room, room reservation |
| Ditutup (field `dibatalkan`) | Application closed/archived by admin |

---

## 1. Problem and motivation

**Setting.** SIMANTAP-TL is a web system for the undergraduate Environmental Engineering
study program (Program Studi S1 Teknik Lingkungan) at Universitas Diponegoro (UNDIP),
Indonesia. The public verification page names the issuer as "Program Studi S1 Teknik
Lingkungan Undip" (`src/pages/VerifikasiSurat.jsx:50,65`). The HTML title reads "Sistem SKP
Terintegrasi — UNDIP" (`index.html:6`). An earlier sample announcement expanded the name as
"Sistem Informasi Manajemen Tugas Akhir dan Praktik" [INFERRED: sample data since removed from
`src/data/seed.js`]; the official expansion should be confirmed with the authors.

**What it manages.** The administrative lifecycle of supervised academic programs. Two are
in production; three more are modeled in code but **not ready** (see "Maturity" below). Each
program has its own stage sequence (`src/utils/helpers.js:11-67`):

- In production:
  - KP: Pendaftaran → Bimbingan → Pembukuan → Lulus
  - MG (Magang and its variant MKT): Pendaftaran → Bimbingan → Expo → Lulus
- In development, not ready:
  - TA: Pendaftaran → Bimbingan → Seminar Proposal → Seminar Hasil → Sidang → Lulus
  - CAP: Pendaftaran → Seminar Proposal → Expo → Lulus
  - S2: Pendaftaran → Penentuan Pembimbing → Seminar Proposal → Seminar Hasil → Sidang → Lulus

For the production programs it tracks registration data, verification by staff, supervisor
assignment, scheduling of the Magang/MKT Expo with room and lecturer clash detection,
generation of 13 kinds of KP and Magang/MKT letters from Word templates, upload of signed
scans, deadline extensions, official letter numbering, and lecturer workload statistics.
Examiner (penguji) roles and the seminar/defence events (Seminar Proposal, Seminar Hasil,
Sidang) belong only to the programs that are not ready yet; KP has no scheduled event.

**Maturity: what is in production.** Production means the build deployed to the department
domain `simantaptlundip.com` with `VITE_PROGRAM_SCOPE=prod` (`package.json` script
`deploy`, `.env.prod`, `DEPLOY.md:42-50`).

| Area | Status | Evidence |
|---|---|---|
| KP, Magang/MKT end to end | Production. Students can only register for these two | `src/utils/config.js:24-29`, `src/pages/portal/shared.js:11` |
| TA, Capstone, Tesis S2 | Not ready. Selectable only in the experimental build on the Firebase domains, which only the super admin and listed test accounts can log in to | `config.js:24-29`, `src/utils/domainAccess.js:6-28` |
| Letter-number registry | Production (all builds) | `CHANGELOG.md:112-117` |
| Room scheduling module | Production for admins (all builds); students see a read-only event list | `config.js:19-22`, `CHANGELOG.md:193-195` |
| Public room-schedule embed | Served only from the Firebase site, embedded on the department website | `DEPLOY.md:92-112` |
| QR letter verification | Three KP letters; written, deployment not confirmed | `functions/verifikasiSurat.js:24-28` |

Signs in the code that TA, Capstone and S2 are unfinished:
- TA letter payloads are marked as layout-first, with tags not yet matched to each template
  (`src/utils/documentGenerator.js:373-374`). One TA template is still "(WiP)" and its path
  does not match the code (§7).
- Capstone and S2 have no letter types at all in `getTemplateConfig` (19 cases: KP 7,
  Magang/MKT 6, TA 6; `documentGenerator.js:140-516`) and no template folder.
- Capstone and S2 have no extension rules (`src/utils/nomorSurat.js:17-24`), no QR letters, and
  are excluded from schedule → room-booking sync (`src/modules/ruang/logic/sinkronRuang.js:10-14`).

Caveat: the build scope only limits which programs a student can *register* for. Admin
screens in the production build still show tabs and program options for all five programs
(`src/pages/Mahasiswa.jsx:309`, `src/pages/mahasiswa/FormMahasiswaKP.jsx:86`), as the scope
comment says (`config.js:9-11`). For the paper, the evaluated system is KP + Magang/MKT; the
other three programs are future work **[INFERRED framing, confirm with the authors]**.

**Users.**
- Students: self-register, submit applications, download generated letters, upload signed
  scans, propose schedules, request extensions (`src/pages/Portal.jsx`, `src/pages/portal/`).
- Lecturers: read-only view of students they supervise/examine (`src/pages/DosenPortal.jsx`;
  rules comment `firestore.rules:342`).
- Admin staff: verify, assign lecturers, issue letter numbers, approve extensions, manage
  rooms, accounts, content (`src/pages/Mahasiswa.jsx`, `src/pages/pengaturan/`).
- Super admin: the only role that can create/delete admins (`functions/index.js:26-34`).
- The public: anyone scanning a QR on a printed letter (`/verifikasi/{token}`), and visitors
  of the department website, which embeds a read-only room schedule (`embed/ruang.html`).

**The problems the code history shows it solving** (from `CHANGELOG.md`):
- The predecessor kept the whole institution's state in one Firestore document
  (`sistem_ta/global_state`), with uploads embedded as base64. When it exceeded Firestore's
  1 MiB document limit, writes failed and files "disappeared" after upload
  (`CHANGELOG.md:330-346, 365-373`).
- The predecessor's login compared plaintext passwords on the client, used one hard-coded
  shared password for all lecturers/admins, and had Firestore rules `allow read, write: if true`
  (`CHANGELOG.md:251-262`). The system was inherited from a previous developer's Firebase
  project (`migrate_firebase.mjs:1-2`).
- Letter production, numbering and verification were manual **[INFERRED]** from the fact
  that the app introduces a numbering registry, template generation and QR verification, and
  that the admin form originally had a free-text number field (`CHANGELOG.md:119-135`).
- Room usage for lectures and seminars lived in an Excel workbook ("PENGGUNAAN RUANG untuk
  SEMINAR & KULIAH", one sheet per weekday) and in the university's central timetable export,
  both of which the room module imports (`src/modules/ruang/logic/jadwalRuang.js:3-7`,
  `src/modules/ruang/logic/jadwalKuliahRekap.js:5-9`).
- Printed letters could not be checked for authenticity or currency by a third party (e.g.
  a host company). The QR design was modeled on the faculty's existing "Verified!" page
  (developer notes, not in repo **[INFERRED]** as to the faculty system's details).

---

## 2. System architecture

### 2.1 Components

```
 Browser (React 18 SPA, Vite)                         Public (no login)
 ├─ Student portal / Lecturer portal / Admin           ├─ /verifikasi/{token}  (main.jsx route)
 ├─ docxtemplater + PizZip: fill .docx in browser      └─ /embed/ruang.html    (2nd Vite entry)
 ├─ qrcode: render QR PNG, inject into .docx                 │
 └─ Firebase JS SDK ──────────────┐                          │
                                  ▼                          ▼
 Firebase project "simantap-tl"                     Cloud Functions (HTTP, public, CORS *; asia-southeast2)
 ├─ Authentication (email+password, custom claims)  ├─ verifikasiSuratPublik
 ├─ Firestore (per-entity collections, Security     └─ jadwalRuangPublik  (/api/ruang)
 │   Rules = server-side validation)
 ├─ Storage (uploads/{applicationId}/..., rules)    Cloud Functions (callable, authenticated; asia-southeast2)
 └─ Firestore trigger catatPerubahanDataSurat       ├─ account mgmt (create/reset/delete/claims)
                                                    └─ terbitkanVerifikasi (issue QR token)
 Cloud Run "simantap-pdf-converter" (asia-southeast2)
 └─ POST /convert : .docx → PDF via LibreOffice headless

 Static hosting: cPanel shared host (production domain) and Firebase Hosting (experimental)
```

| Component | Tech | Where |
|---|---|---|
| SPA | React 18.3, Vite 5, no router library, no state library | `package.json`, `main.jsx`, `src/App.jsx` |
| Auth | Firebase Auth + custom claims `{role, nim | kode, super}` | `src/utils/auth.js`, `functions/index.js` |
| Database | Cloud Firestore, real-time listeners (`onSnapshot`) | `src/App.jsx:285-357`, `src/utils/useMahasiswaAdmin.js` |
| Authorization / validation | Firestore & Storage Security Rules | `firestore.rules` (467 lines), `storage.rules` |
| Server logic | Cloud Functions v1, Node 22 | `functions/index.js`, `functions/verifikasiSurat.js` |
| File storage | Firebase Storage, PDF only, ≤25 MB | `src/utils/fileUpload.js`, `storage.rules` |
| Letter generation | docxtemplater 3.69 + PizZip in the browser | `src/utils/documentGenerator.js` |
| PDF conversion | Express + LibreOffice Writer on Cloud Run | `converter-service/server.js`, `converter-service/Dockerfile` |
| QR verification | `qrcode` npm + callable/HTTP functions | `src/utils/qrVerifikasi.js`, `functions/verifikasiSurat.js` |
| Excel import/export | SheetJS 0.18.5 loaded lazily from cdnjs | `src/utils/exportUtils.js:71-94` |
| Room scheduling module | Self-contained folder with one boundary file | `src/modules/ruang/` |
| Deployment | Firebase CLI; custom SSH/scp script for cPanel | `firebase.json`, `scripts/deploy-cpanel.mjs` |

### 2.2 Data model (Firestore collections)

From `firestore.rules` and `src/App.jsx`:

| Collection | Key | Content | Who writes |
|---|---|---|---|
| `mahasiswa/{id}` | `{nim}_{program}` (or `_2`, `_3` after closure) | One application: form data, stage, verification state, lecturers, schedule per event, uploads, extension, KP program window (`mulaiProgram`, `batasProgram`), activity log, change-tracking | admin; student (whitelisted fields only) |
| `slotPengajuan/{nim}_{program}` | uniqueness marker | Points to the doc holding (nim, program) when its ID is not the canonical one | admin, functions, migration script |
| `akun/{nim}` | student account profile | `uid, email, isActive, mustChangePassword` | admin, functions; student only clears `mustChangePassword` |
| `dosen/{kode}` | lecturer profile | | admin |
| `admin/{uid}` | admin profile | | functions only |
| `loginIndex/{nim|nip|email}` | identifier → email | | functions only; public `get` |
| `auditLog/*` | account actions | | functions only |
| `config/global` | open periods, every period ever used (`daftarPeriode`), announcements, guides, admin-editable content/form text | | admin; public read |
| `angkatan/*` | cohort years (archived, never deleted) | | admin |
| `nomorSurat/{year-month-seq}` | letter-number registry | never deleted | admin |
| `verifikasiSurat/{token}` | QR verification records | | functions only, no client access |
| `dataSuratDiubah/{applicationId}` | timestamp of last change to printed fields | | trigger only |
| `indeksMahasiswa/{applicationId}` | queryable mirror of one application for the "Semua periode" archive table (program, periode, angkatan, bidang, tahap, deadline, NIM, lower-case name, entry date, status, verification, lecturer codes) | | trigger only; admin read |
| `statistik/lulus` | counts of graduated, non-closed applications per program, per cohort, per lecturer × role field × program | | trigger + repair script; admin read |
| `ruang`, `semesterRuang`, `booking` | room module | | admin; non-admins read only published |

Uploads live at `uploads/{applicationId}/{docKey}/{timestamp}-{name}` in Storage; Firestore
holds only `{fileName, size, url, path, uploadedAt}` (`src/utils/fileUpload.js:15-37`).

### 2.3 Data flows

**Reads.** Each role subscribes with queries that match the rules exactly: students to
`where('owner','==', nim)`; lecturers to four queries
(`pembimbing1|pembimbing2|penguji1|penguji2 == kode`) merged client-side
(`src/App.jsx:285-313`). Admins do not listen to the whole `mahasiswa` collection. By default
they load every application not yet at Lulus, from any period (`where('tahap','!=','Lulus')`),
plus every application in the two most recent periods (`where('periode','==', p)`), "recent" by chronological order of names like "Gasal 2026/2027" (`src/utils/helpers.js:258-269`); all
listeners are merged by document id (`src/utils/useMahasiswaAdmin.js:10-20`, `:24-106`). Choosing
an older period in the period selector adds a listener for that period, which stays until
logout (`src/App.jsx:379-418`). "Semua periode" does not load the history: its student table
is an archive read one page at a time from `indeksMahasiswa` (`limit` + `startAfter` cursor,
`count()` for the total), after which only that page's application documents are fetched by id
(`src/pages/mahasiswa/useArsipMahasiswa.js`). Its default order is entry date, oldest first, and
No. is the row's position in the current result; search is a name/NIM prefix and sorting is
limited to No./name/stage/deadline. Dashboard and lecturer workload under "Semua periode" count
the loaded non-graduated applications and add graduated totals from `statistik/lulus`
(`src/utils/ringkasLulus.js`, `src/App.jsx:399-414`). Both `indeksMahasiswa` and
`statistik/lulus` are maintained by an `onWrite` trigger on `mahasiswa/{id}`
(`functions/indeksArsip.js`). The default load therefore grows with active students plus about
a year of intake, not with the full history. Grouping the student table by cohort still loads
everything, because cohort numbering spans periods (`src/pages/Mahasiswa.jsx:102-107`). The list of periods for the selector is kept
in `config/global.daftarPeriode`, filled once from existing data the first time an admin opens
the app and extended when a period is opened or a record is saved with a new period
(`useMahasiswaAdmin.js:110-123`, `src/App.jsx:203-208`). The letter-number registry view loads
one calendar year at a time, the current year by default
(`src/pages/pengaturan/SeksiNomorSurat.jsx:22-37`). Other admin collections (`akun`, `dosen`,
`angkatan`) are still listened to in full. The client keeps no copy of application data in
browser storage: state starts empty and fills from these listeners, and a leftover cache from
earlier versions is deleted at startup (`src/App.jsx:54-57`). Browser storage holds only UI
preferences (theme, text size, sidebar, hidden table columns). A fresh project is initialised
with an empty `config/global` only; there is no sample data (`src/App.jsx:95-102`,
`src/data/seed.js`).

**Navigation state.** Admin view state lives in the URL, not in component state: the tab is the
path (`/dashboard`, `/mahasiswa`, `/dosen`, `/ruang`, `/pengaturan/{section}`), and periode,
program and the student table's search, filters, sort, grouping and page are query parameters
(`src/utils/rute.js`, `src/App.jsx:221-258`, `src/pages/mahasiswa/useFilterMahasiswa.js`).
Changing page, periode or program adds a browser history entry; typing, filtering, sorting and
paging replace the current one. Periode and program are always written so a link keeps
pointing at the same view after a newer period opens or the default program changes (all five
program codes are valid in every build; unknown or lower-case codes are normalised); a link to
an older period loads it like the selector does.
Refresh and pasted links therefore restore the view. Leaving a settings editor with unsaved
drafts through Back/Forward asks for confirmation and restores the URL if cancelled
(`rute.js:44-70`). Student and lecturer portals keep their own component state, and the
student edit form is not addressable by URL.

**Writes.** The client computes the full next state of an application (workflow logic in
`src/utils/helpers.js`) and writes the whole document with `setDoc`, after a 900 KB size guard
(`src/App.jsx:66-76`). Firestore Security Rules then re-validate the *diff* between old and new
document for non-admins (`firestore.rules:283-301`). Side effects on save: archive replaced
schedules (`arsipkanJadwal`, `helpers.js:373`), delete orphaned Storage files
(`orphanedUploadPaths`, `helpers.js:956`), maintain `slotPengajuan` (`App.jsx:420-449`).

**Letter generation.** Click "Unduh" → `getTemplateConfig(docType, record, lecturers)` picks a
template and builds the tag payload (`documentGenerator.js:125`) → for QR letters, call
`terbitkanVerifikasi`, compare server snapshot with what will be printed, render QR PNG →
fetch `/doc-templates/*.docx` → docxtemplater fills tags → swap QR placeholder image in the
OOXML package → POST to Cloud Run `/convert` → save PDF, or fall back to the `.docx` if
conversion fails (`documentGenerator.js:40-113`). Some letters (signature pages students must
complete) intentionally download as editable `.docx` (`docx: true`, e.g. `:281-309`).

**Verification scan.** QR → `https://simantaptlundip.com/verifikasi/{token}` → `main.jsx`
renders `VerifikasiSurat` outside the authenticated app → fetches
`verifikasiSuratPublik?t=token` on the `asia-southeast2-simantap-tl.cloudfunctions.net` URL → verdict
(`src/pages/VerifikasiSurat.jsx:11`, `functions/verifikasiSurat.js:179-216`).

### 2.4 Why each technology (stated in code/docs vs. inferred)

| Choice | Rationale | Source |
|---|---|---|
| Firebase (BaaS) | Inherited from the predecessor; no dedicated backend server **[INFERRED]** that a small department team can avoid running servers | `migrate_firebase.mjs` |
| Firestore per-entity collections | Single 1 MiB document caused data loss; per-doc writes only touch what changed | `CHANGELOG.md:336-340`, `App.jsx:59-64` |
| Firebase Auth + custom claims | Replace plaintext/shared passwords; roles in token so the client cannot set its own role; `nim`/`kode` in token so rules for list queries need no per-document `get()` | `functions/index.js:88-92`, `firestore.rules:5-13` |
| Security Rules as the validation layer | No API server; "what the UI cannot do, the database must reject" | `firestore.rules:43-55`, `CHANGELOG.md:176-178` |
| Firebase Storage | Remove base64 files from documents | `CHANGELOG.md:342-346` |
| Word templates + docxtemplater | Staff edit letter layouts in Word themselves; templates are the single source of truth; tags are the only coupling to code | `public/List of Tags.txt`, `documentGenerator.js:8-13` |
| LibreOffice on Cloud Run | Convert the same `.docx` to PDF rather than maintain a second PDF layout; `libreoffice-writer` only to shrink image/cold start | `converter-service/Dockerfile:3-10` |
| React without router/state libs | Small app (about five admin pages); a ~70-line hand-written router: path = page, query = view options, history entries only for page/periode/program changes. Firebase Hosting and `public/.htaccess` (cPanel) rewrite all paths to `index.html` | `src/utils/rute.js`, `App.jsx:221-258`, `firebase.json`, `public/.htaccess` |
| SheetJS from CDN, lazily | Only needed for import/export **[INFERRED]** to keep bundle small | `exportUtils.js:71-80` |
| Two static hosts | Production on the department's cPanel domain; Firebase Hosting for experimental build and Hosting-only features (rewrites) | `DEPLOY.md:1-7`, `DEPLOY.md:92-112` |

---

## 3. Key design decisions and trade-offs

Each item lists the alternative that was tried or considered and why it lost.

1. **Per-entity documents instead of one global document.** Alternative (the predecessor's
   design) hit the 1 MiB limit and lost data. Trade-off: one application = one document; a
   student in two programs has two documents linked by `owner` (`App.jsx:272-276`). The old
   global document is left orphaned, not deleted (`CHANGELOG.md:340`).

2. **Client-side business logic + declarative server-side re-validation.** The client builds
   the next state; rules check field whitelists, allowed transitions and preconditions
   (`firestore.rules:283-301`). Alternative: a Cloud Function per user action. Not chosen
   **[INFERRED]**: would duplicate the client logic anyway and add latency/cold starts. Cost:
   the same rule is written twice (JS in `helpers.js`, rules language in `firestore.rules`) and
   comments in both files cross-reference each other to keep them in sync (e.g.
   `helpers.js:281-287` ↔ `firestore.rules:264-276`).

3. **Roles and identifiers in token claims, not looked up per document.** Firestore evaluates
   list queries against the query, not each document, so rules for collection listeners may
   only use request-constant values (`firestore.rules:5-13`). Claims are set only by Admin SDK
   in functions (`functions/index.js:1-4`). Active/deactivated status is still checked with one
   `get()` per request so deactivation takes effect immediately (`firestore.rules:25-36`).

4. **Login by NIM/NIP while Auth is email-based.** A public, get-only `loginIndex` maps
   identifier → email before sign-in (`src/utils/auth.js:15-33`, `firestore.rules:426-429`).
   Trade-off: anyone who knows a NIM/NIP can learn the associated email (no listing).

5. **One open application per (student, program), enforced by the database.** Deterministic
   ID `{nim}_{program}`; legacy/admin-created/renamed documents are covered by marker docs in
   `slotPengajuan`; a closed application allows a re-application with ID `_2`, `_3`, … only if
   the previous one exists and is closed (`firestore.rules:303-317`, `helpers.js:241-251`).
   Alternative "Akhiri & daftar ulang" (reset the same document) was removed because it
   destroyed history; closing keeps an immutable archive (`CHANGELOG.md:54, 68-73`). Document
   IDs are not renamed on NIM change because Storage paths use the ID
   (`functions/index.js:410-420`).

6. **Verification status as the admin's work queue.** Only submissions that need staff action
   reset status to "awaiting verification" (`tandaiMenungguVerifikasi`, `helpers.js:271-294`;
   enforced by `ditandaiMenunggu`, `firestore.rules:252-263`). Feature access depends on
   "ever verified" (`pernahTerverifikasi`), not the current status, so students are not
   blocked while waiting. An earlier version flagged every upload and was corrected
   (`CHANGELOG.md:96-97`).

7. **Lock downloads when printed data changes after verification.** `hitungPerubahanData`
   records old→new values of fields that appear on letters, merges successive edits, drops
   fields reverted to their verified value, and ignores non-printed fields (phone, address,
   links) (`helpers.js:1045-1087`). While present, all generated-letter downloads are locked
   for the student until staff re-verify (`bolehUnduhDokumen`, `helpers.js:1112`). Staff can
   flag previously uploaded signed letters for re-upload (`berkasSebelumPerubahan`,
   `helpers.js:1089`). Alternative: lock nothing (stale letters) or lock on every pending
   status (blocks students needlessly) (`CHANGELOG.md:28-34`).

8. **Letter-number registry: hybrid manual + suggested, transactional, never deleted.** One
   sequence per calendar month across programs, restarting at 001 each month
   (`src/utils/nomorSurat.js:7-13, 30-35`). The faculty format uses a three-digit sequence; at
   full adoption (≈800 students, each passing through four or five programs) the department
   issues on the order of 800 numbers a year, which a yearly sequence would overflow, while the
   month numeral already in every number keeps `001/…/X/2026` and `001/…/XI/2026` distinct
   (developer decision 2026-10-23). Registry docs `nomorSurat/{year-month-seq}` are never
   deleted so ended numbers are never reused (`firestore.rules:463-471`). Recording happens in
   a transaction that rejects a number held by another student or already ended
   (`src/utils/nomorSuratDb.js:38-70`). History of
   alternatives in `CHANGELOG.md:112-124, 201-206`: (a) fully automatic read-only issuing —
   replaced so staff can still type numbers; (b) a counter collection — dropped in favour of
   computing the smallest unused number from the registry (`nomorSuratDb.js:17-31`); (c)
   per-academic-period sequences — rejected, the number belongs to the letter, not the student
   (developer notes). One number covers all letters of one application cycle; the QR token, not
   the number, identifies an individual letter.

9. **QR tokens are random, not the letter number.** Letter numbers are sequential and would
   allow enumeration of names and student IDs (`functions/verifikasiSurat.js:6-12`). Tokens are
   15 random bytes, base64url (120 bits) (`:140`). One token per *printed content version*:
   re-printing identical content reuses the token, changed content gets a new one (`:135-145`).
   Old paper stays "authentic" but is shown as outdated; only an ended number makes it invalid
   (`:186-189`). The snapshot shown publicly is computed on the server from the stored record,
   never sent by the client (`:9-12`).

10. **Change timestamps via a Firestore trigger, not a field on the record.** Every write path
    (admin, student, NIM change) is covered without adding a field to the student document,
    which would have to be whitelisted in rules (`functions/verifikasiSurat.js:88-97`).

11. **Template-driven letters, PDF by conversion, `.docx` fallback.** No second PDF layout;
    if Cloud Run fails the user still receives the `.docx` (`documentGenerator.js:23-27, 63-75`).
    Uploaded files were deliberately *not* routed through the converter; uploads are PDF-only
    instead, checked by MIME type and extension in the client and in Storage rules
    (`fileUpload.js:15-22`, `storage.rules:40-44`).

12. **Admin-editable form text, code-defined fields.** Admins can change labels, hints,
    placeholders, required flags and order of registration fields per program, stored in
    `config/global`, but cannot add/remove fields because fields are bound to template tags
    (`src/utils/formPendaftaran.js:3-11`, `CHANGELOG.md:216-222`). Dropdown options are
    deactivated, never deleted, so old records keep their labels (`CHANGELOG.md:219`).

13. **The tracked deadline is a program window, separate from the printed internship period.**
    For KP the app tracks a 3-month window from the supervisor assignment letter's date, plus
    approved extensions (at most one month), so the total never exceeds the 4 months allowed. The first numbered KP letter is that letter, and one number serves the
    whole application. Staff fix the letter date before drawing a number: it defaults to one month
    before the confirmed fieldwork start (the supervisor must receive it before departure), or
    today if that has passed, and the number's month/year must match it, so numbers can be drawn
    early yet the paper, the registry and the deadline agree (`src/utils/perpanjangan.js:59-90`,
    `src/pages/mahasiswa/LangkahSuratTugas.jsx:14`, `src/pages/mahasiswa/FormMahasiswa.jsx:216-226`). The student-entered company dates
    (`tanggalMulai`/`batasAkhir`) only print on letters. Before a number exists there is no
    deadline ("Menunggu surat tugas"), and the clock stops once the signed approval sheet moves
    the student to the archiving stage (`src/utils/helpers.js:158-170`). The window is stored,
    not computed at read time, because the archive table filters deadlines with Firestore
    queries; the index mirror carries it (`functions/indeksArsip.js:39`). The department's KP
    handbook (Buku Panduan KP, not in the repo) sets 4 months from the assignment letter and a
    3-month maximum for fieldwork, and does not mention extensions; the department confirmed
    (2026-10-23) that the 4 months include the one-month extension, which also matches the
    letter template's fixed "Jangka Waktu: 3 (tiga) bulan".
    Extension letters print from an approval history, not the current deadline. Otherwise
    re-downloading after the deadline moved would shift the printed period
    (`src/utils/perpanjangan.js:4-9`). Month addition clamps to month end (31 Jan + 1 → 28/29
    Feb) (`nomorSurat.js:94-103`). Limits: KP/Magang 1×1 month, TA 2×1 month (`:20-24`). The
    system flags expired numbers with no extensions left for review but never ends them by
    itself (`:115-124`).

14. **Build-time program scoping as the release gate, one database.** A program goes into
    production only when it is ready: `VITE_PROGRAM_SCOPE=prod` limits new registrations to
    KP and Magang on the production domain, and the code comment says to add other programs to
    the filter "once each is considered ready" (`src/utils/config.js:24-29`). `full` exposes all
    programs on the experimental Firebase domain, where only the super admin and test accounts
    may log in (`src/utils/domainAccess.js:22-28`). Both builds use the same Firebase project
    (`DEPLOY.md:46-71`). A second flag, `FITUR_EKSPERIMENTAL`, is on only in `full`; its one
    remaining effect is that the KP/Magang/MKT supervisor assignment letter also waits for a
    letter number (`src/utils/helpers.js:634-635, 748-749, 810-811`,
    `src/pages/DosenPortal.jsx:199`). Trade-offs: no staging database (localhost writes go to
    live data), and the gate covers student registration only, not admin screens (§1).

15. **Room module isolated behind one boundary file.** `modules/ruang/**` may touch parent
    code only through `host.js`; the parent imports only `modules/ruang/index.js`
    (`src/modules/ruang/README.md:6-11`, `host.js:1-20`). Only *confirmed* program schedules
    become room bookings; unconfirmed student proposals do not block rooms
    (`sinkronRuang.js:4-9`). Booking docs carry a copied `terbit` flag so rules can filter
    without `get()` (`useJadwalRuang.js:8-12`).

16. **Public endpoints with explicit field whitelists.** The room-schedule API returns only
    published data and strips student names and responsible persons (`functions/index.js:439-471`);
    the verification API returns only fields printed on the letter (`verifikasiSurat.js:164-199`).

17. **Deployment via `scp` + `chmod`, not `rsync`.** Shared host has no rsync and no root
    (`DEPLOY.md:219-223`).
18. **Windowed admin loading, with a server-paged archive only for "all periods".** Admin views compute every
    statistic, filter and search in the browser over loaded records. Cursor pagination
    (`limit`/`startAfter`) would have required server-side aggregates for the dashboard and
    workload charts. Instead the default load is bounded by status and period: everything not
    yet Lulus, plus the two latest periods in full, with older periods loaded on request
    (`src/utils/useMahasiswaAdmin.js:6-10`). It works because nearly every view that needs
    graduated records (workload "including graduates", graduates per cohort, the workload
    mini-charts in the edit form) is already scoped to one period, and admin views open on the
    latest period. Trade-off: cohort numbering spans all periods and still needs the full
    load, and cross-record checks that assumed everything was in memory
    now query Firestore directly (`src/pages/mahasiswa/usePengajuanMilik.js`, `src/App.jsx:482-493`).
    The one view that would grow without bound, "Semua periode", is paged on the server instead:
    a trigger-maintained mirror collection (`indeksMahasiswa`) is queried with cursors, and
    graduated totals come from a trigger-maintained summary doc (`statistik/lulus`). The mirror is
    a separate collection, not extra fields on the application, because clients write
    applications whole and the rules check each changed field; a trigger write between a
    student's read and save would make that save fail (`functions/indeksArsip.js:1-12`). Paging
    the active set as well was rejected: Firestore has no substring search, every filter/sort
    combination needs a composite index, and the active set is bounded by intake
    **[INFERRED: no load measurements yet]**.
19. **Bounded login sessions instead of Firebase's indefinite persistence.** Firebase Auth keeps a
    browser signed in until explicit sign-out (refresh tokens never expire by themselves), and the
    old "remember me" choice only switched between per-tab and indefinite storage. Sessions now use
    one login shared by all tabs and end when (a) the last app tab is closed, detected when a tab
    opens by asking other tabs over `BroadcastChannel` while a per-tab `sessionStorage` marker
    tells a reload apart from a fresh tab; (b) no activity in any tab for a role-specific limit
    (admin 30 min, lecturer 60, student 120; admins use shared office PCs), tracked as one
    `localStorage` timestamp so every tab times out together; (c) 12 hours after sign-in
    (`auth_time`), active or not (`src/utils/sesi.js:14-16`, `main.jsx`). (c) is also enforced
    server-side in `isSignedIn()` of both rules files (`firestore.rules:15-20`,
    `storage.rules:5-9`), so a client that skips the timer still loses data access; (a) and (b)
    are client-only because the server sees no tab or activity state. A one-minute warning precedes
    (b) and (c); unsaved form edits are lost when the timer runs out.

---

## 4. Implementation challenges and solutions

| Challenge | Solution | Where |
|---|---|---|
| Uploads vanished: global doc > 1 MiB, write failed, real-time sync reverted the optimistic update | Per-entity collections, files to Storage, 900 KB pre-write guard | `CHANGELOG.md:330-346`, `App.jsx:66-76` |
| Firestore rules for list queries cannot depend on per-document lookups | Put `nim`/`kode` into custom claims; every client query mirrors a rule (`where(owner == nim)`) | `firestore.rules:5-13`, `functions/index.js:88-92`, `App.jsx:285-313` |
| No OR query across 4 lecturer fields under rules | Four listeners merged and de-duplicated client-side | `App.jsx:294-313` |
| Auth `onCreate` trigger fires late and overwrote admin/lecturer claims with `student` | Trigger skips users that already have a role claim | `functions/index.js:40-59` |
| Failed profile creation left orphan Auth accounts | Delete the just-created Auth user on failure | `src/utils/auth.js:35-47` |
| Bootstrap of first super admin (chicken-and-egg) | Any admin may claim it while none exists; path then locks | `functions/index.js:225-250` |
| NIM change must keep ownership, claims and uniqueness consistent | Batch: move account doc, rewrite `owner/nim` on applications, rebuild `slotPengajuan`, then reset claims | `functions/index.js:347-437` |
| Rule ordering on deletion (Storage rules read the Firestore doc; marker deletion requires doc already gone) | Delete Storage folder before the doc; delete marker after, checked with `existsAfter` | `App.jsx:450-474`, `firestore.rules:364-371` |
| Firestore caps rule evaluation at 1000 expressions per request and reports overruns as "Missing or insufficient permissions"; the student-write check ran every sub-check on every save, so a legitimate save (deleting the company reply letter, which also moves the stage back) was refused, found only via the console Rules Playground | Each sub-check runs only when its own fields changed; when they did not, the sub-check is trivially true, so the guard does not loosen the rules | `firestore.rules:298-320` |
| Append-only activity logs in a rules language without loops | Compare prefix slice: new list longer and `new[0:old.size()] == old` | `firestore.rules:112-118` |
| LibreOffice substituted fonts with different metrics, breaking letterhead tables | Install metric-compatible fonts (Liberation, Carlito, Caladea) in the image | `converter-service/Dockerfile:6-19` |
| Cloud Run cold start delayed downloads | Ping converter and prefetch templates on page load; the print date is still computed at click time | `documentGenerator.js:77-97` |
| Injecting a QR into an arbitrary Word template | Template author inserts a placeholder image with alt text `qr-verifikasi`; code rewrites the image relationship in document/header/footer parts and registers PNG content type; fails closed if no placeholder, because the placeholder is a real QR to the homepage | `src/utils/qrVerifikasi.js:50-82` |
| Printed letter could disagree with the server snapshot (admin edited but did not save) | Client compares printed fields with the snapshot returned by `terbitkanVerifikasi` and refuses to print on mismatch | `qrVerifikasi.js:24-43` |
| Concurrent number assignment by two admins | Firestore transaction reads the registry doc before writing | `nomorSuratDb.js:45-69` |
| Counter stored as text ("5") produced number 51 | `Number()` coercion; later counter removed entirely | `CHANGELOG.md:123`, `nomorSuratDb.js:26` |
| Template tag typos broke printing (`{tgl_sidang}}`, `(judul_kp)`) or printed "undefined" (removed tags) | Tags renamed by role; tag inventory maintained in `public/List of Tags.txt` | `CHANGELOG.md:14, 106-110` |
| Legacy room names in student data didn't match the official room list | Fuzzy normalisation + per-room aliases | `ruangBooking.js:24-35` |
| Firestore batch limit (500 ops) during room import | Chunk at 400 ops | `useJadwalRuang.js:15-23` |
| `scp -r` from Windows OpenSSH created dirs with mode 707; LiteSpeed (group `nobody`) returned 404 for the whole site | Deploy script runs `chmod 755` on every directory after copy | `DEPLOY.md:131-189`, `scripts/deploy-cpanel.mjs:26-32` |
| Production host (cPanel) has no `/api` rewrites | Public verification page calls the function's `cloudfunctions.net` URL with CORS | `src/pages/VerifikasiSurat.jsx:5-11` |
| Migrating accounts from plaintext passwords to Firebase Auth without forcing resets | One-off Admin SDK script; placeholder emails + `mustChangePassword` where no email was known | `functions/migrate.js` |

---

## 5. Novel or interesting parts (candidates for contribution claims)

Ranked by how much is genuinely specific to this system. Novelty against literature is not
established here; that needs a related-work search.

### 5.1 A workflow state machine enforced in Firestore Security Rules
For non-admin writers, the rules check *transitions*, not just ownership: field whitelists,
stage moves allowed only as a consequence of specific uploads (`tahapMhsAman`,
`firestore.rules:170-185`), schedule proposals only for the currently active event and never
after staff lock it (`:191-219`), extension requests once and only before the admin letter
exists (`:232-246`), a "needs correction" state that blocks submissions (`:259-271`),
append-only logs (`:107-113`), and creation constraints that check open periods, active
cohorts/lecturers and auto-computed dates (`:298-335`). Design principle recorded in comments:
"the app is not the only entry point" (`:38-46`). This is a concrete, sizeable example
(467 lines) of using a BaaS rules language as a declarative validation layer for a
multi-actor administrative workflow without an API server. In production the paths actually
exercised are those of KP and Magang/MKT; the schedule-proposal rules are exercised only by
the Magang/MKT Expo, since the seminar/defence events belong to programs not yet released.

### 5.2 Database-enforced uniqueness and archival re-application without a server
Deterministic IDs + marker collection + numbered successor IDs validated by rules
(`firestore.rules:303-317`, `:354-366`) give "one *open* application per program" while
keeping closed applications as immutable archives (`:342-349`).

### 5.3 Version-aware QR verification of printed letters
- Token per (application, letter type, letter number, printed content), reused for identical
  reprints (`verifikasiSurat.js:135-162`).
- Three verdicts computed at scan time: valid; **authentic but outdated** (printed data differs
  from current record, with the change date from a trigger); invalid (number ended or
  application closed) (`:167-199`; UI `VerifikasiSurat.jsx:55-56`).
- Outdated detection is suppressed while student edits are pending verification, so
  unverified values never surface publicly (`:71-79`).
- The issuing function applies the same download permissions as the UI (`:39-60`), and the
  client refuses to print if its content differs from the server snapshot
  (`qrVerifikasi.js:24-43`).
- Works with staff-maintained Word templates via an alt-text image placeholder
  (`qrVerifikasi.js:50-82`).
Paper framing: lightweight document authenticity *and currency* for institutions that cannot
deploy digital signatures **[INFERRED framing]**.

### 5.4 Keeping printed artifacts consistent with mutable records
Combination of (a) post-verification change tracking that merges and cancels edits
(`helpers.js:1062-1087`), (b) download locks (`:1112`), (c) re-upload requests for signed
copies made before the change (`:1089-1103`), (d) extension periods printed from history
(`perpanjangan.js`), and (e) the QR "outdated" verdict. Together these address the gap
between a database record and paper copies already in circulation.

### 5.5 Template-as-source-of-truth document pipeline
Non-developers edit `.docx` letters; code only maps tags (`List of Tags.txt`, 404 lines,
documents every tag). Browser-side fill + stateless converter + graceful fallback.
Measurable properties could be reported (see §6).

### 5.6 Smaller items
- Verification status redefined as an admin work queue (§3.6).
- Room module with explicit host boundary and public embed that strips personal data (§3.15–16).
- Import of the university timetable with per-row status flags before commit
  (`jadwalKuliahRekap.js:11-19`).
- Lecturer workload split into three roles (supervisor; examiner 1, the TA chair examiner;
  examiner 2, the TA member examiner), each broken down by program, shown as a horizontal
  stacked-bar chart or a table (`src/utils/helpers.js:225`, `src/pages/dosen/BebanDosen.jsx:29`).
  Program colors were checked for colour-vision separation against the card surface in both
  themes [INFERRED from the validation note in `styles.css`; no automated test]. In production
  only the supervisor view has data; examiners exist only in the programs not yet released.

---

## 6. Evaluation: what exists

**Automated tests: none.** There is no test framework, no `test` script in `package.json`,
and no `*.test.*`/`*.spec.*` file outside `node_modules`. There are no Firestore rules unit
tests; developer notes from 2026-10-08 state the hardened rules were not emulator-tested at
that time **[INFERRED that this is still true]**. `functions/package.json` defines an emulator
script (`serve`) that could host such tests.

**Scripts that check things:**
- `test_firebase.mjs`: connectivity smoke test (writes one doc).
- `functions/migrate-slot-pengajuan.js`: dry-run mode reports duplicate (nim, program) pairs
  and missing markers before writing (`--tulis` to apply). A data-integrity audit, not a test.

**Manual verification records.** `CHANGELOG.md` (385 lines, Indonesian) documents each change
and its deploy order; it is the main evidence of iterative, user-driven refinement. Developer
notes (outside the repo) record one measurement of the converter: a real template converted
in about 3.6 s round trip, ~190 KB PDF. Treat as anecdotal; re-measure before citing.

**No usage metrics, logs analysis, user study or performance benchmarks exist in the repo.**
`auditLog` captures account-management actions only (`functions/index.js:36-38`).

**Descriptive numbers you can cite (measured 2026-10-19):**
- ~16,100 lines across JS/JSX/CSS/rules (tracked + untracked, excluding `node_modules`);
  largest: `src/utils/helpers.js` 1,209; `src/App.jsx` 757; `firestore.rules` 467;
  `functions/index.js` 477; `functions/verifikasiSurat.js` 204.
- 33 `.docx` templates in `public/doc-templates/` (KP 11, Magang 14, TA 8), of which 6 are
  marked "(not used)" or "(WiP)" in the file name. `getTemplateConfig` handles 19 document
  types (`documentGenerator.js:140-516`): 13 in production (KP 7, Magang/MKT 6, each Magang
  type with separate Magang and MKT templates) and 6 for TA, which is not ready.
- 33 commits on 22 distinct days, 2026-07-27 to 2026-10-15 (`git log`).

**Evaluation that could be done** **[INFERRED suggestions]**: rules unit tests on the emulator
(attack scenarios: self-verification, stage skipping, editing locked schedules); converter
latency/cold-start distribution; template fidelity (PDF vs Word rendering diff); admin time per
application before/after; QR scan outcomes; counts of applications/letters from Firestore
exports.

---

## 7. Limitations and known issues

**Security / privacy**
- `loginIndex` is publicly readable by ID, so a known NIM/NIP reveals the account's email
  (`firestore.rules:426-429`).
- Temporary passwords use `Math.random`, not a cryptographic RNG (`functions/index.js:13-18`).
- Session limits (§3.19): the idle timeout and "all tabs closed" are enforced only in the browser;
  only the 12-hour maximum is also in the rules. Cloud Functions callables do not check
  `auth_time`, so an older token could still call them until it expires (at most one hour after
  its last refresh) **[INFERRED]**. A browser that restores tabs on restart keeps the session,
  since restored tabs carry their `sessionStorage`. When the rules are first deployed, sessions
  older than 12 hours lose access immediately, and every user is signed out once when first
  opening the new app version.
- The PDF converter is unauthenticated; CORS restricts browsers, not other clients
  (`converter-service/server.js:16-22`). Abuse/cost exposure **[INFERRED]**.
- Storage rules' `isAdmin()` checks only the role claim, not the `isActive` flag that
  Firestore rules check (`storage.rules:17` vs `firestore.rules:25-28`), so a deactivated
  admin keeps Storage access while the claim persists **[INFERRED consequence]**.
- The restriction of the Firebase domains to super admin/test accounts is client-side only,
  as the code states (`src/utils/domainAccess.js:1-4`).
- Public verification reveals name, NIM, title and period to anyone holding the QR (by design).

**Consistency / concurrency**
- Application documents are written whole with `setDoc`; there is no version check, so two
  admins (or admin + student) editing one record concurrently is last-writer-wins
  **[INFERRED from `App.jsx:66-76`]**. Only the number registry uses a transaction.
- Workflow logic is duplicated between `helpers.js` and `firestore.rules` and kept in sync by
  hand.
- Some time checks rely on the client clock: number month validation uses the admin's device
  clock (`nomorSurat.js:51-59`, `DEPLOY.md:87`).
- Storage files for deleted students are removed by the client, not the server
  (`functions/index.js:303-308`); a failed client run would leave files **[INFERRED]**.

**Scope / completeness**
- Only KP and Magang/MKT are production-ready. TA, Capstone and Tesis S2 are not ready and
  are released only in the experimental build (`config.js:24-29`); see "Maturity" in §1 for
  what is missing in each.
- Admin screens in the production build still offer all five programs (§1 caveat), so staff
  could create records for programs that are not ready.
- In the production build the KP/Magang supervisor assignment letter shows as available once a
  supervisor is assigned, without waiting for a letter number (`helpers.js:634-635`). For KP
  it carries a QR, and the QR step refuses to print until a number is recorded
  (`functions/verifikasiSurat.js:116-120`), so the student sees an available letter that
  fails with a message **[INFERRED from reading both paths, not run]**.
- QR verification covers three KP letters only (`verifikasiSurat.js:24-28`); Magang/TA pending.
- Program-schedule → room-booking sync covers Magang/MKT Expo only (`sinkronRuang.js:12-14`).
  The sync deletes a program booking only when its student is loaded in the admin session;
  bookings of deleted students are removed explicitly on delete
  (`sinkronRuang.js:58-61`, `data/useJadwalRuang.js:63-68`).
- Admin loading is bounded, not paginated (§3.18): closed (Ditutup) applications from old
  periods still load by default, `akun`/`dosen` are still loaded whole, and the first admin
  session after the change reads the whole `mahasiswa` collection once to fill
  `daftarPeriode` (`useMahasiswaAdmin.js:116-123`). The nomor-surat duplicate checks in the edit
  form that scan loaded records (`urutTerpakaiDiRecord`, `pemakaiNomorLain`) see only loaded
  records; the registry transaction remains the authority (`nomorSuratDb.js:38-70`).
- The "Semua periode" archive table is less capable than per-period views: name/NIM prefix
  search only, four sort orders, a deadline filter that cannot combine with search, No. as row
  position rather than a fixed number, and refresh returns to page 1. Each filter/sort
  combination relies on the 76 composite indexes in `firestore.indexes.json` (index merging is
  assumed for multi-filter queries); a combination without an index fails with a message
  instead of results. Verified live on 2026-10-22 for: program alone; + status; + status and
  cohort; + lecturer; + verification with deadline sort; name/NIM prefix search; status "lewat";
  stage sort descending. Other combinations rely on the same merging **[INFERRED]**.
- `indeksMahasiswa` and `statistik/lulus` are maintained by a trigger, so they lag writes by
  seconds, and at-least-once trigger delivery can drift the counters; `migrate-indeks-arsip.js
  --tulis` rebuilds both. Nothing works until the trigger, rules and indexes are deployed and
  the script has run once.
- "Surat Keterangan Selesai Pembukuan" has no template yet; it shows "template not available"
  (`helpers.js:670-677`).
- `getTemplateConfig` references `TA/persetujuan-dosbing.docx` (`documentGenerator.js:393`),
  but the file on disk is `persetujuan-dosbing (WiP).docx`; that download would fail
  **[INFERRED: path mismatch observed, not run]**.
- Lecturer and admin views are not optimised for mobile (`CHANGELOG.md:228`).
- UI and notifications are Indonesian only; notifications are WhatsApp/email links composed
  for staff to send manually, not automated messages (`helpers.js:467-495`).

**Operations**
- One Firebase project for development and production; local runs write to live data
  (`DEPLOY.md:68-69`).
- Two deploy targets with different capabilities (cPanel has no rewrites/functions routing);
  cPanel deploys never delete stale hashed assets (`DEPLOY.md:123-129`).
- The legacy `sistem_ta/global_state` document is still in Firestore, unused
  (`CHANGELOG.md:340`).
- Some changes required ordered multi-step deploys (functions → app → migration → rules);
  mismatched versions reject each other's writes (`CHANGELOG.md:149, 177`).

---

## 8. File map (claim → code)

### Client entry and shell
| File | Implements |
|---|---|
| `main.jsx` | Entry; routes `/verifikasi/{token}` to the public page outside the app |
| `src/App.jsx` | Auth session, role-based listeners, `writeDoc` guard, save/delete orchestration, `slotPengajuan` upkeep, domain gate |
| `src/utils/useMahasiswaAdmin.js` | Admin's windowed `mahasiswa` listeners, on-demand periods, `daftarPeriode` upkeep |
| `src/utils/rute.js`, `src/pages/mahasiswa/useFilterMahasiswa.js` | Hand-written router (path/query, push vs replace, Back guard); student-table view state in the query |
| `src/pages/mahasiswa/useArsipMahasiswa.js`, `ArsipKontrol.jsx`, `src/utils/ringkasLulus.js` | "Semua periode" archive table (cursor paging over `indeksMahasiswa`), its notices/paging UI, graduated totals for Dashboard/Dosen |
| `functions/indeksArsip.js`, `functions/migrate-indeks-arsip.js`, `firestore.indexes.json` | Trigger maintaining `indeksMahasiswa` + `statistik/lulus`, rebuild script, composite indexes |
| `src/utils/firebase.js` | Firebase SDK init |
| `src/utils/config.js`, `.env.prod`, `.env.full`, `vite.config.ts` | Build scopes (prod vs full), feature flags, two Vite entries |
| `src/utils/domainAccess.js` | Soft restriction of Firebase domains |

### Identity and accounts
| File | Implements |
|---|---|
| `src/utils/auth.js` | NIM/NIP login via `loginIndex`, registration with rollback, password change, callable wrappers |
| `src/utils/sesi.js`, `src/components/PeringatanSesi.jsx` | Session limits: last-tab check, shared idle timer per role, 12-hour maximum, one-minute warning |
| `functions/index.js:40-437` | Claims, registration, admin/lecturer creation, resets, super admin, deletes, NIM change, audit log |
| `functions/migrate.js` | One-off migration to Firebase Auth |
| `src/pages/Login.jsx`, `src/pages/portal/AkunForm.jsx`, `src/pages/pengaturan/SeksiAkun.jsx`, `SeksiStaf.jsx` | Account UIs |

### Workflow logic and enforcement
| File | Implements |
|---|---|
| `src/utils/helpers.js` | Programs/stages, verification semantics, document catalog (`KP_DOKUMEN`, `MAGANG_DOKUMEN`, `MKT_DOKUMEN`, `TA_DOKUMEN`), schedule archive, clash detection, change tracking, download locks, activity log |
| `firestore.rules` | Server-side validation of every student write; creation constraints; uniqueness; collection access |
| `storage.rules` | Upload permissions, PDF ≤25 MB, admin-only document keys |
| `src/utils/perpanjangan.js` | Extension periods and approval patch |
| `src/utils/formPendaftaran.js`, `src/utils/pilihan.js` | Registration field catalogue and admin overrides; option lists |
| `functions/migrate-slot-pengajuan.js` | Backfill/audit of uniqueness markers |
| `src/pages/Portal.jsx`, `src/pages/portal/*` | Student actions (register, upload, company-letter confirmation, schedule proposal, extension, documents page, change notice) |
| `src/pages/Mahasiswa.jsx`, `src/pages/mahasiswa/*` | Admin table and edit modal (stages, verification, numbers, extensions, closure, change banner, workload mini-charts) |
| `src/pages/DosenPortal.jsx`, `src/pages/Dosen.jsx`, `src/pages/Dashboard.jsx` | Lecturer view, lecturer table, statistics/workload |

### Letters, numbering, verification
| File | Implements |
|---|---|
| `src/utils/documentGenerator.js` | Template selection and tag payloads, fill, QR hook, PDF conversion with fallback, warm-up |
| `public/doc-templates/**` | Word templates (staff-edited) |
| `public/List of Tags.txt` | Tag inventory and template notes |
| `converter-service/server.js`, `Dockerfile` | Cloud Run docx→PDF |
| `src/utils/nomorSurat.js` | Number format, parsing, month checks, extension rules, review flag |
| `src/utils/nomorSuratDb.js` | Registry transaction, next-number suggestion |
| `src/pages/mahasiswa/NomorSuratPanel.jsx`, `src/pages/pengaturan/SeksiNomorSurat.jsx` | Number UI and registry view |
| `src/utils/qrVerifikasi.js` | Token request, content cross-check, QR render, OOXML image swap |
| `functions/verifikasiSurat.js` | Token issuing, change trigger, public verdict endpoint |
| `src/pages/VerifikasiSurat.jsx` | Public verification page |
| `src/components/kpDocuments.jsx`, `src/pages/portal/HalamanDokumen.jsx` | Document panels (admin/student) |
| `src/utils/fileUpload.js` | Upload to Storage, PDF/size checks, cleanup |

### Room scheduling module
| File | Implements |
|---|---|
| `src/modules/ruang/README.md` | Boundary rules, API, data, extraction steps |
| `src/modules/ruang/host.js`, `index.js` | The only inbound/outbound boundary |
| `logic/ruangBooking.js` | Booking model, clash detection, import/change planning |
| `logic/jadwalRuang.js`, `logic/jadwalKuliahRekap.js` | Excel parsers (department grid; central timetable) |
| `logic/sinkronRuang.js` | Confirmed program events → bookings |
| `data/useJadwalRuang.js` | Firestore listeners and batched writes |
| `embed/ruang.html`, `embed/ruang.jsx`, `functions/index.js:439-471` | Public embed and API |

### Configuration and operations
| File | Implements |
|---|---|
| `firebase.json`, `.firebaserc` | Hosting, rewrites (`/api/ruang`), functions, rules targets |
| `scripts/deploy-cpanel.mjs`, `DEPLOY.md` | cPanel deploy with permission fix; deploy guide |
| `CHANGELOG.md` | Dated design history (Indonesian), primary source for §3–4 |
| `src/pages/Pengaturan.jsx`, `src/pages/pengaturan/*` | Admin settings: periods, cohorts, form/content editors with draft-and-publish, announcements, guides |
| `src/data/seed.js` | Empty defaults for `config/global` on a fresh project |
| `migrate_firebase.mjs`, `test_firebase.mjs` | One-off legacy scripts |

---

## Changelog

Dated entries for changes that affect architecture, design decisions, features or evaluation.
Each entry says what changed, why, and which sections above it likely affects. Sections above
always describe the current system; this list is the only place for history.

### 2026-10-19
- **What:** First version of this document, written from the code at commit `47ade92` plus
  uncommitted working-tree changes (QR letter verification for KP, Lembar Pengesahan Proposal
  KP, download locks after data changes).
- **Why:** Context for co-authors of the paper.
- **Affects:** all sections.

### 2026-10-19 (2)
- **What:** Made production maturity explicit. Only KP and Magang/MKT are production-ready;
  TA, Capstone and Tesis S2 are not ready and exist only in the experimental build. Added a
  "Maturity" table to §1, scoped feature descriptions to the production programs, recast the
  build scope as the release gate (§3.14), qualified §5.1 and §5.6, split the letter-type
  count by maturity and corrected it from 20 to 19 (§6), and added two production-scope
  limitations (§7).
- **Why:** The first version described all five programs as if equally operational.
- **Affects:** §1, §3.14, §5.1, §5.6, §6, §7; the paper's scope and evaluation claims should
  cover KP and Magang/MKT only.

### 2026-10-19 (3)
- **What:** Removed the client-side data cache and all sample data. The app no longer mirrors
  application data (students, lecturers, accounts) into `localStorage`; it starts empty, loads
  from Firestore listeners, and deletes the old cache key at startup. `src/data/seed.js` now
  holds only empty `config/global` defaults; first-boot seeding no longer writes sample students
  or the (outdated) lecturer list. The obsolete `update_dosen.mjs` script was deleted. A public,
  unused Realtime Database instance holding a copy of the old sample data was flagged for
  deletion in the Firebase console.
- **Why:** The cache persisted personal data and tokenised file URLs on shared computers after
  logout and could briefly show a previous user's data; sample data could reappear if
  `config/global` were ever deleted.
- **Affects:** §1 (setting; seed citations removed), §2.3 (reads), §8 (file map); possibly §7 if
  the paper discusses privacy of client-side data.

### 2026-10-20
- **What:** TA gained a Bimbingan stage between Pendaftaran and Seminar Proposal. Uploading
  the last required Pendaftaran document moves the student to Bimbingan and flags the entry
  for staff, who assign the supervisor; the supervisor assignment letter (ST Pembimbing TA)
  then becomes downloadable. The stage move is also enforced in `firestore.rules`
  (`tahapMhsAman`). A Lembar Pengesahan Proposal TA slot was added (template pending). TA
  examiner 1/2 are labelled Ketua/Anggota Penguji. The lecturer-workload page now separates
  supervisor, examiner 1 and examiner 2, with a chart/table toggle.
- **Why:** Department request to mirror the KP supervision step in TA and to see workload per
  role.
- **Affects:** §1 (TA stage list), §5.1 if TA is discussed as an example of rule-enforced
  stage moves, §5.6 (workload views). TA is still not production-ready.

### 2026-10-21
- **What:** TA registration now records the TA type (regular research vs lecturer project),
  and the required Pendaftaran documents depend on it: document entries carry an optional
  per-student visibility predicate (`tampil` in `TA_DOKUMEN`), and both the client and
  `firestore.rules` compute the required-upload set from the type before allowing the move to
  Bimbingan. The supervisor-approval document was dropped (supervisors are assigned by staff
  only), and the 120-credit check moved from a student self-declaration to a staff checkbox.
- **Why:** Department process change for TA.
- **Affects:** §5.1 if TA's rule-enforced stage move is used as an example (the required set is
  now conditional); otherwise TA remains outside the production scope.

### 2026-10-21 (2)
- **What:** Admins no longer listen to the whole `mahasiswa` collection. The default load is
  every application not yet at Lulus plus the two latest periods in full; picking an older
  period or "Semua periode" loads it on request for the rest of the session. A persistent
  `config/global.daftarPeriode` keeps old periods in the selector. The room-booking sync now
  deletes bookings only for loaded students, and student/account deletion removes their
  bookings and ends their letter numbers explicitly. The nomor-surat registry view loads one
  year at a time (current year by default). Periods are now sorted chronologically, not alphabetically; alphabetical order put every Gasal before every Genap and made a test period the default.
- **Why:** Planning for growth: the admin load grew with the full history of the department.
  Chosen over server-side pagination because statistics and filters run client-side and are
  almost all scoped to one period.
- **Affects:** §2.1 (database row), §2.2 (`config/global`), §2.3 (reads), §3.18 (new
  decision), §7 (limitations of bounded loading), §8 (file map). If the paper discusses
  scalability, this is the current answer and has not been measured.

### 2026-10-21 (3)
- **What:** Admin view state moved into the URL with a small hand-written router
  (`src/utils/rute.js`). Admin tabs are paths, settings sections are `/pengaturan/{section}`,
  and periode, program and all student-table filters, sort, grouping and page are query
  parameters. Page, periode and program changes add history entries; filter and paging changes
  replace the current one. Switching tabs restores that tab's last parameters, and "Kembali"
  from settings returns to the last admin tab. Student/lecturer portals and the edit form are
  unchanged by design (one admin in practice, so per-record links were judged not worth it).
- **Why:** Refresh reset the admin to the Dashboard and latest period, and Back left the app.
  Also prepares the table filters to map onto server-side queries if pagination is ever needed.
- **Affects:** §2.3 (new "Navigation state" paragraph), §2.4 (router row), §8 (file map).

### 2026-10-22
- **What:** "Semua periode" no longer loads the whole `mahasiswa` collection. Its student table
  is a server-paged archive over a new trigger-maintained mirror collection `indeksMahasiswa`
  (cursor paging, `count()`, name/NIM prefix search, four sort orders, default entry date oldest
  first with No. = row position), and Dashboard/Dosen under "Semua periode" add graduated totals
  from a trigger-maintained `statistik/lulus` doc to the loaded non-graduated applications. New
  `onWrite` trigger `jagaIndeksArsip`, rebuild script `migrate-indeks-arsip.js`, admin-read-only
  rules for both collections, and `firestore.indexes.json` (76 composite indexes). Saving or
  deleting a record opened from the archive passes the archive's copy so slot, letter-number and
  file cleanup still work when its period is not loaded.
- **Why:** The full-history load behind "Semua periode" was the remaining admin load that grows
  without bound after the windowed loading change.
- **Affects:** §2.2 (two new collections), §2.3 (reads), §3.18 (revised decision), §7 (archive
  limitations, trigger lag/drift, deploy prerequisites), §8 (file map). Deployed and checked live
  the same day: 125 KP records paged correctly, in the same entry order as the per-period views;
  the graduate summary is deployed but untested with non-zero data (no graduated records yet).

### 2026-10-22 (2)
- **What:** Login sessions are now bounded. One login is shared by all tabs and ends when the
  last app tab closes, after a role-specific idle period (admin 30 min, lecturer 60, student
  120), or 12 hours after sign-in; a one-minute warning precedes the timed endings and the login
  page states the reason. The "Ingat saya" option was removed. `isSignedIn()` in
  `firestore.rules` and `storage.rules` now rejects tokens older than 12 hours.
- **Why:** Sessions previously never expired (users stayed signed in into the next day), which
  matters on shared office computers holding all students' data.
- **Affects:** §3.19 (new decision), §7 (security limitations), §8 (file map). Verified in the
  browser with shortened limits; the rules change is not yet deployed.

### 2026-10-23
- **What:** KP deadline tracking separated from the student-entered company period. New
  admin-written fields `mulaiProgram` / `batasProgram` on `mahasiswa/{id}` hold a 4-month
  program window anchored to the first recorded letter number, extended by approved
  extensions. Status badges, deadline filters (via the index mirror), the "needs review" flag,
  the extension base and the KP extension letter use it. One-off migration script
  `functions/migrate-jendela-program.js`.
- **Why:** Students enter only their fieldwork period (often one month), so the app flagged
  students as overdue while they were still within the program.
- **Affects:** §2.2 (new fields on `mahasiswa`), §3 decision 13, §5.4 if deadlines are discussed,
  §6 if the paper reports deadline accuracy.

### 2026-10-23 (2)
- **What:** The KP program window now starts at a staff-confirmed assignment-letter date instead
  of the moment a number is saved. Staff confirm the fieldwork start from the company reply,
  accept or adjust a default letter date (fieldwork start minus one month), then draw a number
  dated in that month, which may be a future month. The letter prints that date.
- **Why:** Staff draw numbers early so they are not forgotten, which started the 4-month clock
  months before fieldwork; tying the clock to the letter date keeps paper, registry and deadline
  consistent with the KP handbook.
- **Affects:** §3 decision 13; §5.4 (printed artifacts consistent with records).

### 2026-10-23 (3)
- **What:** The student-write rule (`perubahanMhsAman`, `firestore.rules:298-320`) now runs each
  sub-check only when the fields it inspects are among the changed keys.
- **Why:** A student deleting the company reply letter (which also moves the stage back to
  Pendaftaran) was refused as "Missing or insufficient permissions". The Rules Playground showed
  the real cause: the request hit Firestore's limit of 1000 evaluated expressions. Skipped
  sub-checks are ones that are trivially true when their fields are unchanged.
- **Affects:** §4 (new challenge row); §5.1 and §7 if the paper discusses the cost limits of
  rules as a validation layer.

### 2026-10-23 (4)
- **What:** The letter-number sequence now restarts every month instead of every calendar year.
  Registry IDs change from `{year}-{seq}` to `{year}-{month}-{seq}`; next-number suggestion,
  duplicate checks and sorting work per month. Existing registry entries, and the student and
  QR-verification records pointing at them, are renamed by `functions/migrate-nomor-bulanan.js`.
- **Why:** The faculty format allows three digits. At full adoption (≈800 students, four or
  five programs each) yearly volume approaches 999; a monthly sequence gives 999 per month
  without changing the printed format, since the month numeral already distinguishes letters.
- **Affects:** §2.2 (registry key), §3 decision 8, §4 if numbering capacity is discussed.

### 2026-10-23 (5)
- **What:** A KP record now remembers which company reply letter its assignment-letter number was
  issued for (`suratBalasanNomor`, admin-only). If the student deletes or replaces that letter
  afterwards, the staff number panel reopens with a notice to re-confirm the date and draw a new
  number (`suratBalasanBerganti`, `src/utils/nomorSurat.js`); the old number expires on save.
  The supervising lecturer is kept.
- **Why:** A new company letter usually moves the fieldwork dates and therefore the assignment
  letter date; previously the panel stayed locked on the old number and nothing prompted staff.
  With monthly sequences, spending a number per re-issue is cheap, and expiring the old one makes
  the superseded paper fail QR verification.
- **Affects:** §2.2 (new admin-only field on `mahasiswa`), §3 decision 8 / 13, §5.4.

### 2026-10-23 (6)
- **What:** The KP assignment letter now prints the program window (letter date to +3 months,
  `periodeSuratTugasKP` in `src/utils/perpanjangan.js`) instead of the fieldwork dates from the
  company letter; the QR server computes the same period (`functions/verifikasiSurat.js`).
- **Why:** Printing fieldwork dates made the letter disagree with the deadline the system
  enforces. The window itself was cut from 4 to 3 months: the department confirmed the
  handbook's 4-month limit includes the single one-month extension, which matches the template's fixed
  "3 (tiga) bulan".
- **Affects:** §5.4 (printed artifacts consistent with records), §3 decision 13.

### 2026-10-23 (7)
- **What:** User-facing Cloud Functions (all callables, `jadwalRuangPublik`, `verifikasiSuratPublik`)
  are pinned to `asia-southeast2` via `functions/region.js`; the client calls them with
  `getFunctions(app, 'asia-southeast2')` (`src/utils/firebase.js:34`), the verification page uses the
  regional URL, and the `/api/ruang` rewrite names the region (`firebase.json`). Background triggers
  (`onUserCreate`, `jagaIndeksArsip`, `catatPerubahanDataSurat`) stay in `us-central1`.
- **Why:** Functions had no region, so they ran in `us-central1` while Firestore is in
  `asia-southeast2`: every callable crossed the Pacific, and each Firestore call inside it crossed
  back. Triggers were left because they are not on a user's critical path and a duplicate
  `jagaIndeksArsip` during cutover would double-count `statistik/lulus` (`FieldValue.increment`).
- **Affects:** §2.1 architecture diagram, §5.4 (public verification), any latency or deployment
  discussion. The latency gain is [INFERRED] from region distance; not measured.
