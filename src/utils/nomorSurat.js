import { programOf, todayISO, parseISO } from './helpers.js';

// ===================== Nomor surat =====================
// Logika murni (tanpa Firestore) untuk nomor surat: format, aturan perpanjangan,
// dan status "perlu ditinjau". Penulisan ke Firestore ada di nomorSuratDb.js.
//
// Bentuk nomor:  013/UN7.F3.6.8/DL/XII/2025
//   013         nomor urut, reset tiap tahun (satu urutan untuk semua program)
//   UN7.F3      kode fakultas
//   6.8         kode penandatangan (Ketua Prodi S1)
//   DL          kode hal (Pendidikan dan Pelatihan)
//   XII / 2025  bulan (romawi) & tahun saat nomor diterbitkan
export const KODE_NOMOR = { fakultas: 'UN7.F3', penandatangan: '6.8', hal: 'DL' };

// Nomor diketik admin atau diisi lewat tombol "Ambil nomor" (nomor urut
// terkecil yang belum dipakai tahun itu), lalu dicatat di registri saat Simpan.
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
  const { fakultas, penandatangan, hal } = KODE_NOMOR;
  return `${String(urut).padStart(3, '0')}/${fakultas}.${penandatangan}/${hal}/${romawiBulan(bulan)}/${tahun}`;
}

// Baca nomor ketikan manual → { urut, bulan, tahun }, atau null bila tidak persis
// sesuai format (termasuk kode yang salah, bulan Romawi tidak valid, atau nomor urut
// yang tidak tiga digit). opsi.longgar: hanya nomor urut, bulan & tahun yang diperiksa,
// untuk nomor lama yang tersimpan sebelum format berubah (mis. masih memuat ".TL").
export function bacaNomor(nomor, opsi = {}) {
  const s = String(nomor || '').trim();
  const h = s.match(/^(\d+)\/.+\/([IVX]+)\/(\d{4})$/);
  if (!h) return null;
  const hasil = { urut: Number(h[1]), bulan: ROMAWI.indexOf(h[2]) + 1, tahun: Number(h[3]) };
  if (!hasil.urut || !hasil.bulan) return null;
  if (opsi.longgar) return hasil;
  return formatNomor(hasil.urut, hasil.bulan, hasil.tahun) === s ? hasil : null;
}

// Bulan/tahun nomor dibanding bulan ini (jam perangkat admin): 'depan' (ditolak),
// 'lalu' / 'tahun-lalu' (minta konfirmasi), atau null bila bulan ini.
export function waktuNomor(p, now = new Date()) {
  const tahun = now.getFullYear();
  const bulan = now.getMonth() + 1;
  if (p.tahun > tahun || (p.tahun === tahun && p.bulan > bulan)) return 'depan';
  if (p.tahun < tahun) return 'tahun-lalu';
  return p.bulan < bulan ? 'lalu' : null;
}

export const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Nomor urut tahun `tahun` yang dipakai record mahasiswa tapi belum tercatat di
// registri (mis. diketik sebelum pencatatan aktif). Ikut dihindari saat menyarankan
// nomor berikutnya.
export function urutTerpakaiDiRecord(semua, tahun, kecualiId) {
  return (semua || [])
    .filter((x) => x.id !== kecualiId && x.nomorSurat && !x.nomorSuratId)
    .map((x) => bacaNomor(x.nomorSurat, { longgar: true }))
    .filter((p) => p && p.tahun === tahun)
    .map((p) => p.urut);
}

// Record mahasiswa lain yang memakai nomor (tahun + urut) yang sama.
export function pemakaiNomorLain(semua, p, kecualiId) {
  return (semua || []).find((x) => {
    if (x.id === kecualiId || !x.nomorSurat) return false;
    const q = bacaNomor(x.nomorSurat, { longgar: true });
    return q && q.tahun === p.tahun && q.urut === p.urut;
  }) || null;
}

// Kunci sortir: tahun dulu, baru nomor urut (urutan reset tiap tahun, jadi 001/2026
// harus setelah 120/2025). Nomor ketikan manual yang tidak sesuai format dibandingkan
// apa adanya, setelah semua nomor yang sesuai format.
export function kunciUrutNomor(nomor) {
  const s = String(nomor || '').trim();
  const urut = s.match(/^(\d+)\//);
  const tahun = s.match(/\/(\d{4})\s*$/);
  if (!urut || !tahun) return `2 ${s}`;
  return `1 ${tahun[1]}-${urut[1].padStart(6, '0')}`;
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
// tidak mau → centang "Ditutup", mahasiswa mendaftar ulang sebagai pengajuan
// baru). Sistem tidak pernah mengakhiri sendiri.
export function perluDitinjau(m) {
  if (!m || !m.nomorSuratId || m.dibatalkan || m.tahap === 'Lulus') return false;
  const a = aturanPerpanjangan(m);
  if (!a || !m.batasAkhir) return false;
  return m.batasAkhir < todayISO() && perpanjanganDisetujui(m) >= a.maks;
}

