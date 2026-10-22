# Changelog

## 22-10-2026 (2) — Batas sesi login
- Satu login berlaku untuk semua tab, dan berakhir bila: semua tab SIMANTAP ditutup (dicek saat tab baru dibuka; reload dan tab yang dipulihkan browser tidak dihitung), tidak ada aktivitas di tab mana pun selama 30 menit (admin), 60 menit (dosen) atau 2 jam (mahasiswa), atau 12 jam sejak login (`utils/sesi.js`).
- Satu menit sebelum keluar otomatis muncul peringatan dengan hitung mundur: "Tetap masuk" atau aktivitas apa pun memperpanjang batas diam; batas 12 jam tidak bisa diperpanjang. Halaman login menyebut alasannya. Perubahan yang belum disimpan hilang bila waktu habis.
- Pilihan "Ingat saya" dihapus dari ketiga form login.
- `firestore.rules` & `storage.rules`: `isSignedIn()` menolak login yang lebih dari 12 jam (`auth_time`), jadi batas ini tidak bisa dilewati dari klien. Batas diam dan "semua tab ditutup" hanya di aplikasi.
- Setelah versi ini dibuka pertama kali, semua pengguna perlu login sekali lagi.

## 22-10-2026 — "Semua periode" sebagai arsip per halaman
- "Semua periode" tidak lagi memuat seluruh data mahasiswa. Tabel Mahasiswa-nya diambil per halaman dari Firestore (`useArsipMahasiswa.js`): urutan bawaan = urut masuk, terlama dulu; kolom No. = posisi baris di hasil saat ini (lanjut antar halaman); tombol « ‹ › dan "x–y dari N"; refresh kembali ke halaman 1.
- Di arsip: cari = awalan nama atau NIM (cari di tengah kata tetap ada di tampilan per periode), urutan hanya No., Mahasiswa, Tahap & jadwal, Deadline. Filter deadline (mendekati/lewat) tidak bisa digabung dengan pencarian. Ekspor dari arsip mengambil semua baris yang cocok saat tombol ditekan.
- Membuka record dari arsip memuat periode record itu dulu, supaya grafik beban mini dan cek bentrok/nomor di form tetap lengkap. Simpan/hapus dari arsip membawa salinan record, jadi slot pengajuan, nomor surat dan berkas tetap dibereskan walau periodenya belum dimuat.
- Dashboard & Dosen di "Semua periode": angka dari data yang dimuat (belum Lulus) ditambah jumlah lulus dari dokumen `statistik/lulus`.
- "Kelompokkan per Angkatan" tetap memuat semua data (nomor per angkatan lintas periode). Pengelompokan bawaan di "Semua periode" kini Normal, bukan per periode.
- Server: trigger baru `jagaIndeksArsip` (`functions/indeksArsip.js`) menjaga koleksi `indeksMahasiswa` (salinan field yang bisa di-query, terpisah dari record supaya tulisan mahasiswa tidak tertolak rules) dan `statistik/lulus`. Skrip `functions/migrate-indeks-arsip.js` mengisi/menghitung ulang keduanya. `firestore.rules`: keduanya hanya dibaca admin, tidak bisa ditulis klien. `firestore.indexes.json` baru (76 indeks komposit), ditautkan di `firebase.json`.
- Urutan deploy: functions → rules & indeks → skrip `--tulis` → aplikasi. Sebelum itu arsip menampilkan pesan bahwa aturannya belum di-deploy.

## 21-10-2026 (4) — Tampilan admin tersimpan di URL
- Tab admin kini punya alamat sendiri: `/dashboard`, `/mahasiswa`, `/dosen`, `/ruang`. `/` dan alamat tak dikenal diarahkan ke `/dashboard`. Seksi Pengaturan juga: `/pengaturan/periode`, `/pengaturan/nomor-surat`, dst.
- Periode (`?periode=`, `semua` untuk Semua periode) dan program (`?program=KP`, Dashboard `?program=semua`) selalu ditulis di URL, termasuk nilai bawaannya, supaya tautan lama tetap membuka tampilan yang sama walau periode baru dibuka atau program bawaan tabel Mahasiswa (`PROGRAM_AWAL_MAHASISWA`, kini KP) kelak diganti. Kelima kode program berlaku di semua build; kode huruf kecil dirapikan (`mg` → `MG`) dan kode tak dikenal jatuh ke program bawaan. Tautan ke periode lama memuat periode itu seperti saat dipilih dari pilihan periode; periode tak dikenal jatuh ke periode terbaru.
- Tabel Mahasiswa: cari, filter (status, angkatan, bidang, verifikasi, dosen), urutan, pengelompokan, baris per halaman dan halaman disimpan di URL (`useFilterMahasiswa.js`). Nilai bawaan tidak ditulis. Refresh dan tautan yang ditempel mengembalikan tampilan yang sama. Kolom tersembunyi tetap disimpan per browser.
- Tombol Kembali/Maju browser: berpindah antar tab, periode, program dan seksi Pengaturan. Mengetik, mengubah filter, mengurutkan dan berpindah halaman tidak menambah riwayat. Kembali dari editor Pengaturan yang masih punya draf meminta konfirmasi.
- Pindah tab mengembalikan filter terakhir tab tujuan; "← Kembali" dari Pengaturan kembali ke tab dan filter terakhir (setelah refresh: ke Dashboard).
- Router ditulis sendiri di `utils/rute.js` (tanpa library). Portal mahasiswa, portal dosen dan form edit mahasiswa tidak berubah; refresh tetap menutup form edit.

## 21-10-2026 (3) — Admin tidak lagi memuat seluruh data mahasiswa
- Admin kini memuat semua pengajuan yang belum Lulus (periode mana pun) ditambah seluruh isi 2 periode terbaru (`useMahasiswaAdmin.js`). Memilih periode lain di pilihan periode memuat periode itu; "Semua periode" memuat semuanya. Data yang sudah dimuat tetap ada sampai logout. Mahasiswa dan dosen tidak terpengaruh (query mereka sudah terbatas).
- Daftar periode untuk pilihan periode disimpan di `config/global.daftarPeriode`, supaya periode lama tetap muncul walau datanya belum dimuat. Diisi otomatis sekali saat admin pertama membuka aplikasi (membaca seluruh koleksi satu kali), lalu bertambah saat periode dibuka atau data disimpan dengan periode baru.
- Tabel Mahasiswa: "Kelompokkan per Angkatan" memuat semua data, karena nomor per angkatan dihitung lintas periode. Pencarian tanpa hasil di satu periode menyarankan memilih "Semua periode".
- Banner pengajuan ditutup: pengecekan "sudah ada pengajuan baru yang terbuka" membaca langsung pengajuan milik mahasiswa itu dari Firestore, tidak lagi hanya dari data yang dimuat.
- Hapus akun mahasiswa: pengajuannya dibaca dulu dari Firestore supaya nomor surat pengajuan lama (yang tidak dimuat) tetap diakhiri.
- Jadwal ruang: sinkron otomatis hanya menghapus booking milik mahasiswa yang sedang dimuat. Booking mahasiswa yang dihapus kini dihapus langsung saat mahasiswa/akunnya dihapus (`hapusBookingMahasiswa`).
- Pengaturan → Nomor Surat: hanya memuat tahun yang dipilih, bawaannya tahun ini. Pilihan tahun tersedia dari nomor tertua sampai tahun ini; "Semua tahun" memuat semuanya.
- Muncul keterangan "Memuat data mahasiswa…" selama data dimuat, dan banner merah dengan tombol "Coba lagi" bila sebagian data gagal dimuat.
- Periode kini diurutkan kronologis (`urutPeriode` di `helpers.js`), bukan abjad. Urut abjad menaruh semua "Gasal …" sebelum "Genap …" dan periode uji ("Test Genap") di akhir, sehingga periode bawaan admin bisa jatuh ke periode yang salah. Nama periode tanpa tahun + Gasal/Ganjil/Genap ditaruh paling awal.

## 21-10-2026 (2) — Pendaftaran TA: jenis TA, kelayakan, syarat SKS oleh admin
- Form pendaftaran TA punya isian baru "Jenis Tugas Akhir" (wajib, mulai kosong): Reguler (penelitian/skripsi) atau Proyek dosen (`pendaftaran.jenisTA`). Proyek dosen memunculkan isian "Dosen pengusul proyek" (wajib; `namaPersetujuanDosen`, sebelumnya opsional untuk semua TA); Reguler menyembunyikannya.
- Dokumen Pendaftaran TA mengikuti jenisnya: Reguler → Persetujuan UGB (`persetujuan-ugb`), Proyek dosen → Persetujuan Proyek Dosen (`persetujuan-proyek-dosen`, baru; tag diganti ke `{nama_dosen_proyek}` `{nip_dosen_proyek}` `{judul_ta}`). Dokumen tampil lewat `tampil(m)` di `TA_DOKUMEN`; syarat masuk Bimbingan (`unggahanPendaftaranTA` / aturan `firestore.rules`) ikut menyesuaikan.
- Persetujuan Dosen Pembimbing dihapus seluruhnya (dokumen, generator, syarat masuk Bimbingan). Pembimbing ditentukan admin.
- Form Kelayakan TA kini punya template (`kelayakan-ta`) dengan data baru dari form pendaftaran: Total SKS lulus (`totalSks`) dan Skor TOEFL (`toefl`), plus IPK dan dosen wali.
- Centang "Sudah lulus 120 SKS dengan IPK ≥ 2,00" pindah ke admin (modal admin, tab Pendaftaran TA; Capstone di modal generik), diperiksa dari tautan berkas; mahasiswa tidak lagi bisa mengisinya (`syaratSKS` keluar dari `fieldPendaftaran` di `firestore.rules`).
- Tautan berkas TA kini berisi: Proposal, Transkrip, IRS, Sertifikat TOEFL (tampil juga di tab Pendaftaran admin).
- `firestore.rules`: field pendaftaran baru `jenisTA` (hanya '', 'reguler', 'proyek'), `totalSks`, `toefl`.

## 21-10-2026 — Angkatan wajib di semua program
- Isian Angkatan di form pendaftaran mahasiswa kini selalu wajib (ditandai *, divalidasi saat kirim) untuk semua program, lewat `wajibTetap` di `formPendaftaran.js`; tombol wajibnya di Pengaturan → Form Pendaftaran terkunci menyala. Sebelumnya tidak wajib di kode, dan hanya wajib bila admin menyalakan tombolnya per program.
- `firestore.rules` menolak pengajuan baru tanpa angkatan dan edit yang mengosongkannya. Pengajuan lama yang angkatannya kosong tetap bisa diedit selama angkatannya tidak diubah menjadi kosong; data lama tidak diisi otomatis.

## 20-10-2026 (3) — TA memakai daftar Tema yang sama dengan KP
- Dropdown Topik/Bidang TA kini berisi daftar Tema yang sama dengan KP & Magang (`KP_TEMA`, diubah di Pengaturan → Form Pendaftaran pada kartu Tema/Bidang mana pun dari ketiga program itu). Daftar Bidang lama (`BIDANG`) tinggal untuk Capstone & Tesis S2. Aturannya satu tempat: `pakaiTemaKP` di `utils/pilihan.js`, dipakai form pendaftaran mahasiswa, modal admin, filter tabel Mahasiswa, dan editor Pengaturan.
- Data lama: pengajuan TA yang menyimpan kode Bidang lama (mis. "Air Limbah") tetap tercetak dengan label lamanya, tapi dropdown-nya menampilkan "… (tidak valid, pilih ulang)". `functions/laporan-tema-bidang.js` kini ikut mendaftar pengajuan TA tersebut.

## 20-10-2026 (2) — Ketua & Anggota Penguji dihitung terpisah di semua grafik beban
- Ketua Penguji (penguji1) dan Anggota Penguji (penguji2) kini peran berbeda di semua grafik beban, tidak lagi dijumlah sebagai "penguji": `hitungBeban` mengembalikan `penguji1` & `penguji2` (total `penguji` tetap ada).
- Modal admin TA: tab Seminar Proposal menampilkan beban Ketua Penguji saja; tab Sidang dan halaman data menampilkan dua grafik (Ketua & Anggota). Program lain tetap satu grafik penguji gabungan (`BebanDosenMini`).
- Dashboard: grafik "Penguji" dipecah menjadi "Ketua Penguji" dan "Anggota Penguji".
- Halaman Dosen: pilihan peran bernama "Ketua Penguji" dan "Anggota Penguji" (sebelumnya "Penguji 1 · Ketua (TA)" / "Penguji 2 · Anggota (TA)"), begitu pula kolom ekspor. Penguji 1/2 Capstone & Tesis S2 ikut terhitung di peran yang sama.

## 20-10-2026 — TA: tahap Bimbingan, Ketua/Anggota Penguji; beban dosen per peran
- TA kini Pendaftaran → **Bimbingan** → Seminar Proposal → Seminar Hasil → Sidang → Lulus. Mengunggah berkas Pendaftaran terakhir (Persetujuan UGB, Persetujuan Dosen Pembimbing, Surat Kelayakan TA, Lembar Pengesahan Proposal TA; `UNGGAHAN_PENDAFTARAN_TA`) memindahkan mahasiswa ke Bimbingan dan menandai "Menunggu verifikasi" supaya admin menetapkan pembimbing; `tahapMhsAman` di `firestore.rules` mengizinkan langkah ini hanya bila keempat berkas ada. Bimbingan → Seminar Proposal tetap lewat admin.
- Dropdown dosen pembimbing (dan panel Nomor Surat) TA pindah dari tab Pendaftaran ke tab Bimbingan di modal admin.
- Dokumen baru: "Lembar Pengesahan Proposal TA" (Pendaftaran; template `lempeng-proposal-ta` menyusul, sementara tampil "Template surat belum tersedia") dan "Surat Tugas Pembimbing TA" (Bimbingan, `TA/st-pembimbing-ta.docx`, diunduh mahasiswa setelah semua berkas Pendaftaran terunggah dan admin menetapkan pembimbing serta nomor surat).
- Kartu mahasiswa TA: di Pendaftaran meminta semua berkas, di Bimbingan menunggu pembimbing / memberi tahu ST sudah tersedia.
- Form pendaftaran TA: isian tautan berjudul "Link pengiriman berkas — Google Drive" dengan isi bernomor di bawahnya (Proposal, Transkrip, IRS).
- TA: Penguji 1 = **Ketua Penguji**, Penguji 2 = **Anggota Penguji** (label di modal admin, kolom tabel, kartu mahasiswa, kolom peran portal dosen).
- Halaman Dosen: beban dipisah per peran (Pembimbing, Penguji 1 · Ketua, Penguji 2 · Anggota), dirinci per program, dengan pilihan tampilan Grafik (batang bertumpuk mendatar per dosen, rincian saat diarahkan/difokus) atau Tabel (dengan Edit/Hapus). Pilihan diingat per perangkat. Ekspor memuat ketiga peran. `hitungBebanPeran` di `helpers.js`, `pages/dosen/BebanDosen.jsx`.

## 19-10-2026 (3) — Cache lokal & data contoh dihapus
- Aplikasi tidak lagi menyimpan salinan data (mahasiswa, dosen, akun) di `localStorage` browser. Sebelumnya salinan ini tertinggal setelah logout, termasuk NIM, nomor WA, alamat, dan tautan berkas, dan bisa sekilas menampilkan data pengguna sebelumnya. Sisa cache lama (`sistem-ta-v2`) dihapus otomatis saat aplikasi dibuka. Yang masih disimpan di browser hanya preferensi tampilan (tema, ukuran teks, sidebar, kolom tabel).
- Data contoh dihapus dari `src/data/seed.js` (mahasiswa fiktif, daftar dosen lama, pengumuman contoh). Project Firebase yang masih kosong kini hanya dibuatkan `config/global` kosong; dosen ditambahkan lewat Pengaturan → Staf atau tab Dosen.
- Periode awal di halaman admin tetap periode terbaru, dipilih begitu data dari Firestore tersedia.
- Skrip lama `update_dosen.mjs` (menulis dosen dari seed ke dokumen `sistem_ta/global_state` yang sudah tidak dipakai) dihapus.
- Realtime Database (`simantap-tl-default-rtdb`) berisi salinan data contoh lama dengan aturan publik dan tidak dipakai aplikasi; dihapus lewat Firebase Console.

## 19-10-2026 (2) — Dropdown form pendaftaran mulai kosong
- Form pendaftaran mahasiswa (pengajuan baru): Periode, Jenis (Magang/MKT), Klasifikasi, Tema/Bidang, dan Status Kerja Praktik kini mulai kosong dengan teks "— pilih … —" dan wajib dipilih (ditandai *, divalidasi saat kirim; di Pengaturan → Form Pendaftaran tombol wajibnya terkunci menyala lewat `wajibTetap`). Sebelumnya terisi otomatis (periode terbuka pertama, Magang, Penelitian, tema/bidang pertama, Telah) sehingga mahasiswa melewatinya tanpa memilih. Program tetap terpilih karena isi form bergantung padanya.
- Mengganti program kini mengosongkan Tema/Bidang yang tidak berlaku untuk program baru (tidak lagi diganti otomatis ke pilihan pertama).
- Pengajuan lama dan modal admin tidak berubah.

## 19-10-2026 — Perbaikan Tema KP tercetak "Udara"
- Penyebab: form pendaftaran mahasiswa (dan modal tambah admin) selalu mulai dengan `bidang: 'U'` (kode Bidang TA "Udara"). Untuk KP/Magang kode itu tidak ada di daftar Tema KP, jadi dropdown menampilkan tema pertama ("Perencanaan Bangunan Pengolahan Air Minum") sementara yang tersimpan tetap 'U'; mahasiswa yang tidak menyentuh dropdown mendapat `{tema_kp}` = "Udara" di surat.
- Nilai awal kini diambil dari daftar program itu sendiri (Tema KP pertama untuk KP/Magang, Bidang pertama untuk TA/Capstone/S2) di `FormPendaftaran.jsx` dan `FormMahasiswa.jsx`; modal admin juga menyesuaikan kode saat program diganti.
- Modal admin bertab (`FormMahasiswaKP.jsx`, dipakai juga untuk TA) menampilkan daftar Bidang untuk TA, bukan Tema KP.
- Dropdown tema/bidang (`untukPilihan` di `pilihan.js`) menampilkan nilai tersimpan yang bukan milik daftarnya sebagai "… (tidak valid, pilih ulang)", tidak lagi diam-diam menampilkan opsi pertama.
- Data lama tidak diubah otomatis. `functions/laporan-tema-bidang.js` (laporan saja) mendaftar pengajuan yang kodenya tidak cocok dengan programnya, untuk diperbaiki lewat modal edit admin.

## 16-10-2026 (3) — QR verifikasi surat KP
- Surat KP yang sudah bertanda tangan (`pembimbing-kp-st`, `penilaian-kp`, `perpanjangan-kp`) kini memuat QR ke halaman publik `/verifikasi/{token}`. Halaman itu menampilkan apakah surat masih berlaku, lalu nomor surat, keperluan, nama, NIM, program, judul, periode, dan waktu terakhir dicetak. Tanpa login.
- Token acak per (mahasiswa, jenis surat, nomor surat), bukan nomor surat (nomor urut bisa ditebak). Diterbitkan Cloud Function `terbitkanVerifikasi` (`functions/verifikasiSurat.js`) saat surat diunduh, dengan aturan siapa yang boleh mengunduh sama seperti di aplikasi: admin, mahasiswa pemilik (unduhan tidak terkunci), dosen yang ditugaskan (Surat Tugas saja). Data di halaman dihitung server dari record yang tersimpan. Satu token per versi isi surat: mengunduh ulang dengan data tercetak yang sama memakai token lamanya, data yang berubah (atau nomor yang diganti) menghasilkan token baru. Kertas versi lama tetap menampilkan datanya sendiri dan tetap dianggap asli (isinya benar saat dicetak), lihat "Surat versi lama" di bawah.
- Saat QR dipindai, data di kertas juga dibandingkan dengan data tersimpan sekarang (nama, NIM, judul, periode), tanpa menunggu ada yang mengunduh ulang. Bila berbeda, putusannya menjadi "Surat versi lama" (garis & judul kuning, di antara hijau "Surat terverifikasi" dan merah "Surat tidak berlaku"): surat itu asli, tetapi datanya sudah diperbarui di SIMANTAP pada <tanggal> setelah dicetak, versi terbarunya tersedia di SIMANTAP-TL, dan pembaca diminta meminta salinan terbaru kepada mahasiswa. Tanpa daftar field. Tanggalnya dari `dataSuratDiubah/{mahasiswaId}`, dicatat trigger `catatPerubahanDataSurat` setiap kali field yang tercetak berubah (nama, NIM, judul, tanggal mulai, batas akhir, riwayat perpanjangan) lewat jalur mana pun; perubahan sebelum trigger ini ada tampil tanpa tanggal. Dilewati selama ada perubahan data dari mahasiswa yang belum diverifikasi admin, supaya nilai yang belum resmi tidak tampil di halaman publik.
- "Berlaku" dibaca saat QR dipindai (`verifikasiSuratPublik`): nomor di registri masih aktif, masih nomor milik record itu, dan pengajuan tidak ditutup. Nomor yang diakhiri membuat semua surat lamanya tampil "Surat tidak berlaku".
- Unduhan surat ber-QR kini gagal dengan pesan jelas bila nomor surat belum tercatat, perpanjangan belum disetujui, atau isi form admin berbeda dengan data tersimpan ("Simpan data mahasiswa dulu, lalu unduh lagi"). Sebelumnya surat tanpa nomor tetap tercetak dengan `___/UN7.../2026`.
- Template: QR ditandai gambar placeholder ber-alt text `qr-verifikasi` (lihat `List of Tags.txt`); gambarnya diganti di `qrVerifikasi.js`. Dependensi baru: `qrcode`.
- `firestore.rules`: koleksi `verifikasiSurat` dan `dataSuratDiubah` tertutup untuk klien. Deploy: `firebase deploy --only functions,firestore:rules`, lalu aplikasi.

## 16-10-2026 (2) — Lembar Pengesahan Proposal KP
- Tahap Pendaftaran KP punya dokumen baru "Lembar Pengesahan Proposal KP" (`lembarPengesahanProposalKP` di `KP_DOKUMEN`, template `KP/lempeng-proposal-kp.docx`), sejajar dengan dua surat kelayakan: tersedia setelah pendaftaran diverifikasi, diunduh sebagai Word yang bisa diedit (`docx: true`), lalu pindaian bertanda tangan diunggah kembali sebagai PDF.
- Template: tag judul yang tertulis `(judul_kp)` (kurung biasa) dibetulkan menjadi `{judul_kp}`; isi lain template tidak diubah.

## 16-10-2026 — Status dokumen admin mengikuti kunci unduhan mahasiswa
- Panel dokumen admin: dokumen berstatus "Siap diunduh" (panah biru) kini tampil sebagai gembok kuning saat unduhan mahasiswa dikunci, yaitu saat ada perubahan data yang belum diverifikasi ulang atau status Perlu perbaikan. Tooltip: "Terkunci untuk mahasiswa (menunggu verifikasi ulang data)" / "(perbaiki data sesuai pesan admin)". Admin tetap bisa mengunduh lewat ikon printer. Gembok abu-abu tetap berarti dokumen belum tersedia.

## 16-10-2026 (2) — Simpan tidak menutup modal edit
- Modal edit admin: "Simpan" kini menyimpan tanpa menutup modal (tombolnya menampilkan "Tersimpan ✓" sebentar), jadi panah ‹ › bisa langsung dipakai ke entri berikutnya. Setelah tersimpan, isi form diselaraskan ke record versi tersimpan (`awal` dari `Mahasiswa.jsx` mengikuti data terbaru), termasuk patokan "belum disimpan", banner perubahan data, dan centang unggah ulang. Menambah mahasiswa baru tetap menutup modal setelah Simpan.
- Panah ‹ › dengan perubahan yang belum disimpan kini bertanya "Simpan perubahan lalu pindah?": OK menyimpan (dengan pemeriksaan yang sama seperti tombol Simpan) lalu pindah, Batal tetap di entri ini. Sebelumnya pilihannya membuang perubahan.
- Perbaikan: urutan ‹ › kini dibekukan saat modal dibuka (`urutanBeku` di `Mahasiswa.jsx`). Sebelumnya urutannya mengikuti filter/sortir tabel secara langsung, jadi menyimpan entri yang lalu keluar dari filter (mis. filter "Menunggu verifikasi" lalu disimpan Terverifikasi) membuat tombol ‹ › hilang.
- Tombol kiri footer "Batal" menjadi "Tutup" untuk record lama. Menutup modal (Tutup, ✕, atau klik di luar) dengan perubahan yang belum disimpan meminta konfirmasi dulu.

## 16-10-2026 — Generator surat TA lama dihapus
- Kode mati dihapus dari `helpers.js`: generator surat TA teks/HTML lama (`dokTA`, `TEMPLATE_SURAT`, `tokenSurat`, `renderSurat`, `KOP_SURAT`, `KOP_SURAT_HTML`, `evKeyDok`, `PEJABAT`) beserta import `logo-undip.png`. Pemanggil terakhirnya (surat perpanjangan di `FormMahasiswaGeneric.jsx`) sudah dihapus di entri 15-10-2026 (5), dan generator ini masih memakai susunan 2 pembimbing + 4 dosen. Dokumen TA tetap dibuat dari template .docx lewat `documentGenerator.js`.
- Import yang tidak terpakai di `App.jsx`, `ui.jsx`, `Dashboard.jsx`, dan `Dosen.jsx` ikut dibersihkan. Tampilan tidak berubah.

## 15-10-2026 (7) — Perubahan data mengunci unduhan sampai diverifikasi ulang
- Mahasiswa yang sudah pernah diverifikasi lalu mengubah data yang tercetak di dokumen, lewat Edit pendaftaran atau mengunggah ulang surat balasan (data perusahaan), kini mendapat penanda `perubahanData` (`hitungPerubahanData` di `helpers.js`): daftar field yang berubah beserta nilai lama (saat terakhir diverifikasi) dan baru. Beberapa kali edit sebelum admin memeriksa digabung; field yang dikembalikan ke nilai lamanya dibuang, dan bila tidak ada yang tersisa penandanya hilang. Nomor WA, alamat, dan link berkas tidak tercetak di dokumen, jadi tidak dihitung.
- Selama penanda ada, semua unduhan dokumen hasil template di sisi mahasiswa terkunci di semua tahap, termasuk dokumen tahap Pendaftaran dan surat perpanjangan (`bolehUnduhDokumen`, alasannya lewat `alasanUnduhTerkunci`). Unggah berkas dan kirim tautan tetap terbuka. Pemicu "Menunggu verifikasi" lain (surat balasan pertama tanpa perubahan data, usulan jadwal, tautan Pembukuan, perpanjangan) tidak mengunci unduhan; dokumen tahap berikutnya tetap mengikuti syarat masing-masing (mis. menunggu dosen pembimbing).
- Mahasiswa melihat pemberitahuan kuning di kartu pengajuan dan halaman dokumen: "Perubahan data terdeteksi. Tunggu verifikasi ulang oleh admin." dengan field yang diubah sebagai chip (`portal/PerubahanDataNotice.jsx`). Keterangan unduhan terkunci dipersingkat: "Dikunci: menunggu verifikasi ulang data." / "Dikunci: perbaiki data sesuai pesan admin."
- Admin melihat banner "Data diubah mahasiswa" di atas modal edit, berisi waktu dan nilai lama → baru per field (`mahasiswa/BannerPerubahanData.jsx`). Menyimpan dengan status Terverifikasi menghapus penandanya dan membuka unduhan lagi.
- Berkas bertanda tangan yang diunggah sebelum data berubah (versi isi template, tanggal unggah ≤ edit pertama, `perubahanData.sejak`; surat balasan dikecualikan) tampil di banner admin sebagai centang "Minta unggah ulang", tanpa centang bawaan (`berkasSebelumPerubahan`). Berkas yang dicentang tidak dihapus, tetapi ditandai `perluUlang`: di halaman dokumen mahasiswa slotnya kuning bertuliskan "Unggah ulang" (tooltip: data berubah setelah berkas ini diunggah), ringkasan di kartu menampilkan "n perlu diunggah ulang" (`jumlahPerluUlang`), dan panel dokumen admin memakai ikon status kuning "Diminta unggah ulang". Tandanya hilang sendiri begitu berkas pengganti diunggah.
- `firestore.rules`: `perubahanData` ditambahkan ke field yang boleh ditulis mahasiswa, hanya bersamaan dengan status kembali ke 'baru' (`perubahanDataAman`). Deploy: aplikasi dan `firebase deploy --only firestore:rules` berdekatan.

## 15-10-2026 (6) — "Ditutup" didesain ulang
- Modal edit admin (semua tata letak): centang "Ditutup" diganti bagian "Tutup pengajuan" di dasar modal, berisi penjelasan singkat akibatnya dan tombol merah bergaris "Tutup pengajuan". Tombol itu membuka isian alasan (wajib, terlihat oleh mahasiswa) dengan tombol "Tutup" yang baru aktif setelah alasan diisi. Bagian ini tidak tampil untuk mahasiswa baru.
- Pengajuan yang ditutup ditandai banner merah di atas modal (di halaman utama maupun Edit data): "Ditutup <tanggal>", alasannya, dan tombol "Buka kembali" (nonaktif bila mahasiswa sudah punya pengajuan baru yang terbuka). Data lama yang ditutup tanpa alasan menampilkan isian alasan langsung di banner, karena Simpan tetap menolak penutupan tanpa alasan. Semua perubahan berlaku setelah Simpan.
- Tombol `.btn-danger` dan `.btn-danger-outline` baru di `styles.css`.
- Panel dokumen (`KpDocumentPanel`, dipakai di modal edit admin dan pratinjau Pengaturan → Konten): label status di samping nama dokumen diganti ikon berwarna dengan warna yang sama: centang hijau (Terunggah/Disetujui), panah unduh biru (Siap diunduh), panah unggah kuning (Belum diunggah), tautan kuning (Belum dikirim), jam kuning (Menunggu diperiksa), gembok abu-abu (Belum tersedia), dokumen dicoret abu-abu (Template belum ada). Teks status muncul saat kursor diarahkan dan dibacakan pembaca layar.
- Panel dokumen di modal edit admin: tombol "Unduh PDF"/"Unduh Word" diganti tombol ikon printer (sama dengan cetak surat perpanjangan) di baris nama dokumen, di samping ikon status. Portal mahasiswa dan pratinjau Pengaturan tetap memakai tombol berteks.
- Berkas terunggah dan tautan terkirim di panel dokumen tampil sebagai kotak ringkas: ikon berkas/tautan, nama satu baris (dipotong bila panjang, nama lengkap di tooltip), dan tanggal unggah kecil di bawahnya. Sebelumnya nama berkas bergaris bawah hijau dengan tanggal yang ikut terbungkus ke baris berikutnya.
- Catatan dokumen (mis. "Unggah berkas permohonan dari perusahaan tempat Anda diterima KP.") tidak lagi tampil di panel dokumen admin karena ditujukan ke mahasiswa. Portal mahasiswa dan pratinjau Pengaturan tetap menampilkannya. Begitu juga kalimat syarat dokumen yang belum tersedia (mis. "Tersedia setelah admin memverifikasi tautan folder berkas final."): untuk admin, syarat itu pindah ke tooltip ikon gembok.
- Blok "Alur tahap" di modal edit admin disederhanakan: memakai `StageStepper` (langkah bernomor dengan ✓ untuk yang selesai, seperti di kartu Portal versi HP) beserta keterangan "Tahap x dari n". Mundur/lanjut menjadi dua tombol panah di kanan baris "Tahap x dari n" (panah lanjut hijau; tujuan di tooltip; nonaktif di tahap pertama/terakhir), lewat prop baru `aksi` pada `StageStepper`. Tombol kecil "Tidak lulus" ada di baris info kegiatan, hanya bila tahap ini punya kegiatan.
- Tab tahap di modal edit admin KP/Magang/TA: tab yang sesuai tahap mahasiswa saat ini (`m.tahap`) diberi kotak kecil kuning di depan namanya (tooltip "Tahap mahasiswa saat ini"). Penanda ini mengikuti `m.tahap`, jadi ikut berpindah saat tahap dimajukan/dimundurkan lewat panah Alur tahap atau dropdown, terpisah dari tab yang sedang dibuka.
- Panah mundur Alur tahap: mundur dari Lulus kini mengosongkan Tanggal lulus. Saat mahasiswa dilanjutkan ke Lulus lagi, tanggalnya terisi ulang dengan tanggal hari itu, bukan tanggal kelulusan lama. Mengganti tahap lewat dropdown "Tahap saat ini" tidak mengubah tanggal lulus.
- Tombol "Edit data" di kotak identitas modal edit admin menjadi tombol ikon pensil (`PencilIcon` di `ui.jsx`, sama dengan ikon edit tautan), di samping ikon pesan; teks "Edit data" ada di tooltip.
- Kotak tautan dari mahasiswa (`LinkBerkasRow`: berkas persyaratan, Turnitin, folder sidang, folder Pembukuan) saat terkunci kini abu-abu dengan kursor biasa (bukan kursor ketik), tanpa caret dan sorotan fokus, dan dilewati tombol Tab. Setelah ikon pensil ditekan, kotak kembali tampil seperti isian biasa.
- Panel dokumen admin KP: "Berita Acara & Penilaian KP" ikut tampil di tab Lulus (nilai di tab itu diisi dari lembar ini), dalam tampilan ringkas yang hanya menampilkan versi terunggah (yang sudah dinilai): nama, ikon status (centang hijau bila sudah diunggah, ikon unggah abu-abu "Belum diunggah (unggah di tab Bimbingan)" bila belum), dan kotak berkasnya. Tanpa tombol unduh templat maupun unggah/ganti/hapus; semuanya tetap di tab Bimbingan. Diatur lewat properti baru `adminJugaDiTahap` di daftar dokumen dan opsi `{ admin }` pada `dokumenPerTahap`; Portal mahasiswa dan pratinjau Pengaturan tidak berubah.
- Tabel Mahasiswa: kolom Aktivitas kini disortir menurut aktivitas terbaru tiap mahasiswa (entri log paling akhir, sama dengan yang tampil di sel), bukan tanggal pendaftaran. Klik pertama langsung menampilkan yang terbaru di atas. Data lama tanpa log memakai tanggal pendaftaran. Urutan pendaftaran tetap bisa dilihat lewat sortir kolom No. Kalimat "Tahap saat ini: … → berikutnya: …" dan petunjuk dropdown/Simpan dihapus. Info kegiatan tahap ini kini satu baris (nama kegiatan, tanggal, jam, ruang) dengan lencana status jadwal (Jadwal final / Menunggu verifikasi / Belum dijadwalkan / Tidak lulus, ulang); isian tautan berkas persyaratan yang sama sudah ada di blok Jadwal tahap itu, jadi tidak diulang di sini.

## 15-10-2026 (5) — Petunjuk di balik tombol lampu
- Panel Nomor Surat: baris "Perpanjangan disetujui: x / y (+n bulan tiap kali…)" dihapus; jatahnya sudah tampil di meter panel Perpanjangan. Peringatan kuning "Batas akhir sudah lewat dan jatah perpanjangan habis" tetap ada.
- Tombol "Akhiri & daftar ulang" dihapus (beserta `akhiriNomor` di `nomorSuratDb.js` dan `patchDaftarUlang` di `nomorSurat.js`). Tombol itu mengosongkan nomor, pembimbing, dan riwayat perpanjangan serta menghapus berkas pada pengajuan yang sama, langsung tanpa Simpan. Gantinya centang "Ditutup": pengajuan lama menjadi arsip utuh dan mahasiswa mendaftar ulang sebagai pengajuan baru. Peringatan kuning kini mengarahkan ke Edit data (bila dosen masih bersedia) atau Ditutup.
- Kode mati dihapus: blok Perpanjangan di `FormMahasiswaGeneric.jsx` (hanya untuk TA/KP/Magang, padahal ketiganya selalu memakai `FormMahasiswaKP.jsx`), komponen `PersetujuanPerpanjangan.jsx` (sudah diganti `PanelPerpanjangan.jsx`), serta state & fungsi unggah surat perpanjangan admin (`ppBusy`, `ppErr`, `berikanSuratPerpanjangan`, `setPP`) di `FormMahasiswa.jsx` yang tidak pernah diteruskan ke tata letak mana pun. Tampilan tidak berubah.
- Tab Pembukuan (modal edit admin KP): kotak biru "Daftar berkas dalam folder" disembunyikan dan dibuka lewat tombol lampu di kanan judul "Pembukuan", sama seperti panduan nomor surat. Gaya tombol lampu (`.lampu-btn`) kini berlaku di mana pun, tidak hanya di baris nomor surat.

## 15-10-2026 (4) — Panel Perpanjangan dirapikan
- Modal edit admin KP/Magang/TA: panel Perpanjangan (`mahasiswa/PanelPerpanjangan.jsx`) memakai penanda visual, bukan deretan kalimat. Di judul ada meter jatah (kotak terisi = perpanjangan yang sudah disetujui) dengan teks mis. "0/1 · +1 bln". Status pengajuan berupa lencana: "Diajukan <tanggal>" (kuning), "Disetujui" (hijau), atau "Tidak ada pengajuan" (abu-abu); alasan mahasiswa tampil di bawahnya bila ada. Riwayat perpanjangan berupa daftar ringkas "Ke-1  tanggal lama → tanggal baru".
- Kalimat "Surat perpanjangan belum ditampilkan…", "Surat final … belum diunggah", dan kotak kuning penjelasan persetujuan dihapus. Sebelum menyetujui, panel hanya menampilkan batas akhir lama → baru dan tombol "Setujui perpanjangan" (hijau bila ada pengajuan yang menunggu); penjelasan lengkap tetap ada di dialog konfirmasi. Tautan surat final mahasiswa tampil hanya bila sudah diunggah. Teks meter jatah hanya "0/1" (lama tiap perpanjangan muncul saat kursor diarahkan). Tombol setujui dan cetak menjadi tombol ikon (centang & printer) di kanan tanggal; tombol setujui hijau saat ada pengajuan yang menunggu dan tidak bisa ditekan bila tidak ada pengajuan.

## 15-10-2026 (3) — Tombol "Edit data" & "Ambil nomor"
- Modal edit admin KP/Magang/TA: tombol "Edit data pendaftaran" disingkat jadi "Edit data" dan dipindah dari tab Pendaftaran ke kotak identitas (di samping ikon pesan), jadi terlihat di semua tab tahap. Breadcrumb halamannya ikut menjadi "Edit data".
- Semua grafik beban dosen (Dashboard: Pembimbing per program & Penguji; modal edit mahasiswa: grafik ringkas) kini diurutkan alfabetis menurut kode dosen, bila tersusun beberapa kolom, urutan turun di kolom pertama dulu lalu lanjut ke kolom berikutnya. Sebelumnya Dashboard urut dari beban terbesar dan grafik ringkas dari beban terkecil.
- Modal edit admin KP/Magang/TA: panel tab tahap (kiri) tidak lagi direntangkan setinggi kolom Dokumen + Perpanjangan (kanan), jadi tidak ada ruang kosong besar di bawah isi tab yang pendek. Kedua kolom kini bisa berakhir di ketinggian berbeda.
- Panel Nomor Surat: tombol "Isi nomor berikutnya" berganti nama menjadi "Ambil nomor" (keterangan lengkapnya muncul saat kursor diarahkan). Teks di Pengaturan → Nomor Surat dan panduan format ikut disesuaikan.

## 15-10-2026 (2) — "Dibatalkan" jadi "Ditutup": arsip + daftar ulang
- Status "Dibatalkan" berganti nama menjadi "Ditutup" (field data tetap `dibatalkan`). Di modal edit admin, centang "Ditutup" kini wajib disertai alasan (`penutupan: { alasan, tanggal }`, tanggal terisi otomatis); Simpan ditolak tanpa alasan (`PenutupanPengajuan.jsx`).
- Pengajuan yang ditutup menjadi arsip baca-saja bagi mahasiswa: kartunya hanya menampilkan judul, tanggal & alasan penutupan (tanpa tahapan, dokumen, perpanjangan, atau tombol), ditaruh paling bawah. `firestore.rules` menolak semua perubahan/hapus oleh mahasiswa, `storage.rules` menolak unggahan. Seluruh data, berkas, dan nomor surat tetap tersimpan.
- Mahasiswa boleh mendaftar ulang program yang sama setelah pengajuannya ditutup: pengajuan baru mendapat ID bernomor `{nim}_{program}_2`, `_3`, … (`idPengajuanBaru` di `helpers.js`). Aturan create mengizinkan ID bernomor hanya bila pengajuan sebelumnya ada dan sudah ditutup, jadi tetap satu pengajuan terbuka per program.
- Pengajuan yang ditutup tidak memegang penanda `slotPengajuan` (`slotPengajuanUntuk` di `App.jsx`, ganti NIM di `functions/index.js`, dan `migrate-slot-pengajuan.js`).
- Admin tidak bisa membuka kembali pengajuan yang ditutup bila mahasiswa sudah punya pengajuan terbuka lain untuk program itu.
- Deploy: aplikasi, `firebase deploy --only firestore:rules,storage`, dan `firebase deploy --only functions:studentUpdateProfile`.

## 15-10-2026 — Surat balasan perusahaan mengunci data perusahaan (KP & Magang/MKT)
- Mengunggah atau mengganti surat balasan kini lewat form konfirmasi `portal/FormSuratBalasan.jsx`: mahasiswa memeriksa sekali lagi data yang tertera di surat (Tempat/Perusahaan, Instansi (Kota/Provinsi), Mulai, Berakhir; `MEDAN_SURAT_BALASAN` di `formPendaftaran.js`), wajib mencentang "Data di atas sudah sesuai dengan surat balasan", lalu "Kirim & kunci data". Data itu tersimpan bersama berkasnya.
- Selama surat balasan ada, keempat isian itu terkunci di "Edit pendaftaran" (ikon gembok di tepi kanan, tanpa teks). Isian lain tetap bisa diubah; admin tetap bisa mengubah semuanya.
- Menghapus surat balasan mengembalikan mahasiswa dari Bimbingan ke Pendaftaran (pembimbing & nomor surat tetap, aktivitas `kembaliPendaftaran`) dan membuka kunci data perusahaan; konfirmasi hapus menjelaskan akibatnya. Mengunggah surat baru membawanya kembali ke Bimbingan. Kartu menampilkan langkah "Unggah surat balasan perusahaan" di tahap Pendaftaran.
- Setiap unggahan surat balasan (pertama maupun pengganti) mengembalikan status ke "Menunggu verifikasi" supaya admin mengecek data perusahaannya.
- Sejak tahap setelah Bimbingan (Pembukuan KP / Expo Magang), surat balasan final: tombol Ganti/Hapus hilang (`suratBalasanFinal`).
- `firestore.rules`: `dataPerusahaanAman` (data perusahaan hanya berubah bersamaan dengan surat balasan baru), `sbFinalAman`, Bimbingan → Pendaftaran saat surat dihapus (`tahapMhsAman`), dan `ditandaiMenunggu` mencakup setiap unggahan surat balasan.
- Catatan data lama: mahasiswa yang sudah mengunggah surat balasan sebelum perubahan ini langsung mendapati data perusahaannya terkunci tanpa pernah melihat form konfirmasi.

## 14-10-2026 (5) — Tombol kirim tautan jadi ikon
- Halaman dokumen Portal mahasiswa: tombol "Kirim tautan" (mis. Folder Berkas Final KP) diganti tombol ikon pesawat kertas di kanan isian tautan (`IkonKirim` di `DokIkon.jsx`). Tombol "Batal" saat mengganti tautan tetap di bawah isian.
- Ikon dokumen di halaman yang sama: PDF berwarna merah, DOC (Word) biru (`.ikon-pdf` / `.ikon-doc`).

## 14-10-2026 (4) — Berita Acara & Penilaian KP
- Dokumen baru "Berita Acara & Penilaian KP" di tahap Bimbingan, di samping Lembar Pengesahan (`penilaianKP` di `KP_DOKUMEN`, docType `Penilaian KP`, template `KP/penilaian-kp.docx`), menggantikan BA Seminar KP. Tersedia setelah dosen pembimbing ditetapkan. Dinilai pembimbing di kertas lalu dikembalikan ke admin, jadi hanya admin yang mengunggah hasilnya; `penilaianKP` ditambahkan ke `dokumenAdmin()` (`firestore.rules`) dan `berkasAdmin()` (`storage.rules`).
- Tag jadwal seminar di template diganti karena tahap Seminar KP sudah tidak ada: `{hari_smkp}` → `{hari_cetak}` (tag baru: nama hari tanggal cetak), `{tanggal_smkp}` → `{tgl_cetak}`, `{tempat_smkp}` dihapus (Tempat diisi tangan).

## 14-10-2026 (3) — Alur Pembukuan KP + "Menunggu verifikasi" untuk setiap kiriman
- Lembar Pengesahan KP (template Word + unggahan PDF bertanda tangan) pindah ke tahap Bimbingan (tersedia setelah dosen pembimbing ditetapkan). Mengunggahnya memindahkan mahasiswa dari Bimbingan ke Pembukuan secara otomatis (aktivitas `tahapPembukuan`), sama seperti surat balasan memindahkan Pendaftaran → Bimbingan; `tahapMhsAman` di `firestore.rules` mengizinkan langkah ini.
- Di tahap Pembukuan mahasiswa mengirim tautan folder berkas final. Admin menyetujuinya dengan mencentang "Sudah diperiksa" dan mengubah status ke Terverifikasi (`pembukuanDisetujui` di `helpers.js`); persetujuan ini membuka dokumen baru "Surat Keterangan Selesai Pembukuan" (`suratPembukuanKP`, docType `Surat Pembukuan KP`). Templatenya menyusul: sampai case-nya ada di `getTemplateConfig`, dokumen ini tampil "Template surat belum tersedia". Mengirim/mengganti tautan mencabut centang.
- Kiriman yang menuntut tindakan admin mengembalikan status ke "Menunggu verifikasi" (`tandaiMenungguVerifikasi`): surat balasan (Pendaftaran → Bimbingan, admin menetapkan pembimbing), tautan folder Pembukuan (admin menyetujui), usulan jadwal & berkas sidang, dan perpanjangan. Unggahan biasa tidak, termasuk lembar pengesahan yang langsung memindahkan KP ke Pembukuan. `firestore.rules` mewajibkannya (`ditandaiMenunggu`).
- Akses fitur (unggah, ajukan jadwal, perpanjangan, tombol di kartu, unduh dokumen) kini mengikuti "pernah terverifikasi" (`pernahDiverifikasi`), bukan status saat ini, jadi mahasiswa berstatus "Menunggu verifikasi" tetap bisa mengunduh semua dokumennya. Pengecualian: status "Perlu perbaikan" mengunci semua unduhan template dan semua kiriman mahasiswa (unggah/ganti berkas, tautan Pembukuan, usulan jadwal & berkas sidang, surat perpanjangan final) sampai pendaftaran dibetulkan (`bolehAksesBerkas`; halaman dokumen dengan pemberitahuan merah, kartu, form perpanjangan), karena data yang tercetak (mis. judul) mungkin masih salah. Menghapus berkas sendiri dan mengajukan perpanjangan tetap boleh. Panel admin tidak terkunci. `firestore.rules` (`perbaikanTerkunci`) dan `storage.rules` ikut menolaknya. Pesan "Pendaftaran sedang menunggu diperiksa admin" hanya untuk pendaftaran yang belum pernah diverifikasi.
- Banner di halaman Mahasiswa memisahkan "pendaftaran baru" dari "kiriman baru dari mahasiswa perlu diverifikasi".
- Kartu KP: di Bimbingan meminta lembar pengesahan, di Pembukuan menampilkan status tautan (belum dikirim / menunggu diperiksa / disetujui), masing-masing dengan tombol ke halaman dokumen.

## 14-10-2026 (2) — Pembukuan KP: lembar pengesahan + folder berkas final
- Tahap Pembukuan KP punya dokumen baru "Lembar Pengesahan KP" (`lembarPengesahanKP` di `KP_DOKUMEN`, template `KP/lempeng_kp.docx`). Templatenya diunduh sebagai Word (.docx) yang bisa diedit, bukan PDF: `getTemplateConfig` mengembalikan `docx: true` dan `generateDocument(..., { docx: true })` melewati konversi PDF. Tombolnya bertuliskan "Unduh Word". Mahasiswa mengunggah kembali pindaian PDF bertanda tangan di slot unggah yang sama.
- Isian tautan Pembukuan kini untuk folder Google Drive berisi berkas final ("Folder Berkas Final KP"). Di bawahnya, Portal mahasiswa menampilkan format nama berkas + contoh dan daftar 6 berkas wajib; modal admin hanya menampilkan daftar berkasnya (`components/PetunjukPembukuan.jsx`, teks di `PEMBUKUAN_FORMAT_NAMA`/`PEMBUKUAN_DAFTAR_BERKAS` di `helpers.js`).
- Kartu mahasiswa di tahap Pembukuan meminta kedua berkas dan baru menyatakan "terkirim" setelah lembar pengesahan terunggah dan tautan folder terkirim.

## 14-10-2026 — Tag dosen di template diganti nama peran
- Tag dosen di semua template `.docx` kini memakai nama peran: `{nama_pembimbing}`/`{nip_pembimbing}`, `{nama_penguji1}`/`{nip_penguji1}`, `{nama_penguji2}`/`{nip_penguji2}`, menggantikan `{nama_dosen1}`…`{nama_dosen4}`/`{nip1}`…`{nip4}`. `documentGenerator.js` mengirim nama baru. Hanya teks tag yang diubah; tata letak dan label baris template tidak disentuh.
- `ba-sidang-ta.docx` tidak bisa dicetak sama sekali karena tag `{tgl_sidang}}` (kurung tutup ganda); sudah dibetulkan.
- Di template TA lama (4 dosen): Ketua Penguji = penguji 1, Anggota Penguji = penguji 2. Tag di baris "Pembimbing II" yang tidak lagi dikirim dihapus (sebelumnya tercetak "undefined"); barisnya perlu dihapus/diganti labelnya manual, lihat `List of Tags.txt`.
- Tag ganda/alias disatukan: `{judul_kp}` di kelayakan-proposal-magang → `{judul_magang}`, `{tanggal_smmagang}`/`{tanggal_smmkt}` → `{tgl_smmagang}`/`{tgl_smmkt}`, `{judul_TA}` → `{judul_ta}`, `{tgl_surat_ppta}` → `{tgl_cetak}`, `{tgl_surat_sempro}` → `{tgl_sempro}`. Alias `topik_ta`, `judul_kp` (Magang), `judul_TA`, `tgl_surat_*` tidak dikirim lagi.

## 13-10-2026 (2) — Nomor surat hibrida aktif di semua build
- Satu panel Nomor Surat untuk semua build (`NomorSuratPanel.jsx`): isian tetap bisa diketik, ditambah tombol "Isi nomor berikutnya" yang mengisi nomor urut terkecil tahun ini yang belum dipakai (`nomorBerikutnya` di `utils/nomorSuratDb.js`). Nomor yang diketik lebih jauh (mis. 045) dilewati, begitu juga nomor di record mahasiswa yang belum tercatat di registri. Alur "Ambil nomor" (isian hanya-baca, nomor langsung diterbitkan) di build eksperimental dihapus, begitu juga tombol "Akhiri nomor" (cukup kosongkan isian lalu Simpan). "Akhiri & daftar ulang" tetap ada untuk nomor yang tercatat.
- Pencatatan ke registri saat Simpan kini aktif di build yang di-deploy (`CATAT_NOMOR_MANUAL` dihapus). Registri mencatat `sumber: 'saran'` bila nomor berasal dari tombol dan tidak diubah, `'manual'` bila diketik.
- Simpan ditolak bila bulan/tahun nomor baru/diubah melewati bulan ini, dan meminta konfirmasi bila bulan/tahunnya sudah lewat (`waktuNomor` di `utils/nomorSurat.js`, memakai jam perangkat admin). Simpan juga ditolak bila nomor yang sama (tahun + nomor urut) dipakai record mahasiswa lain, termasuk yang belum tercatat di registri.
- `nomorSuratCounter/` tidak dipakai lagi: nomor berikutnya dicari langsung dari registri, dan aturannya dihapus dari `firestore.rules`.
- Tab Registri Nomor Surat tampil di semua build.

## 13-10-2026 — Nomor surat manual tercatat di registri (sementara hanya localhost)
- Build produksi: nomor surat yang diketik di modal edit mahasiswa dicatat di registri `nomorSurat/` saat Simpan (`sumber: 'manual'`, tampil "Diketik manual" di Registri), dan `nomorSuratCounter/{tahun}` dinaikkan bila nomor urutnya lebih besar, supaya penomoran otomatis nanti melanjutkan dari nomor terakhir. Nomor lama mahasiswa itu, bila diganti atau dikosongkan, ditandai kedaluwarsa. Simpan ditolak bila nomor baru/diubah tidak persis sesuai format (`bacaNomor` di `utils/nomorSurat.js`), sudah dipakai mahasiswa lain, atau sudah pernah diakhiri. Nomor lama yang tidak diubah (termasuk format lama dengan `.TL`) dicatat dengan pemeriksaan longgar dan tidak pernah memblokir simpan.
- Tab Pengaturan → Registri Nomor Surat juga tampil di build produksi selama fitur ini aktif.
- Semua build: menghapus mahasiswa (atau akunnya) menandai nomornya di registri sebagai kedaluwarsa, bila nomornya tercatat.
- Counter dibaca dengan `Number()`, jadi nilai `terakhir` yang tersimpan sebagai teks (mis. diisi lewat Firebase console) tidak lagi menghasilkan nomor 51 dari "5".
- Sementara hanya aktif di `npm run dev` (`CATAT_NOMOR_MANUAL` di `utils/config.js`); build yang di-deploy tidak berubah. Lihat DEPLOY.md.

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