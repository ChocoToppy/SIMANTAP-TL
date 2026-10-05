# Changelog

## 05-10-2026 — Nomor surat otomatis + registri
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