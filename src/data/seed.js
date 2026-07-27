// ===================== seed.js =====================
// seed.js — data contoh awal (dipakai saat pertama kali / setelah reset)
// Daftar dosen diambil dari rekap Anda. Mahasiswa di bawah adalah CONTOH
// (nama fiktif) supaya dashboard langsung "hidup". Hapus/ganti sesuka Anda.

export const DOSEN_AWAL = [
  { kode: 'ASN', nama: 'Dr. Ir. Anik Sarminingsih, M.T.', nip: '19670401 199903 2 001', kompetensi: 'Air Bersih - Plambing dan Drainase', status: 'AA - S3', wa: '081234567001', email: 'anik@undip.ac.id' },
  { kode: 'ARG', nama: 'Arya Rezagama, S.T., M.T.', nip: '19880225 201212 1 003', kompetensi: 'Air Bersih - Plambing dan Drainase', status: 'L - S2' },
  { kode: 'BDZ', nama: 'Dr. Badrus Zaman, S.T., M.T.', nip: '19720830 200003 1 001', kompetensi: 'Air Limbah dan Udara', status: 'LK - S3' },
  { kode: 'BPS', nama: 'Dr. Budi P Samadikun, S.T., M.Si.', nip: '19780514 200501 1 001', kompetensi: 'Drainase dan Sampah', status: 'L - S3' },
  { kode: 'DSH', nama: 'Ir. Dwi Siwi Handayani, M.Si.', nip: '19641202 199903 2 001', kompetensi: 'Sampah dan Air Bersih - Plambing', status: 'AA - S2' },
  { kode: 'EST', nama: 'Ir. Endro Sutrisno, M.S.', nip: '19570831 198602 1 002', kompetensi: 'Air Bersih - Plambing dan Drainase', status: 'L - S2' },
  { kode: 'GSM', nama: 'Ganjar Samudro, S.T., M.T.', nip: '19820120 200801 1 005', kompetensi: 'Air Bersih - Sampah', status: '-' },
  { kode: 'HSH', nama: 'Dr. Haryono Setiyo Huboyo, S.T., M.T.', nip: '19740214 199903 1 002', kompetensi: 'Sampah dan Udara', status: 'L - S3' },
  { kode: 'IBP', nama: 'Ika Bagus Priyambada, S.T., M.Eng.Sc.', nip: '19710301 199803 1 001', kompetensi: 'Sampah dan Udara', status: 'AA - S2' },
  { kode: 'IWW', nama: 'Ir. Irawan Wisnu Wardana, M.S.', nip: '19560601 198602 1 001', kompetensi: 'Air Bersih - Plambing dan Udara', status: 'AA - S2' },
  { kode: 'JND', nama: 'Junaidi, S.T., M.T.', nip: '19660901 199802 1 001', kompetensi: 'Air Bersih - Plambing dan Air Limbah', status: 'L - S2' },
  { kode: 'MAB', nama: 'M. Arief Budihardjo, S.T., M.Eng.Sc., Ph.D.', nip: '19740930 200112 1 002', kompetensi: 'Sampah dan Udara', status: 'LK - S3', wa: '081234567002', email: 'arief@undip.ac.id' },
  { kode: 'MHW', nama: 'Ir. Mochtar Hadiwidodo, M.Si.', nip: '19580807 198703 1 001', kompetensi: 'Air Bersih - Plambing dan Drainase', status: 'LK - S2' },
  { kode: 'NDH', nama: 'Nurandani Hardyanti, S.T., M.T.', nip: '19730130 200003 2 001', kompetensi: 'Air Limbah dan Udara', status: 'LK - S2' },
  { kode: 'PTA', nama: 'Pertiwi Andarani, S.T., M.T., M.Eng.', nip: '19870420 201401 2 001', kompetensi: 'Air Limbah dan Udara', status: '-' },
  { kode: 'SSY', nama: 'Dr. Ling. Sri Sumiyati, S.T., M.Si.', nip: '19710330 199802 2 001', kompetensi: 'Sampah dan Air Limbah', status: 'L - S3' },
  { kode: 'SDN', nama: 'Dr.-Ing. Sudarno, S.T., M.Sc.', nip: '19740131 199903 1 003', kompetensi: 'Air Limbah dan Drainase', status: 'L - S3' },
  { kode: 'SYF', nama: 'Prof. Dr. Ir. Syafrudin, C.E.S., M.T.', nip: '19581107 198803 1 001', kompetensi: 'Air Limbah dan Sampah', status: 'P' },
  { kode: 'TIK', nama: 'Titik Istirokhatun, S.T., M.Sc.', nip: '19780303 201012 2 001', kompetensi: 'Air Bersih - Plambing dan Air Limbah', status: '-' },
  { kode: 'WHO', nama: 'Wiharyanto Oktiawan, S.T., M.T.', nip: '19731024 200003 1 001', kompetensi: 'Air Bersih - Plambing dan Air Limbah', status: 'L - S2' },
  { kode: 'WDN', nama: 'Ir. Winardi Dwi Nugraha, M.Si.', nip: '19670919 199903 1 003', kompetensi: 'Air Limbah dan Drainase', status: 'AA - S2' },
  { kode: 'BSR', nama: 'Bimastyaji Surya Ramadan, S.T., M.T.', nip: '19920324 201903 1 016', kompetensi: 'Udara dan Sampah', status: 'AA - S2' },
];

// Batas akhir & jadwal dibuat relatif terhadap HARI INI supaya status deadline
// selalu masuk akal kapan pun aplikasi dibuka.
export function plusHari(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const RAW_MAHASISWA = [
  // --- 2021 Ganjil (periode terbaru, paling ramai) ---
  { id: 'c01', program: 'TA', nama: 'Adinda Lestari', nim: '21080118120001', judul: 'Perencanaan Sistem Pengelolaan Sampah Terpadu Kecamatan Banyumanik', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Perencanaan', bidang: 'S', pembimbing1: 'SSY', pembimbing2: 'BSR', penguji1: 'MAB', penguji2: 'HSH', tahap: 'Sidang', tanggalMulai: plusHari(-160), batasAkhir: plusHari(-15), dibatalkan: false, catatan: '', jadwal: { Sidang: { tanggal: plusHari(-15), jam: '08:00 - 10:00 WIB', ruang: 'R. sidang 1', printBA: true, syarat: true } } },
  { id: 'c02', program: 'TA', nama: 'Bagas Pratama', nim: '21080118120002', judul: 'Optimasi Sistem Pengangkutan Sampah Kecamatan Tembalang', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Perencanaan', bidang: 'S', pembimbing1: 'IBP', pembimbing2: 'SSY', penguji1: 'BPS', penguji2: 'MAB', tahap: 'Seminar Hasil', tanggalMulai: plusHari(-150), batasAkhir: plusHari(-3), dibatalkan: false, catatan: 'Menunggu revisi penguji', jadwal: {} },
  { id: 'c03', program: 'TA', nama: 'Citra Maharani', nim: '21080118120003', judul: 'Evaluasi Kualitas Air Sungai dengan Parameter BOD dan COD', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Penelitian', bidang: 'AL', pembimbing1: 'SDN', pembimbing2: 'BDZ', penguji1: 'NDH', penguji2: 'PTA', tahap: 'Seminar Proposal', tanggalMulai: plusHari(-60), batasAkhir: plusHari(9), dibatalkan: false, catatan: '', jadwal: { 'Seminar Proposal': { tanggal: plusHari(9), jam: '13:00 - 15:00 WIB', ruang: 'R. sidang 2', printBA: false, syarat: true } } },
  { id: 'c04', program: 'TA', nama: 'Dimas Anggara', nim: '21080118120004', judul: 'Perancangan Sistem Plambing Gedung Kuliah Terpadu', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Perencanaan', bidang: 'AB', pembimbing1: 'EST', pembimbing2: 'IWW', penguji1: 'WHO', penguji2: 'ARG', tahap: 'Penentuan Pembimbing', tanggalMulai: plusHari(-25), batasAkhir: plusHari(21), dibatalkan: false, catatan: '', jadwal: {} },
  { id: 'c05', program: 'TA', nama: 'Erika Salsabila', nim: '21080118120005', judul: 'Strategi Pengendalian Pencemaran Udara Sektor Transportasi', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Penelitian', bidang: 'U', pembimbing1: 'HSH', pembimbing2: 'BDZ', penguji1: 'MAB', penguji2: 'IBP', tahap: 'Seminar Proposal', tanggalMulai: plusHari(-55), batasAkhir: plusHari(28), dibatalkan: false, catatan: '', jadwal: { 'Seminar Proposal': { tanggal: plusHari(12), jam: '08:00 - 10:00 WIB', ruang: 'R. sidang 1', printBA: false, syarat: false } } },
  { id: 'c06', program: 'KP', nama: 'Fajar Nugroho', nim: '21080118120006', judul: 'Kerja Praktik di IPAL Kawasan Industri', periode: '2021 Ganjil', angkatan: 18, klasifikasi: '', bidang: 'AL', pembimbing1: 'SDN', pembimbing2: '', penguji1: '', penguji2: '', tahap: 'Seminar KP', tanggalMulai: plusHari(-40), batasAkhir: plusHari(18), dibatalkan: false, catatan: '', jadwal: { 'Seminar KP': { tanggal: plusHari(11), jam: '10:00 - 11:00 WIB', ruang: 'R. seminar', printBA: false, syarat: true } } },
  { id: 'c07', program: 'TA', nama: 'Gita Permata', nim: '21080118120007', judul: 'Perencanaan IPAL Domestik Kawasan Permukiman', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Perencanaan', bidang: 'AL', pembimbing1: 'BDZ', pembimbing2: 'NDH', penguji1: 'JND', penguji2: 'SDN', tahap: 'Seminar Hasil', tanggalMulai: plusHari(-140), batasAkhir: plusHari(45), dibatalkan: false, catatan: '', jadwal: {} },
  { id: 'c08', program: 'TA', nama: 'Hadi Saputra', nim: '21080118120008', judul: 'Studi Kelayakan RDF Plant di TPA Regional', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Perencanaan', bidang: 'S', pembimbing1: 'MAB', pembimbing2: 'BSR', penguji1: 'HSH', penguji2: 'IBP', tahap: 'Seminar Proposal', tanggalMulai: plusHari(-50), batasAkhir: plusHari(80), dibatalkan: false, catatan: '', jadwal: {} },
  { id: 'c09', program: 'TA', nama: 'Indah Cahyani', nim: '21080118120009', judul: 'Perencanaan Bank Sampah Berbasis Masyarakat', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Perencanaan', bidang: 'S', pembimbing1: 'SSY', pembimbing2: 'BSR', penguji1: 'MAB', penguji2: 'BPS', tahap: 'Sidang', tanggalMulai: plusHari(-170), batasAkhir: plusHari(7), dibatalkan: false, catatan: '', jadwal: { Sidang: { tanggal: plusHari(7), jam: '13:00 - 15:00 WIB', ruang: 'R. sidang 1', printBA: false, syarat: false } } },
  { id: 'c10', program: 'TA', nama: 'Joko Widodo Putra', nim: '21080118120010', judul: 'Perancangan Alat Pengendali Emisi Industri Kecil', periode: '2021 Ganjil', angkatan: 18, klasifikasi: 'Perencanaan', bidang: 'U', pembimbing1: 'HSH', pembimbing2: 'IWW', penguji1: 'BPS', penguji2: 'NDH', tahap: 'Lulus', tanggalMulai: plusHari(-220), batasAkhir: plusHari(-40), dibatalkan: false, catatan: 'Lulus', jadwal: {} },
  { id: 'c11', program: 'CAP', nama: 'Kirana Dewi', nim: '21080118120011', judul: 'Capstone: Purwarupa Sistem Penyediaan Air Minum Pedesaan', periode: '2021 Ganjil', angkatan: 18, klasifikasi: '', bidang: 'AB', pembimbing1: 'ARG', pembimbing2: '', penguji1: 'EST', penguji2: 'WHO', tahap: 'Expo', tanggalMulai: plusHari(-90), batasAkhir: plusHari(14), dibatalkan: false, catatan: '', jadwal: { Expo: { tanggal: plusHari(14), jam: '09:00 - 12:00 WIB', ruang: 'Aula', printBA: false, syarat: true } } },
  { id: 'c17', program: 'KP', nama: 'Lukas Pranata', nim: '21080118120012', judul: 'Kerja Praktik di PDAM Kota Semarang', periode: '2021 Ganjil', angkatan: 18, klasifikasi: '', bidang: 'AB', pembimbing1: 'GSM', pembimbing2: '', penguji1: '', penguji2: '', tahap: 'Pendaftaran', tanggalMulai: plusHari(-8), batasAkhir: plusHari(60), dibatalkan: false, catatan: '', jadwal: {} },

  // --- 2020 Genap ---
  { id: 'c12', program: 'TA', nama: 'Lukman Hakim', nim: '21080117130011', judul: 'Optimasi Pengangkutan Sampah Kota Semarang', periode: '2020 Genap', angkatan: 17, klasifikasi: 'Perencanaan', bidang: 'S', pembimbing1: 'BPS', pembimbing2: 'SSY', penguji1: 'IBP', penguji2: 'MAB', tahap: 'Lulus', tanggalMulai: plusHari(-400), batasAkhir: plusHari(-250), dibatalkan: false, catatan: 'Lulus', jadwal: {} },
  { id: 'c13', program: 'TA', nama: 'Maya Anggraini', nim: '21080117130012', judul: 'Perencanaan Pengelolaan Sampah B3 Rumah Tangga', periode: '2020 Genap', angkatan: 17, klasifikasi: 'Perencanaan', bidang: 'S', pembimbing1: 'SYF', pembimbing2: 'BDZ', penguji1: 'ARG', penguji2: 'IWW', tahap: 'Sidang', tanggalMulai: plusHari(-360), batasAkhir: plusHari(-5), dibatalkan: false, catatan: '', jadwal: { Sidang: { tanggal: plusHari(-5), jam: '08:00 - 10:00 WIB', ruang: 'R. sidang 2', printBA: true, syarat: true } } },
  { id: 'c14', program: 'TA', nama: 'Naufal Rizki', nim: '21080117130013', judul: 'Re-Design Sistem Plambing Gedung Fakultas', periode: '2020 Genap', angkatan: 17, klasifikasi: 'Perencanaan', bidang: 'AB', pembimbing1: 'EST', pembimbing2: 'IWW', penguji1: 'MHW', penguji2: 'ASN', tahap: 'Seminar Hasil', tanggalMulai: plusHari(-340), batasAkhir: plusHari(20), dibatalkan: false, catatan: '', jadwal: {} },
  { id: 'c15', program: 'TA', nama: 'Oktavia Ramadhani', nim: '21080117130014', judul: 'Perencanaan Sistem Penyaluran Air Limbah Domestik', periode: '2020 Genap', angkatan: 17, klasifikasi: 'Penelitian', bidang: 'AL', pembimbing1: 'SDN', pembimbing2: 'BDZ', penguji1: 'WHO', penguji2: 'HSH', tahap: 'Pendaftaran', tanggalMulai: plusHari(-300), batasAkhir: plusHari(-120), dibatalkan: true, catatan: 'Cancel ganti periode', jadwal: {} },

  // --- 2020 Ganjil ---
  { id: 'c16', program: 'TA', nama: 'Putra Wijaya', nim: '21080116130021', judul: 'Perencanaan Teknis Operasional Pengelolaan Sampah', periode: '2020 Ganjil', angkatan: 16, klasifikasi: 'Penelitian', bidang: 'S', pembimbing1: 'MAB', pembimbing2: 'BSR', penguji1: 'IBP', penguji2: 'SSY', tahap: 'Lulus', tanggalMulai: plusHari(-550), batasAkhir: plusHari(-420), dibatalkan: false, catatan: 'Lulus', jadwal: {} },
];

// Data lama dianggap sudah terverifikasi & dimiliki oleh NIM masing-masing.
// Lalu ditambah beberapa pendaftaran baru (menunggu verifikasi) untuk demo admin.
export const MAHASISWA_AWAL = RAW_MAHASISWA
  .map((m) => ({ verifikasi: 'terverifikasi', owner: m.nim, pendaftaran: {}, ...m }))
  .concat([
    {
      id: 'p01', program: 'TA', nama: 'Rangga Saputra', nim: '21080120120099',
      judul: 'Perencanaan sistem pengelolaan sampah kawasan kampus', periode: '2021 Ganjil',
      angkatan: 20, klasifikasi: 'Perencanaan', bidang: 'S',
      pembimbing1: '', pembimbing2: '', penguji1: '', penguji2: '',
      tahap: 'Pendaftaran', tanggalMulai: plusHari(-2), batasAkhir: plusHari(178),
      dibatalkan: false, catatan: '', jadwal: {},
      verifikasi: 'baru', owner: '21080120120099',
      pendaftaran: {
        syaratSKS: true, ipk: '3.21', statusKP: 'Telah', terdaftarKRS: true, sudahUGB: true,
        namaPersetujuanDosen: '', berkasLink: 'https://drive.google.com/contoh-berkas-pendaftaran',
        nomorWA: '08123456789', submittedAt: plusHari(-2),
      },
    },
    {
      id: 'p02', program: 'KP', nama: 'Sinta Wulandari', nim: '21080120120100',
      judul: 'Kerja praktik di instalasi pengolahan air', periode: '2021 Ganjil',
      angkatan: 20, klasifikasi: '', bidang: 'SPAM',
      pembimbing1: '', pembimbing2: '', penguji1: '', penguji2: '',
      tahap: 'Pendaftaran', tanggalMulai: plusHari(-1), batasAkhir: plusHari(120),
      dibatalkan: false, catatan: '', jadwal: {},
      verifikasi: 'baru', owner: '21080120120100',
      pendaftaran: {
        semester: '7', sksIpk: '115 SKS / 3,05', tempatKP: 'PDAM Tirta Moedal',
        instansi: 'Semarang, Jawa Tengah', alamatWA: 'Jl. Prof. Soedarto, Tembalang · 08987654321',
        berkasLink: '',
      },
    },
  ]);

// Akun login mahasiswa (prototipe). Password disimpan apa adanya (bukan keamanan nyata).
export const AKUN_AWAL = [
  { nim: '21080118120001', nama: 'Adinda Lestari', password: 'mahasiswa' },
  { nim: '21080120120099', nama: 'Rangga Saputra', password: 'mahasiswa' },
  { nim: '21080120120100', nama: 'Sinta Wulandari', password: 'mahasiswa' },
];

// Periode pendaftaran yang dibuka admin (muncul di dropdown mahasiswa).
export const PERIODE_BUKA_AWAL = ['2021 Ganjil'];

