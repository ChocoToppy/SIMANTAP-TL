import { loadXLSX } from '../host.js';

// ===================== jadwalRuang.js =====================
// Jadwal pemakaian ruang mingguan (kuliah + seminar) yang diimpor dari Excel
// "PENGGUNAAN RUANG untuk SEMINAR & KULIAH": satu sheet per hari, baris = jam,
// kolom = ruang, tiap pemakaian berupa sel gabungan (merge) berisi teks bebas.
// Hasil parse: daftar "slot" { hari, ruang, mulai, selesai, label, jenis }.

export const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Kolom kategori di Excel (SEM KP, KULIAH, dst.) bukan ruang — dilewati.
const KOLOM_KATEGORI = /^(sem\b|sem\s|kuliah)/i;
// Catatan bebas di sel (bukan pemakaian ruang sungguhan) — dilewati saat impor.
const CATATAN = /^(pindah|dari hari|setiap hari|catatan)/i;
const JENIS_SEMINAR = /^(sempro|semhas|seminar|sem\b|sidang|ujian)/i;

const fmtJam = (menit) => `${String(Math.floor(menit / 60)).padStart(2, '0')}:${String(menit % 60).padStart(2, '0')}`;

export async function parseJadwalRuang(file) {
  const XLSX = await loadXLSX();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const slots = [];
  const ruang = [];
  const hariTerbaca = new Set();
  let dilewati = 0;

  wb.SheetNames.forEach((nama, idx) => {
    const meta = wb.Workbook && wb.Workbook.Sheets && wb.Workbook.Sheets[idx];
    if (meta && meta.Hidden) return; // sheet tersembunyi = arsip/draft
    const hari = NAMA_HARI.findIndex((h) => nama.toUpperCase().startsWith(h.toUpperCase()));
    if (hari < 0 || hariTerbaca.has(hari)) return;
    hariTerbaca.add(hari);

    const ws = wb.Sheets[nama];
    if (!ws['!ref']) return;
    const rng = XLSX.utils.decode_range(ws['!ref']);
    const val = (r, c) => { const x = ws[XLSX.utils.encode_cell({ r, c })]; return x ? x.v : undefined; };

    // Waktu tiap baris (kolom A berisi pecahan hari, mis. 0.2917 = 07:00).
    const waktu = {};
    for (let r = 1; r <= rng.e.r; r++) {
      const v = val(r, 0);
      if (typeof v === 'number') waktu[r] = Math.round(v * 1440);
    }
    const barisBerwaktu = Object.keys(waktu).map(Number).sort((a, b) => a - b);
    const akhirBaris = (r) => {
      const next = barisBerwaktu.find((x) => x > r);
      return next !== undefined ? waktu[next] : waktu[r] + 10;
    };

    const kolomRuang = {};
    for (let c = 1; c <= rng.e.c; c++) {
      const h = String(val(0, c) || '').replace(/\s+/g, ' ').trim();
      if (!h || KOLOM_KATEGORI.test(h)) continue;
      kolomRuang[c] = h;
      if (!ruang.includes(h)) ruang.push(h);
    }

    const merges = {};
    (ws['!merges'] || []).forEach((m) => { merges[`${m.s.r},${m.s.c}`] = m; });

    for (let r = 1; r <= rng.e.r; r++) {
      if (waktu[r] === undefined) continue;
      for (const c of Object.keys(kolomRuang).map(Number)) {
        const v = val(r, c);
        const label = v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim();
        if (!label) continue;
        if (CATATAN.test(label)) { dilewati += 1; continue; }
        const m = merges[`${r},${c}`];
        const barisAkhir = m ? m.e.r : r;
        const kolomAkhir = m ? m.e.c : c;
        const mulai = waktu[r];
        const selesai = akhirBaris(barisAkhir);
        if (!(selesai > mulai)) continue;
        for (let cc = c; cc <= kolomAkhir; cc++) {
          if (!kolomRuang[cc]) continue;
          slots.push({ hari, ruang: kolomRuang[cc], mulai: fmtJam(mulai), selesai: fmtJam(selesai), label, jenis: JENIS_SEMINAR.test(label) ? 'seminar' : 'kuliah' });
        }
      }
    }
  });

  return { slots, ruang, hari: Array.from(hariTerbaca).sort(), dilewati };
}
