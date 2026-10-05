import { judulLabelFor, punyaKlasifikasi, punyaSyarat } from './helpers.js';

// ===================== formPendaftaran.js =====================
// Daftar field form pendaftaran mahasiswa (portal) + cara admin menyesuaikannya
// dari Pengaturan → Form Pendaftaran. Field-nya SENDIRI tetap di kode (tiap field
// = satu kunci data di dokumen mahasiswa yang dibaca generator surat/PDF), admin
// hanya bisa mengubah teks (judul, deskripsi, placeholder), status wajib, dan
// urutannya. Tidak ada tambah/hapus field.
//
// Override disimpan di config/global → konten.formPendaftaran[kunciProgram]:
//   { urutan: [id...], medan: { [id]: { label, hint, placeholder, wajib } } }
// dan tiap properti yang tidak ada = pakai nilai bawaan di bawah.

// Satu "kunci program" per varian form: MKT dipisah dari Magang karena judulnya
// berbeda ("Nama Mata Kuliah").
export const KUNCI_PROGRAM = ['TA', 'CAP', 'S2', 'KP', 'MG', 'MKT'];
export const NAMA_KUNCI = { TA: 'Tugas Akhir', CAP: 'Capstone Design', S2: 'Tesis S2', KP: 'Kerja Praktik', MG: 'Magang', MKT: 'Mata Kuliah Terapan' };

export function kunciProgram(m) {
  return m.program === 'MG' && m.jenisMagang === 'MKT' ? 'MKT' : m.program;
}
export function gayaKP(kunci) { return kunci === 'KP' || kunci === 'MG' || kunci === 'MKT'; }
const programDari = (kunci) => (kunci === 'MKT' ? 'MG' : kunci);

const NAMA_KP = (k) => (k === 'KP' ? 'KP' : 'Magang');

// tipe: text | textarea | date | select | centang | blok
// di: 'm' (kolom langsung di dokumen) atau 'p' (di dalam m.pendaftaran)
// kunciPosisi: selalu di paling atas, tidak bisa digeser (mengubah bentuk form)
// wajibTetap: sudah divalidasi di kode, tombol wajib dikunci menyala
export const META = {
  program: { nama: 'Program', tipe: 'select', di: 'm', kolom: 'program', label: () => 'Program', kunciPosisi: true },
  jenis: { nama: 'Jenis (Magang/MKT)', tipe: 'select', di: 'm', kolom: 'jenisMagang', label: () => 'Jenis', kunciPosisi: true },
  periode: { nama: 'Periode', tipe: 'select', di: 'm', kolom: 'periode', label: () => 'Periode', wajibTetap: true },
  nama: { nama: 'Nama', tipe: 'text', di: 'm', kolom: 'nama', label: () => 'Nama', wajibTetap: true },
  angkatan: { nama: 'Angkatan', tipe: 'select', di: 'm', kolom: 'angkatan', label: () => 'Angkatan' },
  judul: {
    nama: 'Judul', tipe: 'textarea', di: 'm', kolom: 'judul', full: true, wajibTetap: true,
    label: (k) => judulLabelFor({ program: programDari(k), jenisMagang: k === 'MKT' ? 'MKT' : 'Magang' }),
    hint: 'Huruf kapital hanya di awal kata, bukan semua huruf kapital. Contoh: "Analisis Pengelolaan Limbah Cair", bukan "ANALISIS PENGELOLAAN LIMBAH CAIR".',
  },
  dosenWali: { nama: 'Dosen Wali', tipe: 'select', di: 'm', kolom: 'dosenWali', label: () => 'Dosen Wali' },
  klasifikasi: { nama: 'Klasifikasi', tipe: 'select', di: 'm', kolom: 'klasifikasi', label: () => 'Klasifikasi' },
  // Dropdown ini isinya dikelola dari kartu field-nya di editor (Tema KP/Bidang TA).
  bidang: { nama: 'Tema / Bidang', tipe: 'select', di: 'm', kolom: 'bidang', label: (k) => (k === 'KP' ? 'Tema Kerja Praktik' : gayaKP(k) ? 'Tema Magang' : 'Topik / bidang') },
  semester: { nama: 'Semester', tipe: 'select', di: 'p', kolom: 'semester', label: () => 'Semester' },
  sksIpk: { nama: 'SKS / IPK', tipe: 'text', di: 'p', kolom: 'sksIpk', label: () => 'Jumlah SKS / IPK', placeholder: 'mis. 110 SKS / 3,20' },
  tempatKP: { nama: 'Tempat', tipe: 'text', di: 'p', kolom: 'tempatKP', label: (k) => `Tempat / Perusahaan ${NAMA_KP(k)}` },
  instansi: { nama: 'Instansi', tipe: 'text', di: 'p', kolom: 'instansi', label: () => 'Instansi (Kota / Provinsi)', placeholder: 'mis. Semarang, Jawa Tengah' },
  tanggalMulai: { nama: 'Tanggal mulai', tipe: 'date', di: 'm', kolom: 'tanggalMulai', label: (k) => `Mulai ${NAMA_KP(k)}` },
  batasAkhir: { nama: 'Tanggal berakhir', tipe: 'date', di: 'm', kolom: 'batasAkhir', label: (k) => `Berakhir ${NAMA_KP(k)}` },
  alamatWA: { nama: 'Alamat', tipe: 'textarea', di: 'p', kolom: 'alamatWA', full: true, label: () => 'Alamat lengkap' },
  syarat: { nama: 'Syarat pendaftaran', tipe: 'blok', label: () => 'Syarat pendaftaran' },
  namaPersetujuanDosen: { nama: 'Persetujuan dosen', tipe: 'select', di: 'p', kolom: 'namaPersetujuanDosen', full: true, label: () => 'Nama persetujuan projek dosen (opsional)' },
  berkasLink: {
    nama: 'Link berkas', tipe: 'text', di: 'p', kolom: 'berkasLink', full: true, placeholder: 'https://drive.google.com/...',
    label: (k) => (gayaKP(k)
      ? `Link berkas (${k === 'KP' ? 'Transkrip, IRS, KTM' : 'Surat penerimaan, Transkrip, IRS, KTM, Proposal Magang'}) — Google Drive`
      : 'Link berkas (Surat UGB, persetujuan dosen, transkrip, IRS, proposal) — Google Drive, opsional'),
  },
  nomorWA: { nama: 'Nomor WA', tipe: 'text', di: 'p', kolom: 'nomorWA', label: () => 'Nomor WA', placeholder: '08xxxxxxxxxx' },
};

// Butir di dalam blok "Syarat pendaftaran" (TA/Capstone). Urutannya tetap.
export const BUTIR_SYARAT = ['syaratSKS', 'ipk', 'statusKP', 'terdaftarKRS', 'sudahUGB'];
export const META_SYARAT = {
  syaratSKS: { nama: 'Syarat SKS & IPK', tipe: 'centang', label: () => 'Sudah lulus 120 SKS dengan IPK ≥ 2,00' },
  ipk: { nama: 'IPK', tipe: 'text', label: () => 'IPK', placeholder: 'mis. 3,20' },
  statusKP: { nama: 'Status Kerja Praktik', tipe: 'select', label: () => 'Status Kerja Praktik' },
  terdaftarKRS: { nama: 'Terdaftar KRS', tipe: 'centang', label: (k) => `Terdaftar pada KRS mengambil mata kuliah ${k === 'CAP' ? 'Capstone Design' : 'TA'}` },
  sudahUGB: { nama: 'Sudah menyusun UGB', tipe: 'centang', label: (k) => `Telah menyusun Usulan Garis Besar (UGB) / proposal${k === 'CAP' ? ' Capstone Design' : ''}` },
};

export function urutanBawaan(kunci) {
  const program = programDari(kunci);
  const kepala = ['program', ...(program === 'MG' ? ['jenis'] : [])];
  if (gayaKP(kunci)) {
    return [...kepala, 'periode', 'nama', 'angkatan', 'judul', 'dosenWali', 'semester', 'sksIpk', 'bidang', 'tempatKP', 'instansi', 'tanggalMulai', 'batasAkhir', 'alamatWA', 'nomorWA', 'berkasLink'];
  }
  return [
    ...kepala, 'periode', 'nama', 'angkatan', 'judul', 'dosenWali',
    ...(punyaKlasifikasi(program) ? ['klasifikasi'] : []), 'bidang',
    ...(punyaSyarat(program) ? ['syarat'] : []),
    'namaPersetujuanDosen', 'berkasLink', 'nomorWA',
  ];
}

// Urutan tersimpan yang sudah dibersihkan: field baru dari kode tetap muncul
// (di akhir), id yang sudah tidak ada dibuang, dan field kunciPosisi tetap di atas.
export function urutanForm(kunci, konten) {
  const bawaan = urutanBawaan(kunci);
  const simpan = konten && konten.formPendaftaran && konten.formPendaftaran[kunci] && konten.formPendaftaran[kunci].urutan;
  if (!Array.isArray(simpan)) return bawaan;
  const kepala = bawaan.filter((id) => META[id].kunciPosisi);
  const bebas = bawaan.filter((id) => !META[id].kunciPosisi);
  const urut = simpan.filter((id) => bebas.includes(id));
  return [...kepala, ...urut, ...bebas.filter((id) => !urut.includes(id))];
}

// Nilai akhir satu field = bawaan kode ditimpa override admin.
export function medanForm(kunci, id, konten) {
  const meta = META[id] || META_SYARAT[id];
  const ov = ((konten && konten.formPendaftaran && konten.formPendaftaran[kunci] && konten.formPendaftaran[kunci].medan) || {})[id] || {};
  const labelBawaan = meta.label(kunci);
  return {
    id, tipe: meta.tipe, nama: meta.nama, full: !!meta.full, kunciPosisi: !!meta.kunciPosisi, wajibTetap: !!meta.wajibTetap,
    labelBawaan, hintBawaan: meta.hint || '', placeholderBawaan: meta.placeholder || '',
    label: (ov.label || '').trim() || labelBawaan,
    hint: ov.hint !== undefined ? ov.hint : (meta.hint || ''),
    placeholder: ov.placeholder !== undefined ? ov.placeholder : (meta.placeholder || ''),
    wajib: !!meta.wajibTetap || !!ov.wajib,
    diubah: Object.keys(ov).length > 0,
  };
}

export function nilaiMedan(id, m) {
  const meta = META[id];
  if (!meta || !meta.kolom) return '';
  const v = meta.di === 'p' ? (m.pendaftaran || {})[meta.kolom] : m[meta.kolom];
  return String(v ?? '').trim();
}

// Pesan galat untuk field yang ditandai wajib oleh admin (nama/judul/periode
// tetap divalidasi terpisah di FormPendaftaran). null = lolos.
export function galatWajib(kunci, m, konten) {
  for (const id of urutanForm(kunci, konten)) {
    const meta = META[id];
    if (!meta || !meta.kolom || meta.wajibTetap || meta.kunciPosisi) continue;
    const f = medanForm(kunci, id, konten);
    if (f.wajib && !nilaiMedan(id, m)) return `${f.label} wajib diisi.`;
  }
  return null;
}
