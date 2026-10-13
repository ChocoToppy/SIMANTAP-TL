# Changelog

## 12-10-2026 (4) — Grafik beban dosen dipisah per peran
- Panduan format nomor surat (isian manual) kini dibuka/ditutup lewat tombol lampu di kanan isian "Nomor Surat", menggantikan tautan lipat di bawahnya. Ikon `LampIcon` ada di `ui.jsx`.
- Dropdown dosen pembimbing/penguji di tab tahap modal edit KP/Magang/TA (Pendaftaran TA, Bimbingan, Seminar Proposal, Sidang) dibuat selebar penuh.
- Dashboard: kartu "Beban dosen (per periode)" berisi dua grafik, Pembimbing dan Penguji, dengan pilihan Semua/Aktif yang sama untuk keduanya. Sebelumnya satu grafik berisi total pembimbing + penguji. Saat filter program "Semua", grafik Pembimbing dipecah per program (Tugas Akhir, Kerja Praktik, dst., hanya yang ada isinya) karena beban pembimbing tiap program tidak dijumlah; grafik Penguji tetap lintas program.
- Modal edit mahasiswa (admin): grafik beban ringkas (`mahasiswa/BebanDosenMini.jsx`) tampil di bawah setiap dropdown pembimbing/penguji: tab Pendaftaran (TA) & Bimbingan untuk pembimbing, tab Seminar Proposal & Sidang untuk penguji, serta halaman "Edit data pendaftaran" dan tata letak generik untuk keduanya. Grafik dihitung per periode mahasiswa itu, termasuk yang sudah lulus; beban pembimbing hanya menghitung program mahasiswa itu (pembimbing KP terpisah dari pembimbing TA, dst.), beban penguji lintas program (sama dengan mode "Semua" di Dashboard). Isinya semua dosen aktif diurutkan dari beban paling sedikit (tersusun beberapa kolom bila lebar cukup, urutan dibaca kiri ke kanan), dan dosen yang sedang dipilih di form ditebalkan serta sudah ikut dihitung.

## 12-10-2026 (3) — Panduan format nomor surat
- Isian manual "Nomor Surat" di modal edit admin (build produksi) punya tautan lipat "Panduan format nomor surat" yang menjelaskan arti tiap bagian nomor, dengan contoh `013/UN7.F3.6.8/DL/XII/2025`. Kode di panduan diambil dari `KODE_NOMOR` (`utils/nomorSurat.js`). Penomoran otomatis tetap hanya di build eksperimental.
- Kode departemen `TL` dihapus dari format nomor surat (sudah tidak dipakai lagi): `013/UN7.F3.6.8/DL/XII/2025`. Berlaku untuk panduan, contoh di isian manual, dan nomor yang diterbitkan otomatis (`KODE_NOMOR` di `utils/nomorSurat.js`). Nomor lama yang sudah tersimpan tidak diubah.
- Kolom "No. Surat" di tabel Mahasiswa bisa disortir seperti kolom lain. Urutannya tahun dulu, lalu nomor urut (`kunciUrutNomor` di `utils/nomorSurat.js`), karena nomor urut mulai lagi dari 001 tiap tahun. Nomor ketikan yang tidak sesuai format ada setelah nomor yang sesuai format, dan mahasiswa tanpa nomor selalu di paling bawah.

## 12-10-2026 (2) — Tombol tutup di atas & bawah setiap jendela
- Form melayang di Portal mahasiswa (Ajukan/Edit pendaftaran, Ajukan jadwal / Unggah berkas sidang, Kirim bukti pembukuan, Perpanjangan) punya tombol ✕ di kanan atas judul (`KepalaForm` di `ui.jsx`), selain Batal di bawah. Pratinjau Form Pendaftaran di Pengaturan tidak menampilkan ✕.
- Panel Filter di halaman Mahasiswa (admin) punya judul "Filter" dengan ✕ di atas dan tombol "Tutup" di bawah; sebelumnya hanya bisa ditutup dengan klik di luar panel.
- Semua jendela `Modal` sudah punya ✕ di atas dan Batal/Tutup di bawah, jadi tidak diubah.

## 12-10-2026 — KP: Seminar KP diganti Pembukuan; TA: 1 pembimbing + 2 penguji
- KP: tahap "Seminar KP" dihapus. Alurnya sekarang Pendaftaran → Bimbingan → Pembukuan → Lulus. Halaman dokumen mahasiswa punya tab Pembukuan dengan isian "Kirim tautan" (dokumen `pembukuan` di `KP_DOKUMEN`, `linkInput: true`) untuk mengirim tautan bukti bahwa laporan KP sudah diarsipkan dan ditandatangani (disimpan di `m.pembukuan.berkasLink`); isian terbuka hanya saat tahap Pembukuan. Tombol "Kirim bukti pembukuan" di kartu membuka halaman itu. Panel dokumen admin menampilkan status Terkirim/Belum dikirim beserta tautannya. Admin memeriksanya di tab Pembukuan pada modal edit (kotak tautan yang sama dengan berkas lain, dengan centang "Sudah diperiksa"), lalu meluluskan lewat "Alur tahap".
- Ikut dihapus bersama Seminar KP: pengajuan jadwal Seminar KP, dokumen "Persetujuan SMKP" dan "Berita Acara Seminar KP" (template .docx-nya tetap di `public/doc-templates/KP/`), isian nilai Seminar KP di portal dosen (dosen kini hanya membaca data), sinkron Seminar KP ke jadwal ruang, dan pilihan program KP di booking seminar/sidang. Label dosen KP menjadi "Dosen Pembimbing".
- TA: Pembimbing 2 dihapus. Seminar Proposal & Seminar Hasil = Pembimbing + Penguji 1; Sidang = Pembimbing + Penguji 1 + Penguji 2. Penguji 1 diisi di tab Seminar Proposal, Penguji 2 di tab Sidang. Pemeriksaan bentrok dosen hanya menghitung Penguji 2 pada Sidang.
- Tag dokumen TA: BA Sempro/Semhas `{nama_dosen2}`/`{nip2}` = penguji; BA Sidang `{nama_dosen2}` = penguji 1, `{nama_dosen3}` = penguji 2, `{nama_dosen4}` tidak dikirim lagi; Perpanjangan TA & Persetujuan Dosbing tidak lagi mengirim `{nama_dosen2}`. Lihat "List of Tags.txt".
- `firestore.rules`: field baru `pembukuan` (mahasiswa hanya boleh mengisi `berkasLink` saat tahap Pembukuan), Seminar KP keluar dari daftar kegiatan, aturan tulis dosen dihapus.
- Data lama tidak dimigrasi: satu-satunya KP bertahap "Seminar KP" adalah akun dummy, dan TA yang masih punya Pembimbing 2 ditinjau admin manual.
- Urutan deploy: aplikasi (hosting) dan `firebase deploy --only firestore:rules` berdekatan (aturan baru menolak usulan jadwal Seminar KP dari aplikasi lama, aturan lama menolak `pembukuan` dari aplikasi baru).

## 10-10-2026 — Status verifikasi tampil di semua tahap
- Modal edit admin KP/Magang/TA: pilihan "Status verifikasi" pindah dari tab Pendaftaran ke kotak identitas (di samping Nama/NIM/Judul), jadi bisa diubah dari tab tahap mana pun. Alasannya: status bisa kembali ke "Menunggu verifikasi" kapan saja bila mahasiswa menyimpan ulang form lewat "Edit pendaftaran". Pengingat pesan (`PengingatPesan`) ikut pindah ke bawah kotak identitas. Tab Pendaftaran tetap berisi ringkasan, tautan berkas, dan tombol "Edit data pendaftaran".

## 09-10-2026 (2) — Kartu program mahasiswa ditata ulang
- Urutan kartu di Portal: judul → tahapan → status tahap ini beserta tombol aksinya (ajukan jadwal / unggah berkas sidang) → pesan admin → dosen → dokumen → perpanjangan → Edit/Hapus pengajuan. Tombol aksi utama tidak lagi terpisah di dasar kartu.
- Di HP, tahapan tampil sebagai satu baris langkah bernomor (✓ untuk yang selesai) dengan keterangan "Tahap x dari n" (`StageStepper` di `ui.jsx`, menggantikan daftar vertikal).
- Dokumen tidak lagi tampil di dalam kartu. Kartu punya satu baris "Dokumen <program>" (ringkasan: jumlah berkas terunggah & siap diunduh) yang membuka halaman dokumen tersendiri (`portal/HalamanDokumen.jsx`) dengan tombol kembali.
- Halaman dokumen: tab per tahap (terbuka di tahap mahasiswa saat ini, bertanda "sekarang"; di HP diganti pemilih berpanah ‹ › dengan keterangan "x dari n", tanpa geser ke samping); bagian "Template terisi otomatis" berisi dokumen PDF & tautan dengan ikon dan tombol Unduh/Buka (ikon gembok + syarat bila belum tersedia); bagian "Unggah berkas" berisi satu slot per dokumen: berkas terunggah (Ganti/Hapus) atau kotak unggah PDF maks 25 MB. Ikon ada di `components/DokIkon.jsx`.
- Panel dokumen di modal admin dan pratinjau Pengaturan → Konten tetap memakai `KpDocumentPanel`, kini dengan daftar bergaris, satu label status per dokumen, dan tombol tahap (bukan dropdown) di HP.
- Dosen ditampilkan sebagai nama lalu kode dalam kurung.

## 09-10-2026 — Pengingat pesan saat verifikasi
- Di modal edit admin, saat status verifikasi diubah ke "Terverifikasi" dan pengajuan masih membawa pesan untuk mahasiswa, muncul pengingat kuning di bawah pilihan status yang menampilkan isi pesan dan tombol "Hapus pesan". Pesan tidak dihapus otomatis, jadi tetap bisa dipakai sebagai pesan satu arah. Pengingat tidak muncul untuk pengajuan yang sudah terverifikasi sejak modal dibuka.
- Modal edit KP/Magang/TA: kotak pesan yang dibuka lewat ikon pesan punya tombol ✕ di sampingnya untuk mengosongkan pesan (muncul hanya bila ada isi).
- Kotak cari di halaman Mahasiswa, Pengaturan → Akun, dan Pengaturan → Nomor Surat punya tombol ✕ di ujung kanan untuk menghapus pencarian sekali klik (muncul hanya bila ada isi; fokus tetap di kotak cari).

## 08-10-2026 (2) — Persetujuan perpanjangan memajukan batas akhir
- Di modal edit admin (KP, Magang/MKT, TA), bagian Perpanjangan punya tombol "Setujui perpanjangan & kirim surat" menggantikan "Kirim ke mahasiswa". Sebelum tombol, keterangan menyebut batas akhir lama → baru; menekannya memunculkan konfirmasi dengan tanggal yang sama. Setelah dikonfirmasi (dan disimpan): batas akhir maju +1 bulan (`ATURAN_PERPANJANGAN` di `nomorSurat.js`: KP/Magang 1×, TA 2×), periodenya tercatat di `perpanjangan.riwayat`, dan surat langsung terlihat di Portal mahasiswa (termasuk TA, yang sebelumnya tidak pernah menampilkan tombol unduh surat ke mahasiswa).
- Surat perpanjangan (KP, Magang/MKT, TA, dan surat teks TA) kini mencetak periode dari `perpanjangan.riwayat` (`utils/perpanjangan.js`), bukan dari batas akhir saat ini, sehingga mengunduh ulang setelah batas akhir maju tidak lagi menggeser periode di surat. Periode dihitung +1 bulan kalender (sebelumnya +30 hari).
- Tombol "Setujui perpanjangan" tanpa konfirmasi di panel Nomor Surat (build eksperimental) dihapus; hitungan "Perpanjangan disetujui n/maks" tetap ada.

## 08-10-2026 — Satu pengajuan per program + aturan Firestore diperketat
- Mahasiswa hanya bisa punya satu pengajuan untuk setiap program. Program yang sudah punya pengajuan tetap tampil di pilihan form tetapi tidak bisa dipilih, dan tombol "Ajukan pendaftaran" nonaktif bila semua program sudah terpakai.
- Kartu pengajuan yang belum pernah terverifikasi punya tombol "Hapus pengajuan" (berkas yang diunggah ikut terhapus). Pengajuan yang pernah terverifikasi (field `pernahTerverifikasi`, tetap terpasang meski kemudian diedit kembali ke "baru") hanya bisa dihapus admin.
- Pengajuan baru dari mahasiswa memakai ID dokumen `{nim}_{program}` (`idPengajuan` di `helpers.js`). Dokumen yang memegang pasangan (NIM, program) dengan ID lain (data lama, buatan admin, setelah ganti NIM) ditandai di koleksi baru `slotPengajuan`, diisi oleh `simpanMahasiswa` (admin), `studentUpdateProfile`, dan skrip `functions/migrate-slot-pengajuan.js` untuk data yang sudah ada.
- `firestore.rules` tidak lagi menganggap aplikasi satu-satunya jalan masuk: mahasiswa hanya bisa mengubah field yang memang ditulis portal (form pendaftaran, usulan jadwal & tautan berkas, perpanjangan, unggahan berkas mahasiswa) dan tidak bisa memverifikasi sendiri, mengisi dosen/nilai/konfirmasi jadwal, mengubah tahap (kecuali Pendaftaran → Bimbingan saat KP/Magang mengunggah surat balasan), atau menimpa berkas admin. Pengajuan baru wajib berstatus awal. Dosen hanya bisa mengisi `hasil` kegiatan dan tidak lagi bisa menghapus data mahasiswa.
- Urutan deploy: `firebase deploy --only functions:studentUpdateProfile,functions:adminDeleteStudent`, hosting/aplikasi, jalankan `node migrate-slot-pengajuan.js` (laporan) lalu `--tulis`, terakhir `firebase deploy --only firestore:rules`.
- Aturan diperketat lagi mengikuti prinsip "yang tidak bisa dilakukan lewat aplikasi juga ditolak database": pengajuan baru hanya dengan periode yang dibuka, angkatan & dosen aktif, dan (selain KP/Magang) tanggal otomatis hari ini + 180 hari; TA/Capstone/S2 tidak bisa mengubah tanggal mulai/batas akhir; usulan jadwal hanya untuk kegiatan yang tombolnya muncul (terverifikasi, ada pembimbing, kegiatan tahap ini) dan Sidang hanya tautan berkas; unggah berkas hanya setelah diverifikasi; perpanjangan hanya diminta sekali dan surat final hanya setelah surat admin tersedia (surat final boleh diganti kapan saja lewat tombol baru "Ganti surat final" di kartu; admin memakai versi terbaru, berkas lama dihapus dari Storage); `aktivitas` dan `riwayatJadwal` hanya bisa ditambah. Dosen hanya bisa mengisi nilai Seminar KP (lulus/tidak) setelah jadwalnya dikonfirmasi.
- `storage.rules`: mahasiswa tidak bisa lagi menimpa/menghapus berkas admin (BA, ST, surat perpanjangan admin), hanya mengunggah PDF ≤ 25 MB setelah pengajuan diverifikasi; dosen hanya bisa membaca. Deploy: `firebase deploy --only firestore:rules,storage`.

## 06-10-2026 (5) — Nama lain untuk ruang
- Daftar ruang punya kolom "Nama lain" (alias, pisahkan dengan koma). Jadwal lama yang menyimpan nama ruang lama (mis. "Ruang Seminar KP") kini dikenali sebagai ruang resmi (mis. C.302) oleh sinkron jadwal program dan pemeriksaan bentrok.

## 06-10-2026 (4) — Kelola ruang saat impor
- Pop-up impor jadwal kuliah punya bagian "Ruang": tiap ruang dari berkas bisa diganti namanya, digabung dengan ruang lain (nama disamakan), atau dilewati sebelum diimpor. Ruang dengan nama setara tidak lagi dibuat ganda.
- Pengaturan → Jadwal Ruang → Ruang: tombol "Hapus N ruang tanpa booking" untuk membersihkan ruang kosong sekaligus (ruang yang sudah punya booking tidak bisa dihapus).

## 06-10-2026 (3) — Tab "Jadwal" untuk mahasiswa + riwayat jadwal
- Tab Penggunaan Ruang di tampilan mahasiswa kini bernama "Jadwal" (admin tetap "Penggunaan Ruang") dan tidak lagi memuat grid atau catatan peminjaman ruang. Isinya satu daftar seminar/sidang/expo seluruh mahasiswa yang hanya menampilkan hari ini ke depan. Kolom Dosen dihapus dari tab ini (dosen pembimbing/penguji dilihat mahasiswa di kartu programnya sendiri). Form usulan jadwal mahasiswa tetap memeriksa bentrok ruang: jadwal yang sudah ditetapkan admin dianggap final sampai admin mengubahnya.
- Jadwal yang sudah final atau sudah ada hasilnya dan kemudian diganti (tanggal/jam/ruang berubah, atau diajukan ulang) diarsipkan otomatis ke `riwayatJadwal` di data mahasiswa (`arsipkanJadwal` di `helpers.js`, dipanggil saat simpan). Usulan yang belum dikonfirmasi tidak diarsipkan. Jadwal yang dibuat sebelum fitur ini tidak punya arsip, hanya jadwal terakhirnya.
- Admin tetap melihat seluruh daftar tanpa batas tanggal.

## 06-10-2026 (2) — Penggunaan Ruang masuk produksi
- Tab Penggunaan Ruang (admin) dan Pengaturan → Jadwal Ruang kini aktif di build produksi (flag baru `FITUR_RUANG` di `src/utils/config.js`; `FITUR_EKSPERIMENTAL` tetap untuk fitur lain seperti Registri Nomor Surat).
- Mahasiswa tidak lagi melihat grid ketersediaan ruang: tab Penggunaan Ruang mereka hanya berisi daftar seminar/sidang/expo yang tercatat, dengan catatan bahwa peminjaman ruang lewat admin. Hanya admin yang bisa melihat dan mengubah grid.

## 06-10-2026 — Jadwal ruang bisa disematkan di situs lain
- Halaman baca-saja `/embed/ruang.html` (Harian/Mingguan/Bulanan, tanpa login) untuk disematkan lewat iframe, mis. di lingkungan.undip.ac.id. Halaman ini tidak ada menunya di aplikasi; alamat dan cara pasangnya ada di `DEPLOY.md` dan `src/modules/ruang/README.md`.
- Cloud Function baru `jadwalRuangPublik` (alamat `/api/ruang`) menyediakan data publik: hanya semester & booking terbit, tanpa nama mahasiswa/PJ. Perlu `firebase deploy --only functions:jadwalRuangPublik,hosting`; `npm run deploy` (cPanel) tidak menyertakannya.

## 05-10-2026 — Nomor surat otomatis + registri
- Eksperimental: fitur ini hanya aktif di build `full`. Di build produksi nomor surat tetap diisi manual, menu Registri Nomor Surat tidak ada, dan ST Pembimbing/Surat Tugas cukup menunggu dosen pembimbing (tanpa syarat nomor surat).
- Nomor surat tidak lagi diketik: di form edit mahasiswa, tombol "Ambil nomor" menyarankan nomor berikutnya (`013/UN7.F3.6.8.TL/DL/XII/2025`), admin mengonfirmasi, lalu nomor tercatat dan terpasang. Urutan per tahun, satu urutan untuk semua program; kode fakultas/penandatangan/hal tetap di `src/utils/nomorSurat.js`. Tombol aktif setelah data tersimpan dan pembimbing ditetapkan.
- Registri baru di Pengaturan → Registri Nomor Surat: semua nomor yang pernah terbit (koleksi Firestore `nomorSurat`), bisa dicari/filter. Nomor kedaluwarsa tidak pernah dihapus atau dipakai ulang. Penerbitan memakai transaksi, jadi dua admin tidak bisa mendapat nomor yang sama. Aturan Firestore diperbarui — perlu `firebase deploy --only firestore:rules`.
- "Akhiri nomor" mengedaluwarsakan nomor; "Akhiri & daftar ulang" juga mengosongkan pembimbing, mengembalikan ke Pendaftaran dengan rentang baru, dan mereset perpanjangan (tahap bisa dimajukan lewat dropdown tahap).
- Perpanjangan kini dihitung: KP/Magang 1× 1 bulan, TA 2× 1 bulan, lewat tombol "Setujui perpanjangan" (menambah batas akhir). Nomor aktif yang lewat batas akhir dengan jatah perpanjangan habis diberi tanda "Perlu ditinjau" (tabel & form); sistem tidak pernah mengakhiri nomor sendiri.

## 05-10-2026 — Pindah antar entri di form edit mahasiswa
- Header modal "Edit mahasiswa" punya tombol ‹ n / total › untuk berpindah ke mahasiswa sebelumnya/berikutnya tanpa menutup form. Urutannya persis tabel yang sedang tampil: tab program, pencarian, filter (angkatan, bidang, status, verifikasi, dosen), urutan kolom, dan pengelompokan, lintas halaman paginasi.
- Jika ada ubahan yang belum disimpan, muncul konfirmasi sebelum pindah (ubahan dibuang).

## 02-10-2026 — Modul Ruang dipisah ke folder sendiri
- Seluruh kode penggunaan ruang (grid harian/mingguan/bulanan, editor booking, impor Excel, sinkron program) dipindah ke `src/modules/ruang/` agar siap dipisah dari aplikasi suatu saat nanti. Perilaku tidak berubah.
- Aplikasi hanya mengimpor lewat `modules/ruang/index.js`; semua ketergantungan modul ke kode induk ada di `modules/ruang/host.js`. Gaya grid pindah ke `modules/ruang/ruang.css`. Penjelasan batas, kontrak, dan langkah pemindahan ada di `modules/ruang/README.md`.

## 29-09-2026 — Editor Form Pendaftaran di Pengaturan
- Pengaturan punya bagian baru "Form Pendaftaran": menampilkan form pendaftaran asli yang dilihat mahasiswa (komponen yang sama, mode pratinjau); klik sebuah field lalu ubah judul, deskripsi, contoh isian (placeholder), status wajib, dan urutan tiap field form pendaftaran mahasiswa, terpisah per program (TA, Capstone, S2, KP, Magang, MKT). Berlaku langsung tanpa deploy ulang; disimpan di `config/global` → `konten.formPendaftaran`.
- Field tidak bisa ditambah/dihapus — tetap di kode (`src/utils/formPendaftaran.js`) karena terikat ke data yang dibaca generator surat/PDF. Nama, judul, dan periode selalu wajib.
- Pilihan dropdown Tema KP/Magang dan Bidang TA/Capstone/S2 diedit langsung di kartu field-nya (tambah, ubah nama, urutkan, nonaktifkan). Nonaktif, bukan hapus, supaya mahasiswa lama tetap menampilkan namanya; kode otomatis dan tidak bisa diubah (`src/utils/pilihan.js`).
- Form edit admin untuk KP/Magang sebelumnya memakai daftar Bidang TA; sekarang memakai daftar Tema KP.
- Bagian "Konten" juga ditampilkan sebagai komponen asli portal: panel dokumen KP/Magang/MKT dan kotak "Dokumen yang perlu disiapkan" per kegiatan. Klik lalu ubah teksnya di panel samping; hanya nilai yang berbeda dari bawaan yang disimpan.
- Editor Form Pendaftaran dan Konten memakai draf: ubahan langsung terlihat di pratinjau tapi baru berlaku untuk mahasiswa setelah menekan "Simpan perubahan" (ada juga "Batalkan").
- Peringatan bila meninggalkan editor dengan ubahan yang belum disimpan (pindah menu Pengaturan, Kembali, Logout, tutup/muat ulang tab), dan centang "Perubahan tersimpan" yang baru muncul setelah server Firestore mengonfirmasi tulisan.
- Ikon menu Pengaturan diganti SVG yang selaras dengan sidebar.
- Sidebar admin punya tombol sematkan (pin) agar tetap melebar tanpa hover.

## 02-09-2026 — Penambahan UI mobile-view untuk Mahasiswa
- Menambahkan UI mobile view untuk mahasiswa, admin dan dosen belum memiliki mobile view yang optimal
- Dist sekarang dibagi menjadi 2, production untuk deployment ke domain utama dan experimental untuk domain firebase
-Fitur program KP sudah ready untuk deployment, mahasiswa hanya bisa mengakses fitur program KP pada deployment productionnp

## 01-09-2026 — Peran Super Admin, akun mahasiswa mandiri, dan hapus akun

### Peran Super Admin
- Menambahkan peran Super Admin — satu-satunya yang boleh menambah atau menghapus akun admin lain (admin biasa masih bisa menambah/mengelola akun dosen seperti biasa).
- Karena belum ada super admin sebelumnya, admin yang sudah ada bisa mengklaim status ini sendiri lewat tombol di tab Dosen & Admin; jalur ini otomatis terkunci begitu ada satu super admin, jadi tidak bisa diklaim ulang oleh admin lain.
- Semua admin sekarang bisa mengubah nama tampilan akun mereka sendiri lewat tombol "Edit" di tab Dosen & Admin; khusus super admin, tombol yang sama juga bisa mengubah email login sendiri.
- Baris admin di tabel Dosen & Admin menampilkan lencana "Super Admin".

### Akun mahasiswa
- Menambahkan tombol "Hapus" di tab Akun Mahasiswa (Pengaturan) — menghapus akun secara permanen: akun Firebase Auth, profil, dan seluruh data KP terkait sekaligus. Dipakai untuk membersihkan akun dummy/uji coba yang tertinggal di daftar.
- Mahasiswa sekarang punya halaman akun sendiri di alamat `/akun` (tombol "Akun" di header Portal) untuk mengubah nama, NIM, dan email aktif sendiri. Email ini dipakai admin untuk mengirimkan password sementara secara manual bila mahasiswa lupa password (bukan email reset otomatis) — kalau mahasiswa juga lupa email yang terdaftar, tetap harus lewat admin.

### Perbaikan
- Memperbaiki layar "Memuat profil admin…" yang sebelumnya selalu muncul dengan kata "admin" untuk peran apa pun saat profil belum termuat penuh saat login (paling kelihatan saat mendaftar akun mahasiswa baru) — sekarang menyesuaikan peran yang sebenarnya sedang login.
- Memperbaiki pesan error saat admin membuat akun admin/dosen baru dengan email yang sudah dipakai akun lain — sebelumnya gagal dengan error internal generik tanpa keterangan, sekarang menampilkan pesan yang jelas.

### Kelola Panduan & Pengumuman (Pengaturan)
- Form tambah/edit di tab Kelola Panduan dan Pengumuman sekarang muncul sebagai jendela modal (sama seperti tab Dosen & Admin), bukan selalu terbuka di atas daftar.

## 31-08-2026 — Login & manajemen akun berbasis Firebase Authentication

### Autentikasi
- Mengganti total sistem login lama (password polos dibandingkan di sisi klien, password admin/dosen bersama yang di-hardcode, sesi disimpan di localStorage) dengan Firebase Authentication asli — password kini di-hash & dikelola sepenuhnya oleh Firebase, tidak pernah tersimpan atau bisa dilihat siapa pun, termasuk admin.
- Tampilan login tidak berubah — mahasiswa tetap masuk pakai NIM, dosen pakai NIP, admin pakai email; di baliknya sistem mencocokkan identitas itu ke akun Firebase Auth yang sesuai.
- Peran (mahasiswa/dosen/admin) kini ditentukan lewat custom claim di token login (bukan dugaan berdasarkan tombol yang diklik saat login seperti sebelumnya), diberikan lewat Cloud Functions saat akun dibuat — klien tidak pernah bisa mengatur perannya sendiri.
- Pendaftaran mandiri mahasiswa sekarang meminta email aktif (dipakai untuk reset password sendiri) selain NIM/nama/password.
- Menambahkan tautan "Lupa password?" di layar login mahasiswa/dosen (kirim email reset lewat Firebase, tanpa perlu hubungi admin).
- Akun yang baru dibuat admin (dosen/admin lain) atau baru direset password-nya wajib mengganti password saat login pertama sebelum bisa memakai aplikasi.

### Firestore & Storage rules
- Mengganti aturan keamanan yang sebelumnya benar-benar terbuka (`allow read, write: if true` di semua koleksi) dengan aturan berlapis: cek peran (role) dulu, lalu cek kepemilikan data per dokumen — admin bebas akses semua, dosen hanya data mahasiswa yang dia bimbing/uji, mahasiswa hanya data miliknya sendiri.
- Berkas di Firebase Storage (unggahan mahasiswa) sekarang tunduk aturan yang sama, dicek silang ke data mahasiswa/dosen/akun terkait di Firestore.
- Akun yang dinonaktifkan admin langsung kehilangan akses seketika, tanpa perlu menunggu token login kedaluwarsa.

### Pengaturan admin (halaman baru "Dosen & Admin")
- Tab Akun (mahasiswa) tidak lagi menampilkan password sama sekali — hanya tombol "Reset Password" (password sementara baru, wajib diganti mahasiswa saat login berikutnya) dan tombol aktifkan/nonaktifkan akun.
- Menambahkan tab baru "Dosen & Admin" — admin bisa membuat akun dosen atau admin lain, mengedit profil dosen (nama/email/NIP/kompetensi), reset password, serta aktifkan/nonaktifkan akun dosen. Form muncul sebagai jendela modal saat tombol "+ Tambah" atau "Edit" diklik, bukan selalu terbuka di atas halaman.
- Setiap aksi reset password oleh admin (ke akun siapa pun) sekarang tercatat di log audit tersendiri.
- Memperbaiki bug lama di tab Dosen (bukan yang baru): mengedit data dosen sebelumnya ikut menyimpan angka beban bimbingan/penguji terhitung (harusnya cuma tampilan) sebagai field asing ke Firestore.

### Tampilan
- Menambahkan lencana identitas berwarna di header (biru untuk mahasiswa, hijau untuk dosen, ungu untuk admin) yang menampilkan nama yang sedang login — sebelumnya mahasiswa/dosen menampilkan "nama · NIM/NIP" polos, dan admin tidak menampilkan siapa pun yang login sama sekali.

### Migrasi
- Akun mahasiswa lama dipindah otomatis ke Firebase Auth tanpa perlu reset password (password lama tetap berlaku). Akun dosen & admin (yang sebelumnya berbagi satu password) dipecah jadi akun individual dengan password sementara.

## 27-08-2026 — Ekspor Excel, tabel per program, dan halaman Panduan

### Ekspor & tabel Mahasiswa
- Memperbaiki ekspor Excel yang sebelumnya tidak berfungsi sama sekali (fungsi belum diekspor dari modulnya) — sekarang mengunduh berkas `.xlsx` yang valid.
- Ekspor Excel/CSV kini menuliskan nama lengkap dosen pembimbing/penguji (bukan kode singkat), sementara tampilan tabel tetap pakai kode singkat supaya hemat lebar kolom.
- Menambahkan kolom "No. Surat" ke tabel Mahasiswa (sebelumnya hanya ada di ekspor & form edit).
- Menambahkan paginasi ke tabel Mahasiswa — default 100 baris/halaman, bisa diperkecil (5/10/25/50) atau diperbesar sampai 500; pencarian & filter tetap menyisir seluruh data, bukan cuma halaman yang tampil.
- Tabel Mahasiswa sekarang dipecah jadi tab per program (Tugas Akhir/KP/Capstone/Magang/Tesis S2) — kolom pembimbing/penguji menyesuaikan otomatis sesuai kebutuhan tiap program (mis. KP cuma satu kolom "Dosen Pembimbing/Penguji"), dan filter "Semua program" dihapus karena programnya tidak lagi dicampur. Tombol "+ Tambah" otomatis memakai program dari tab yang aktif.
- Tab program ini sengaja dibuat beda gaya (pil hijau solid) dari tab navigasi utama (Dashboard/Mahasiswa/Dosen) supaya jelas ini level navigasi berbeda.

### Perilaku tabel (lebar kolom & drag-resize)
- Tabel dengan kolom bisa digeser (Mahasiswa, Dosen, tabel dosen di portal) sekarang defaultnya selalu selebar layar, dan baru melebar melebihi layar (dengan scroll ke samping) begitu ada kolom yang digeser lebih lebar — sebelumnya kolom malah dipepetkan/diciutkan saat digeser.
- Lebar kolom hasil geser sengaja tidak lagi disimpan ke localStorage — selalu kembali ke ukuran default tiap reload.
- Baris pemisah "2021 Ganjil" / "Angkatan 25" saat tabel dikelompokkan kini diberi warna latar biru muda (sebelumnya transparan/tidak kelihatan) supaya jelas sebagai pembatas.

### Halaman Panduan (Portal mahasiswa)
- Menambahkan halaman baru beralamat `/panduan`, berisi semua panduan yang diunggah admin, dikelompokkan per program (termasuk "Umum" untuk yang berlaku ke semua program) — dibuka lewat tombol hijau "Panduan" di header, bisa diakses/dibagikan langsung lewat alamatnya.
- Tiap kartu pengajuan mahasiswa kini menampilkan tombol panduan (hijau, tanpa garis bawah) langsung di sebelah badge status verifikasi — khusus panduan program itu sendiri, tidak termasuk yang "Umum" (supaya kartu tidak penuh kalau panduan Umum makin banyak).
- "Kelola Panduan" di Pengaturan admin sekarang punya field Program (Umum/TA/KP/Capstone/Magang/Tesis S2) untuk mengelompokkan tiap panduan.
- Menambahkan tab "Penggunaan Ruang" ke Portal mahasiswa — tabel jadwal seminar/sidang/expo & pemakaian ruang seluruh mahasiswa (sama seperti di Dashboard admin), supaya mahasiswa bisa cek sendiri potensi bentrok jadwal/ruang.

### Perbaikan kecil
- Tombol berbentuk link (`<a>` bergaya `.btn`) tidak lagi bergaris bawah di seluruh aplikasi.
- Tampilan pengajuan mahasiswa (Portal) sekarang 2 kartu per baris (sebelumnya 3).
- Label paginasi disederhanakan ("1 / 1" alih-alih "Halaman 1 / 1", "100" alih-alih "100 / halaman").

## 26-08-2026 — Halaman Pengaturan, editor konten, dan pembenahan dokumen KP

### Halaman Pengaturan
- Membuat halaman pengaturan dan memindahkan Kelola periode/pengumuman/panduan dari modal+tombol topbar menjadi satu halaman terpisah di alamat `/pengaturan`, diakses lewat ikon gear di topbar.
- Menambahkan tab Konten: admin bisa mengubah label & syarat tiap dokumen KP serta daftar berkas per kegiatan tanpa mengubah kode.
- Menambahkan tab Akun: admin bisa melihat & reset password mahasiswa langsung (password acak baru, tanpa alur verifikasi OTP/SMS) untuk keperluan troubleshooting.

### Tabel mahasiswa & dosen
- Semua kolom di tabel Mahasiswa sekarang bisa diurutkan (sebelumnya hanya sebagian).
- Pembimbing 1/2 dan Penguji 1/2 sekarang kolom terpisah, bukan digabung jadi satu teks.
- Tabel yang kolomnya banyak (Mahasiswa, Dosen, tabel dosen di portal) tidak lagi memepetkan kolom supaya muat di layar — sekarang melebar sesuai kebutuhan dan bisa digulir ke samping.

### Dokumen KP
- Permohonan KP tidak lagi dibuat dari template — sekarang hanya kotak unggah (pengajuan dilakukan lewat Mandala UNDIP).
- Menambahkan tombol Hapus berkas untuk mahasiswa/admin (sebelumnya hanya bisa mengganti).
- Zona unggah kini disembunyikan secara default (tombol "Unggah/Ganti berkas") supaya panel tidak penuh.
- Berkas di Firebase Storage kini otomatis ikut terhapus saat diganti/dihapus, atau saat seluruh data mahasiswa dihapus.
- Menambahkan tag `{tgl_cetak}` (tanggal cetak real-time, dihitung saat tombol Unduh diklik) menggantikan tag `tgl_surat_*` lama di semua surat KP.
- Template & konverter PDF di-warm-up saat halaman dibuka supaya unduhan terasa lebih cepat.
- Daftar "Dokumen yang perlu disiapkan" sekarang tampil sebagai list bernomor.

### Perbaikan lain
- Memperbaiki tautan (Link berkas persyaratan, Turnitin, panduan, dll.) yang salah terbuka ke domain aplikasi sendiri jika diketik tanpa "https://".
- Riwayat aktivitas & daftar pengumuman kini dibatasi tinggi ~3 baris dan bisa discroll.
- Menyederhanakan blok "Notifikasi" admin menjadi nomor WA mahasiswa + tombol salin.

## 24-08-2026 — Restrukturisasi database, penyimpanan file, dan konversi PDF

### Unggah file
- Menambahkan komponen unggah file dengan drag-and-drop serta opsi klik untuk memilih file, menggantikan metode tautan Google Drive dan input tersembunyi sebelumnya.
- Diterapkan di seluruh bagian yang mendukung unggah file.

### Database
- Merestrukturisasi penyimpanan Firestore dari satu dokumen besar menjadi koleksi terpisah per entitas.
- Perubahan ini memperbaiki masalah data yang hilang setelah unggah file karena dokumen lama dapat melewati batas ukuran 1 MiB Firestore.
- Sekarang, hanya dokumen yang berubah yang akan disimpan.
- Dokumen firestore lama `sistem_ta/global_state` masih ada, tetapi sudah tidak digunakan.

### Penyimpanan file
- Meng-upgrade project Firebase ke paket Blaze dan mengaktifkan Cloud Storage. (masih dengan akun google personal yang perlu diganti saat deployment)
- File sekarang benar-benar disimpan di Firebase Storage, bukan sebagai base64 di Firestore.
- Batas ukuran file ditingkatkan dari 400 KB menjadi 8 MB.
- Fitur unggah sudah diuji langsung di aplikasi.

### Unggahan hanya PDF
- Semua area unggah sekarang hanya menerima file PDF.
- Pembatasan juga divalidasi di sisi aplikasi sehingga tidak dapat dilewati melalui drag-and-drop.

### Konversi PDF
- Menambahkan layanan Cloud Run untuk mengonversi surat `.docx` yang dibuat dari template menjadi PDF.
- Semua tombol unduh kini menggunakan label **"Unduh (PDF)"**.
- Jika layanan konversi tidak tersedia, sistem akan kembali mengunduh file `.docx` asli.
- Memperbaiki masalah font yang sebelumnya menyebabkan tata letak surat berubah setelah konversi.

## 20-08-2026 — Desain ulang UI

- Menerapkan desain baru bergaya editorial/broadsheet dengan identitas visual TL Undip.
- Memperbarui header, navigasi, pelacak tahapan, kartu statistik, tabel, warna, dan tipografi.
- Menambahkan logo TL Undip pada aplikasi, halaman login, dan favicon.
- Menyesuaikan tema gelap dengan sistem desain baru.

## 17-08-2026 — Perbaikan alur dokumen KP dan bug kehilangan data

- Mengaktifkan kembali unggahan dokumen Kelayakan KP dan Kelayakan Proposal KP oleh mahasiswa.
- Memperbaiki masalah kotak unggah Surat Balasan Perusahaan yang tidak muncul.
- Mengubah panel dokumen KP menjadi tab berdasarkan tahapan.
- Menyederhanakan alur Surat Perpanjangan KP.
- Menambahkan tag `{judul_kp}` yang sebelumnya belum tersedia.
- Menghapus fitur Surat Perubahan Judul karena sebelumnya ditambahkan tanpa diminta.
- Menemukan penyebab data hilang setelah unggah file, yang kemudian diperbaiki melalui restrukturisasi database dan penyimpanan file pada 24 Agustus.

## 13-08-2026 — Fitur baru

- Menambahkan satu nomor surat yang digunakan untuk seluruh dokumen mahasiswa selama program.
- Menambahkan pengisian nilai akhir khusus admin pada tahap Lulus.
- Memindahkan unggahan Berita Acara Seminar KP ke admin.
- Menambahkan nomor urut tetap dan pengelompokan data mahasiswa berdasarkan periode atau angkatan.
- Menambahkan field Dosen Wali beserta tag untuk template dokumen.
- Menambahkan dokumen Kelayakan KP dan Kelayakan Proposal KP.
- Menambahkan informasi periode aktif pada halaman login.
- Menambahkan area unduhan panduan yang dapat dikelola admin.
- Menambahkan grafik "Lulus per Angkatan" di dashboard.