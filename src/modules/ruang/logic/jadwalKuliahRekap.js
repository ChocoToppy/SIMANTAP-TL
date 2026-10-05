import { loadXLSX } from '../host.js';
import { NAMA_HARI } from './jadwalRuang.js';
import { menitJam, beririsan } from '../host.js';

// ===================== jadwalKuliahRekap.js =====================
// Impor "Jadwal Kuliah" rekap sistem pusat: satu sheet, satu baris per kelas dengan kolom
//   Waktu ("Senin, 07:00-08:40") | Mata Kuliah | Kode MK | Kelas | SKS | ... | Pengampu | Ruang
// Baris diberi flag otomatis (ok / bentrok / belum / tanpa-ruang / ruang-luar) supaya admin
// melihat apa yang akan masuk sebelum mengimpor. Hanya baris berstatus ok & bentrok diimpor.

export const FLAG = {
  ok: { teks: 'Masuk', tone: 'green', impor: true },
  bentrok: { teks: 'Bentrok di berkas', tone: 'amber', impor: true },
  gabungan: { teks: 'Digabung dengan kelas paralel', tone: 'blue', impor: false },
  belum: { teks: 'Belum dijadwalkan', tone: 'gray', impor: false },
  'tanpa-ruang': { teks: 'Tanpa ruang', tone: 'gray', impor: false },
  'ruang-luar': { teks: 'Ruang di luar departemen', tone: 'gray', impor: false },
  'waktu-salah': { teks: 'Waktu tidak terbaca', tone: 'red', impor: false },
};

const POLA_WAKTU = /^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu)\s*,\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/i;
const rapikan = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const pad = (hhmm) => hhmm.replace(/^(\d):/, '0$1:');

// "TL_E. 301" -> "E.301". Ruang tanpa awalan TL_ = milik departemen/fakultas lain.
function ruangDepartemen(teks) {
  const t = rapikan(teks);
  if (!/^TL[_\s]/i.test(t)) return null;
  return t.replace(/^TL[_\s]+/i, '').replace(/\.\s+/g, '.');
}

const normNama = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Cocokkan nama pengampu ke daftar dosen departemen; yang tidak cocok dianggap dosen luar.
export function cocokkanDosen(nama, daftarDosen) {
  const n = normNama(nama);
  const ada = n && (daftarDosen || []).find((d) => { const x = normNama(d.nama); return x === n || (n.length > 12 && (x.includes(n) || n.includes(x))); });
  return ada ? { kode: ada.kode, nama: ada.nama } : { nama: rapikan(nama), luar: true };
}

export const tebakLabelSemester = (namaBerkas) => {
  const m = /(gasal|genap|ganjil)\s*(\d{4})\s*[-/]\s*(\d{4})/i.exec(namaBerkas || '');
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}/${m[3]}` : '';
};

// null bila berkas bukan format rekap ini (supaya pemanggil jatuh ke impor grid per-hari).
export async function parseRekapKuliah(file) {
  const XLSX = await loadXLSX();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return null;
  const baris = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const iHead = baris.findIndex((r) => r.some((c) => rapikan(c).toLowerCase() === 'mata kuliah') && r.some((c) => rapikan(c).toLowerCase() === 'waktu'));
  if (iHead < 0) return null;
  const kolom = {};
  baris[iHead].forEach((c, i) => { kolom[rapikan(c).toLowerCase()] = i; });
  const ambil = (r, k) => (kolom[k] === undefined ? '' : r[kolom[k]]);

  const rows = [];
  baris.slice(iHead + 1).forEach((r) => {
    const mk = rapikan(ambil(r, 'mata kuliah'));
    if (!mk) return; // baris judul hari (SENIN, …) / kosong
    const waktuTeks = rapikan(ambil(r, 'waktu'));
    const kelas = rapikan(ambil(r, 'kelas'));
    const pengampu = String(ambil(r, 'pengampu') || '').split(/\n/).map((x) => rapikan(x.replace(/^\s*-\s*/, ''))).filter(Boolean);
    // Sel ruang bisa memuat tambahan di belakang kode ruang ("TL_E. 301 | Teknik Lingkungan",
    // atau baris kedua) — hanya bagian pertama yang nama ruang.
    const ruangMentah = rapikan(String(ambil(r, 'ruang') || '').split(/[\n|]/)[0]);
    const dasar = { mk, kodeMk: rapikan(ambil(r, 'kode mk')), kelas, sks: rapikan(ambil(r, 'sks')), pengampu, ruangMentah, waktuTeks, label: kelas ? `${mk} (${kelas})` : mk };
    const w = POLA_WAKTU.exec(waktuTeks);
    if (!w) { rows.push({ ...dasar, flag: /belum/i.test(waktuTeks) ? 'belum' : 'waktu-salah' }); return; }
    const hari = NAMA_HARI.findIndex((h) => h.toLowerCase() === w[1].toLowerCase().replace("'", ''));
    const mulai = pad(w[2]), selesai = pad(w[3]);
    if (!ruangMentah) { rows.push({ ...dasar, hari, mulai, selesai, flag: 'tanpa-ruang' }); return; }
    const ruang = ruangDepartemen(ruangMentah);
    if (!ruang) { rows.push({ ...dasar, hari, mulai, selesai, flag: 'ruang-luar' }); return; }
    rows.push({ ...dasar, hari, mulai, selesai, ruang, flag: menitJam(selesai) > menitJam(mulai) ? 'ok' : 'waktu-salah' });
  });

  // Kelas paralel/gabungan (mis. kurikulum 2020 & 2024 yang diajar bersamaan): hari, ruang, jam,
  // dan pengampu sama persis = satu pertemuan, bukan bentrok. Digabung jadi satu booking.
  const grup = new Map();
  rows.filter((x) => x.flag === 'ok').forEach((x) => {
    const k = `${x.hari}|${x.ruang}|${x.mulai}|${x.selesai}|${x.pengampu.map(normNama).sort().join(',')}`;
    if (!grup.has(k)) grup.set(k, []);
    grup.get(k).push(x);
  });
  grup.forEach((g) => {
    if (g.length < 2) return;
    const sama = g.every((x) => x.mk === g[0].mk);
    g[0].label = sama ? `${g[0].mk} (${g.map((x) => x.kelas).filter(Boolean).join(' + ')})` : g.map((x) => x.label).join(' + ');
    g.slice(1).forEach((x) => { x.flag = 'gabungan'; });
  });

  // Flag bentrok: dua kelas di ruang & hari yang sama dengan jam beririsan.
  const impor = rows.filter((x) => x.flag === 'ok');
  impor.forEach((a, i) => impor.slice(i + 1).forEach((b) => {
    if (a.hari === b.hari && a.ruang === b.ruang && beririsan([menitJam(a.mulai), menitJam(a.selesai)], [menitJam(b.mulai), menitJam(b.selesai)])) { a.flag = 'bentrok'; b.flag = 'bentrok'; }
  }));

  const diimpor = rows.filter((x) => FLAG[x.flag].impor);
  if (!rows.length) return null;
  return {
    format: 'rekap',
    rows,
    slots: diimpor.map((x) => ({ hari: x.hari, ruang: x.ruang, mulai: x.mulai, selesai: x.selesai, label: x.label, jenis: 'kuliah', mingguan: true, pengampu: x.pengampu })),
    ruang: Array.from(new Set(diimpor.map((x) => x.ruang))),
    hari: Array.from(new Set(diimpor.map((x) => x.hari))).sort(),
    dilewati: rows.length - diimpor.length,
  };
}
