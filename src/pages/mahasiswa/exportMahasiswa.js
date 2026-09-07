import { programOf, programLabel, punyaKlasifikasi, bidangLabel, eventsFor, getJadwal, formatTanggal, jamTampil, kondisi } from '../../utils/helpers.js';
import { downloadCSV, downloadXLSX } from '../../utils/exportUtils.js';

// Ekspor tabel Mahasiswa (CSV/XLSX) — dipisah dari Mahasiswa.jsx karena murni
// fungsi (tidak ada state/JSX), supaya halaman daftar tidak ikut membengkak.

const CORE_HEADERS = ['No. (Periode)', 'Program', 'Nama', 'NIM', 'Angkatan', 'Judul', 'Periode', 'Klasifikasi', 'Bidang', 'Dosen Wali', 'Pembimbing 1', 'Pembimbing 2', 'Penguji 1', 'Penguji 2', 'Tahap', 'Status', 'Tanggal Mulai', 'Batas Akhir', 'Nomor Surat', 'Nilai Angka', 'Nilai Huruf', 'Catatan'];

function coreRow(m, { nomorUrut, namaLengkapDosen }) {
  const k = kondisi(m);
  return [
    (nomorUrut[m.id] || {}).periode ?? '', programLabel(programOf(m)), m.nama, m.nim, m.angkatan, m.judul, m.periode,
    punyaKlasifikasi(programOf(m)) ? (m.klasifikasi || '') : '', bidangLabel(m.bidang), namaLengkapDosen(m.dosenWali),
    namaLengkapDosen(m.pembimbing1), namaLengkapDosen(m.pembimbing2), namaLengkapDosen(m.penguji1), namaLengkapDosen(m.penguji2),
    m.tahap, k.label, m.tanggalMulai || '', m.batasAkhir || '', m.nomorSurat || '',
    (m.nilaiAkhir || {}).angka || '', (m.nilaiAkhir || {}).huruf || '', m.catatan || '',
  ];
}

function ringkasJadwal(m) {
  return eventsFor(programOf(m)).map((ev) => {
    const j = getJadwal(m, ev);
    if (!(j.tanggal || jamTampil(j) || j.ruang || j.printBA || j.syarat)) return null;
    const info = [j.tanggal ? formatTanggal(j.tanggal) : '', jamTampil(j), j.ruang].filter(Boolean).join(' ');
    return `${ev}: ${info} (BA: ${j.printBA ? 'Ya' : 'Tidak'}, ${j.syarat ? 'Syarat: Ya' : 'Syarat: Tidak'})`;
  }).filter(Boolean).join(' | ');
}

function eksporCSV(list, ctx) {
  downloadCSV('mahasiswa.csv', [...CORE_HEADERS, 'Jadwal'], list.map((m) => [...coreRow(m, ctx), ringkasJadwal(m)]));
}

export async function eksporMahasiswa(format, list, ctx) {
  if (format === 'csv') { eksporCSV(list, ctx); return; }
  const jadwalHeaders = ['Nama', 'NIM', 'Program', 'Event', 'Tanggal', 'Jam', 'Ruang', 'Print BA', 'Syarat'];
  const jadwalRows = [];
  list.forEach((m) => eventsFor(programOf(m)).forEach((ev) => {
    const j = getJadwal(m, ev);
    if (j.tanggal || jamTampil(j) || j.ruang || j.printBA || j.syarat) {
      jadwalRows.push([m.nama, m.nim, programLabel(programOf(m)), ev, j.tanggal || '', jamTampil(j), j.ruang || '', j.printBA ? 'Ya' : 'Tidak', j.syarat ? 'Ya' : 'Tidak']);
    }
  }));
  try {
    await downloadXLSX('mahasiswa.xlsx', [
      { name: 'Mahasiswa', headers: CORE_HEADERS, rows: list.map((m) => coreRow(m, ctx)) },
      { name: 'Jadwal', headers: jadwalHeaders, rows: jadwalRows },
    ]);
  } catch (e) {
    window.alert('Gagal membuat Excel (CDN mungkin diblokir). Mengunduh CSV sebagai gantinya.');
    eksporCSV(list, ctx);
  }
}
