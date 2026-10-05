import { programOf, todayISO, parseISO, tambahHari } from './helpers.js';

// ===================== Nomor surat =====================
// Logika murni (tanpa Firestore) untuk nomor surat: format, aturan perpanjangan,
// dan status "perlu ditinjau". Penulisan ke Firestore ada di nomorSuratDb.js.
//
// Bentuk nomor:  013/UN7.F3.6.8.TL/DL/XII/2025
//   013         nomor urut, reset tiap tahun (satu urutan untuk semua program)
//   UN7.F3      kode fakultas
//   6.8         kode penandatangan (Ketua Prodi S1)
//   TL          kode departemen
//   DL          kode hal (Pendidikan dan Pelatihan)
//   XII / 2025  bulan (romawi) & tahun saat nomor diterbitkan
export const KODE_NOMOR = { fakultas: 'UN7.F3', penandatangan: '6.8', departemen: 'TL', hal: 'DL' };

// Satu nomor berlaku untuk satu siklus (mahasiswa + program) sampai diakhiri
// admin. Perpanjangan: KP/Magang 1× 1 bulan, TA 2× 1 bulan. Program lain
// (Capstone, S2) belum punya aturan, jadi tidak ditandai "perlu ditinjau".
export const ATURAN_PERPANJANGAN = {
  KP: { maks: 1, bulan: 1 },
  MG: { maks: 1, bulan: 1 },
  TA: { maks: 2, bulan: 1 },
};

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function romawiBulan(bulan) { return ROMAWI[bulan - 1] || ''; }

export function idNomor(tahun, urut) { return `${tahun}-${String(urut).padStart(3, '0')}`; }

export function formatNomor(urut, bulan, tahun) {
  const { fakultas, penandatangan, departemen, hal } = KODE_NOMOR;
  return `${String(urut).padStart(3, '0')}/${fakultas}.${penandatangan}.${departemen}/${hal}/${romawiBulan(bulan)}/${tahun}`;
}

export function tambahBulan(iso, n) {
  const d = parseISO(iso) || new Date();
  const hari = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  // 31 Jan + 1 bulan → 28/29 Feb, bukan loncat ke Maret.
  const akhirBulan = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(hari, akhirBulan));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function aturanPerpanjangan(m) { return ATURAN_PERPANJANGAN[programOf(m)] || null; }

// Berapa kali perpanjangan sudah disetujui admin pada siklus ini.
export function perpanjanganDisetujui(m) { return (m.perpanjangan && m.perpanjangan.disetujui) || 0; }

export function bolehPerpanjang(m) {
  const a = aturanPerpanjangan(m);
  return !!a && perpanjanganDisetujui(m) < a.maks;
}

// Nomor aktif yang tenggatnya sudah lewat DAN jatah perpanjangannya habis:
// saatnya admin memutuskan (dosen mau lanjut → perpanjang lewat batas akhir,
// tidak mau → "Akhiri & daftar ulang"). Sistem tidak pernah mengakhiri sendiri.
export function perluDitinjau(m) {
  if (!m || !m.nomorSuratId || m.dibatalkan || m.tahap === 'Lulus') return false;
  const a = aturanPerpanjangan(m);
  if (!a || !m.batasAkhir) return false;
  return m.batasAkhir < todayISO() && perpanjanganDisetujui(m) >= a.maks;
}

// Perubahan record saat "Akhiri & daftar ulang": nomor & pembimbing dikosongkan,
// kembali ke Pendaftaran dengan rentang baru. Tahap bisa dimajukan admin lewat
// dropdown tahap (lewati langkah yang sudah pernah dijalani).
export function patchDaftarUlang(m, durasiHari = 180) {
  const mulai = todayISO();
  return {
    nomorSurat: '', nomorSuratId: '',
    pembimbing1: '', pembimbing2: '',
    tahap: 'Pendaftaran',
    tanggalMulai: mulai,
    batasAkhir: tambahHari(mulai, durasiHari),
    perpanjangan: {},
  };
}
