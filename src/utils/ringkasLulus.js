import { PROGRAM_KEYS, PROGRAM_BEBAN } from './helpers.js';

// ===================== Ringkasan lulus untuk "Semua periode" =====================
// Di "Semua periode" pengajuan Lulus tidak dimuat (lihat useMahasiswaAdmin), jadi Dashboard
// dan Dosen menghitung yang dimuat (belum Lulus) lalu menambahkan angka dari statistik/lulus,
// yang dijaga trigger jagaIndeksArsip (functions/indeksArsip.js). Bentuknya:
//   { program: {KP: n}, angkatan: {'2022': {KP: n}}, dosen: {KODE: {KP: {pembimbing1: n, ...}}} }

const daftarProgram = (prog) => (prog === 'ALL' ? PROGRAM_KEYS : [prog]);

export function jumlahLulus(r, prog) {
  return daftarProgram(prog).reduce((t, p) => t + ((r.program || {})[p] || 0), 0);
}

export function lulusPerAngkatan(r, prog) {
  return Object.entries(r.angkatan || {})
    .map(([angkatan, per]) => ({ angkatan, jumlah: daftarProgram(prog).reduce((t, p) => t + (per[p] || 0), 0) }))
    .filter((x) => x.jumlah > 0)
    .sort((a, b) => String(a.angkatan).localeCompare(String(b.angkatan), 'id', { numeric: true }));
}

// Bentuk sama dengan hitungBeban() di helpers.js, supaya bisa dijumlahkan dengan tambahBeban.
export function bebanLulus(r, kode, prog) {
  const per = (r.dosen || {})[kode] || {};
  let bimbingan = 0, penguji1 = 0, penguji2 = 0;
  daftarProgram(prog).forEach((p) => {
    const x = per[p] || {};
    bimbingan += (x.pembimbing1 || 0) + (x.pembimbing2 || 0);
    penguji1 += x.penguji1 || 0;
    penguji2 += x.penguji2 || 0;
  });
  return { bimbingan, penguji1, penguji2, penguji: penguji1 + penguji2, total: bimbingan + penguji1 + penguji2 };
}

export function tambahBeban(a, b) {
  if (!b) return a;
  return {
    bimbingan: a.bimbingan + b.bimbingan, penguji1: a.penguji1 + b.penguji1, penguji2: a.penguji2 + b.penguji2,
    penguji: a.penguji + b.penguji, total: a.total + b.total,
  };
}

// Untuk hasil hitungBebanPeran() (halaman Dosen): tambahkan lulus per peran & program.
const FIELD_PERAN = { pembimbing: ['pembimbing1', 'pembimbing2'], penguji1: ['penguji1'], penguji2: ['penguji2'] };
export function tambahPeranLulus(hasil, r, kode) {
  if (!r) return hasil;
  const per = (r.dosen || {})[kode] || {};
  const baru = {};
  Object.entries(PROGRAM_BEBAN).forEach(([peran, progs]) => {
    baru[peran] = { ...hasil[peran] };
    progs.forEach((p) => {
      const n = FIELD_PERAN[peran].reduce((t, f) => t + ((per[p] || {})[f] || 0), 0);
      baru[peran][p] += n;
      baru[peran].total += n;
    });
  });
  return baru;
}
