# Changelog

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