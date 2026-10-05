# Modul Ruang (Peminjaman / Penggunaan Ruang)

Dipisah dari aplikasi induk supaya suatu saat bisa dipindah ke aplikasi/paket sendiri.
Saat ini tetap berjalan di dalam SIMANTAP.

## Aturan batas

1. Aplikasi induk hanya mengimpor dari `modules/ruang` (`index.js`), tidak dari subfolder.
2. Isi `modules/ruang/**` hanya boleh menyentuh kode induk lewat **`host.js`**.
3. Gaya ada di `ruang.css` (diimpor oleh `index.js`).

## Struktur

| Folder | Isi |
|---|---|
| `logic/` | Logika murni tanpa React/Firestore: booking, bentrok, perubahan jadwal, impor Excel (grid per hari & rekap sistem pusat), tampilan mingguan/bulanan, sinkron program → booking |
| `data/` | `useJadwalRuang` (listener Firestore + aksi tulis) dan `useSinkronProgram` |
| `components/` | Grid harian/mingguan/bulanan, editor booking |
| `admin/` | Layar admin: semester, daftar ruang, impor Excel (`SeksiJadwalRuang`) |
| `portal/` | `PenggunaanRuangPortal` (admin bisa mengedit, mahasiswa hanya melihat) |
| `host.js` | Semua kebutuhan dari luar modul (lihat di bawah) |

## API publik (`index.js`)

- Layar: `PenggunaanRuangPortal`, `SeksiJadwalRuang`
- Hook: `useJadwalRuang(authUser, claims)` → `{ data, aksi }`, `useSinkronProgram({ aktif, mahasiswa, data, aksi })`
- Logika untuk form induk: `opsiRuang`, `periksaUsulanRuang`, `teksBentrokRuang`, `milikProgram`, `EVENT_SINKRON`

## Kontrak dengan aplikasi induk (`host.js`)

- UI: `Modal`, `Field`, `Badge`, `Empty`
- Domain: `formatTanggal`, `todayISO`, `buatId`, `BULAN`, `menitJam`, `beririsan`, `PROGRAMS`, `PROGRAM_KEYS`, `programOf`, `programLabel`, `programDisplayLabel`, `eventsFor`, `durasiEvent`, `jamTambah`, `kumpulkanEvent`
- Infrastruktur: `loadXLSX`, `db` (Firestore), `FITUR_EKSPERIMENTAL`
- Variabel CSS tema: `--border`, `--border-strong`, `--surface`, `--surface-2`, `--text`, `--muted`, `--accent`, `--accent-weak`, `--blue-bg/-text`, `--green-bg/-text`, `--radius-sm`, `--font-heading`; kelas bersama `btn`, `card`, `callout`, `tbl`, `toolbar`, `form-grid`, `field`, `modal*`, `badge*`, `check`, `seg-*`, `hint`, `login-err`.

## Data & keamanan

Koleksi Firestore: `ruang`, `semesterRuang`, `booking` (aturan di `firestore.rules`, blok
"Jadwal ruang"). Non-admin hanya membaca semester `terbit` dan booking ber-flag `terbit: true`;
query klien wajib memuat filter yang cocok. Aturan ini ikut dipindah bersama modul.

Bentuk dokumen: lihat komentar kepala `logic/ruangBooking.js`. Tambahan: `pj: [{kode?, nama, luar?}]`
(maks. 2), dan untuk seminar/sidang `program`, `kegiatan`, `mahasiswa: [{nama, nim?}]`.

## Ketergantungan data dari induk

- Sinkron program membaca `mahasiswa[].jadwal[ev] = { tanggal, jamMulai, jamSelesai, ruang, dikonfirmasi }`
  untuk event di `EVENT_SINKRON` dan menulis booking `sumber: 'program'`. Saat dipisah, ini jadi
  antarmuka (API/event) antara aplikasi induk dan modul.
- Form jadwal di induk (`FormMahasiswa`, `FormJadwalMhs`) memeriksa bentrok lewat `periksaUsulanRuang`.
- Props yang diberikan induk: `jadwalRuang` (hasil `useJadwalRuang().data`), `aksi`, daftar `dosen`/`mahasiswa`.

## Langkah pemindahan (bila jadi)

1. Salin `modules/ruang` ke repo/paket baru; tulis ulang `host.js` dengan implementasi di sana.
2. Pindahkan blok aturan `ruang`/`semesterRuang`/`booking` di `firestore.rules`.
3. Di induk, ganti `useSinkronProgram` dan pemeriksaan bentrok dengan panggilan ke modul/API.
4. Hapus `modules/ruang` dari induk dan perbarui impor di `App.jsx`, `Portal.jsx`, `Pengaturan.jsx`,
   `FormMahasiswa.jsx`, `FormJadwalMhs.jsx` (lima titik itu satu-satunya yang mengimpor modul).
