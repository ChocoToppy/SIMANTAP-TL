import { geserHari, hariDariTanggal, slotPadaTanggal } from './ruangBooking.js';
import { BULAN } from '../host.js';

// Bantu tampilan mingguan & bulanan grid ruang (harian ada di JadwalRuangHarian).

const pad = (n) => String(n).padStart(2, '0');
const awalBulan = (iso) => `${iso.slice(0, 7)}-01`;

export const awalPekan = (iso) => geserHari(iso, -hariDariTanggal(iso));
export const pekanDari = (iso) => Array.from({ length: 7 }, (_, i) => geserHari(awalPekan(iso), i));

export function tanggalBulan(iso) {
  const [y, m] = iso.split('-').map(Number);
  return Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
}

export function geserBulan(iso, n) {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

export const labelBulan = (iso) => `${BULAN[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

// Langkah tombol ‹ › menurut mode tampilan.
export function geserMode(mode, iso, arah) {
  if (mode === 'bulan') return geserBulan(awalBulan(iso), arah);
  return geserHari(iso, arah * (mode === 'minggu' ? 7 : 1));
}

// Booking per tanggal + daftar ruang yang ikut tampil (yang punya booking pada rentang itu,
// atau semuanya bila `semuaRuang`). Ruang nonaktif tampil hanya jika masih dipakai.
export function susunRuang(data, semester, daftarTanggal, semuaRuang) {
  const perTanggal = {};
  const idPakai = new Set();
  daftarTanggal.forEach((t) => {
    const s = slotPadaTanggal(data, semester, t).sort((a, b) => a.mulai.localeCompare(b.mulai));
    perTanggal[t] = s;
    s.forEach((x) => idPakai.add(x.ruangId));
  });
  const semua = data.ruang || [];
  const kolom = [...semua.filter((r) => r.aktif !== false), ...semua.filter((r) => r.aktif === false && idPakai.has(r.id))]
    .sort((a, b) => (a.urut || 0) - (b.urut || 0));
  return { perTanggal, ruang: semuaRuang ? kolom : kolom.filter((r) => idPakai.has(r.id)), kosong: kolom.filter((r) => !idPakai.has(r.id)) };
}
