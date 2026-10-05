import { programOf, programDisplayLabel, durasiEvent, jamTambah } from '../host.js';
import { ruangSama } from './ruangBooking.js';

// ===================== sinkronRuang.js =====================
// Menyambungkan jadwal program ke jadwal ruang: tiap jadwal yang SUDAH DIKONFIRMASI
// admin (jadwal[ev].dikonfirmasi) di program yang terdaftar di bawah ini menjadi
// satu booking sekali-jalan bersumber 'program'. Usulan mahasiswa yang belum
// dikonfirmasi tidak memblokir ruang.
//
// Hanya program yang sudah rilis. Program lain (TA, Capstone, Tesis S2) menyusul:
// cukup tambahkan barisnya di sini.
export const EVENT_SINKRON = {
  KP: ['Seminar KP'],
  MG: ['Expo'], // Magang & MKT (Mata Kuliah Terapan) sama-sama Expo
};

export const idBookingProgram = (mhsId, ev) => `prog_${mhsId}_${ev.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
export const milikProgram = (mhsId, ev) => (b) => !!b.ref && b.ref.mahasiswaId === mhsId && b.ref.ev === ev;

const SAMA = ['semesterId', 'ruangId', 'tanggal', 'mulai', 'selesai', 'judul', 'terbit'];

// Hitung selisih antara jadwal mahasiswa & booking bersumber 'program' yang ada.
// Hasil: { set, hapus, tidakMasuk } — tidakMasuk = jadwal terkonfirmasi yang belum
// bisa masuk grid (ruang tak dikenal / tanggal di luar semua semester).
export function rancangSinkronProgram(mahasiswa, data) {
  const semesters = data.semesters || [];
  const ruang = data.ruang || [];
  const ada = new Map((data.bookings || []).filter((b) => b.sumber === 'program').map((b) => [b.id, b]));
  const inginkan = new Map();
  const tidakMasuk = [];

  (mahasiswa || []).forEach((m) => {
    if (m.dibatalkan) return;
    (EVENT_SINKRON[programOf(m)] || []).forEach((ev) => {
      const j = (m.jadwal || {})[ev];
      if (!j || !j.dikonfirmasi || !j.tanggal || !j.jamMulai || !j.ruang) return;
      const selesai = j.jamSelesai || jamTambah(j.jamMulai, durasiEvent(ev));
      const r = ruang.find((x) => ruangSama(x.nama, j.ruang));
      const semester = semesters.find((s) => s.mulai <= j.tanggal && j.tanggal <= s.selesai);
      if (!r || !semester) {
        tidakMasuk.push({ nama: m.nama, ev, alasan: !r ? `ruang "${j.ruang}" tidak ada di daftar ruang` : 'tanggal di luar semua semester jadwal ruang' });
        return;
      }
      const id = idBookingProgram(m.id, ev);
      inginkan.set(id, {
        id, semesterId: semester.id, ruangId: r.id, jenis: 'seminar', pola: 'sekali', tanggal: j.tanggal,
        mulai: j.jamMulai, selesai, sumber: 'program', ref: { mahasiswaId: m.id, ev },
        judul: `${ev}${ev === 'Expo' ? ' ' + programDisplayLabel(m) : ''} — ${m.nama}`,
        terbit: semester.status === 'terbit',
      });
    });
  });

  const set = [];
  inginkan.forEach((b, id) => {
    const lama = ada.get(id);
    if (!lama || SAMA.some((k) => lama[k] !== b[k])) set.push(b);
  });
  const hapus = [...ada.keys()].filter((id) => !inginkan.has(id));
  return { set, hapus, tidakMasuk };
}
