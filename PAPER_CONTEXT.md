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
program has its own stage sequence (`src/utils/helpers.js:11-63`):

- In production:
  - KP: Pendaftaran → Bimbingan → Pembukuan → Lulus
  - MG (Magang and its variant MKT): Pendaftaran → Bimbingan → Expo → Lulus
- In development, not ready:
  - TA: Pendaftaran → Seminar Proposal → Seminar Hasil → Sidang → Lulus
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
(`src/pages/Mahasiswa.jsx:274`, `src/pages/mahasiswa/FormMahasiswaKP.jsx:86`), as the scope
comment says (`config.js:9-11`). For the paper, the evaluated system is KP + Magang/MKT; the
other three programs are future work **[INFERRED framing, confirm with the authors]**.

**Users.**
- Students: self-register, submit applications, download generated letters, upload signed
  scans, propose schedules, request extensions (`src/pages/Portal.jsx`, `src/pages/portal/`).
- Lecturers: read-only view of students they supervise/examine (`src/pages/DosenPortal.jsx`;
  rules comment `firestore.rules:337`).
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
 Firebase project "simantap-tl"                     Cloud Functions (HTTP, public, CORS *)
 ├─ Authentication (email+password, custom claims)  ├─ verifikasiSuratPublik
 ├─ Firestore (per-entity collections, Security     └─ jadwalRuangPublik  (/api/ruang)
 │   Rules = server-side validation)
 ├─ Storage (uploads/{applicationId}/..., rules)    Cloud Functions (callable, authenticated)
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
| Database | Cloud Firestore, real-time listeners (`onSnapshot`) | `src/App.jsx:237-313` |
| Authorization / validation | Firestore & Storage Security Rules | `firestore.rules` (467 lines), `storage.rules` |
| Server logic | Cloud Functions v1, Node 20 | `functions/index.js`, `functions/verifikasiSurat.js` |
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
| `mahasiswa/{id}` | `{nim}_{program}` (or `_2`, `_3` after closure) | One application: form data, stage, verification state, lecturers, schedule per event, uploads, extension, activity log, change-tracking | admin; student (whitelisted fields only) |
| `slotPengajuan/{nim}_{program}` | uniqueness marker | Points to the doc holding (nim, program) when its ID is not the canonical one | admin, functions, migration script |
| `akun/{nim}` | student account profile | `uid, email, isActive, mustChangePassword` | admin, functions; student only clears `mustChangePassword` |
| `dosen/{kode}` | lecturer profile | | admin |
| `admin/{uid}` | admin profile | | functions only |
| `loginIndex/{nim|nip|email}` | identifier → email | | functions only; public `get` |
| `auditLog/*` | account actions | | functions only |
| `config/global` | open periods, announcements, guides, admin-editable content/form text | | admin; public read |
| `angkatan/*` | cohort years (archived, never deleted) | | admin |
| `nomorSurat/{year-seq}` | letter-number registry | never deleted | admin |
| `verifikasiSurat/{token}` | QR verification records | | functions only, no client access |
| `dataSuratDiubah/{applicationId}` | timestamp of last change to printed fields | | trigger only |
| `ruang`, `semesterRuang`, `booking` | room module | | admin; non-admins read only published |

Uploads live at `uploads/{applicationId}/{docKey}/{timestamp}-{name}` in Storage; Firestore
holds only `{fileName, size, url, path, uploadedAt}` (`src/utils/fileUpload.js:15-37`).

### 2.3 Data flows

**Reads.** Each role subscribes with queries that match the rules exactly: admins listen to
whole collections; students to `where('owner','==', nim)`; lecturers to four queries
(`pembimbing1|pembimbing2|penguji1|penguji2 == kode`) merged client-side
(`src/App.jsx:237-270`). The client keeps no copy of application data in browser storage:
state starts empty and fills from these listeners, and a leftover cache from earlier versions
is deleted at startup (`src/App.jsx:42-45`). Browser storage holds only UI preferences (theme,
text size, sidebar, hidden table columns). A fresh project is initialised with an empty
`config/global` only; there is no sample data (`src/App.jsx:83-90`, `src/data/seed.js`).

**Writes.** The client computes the full next state of an application (workflow logic in
`src/utils/helpers.js`) and writes the whole document with `setDoc`, after a 900 KB size guard
(`src/App.jsx:54-63`). Firestore Security Rules then re-validate the *diff* between old and new
document for non-admins (`firestore.rules:278-296`). Side effects on save: archive replaced
schedules (`arsipkanJadwal`, `helpers.js:373`), delete orphaned Storage files
(`orphanedUploadPaths`, `helpers.js:956`), maintain `slotPengajuan` (`App.jsx:352-377`).

**Letter generation.** Click "Unduh" → `getTemplateConfig(docType, record, lecturers)` picks a
template and builds the tag payload (`documentGenerator.js:125`) → for QR letters, call
`terbitkanVerifikasi`, compare server snapshot with what will be printed, render QR PNG →
fetch `/doc-templates/*.docx` → docxtemplater fills tags → swap QR placeholder image in the
OOXML package → POST to Cloud Run `/convert` → save PDF, or fall back to the `.docx` if
conversion fails (`documentGenerator.js:40-113`). Some letters (signature pages students must
complete) intentionally download as editable `.docx` (`docx: true`, e.g. `:281-309`).

**Verification scan.** QR → `https://simantaptlundip.com/verifikasi/{token}` → `main.jsx`
renders `VerifikasiSurat` outside the authenticated app → fetches
`verifikasiSuratPublik?t=token` on the `cloudfunctions.net` URL → verdict
(`src/pages/VerifikasiSurat.jsx:10`, `functions/verifikasiSurat.js:167-204`).

### 2.4 Why each technology (stated in code/docs vs. inferred)

| Choice | Rationale | Source |
|---|---|---|
| Firebase (BaaS) | Inherited from the predecessor; no dedicated backend server **[INFERRED]** that a small department team can avoid running servers | `migrate_firebase.mjs` |
| Firestore per-entity collections | Single 1 MiB document caused data loss; per-doc writes only touch what changed | `CHANGELOG.md:336-340`, `App.jsx:46-51` |
| Firebase Auth + custom claims | Replace plaintext/shared passwords; roles in token so the client cannot set its own role; `nim`/`kode` in token so rules for list queries need no per-document `get()` | `functions/index.js:88-92`, `firestore.rules:5-13` |
| Security Rules as the validation layer | No API server; "what the UI cannot do, the database must reject" | `firestore.rules:38-50`, `CHANGELOG.md:176-178` |
| Firebase Storage | Remove base64 files from documents | `CHANGELOG.md:342-346` |
| Word templates + docxtemplater | Staff edit letter layouts in Word themselves; templates are the single source of truth; tags are the only coupling to code | `public/List of Tags.txt`, `documentGenerator.js:8-13` |
| LibreOffice on Cloud Run | Convert the same `.docx` to PDF rather than maintain a second PDF layout; `libreoffice-writer` only to shrink image/cold start | `converter-service/Dockerfile:3-10` |
| React without router/state libs | Small app; path-based routing by hand, Hosting rewrites all paths to `index.html` | `App.jsx:194-210` |
| SheetJS from CDN, lazily | Only needed for import/export **[INFERRED]** to keep bundle small | `exportUtils.js:71-80` |
| Two static hosts | Production on the department's cPanel domain; Firebase Hosting for experimental build and Hosting-only features (rewrites) | `DEPLOY.md:1-7`, `DEPLOY.md:92-112` |

---

## 3. Key design decisions and trade-offs

Each item lists the alternative that was tried or considered and why it lost.

1. **Per-entity documents instead of one global document.** Alternative (the predecessor's
   design) hit the 1 MiB limit and lost data. Trade-off: one application = one document; a
   student in two programs has two documents linked by `owner` (`App.jsx:224-228`). The old
   global document is left orphaned, not deleted (`CHANGELOG.md:340`).

2. **Client-side business logic + declarative server-side re-validation.** The client builds
   the next state; rules check field whitelists, allowed transitions and preconditions
   (`firestore.rules:278-296`). Alternative: a Cloud Function per user action. Not chosen
   **[INFERRED]**: would duplicate the client logic anyway and add latency/cold starts. Cost:
   the same rule is written twice (JS in `helpers.js`, rules language in `firestore.rules`) and
   comments in both files cross-reference each other to keep them in sync (e.g.
   `helpers.js:281-287` ↔ `firestore.rules:259-271`).

3. **Roles and identifiers in token claims, not looked up per document.** Firestore evaluates
   list queries against the query, not each document, so rules for collection listeners may
   only use request-constant values (`firestore.rules:5-13`). Claims are set only by Admin SDK
   in functions (`functions/index.js:1-4`). Active/deactivated status is still checked with one
   `get()` per request so deactivation takes effect immediately (`firestore.rules:20-31`).

4. **Login by NIM/NIP while Auth is email-based.** A public, get-only `loginIndex` maps
   identifier → email before sign-in (`src/utils/auth.js:15-33`, `firestore.rules:404-408`).
   Trade-off: anyone who knows a NIM/NIP can learn the associated email (no listing).

5. **One open application per (student, program), enforced by the database.** Deterministic
   ID `{nim}_{program}`; legacy/admin-created/renamed documents are covered by marker docs in
   `slotPengajuan`; a closed application allows a re-application with ID `_2`, `_3`, … only if
   the previous one exists and is closed (`firestore.rules:298-312`, `helpers.js:241-251`).
   Alternative "Akhiri & daftar ulang" (reset the same document) was removed because it
   destroyed history; closing keeps an immutable archive (`CHANGELOG.md:54, 68-73`). Document
   IDs are not renamed on NIM change because Storage paths use the ID
   (`functions/index.js:410-420`).

6. **Verification status as the admin's work queue.** Only submissions that need staff action
   reset status to "awaiting verification" (`tandaiMenungguVerifikasi`, `helpers.js:271-294`;
   enforced by `ditandaiMenunggu`, `firestore.rules:247-258`). Feature access depends on
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
   sequence per calendar year across programs (`src/utils/nomorSurat.js:7-13`); registry docs
   `nomorSurat/{year-seq}` are never deleted so ended numbers are never reused
   (`firestore.rules:438-446`). Recording happens in a transaction that rejects a number held
   by another student or already ended (`src/utils/nomorSuratDb.js:37-69`). History of
   alternatives in `CHANGELOG.md:112-124, 201-206`: (a) fully automatic read-only issuing —
   replaced so staff can still type numbers; (b) a counter collection — dropped in favour of
   computing the smallest unused number from the registry (`nomorSuratDb.js:21-30`); (c)
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
    (`fileUpload.js:15-22`, `storage.rules:36-40`).

12. **Admin-editable form text, code-defined fields.** Admins can change labels, hints,
    placeholders, required flags and order of registration fields per program, stored in
    `config/global`, but cannot add/remove fields because fields are bound to template tags
    (`src/utils/formPendaftaran.js:3-11`, `CHANGELOG.md:216-222`). Dropdown options are
    deactivated, never deleted, so old records keep their labels (`CHANGELOG.md:219`).

13. **Extension letters print from an approval history, not the current deadline.** Otherwise
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

---

## 4. Implementation challenges and solutions

| Challenge | Solution | Where |
|---|---|---|
| Uploads vanished: global doc > 1 MiB, write failed, real-time sync reverted the optimistic update | Per-entity collections, files to Storage, 900 KB pre-write guard | `CHANGELOG.md:330-346`, `App.jsx:54-63` |
| Firestore rules for list queries cannot depend on per-document lookups | Put `nim`/`kode` into custom claims; every client query mirrors a rule (`where(owner == nim)`) | `firestore.rules:5-13`, `functions/index.js:88-92`, `App.jsx:237-270` |
| No OR query across 4 lecturer fields under rules | Four listeners merged and de-duplicated client-side | `App.jsx:251-270` |
| Auth `onCreate` trigger fires late and overwrote admin/lecturer claims with `student` | Trigger skips users that already have a role claim | `functions/index.js:40-59` |
| Failed profile creation left orphan Auth accounts | Delete the just-created Auth user on failure | `src/utils/auth.js:35-47` |
| Bootstrap of first super admin (chicken-and-egg) | Any admin may claim it while none exists; path then locks | `functions/index.js:225-250` |
| NIM change must keep ownership, claims and uniqueness consistent | Batch: move account doc, rewrite `owner/nim` on applications, rebuild `slotPengajuan`, then reset claims | `functions/index.js:347-437` |
| Rule ordering on deletion (Storage rules read the Firestore doc; marker deletion requires doc already gone) | Delete Storage folder before the doc; delete marker after, checked with `existsAfter` | `App.jsx:378-401`, `firestore.rules:359-366` |
| Append-only activity logs in a rules language without loops | Compare prefix slice: new list longer and `new[0:old.size()] == old` | `firestore.rules:107-113` |
| LibreOffice substituted fonts with different metrics, breaking letterhead tables | Install metric-compatible fonts (Liberation, Carlito, Caladea) in the image | `converter-service/Dockerfile:6-19` |
| Cloud Run cold start delayed downloads | Ping converter and prefetch templates on page load; the print date is still computed at click time | `documentGenerator.js:77-97` |
| Injecting a QR into an arbitrary Word template | Template author inserts a placeholder image with alt text `qr-verifikasi`; code rewrites the image relationship in document/header/footer parts and registers PNG content type; fails closed if no placeholder, because the placeholder is a real QR to the homepage | `src/utils/qrVerifikasi.js:50-82` |
| Printed letter could disagree with the server snapshot (admin edited but did not save) | Client compares printed fields with the snapshot returned by `terbitkanVerifikasi` and refuses to print on mismatch | `qrVerifikasi.js:24-43` |
| Concurrent number assignment by two admins | Firestore transaction reads the registry doc before writing | `nomorSuratDb.js:44-68` |
| Counter stored as text ("5") produced number 51 | `Number()` coercion; later counter removed entirely | `CHANGELOG.md:123`, `nomorSuratDb.js:26` |
| Template tag typos broke printing (`{tgl_sidang}}`, `(judul_kp)`) or printed "undefined" (removed tags) | Tags renamed by role; tag inventory maintained in `public/List of Tags.txt` | `CHANGELOG.md:14, 106-110` |
| Legacy room names in student data didn't match the official room list | Fuzzy normalisation + per-room aliases | `ruangBooking.js:24-35` |
| Firestore batch limit (500 ops) during room import | Chunk at 400 ops | `useJadwalRuang.js:15-23` |
| `scp -r` from Windows OpenSSH created dirs with mode 707; LiteSpeed (group `nobody`) returned 404 for the whole site | Deploy script runs `chmod 755` on every directory after copy | `DEPLOY.md:131-189`, `scripts/deploy-cpanel.mjs:26-32` |
| Production host (cPanel) has no `/api` rewrites | Public verification page calls the function's `cloudfunctions.net` URL with CORS | `src/pages/VerifikasiSurat.jsx:5-10` |
| Migrating accounts from plaintext passwords to Firebase Auth without forcing resets | One-off Admin SDK script; placeholder emails + `mustChangePassword` where no email was known | `functions/migrate.js` |

---

## 5. Novel or interesting parts (candidates for contribution claims)

Ranked by how much is genuinely specific to this system. Novelty against literature is not
established here; that needs a related-work search.

### 5.1 A workflow state machine enforced in Firestore Security Rules
For non-admin writers, the rules check *transitions*, not just ownership: field whitelists,
stage moves allowed only as a consequence of specific uploads (`tahapMhsAman`,
`firestore.rules:165-180`), schedule proposals only for the currently active event and never
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
(`firestore.rules:298-312`, `:354-366`) give "one *open* application per program" while
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
- Lecturer-workload views split by role and program (`CHANGELOG.md:126-130`). In production
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
  (`firestore.rules:404-408`).
- Temporary passwords use `Math.random`, not a cryptographic RNG (`functions/index.js:13-18`).
- The PDF converter is unauthenticated; CORS restricts browsers, not other clients
  (`converter-service/server.js:16-22`). Abuse/cost exposure **[INFERRED]**.
- Storage rules' `isAdmin()` checks only the role claim, not the `isActive` flag that
  Firestore rules check (`storage.rules:13` vs `firestore.rules:20-23`), so a deactivated
  admin keeps Storage access while the claim persists **[INFERRED consequence]**.
- The restriction of the Firebase domains to super admin/test accounts is client-side only,
  as the code states (`src/utils/domainAccess.js:1-4`).
- Public verification reveals name, NIM, title and period to anyone holding the QR (by design).

**Consistency / concurrency**
- Application documents are written whole with `setDoc`; there is no version check, so two
  admins (or admin + student) editing one record concurrently is last-writer-wins
  **[INFERRED from `App.jsx:54-63`]**. Only the number registry uses a transaction.
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
| `src/utils/firebase.js` | Firebase SDK init |
| `src/utils/config.js`, `.env.prod`, `.env.full`, `vite.config.ts` | Build scopes (prod vs full), feature flags, two Vite entries |
| `src/utils/domainAccess.js` | Soft restriction of Firebase domains |

### Identity and accounts
| File | Implements |
|---|---|
| `src/utils/auth.js` | NIM/NIP login via `loginIndex`, registration with rollback, password change, callable wrappers |
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
