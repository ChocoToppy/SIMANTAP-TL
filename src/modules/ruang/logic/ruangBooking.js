import { menitJam, beririsan } from '../host.js';

// ===================== ruangBooking.js =====================
// Logika murni (tanpa Firestore/React) untuk sistem jadwal ruang:
//   ruang        { id, nama, gedung, kapasitas, jenis, aktif, urut }
//   semester     { id, label, mulai, selesai, blackout:[{mulai,selesai,ket}], status:'draft'|'terbit' }
//   booking      { id, semesterId, ruangId, jenis, pola:'mingguan'|'sekali',
//                  hari (0=Senin..6), tanggal (pola sekali), dari/sampai (rentang berlaku
//                  pola mingguan), mulai, selesai ('HH:MM'), judul, sumber, terbit }
// Perubahan jadwal kuliah (sementara/permanen/separuh semester) = mengubah
// rentang dari/sampai atau memecah booking — tidak butuh mekanisme khusus.

export const JENIS_BOOKING = { kuliah: 'Kuliah', pengganti: 'Kelas pengganti', seminar: 'Seminar/Sidang', kegiatan: 'Kegiatan' };
export const JENIS_RUANG = ['kuliah', 'seminar', 'sidang', 'rapat', 'lainnya'];

export function geserHari(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const hariDariTanggal = (iso) => (new Date(`${iso}T00:00:00`).getDay() + 6) % 7;

const normRuang = (s) => String(s || '').toLowerCase().replace(/ruang|r\./g, '').replace(/[^a-z0-9]/g, '');
// Persis sama setelah dinormalisasi (dipakai saat impor supaya tidak salah gabung).
export const ruangPersis = (a, b) => { const x = normRuang(a); return !!x && x === normRuang(b); };
// Longgar (salah satunya memuat yang lain) — untuk nama ruang teks bebas di data mahasiswa.
export function ruangSama(a, b) {
  const x = normRuang(a), y = normRuang(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}

export function slugRuang(nama) {
  return 'r-' + (String(nama).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ruang');
}

// Semester yang ditampilkan ke mahasiswa: yang terbit & mencakup hari ini,
// kalau tidak ada, yang terbit dengan tanggal mulai terbaru.
export function semesterAktif(semesters, hariIni) {
  const terbit = (semesters || []).filter((s) => s.status === 'terbit');
  const sedangBerjalan = terbit.find((s) => s.mulai <= hariIni && hariIni <= s.selesai);
  if (sedangBerjalan) return sedangBerjalan;
  return terbit.slice().sort((a, b) => String(b.mulai).localeCompare(String(a.mulai)))[0] || null;
}

// Semester terbit yang mencakup tanggal tertentu (untuk cek usulan jadwal).
export const semesterUntukTanggal = (semesters, tanggal) =>
  (semesters || []).find((s) => s.status === 'terbit' && s.mulai <= tanggal && tanggal <= s.selesai) || null;

// Pilihan ruang untuk dropdown jadwal: ruang master aktif bila sudah ada, kalau belum
// (belum diimpor / build produksi) pakai daftar bawaan RUANG.
export function opsiRuang(data, daftarBawaan) {
  const master = ((data && data.ruang) || []).filter((r) => r.aktif !== false).sort((a, b) => (a.urut || 0) - (b.urut || 0)).map((r) => r.nama);
  return master.length ? master : daftarBawaan;
}

const dalamBlackout = (semester, tanggal) =>
  (semester.blackout || []).some((b) => b.mulai && b.selesai && b.mulai <= tanggal && tanggal <= b.selesai);

// Booking yang berlaku pada satu tanggal tertentu.
export function bookingPadaTanggal(bookings, semester, tanggal) {
  if (!semester || !tanggal) return [];
  const hari = hariDariTanggal(tanggal);
  return (bookings || []).filter((b) => {
    if (b.semesterId !== semester.id) return false;
    if (b.pola === 'sekali') return b.tanggal === tanggal;
    if ((b.kecuali || []).includes(tanggal)) return false; // dibatalkan/dipindah sekali pada tanggal ini
    if (tanggal < (b.dari || semester.mulai) || tanggal > (b.sampai || semester.selesai)) return false;
    return b.hari === hari && !dalamBlackout(semester, tanggal);
  });
}

// Bentuk siap-tampil (dipakai grid): nama ruang & jenis sudah diselesaikan.
export function slotPadaTanggal(data, semester, tanggal) {
  const namaRuang = new Map((data.ruang || []).map((r) => [r.id, r.nama]));
  return bookingPadaTanggal(data.bookings, semester, tanggal).map((b) => ({
    id: b.id, ruangId: b.ruangId, ruang: namaRuang.get(b.ruangId) || b.ruangId,
    mulai: b.mulai, selesai: b.selesai, label: b.judul, pj: (b.pj || []).map((p) => p.nama), kegiatan: b.kegiatan || '', mahasiswa: (b.mahasiswa || []).map((m) => m.nama), jenis: b.jenis === 'seminar' ? 'seminar' : 'kuliah', jenisBooking: b.jenis,
  }));
}

// Teks tooltip satu blok jadwal: jam, judul, mahasiswa, penanggung jawab.
export const teksSlot = (s) => [
  `${s.mulai}–${s.selesai} · ${s.label}`,
  s.mahasiswa && s.mahasiswa.length ? `Mahasiswa: ${s.mahasiswa.join(', ')}` : '',
  s.pj && s.pj.length ? `PJ: ${s.pj.join(', ')}` : '',
].filter(Boolean).join('\n');

// Booking yang bentrok dengan usulan {tanggal, jamMulai, jamSelesai, ruang(nama)}.
// Waktu yang sekadar bersentuhan (selesai 10:00, mulai 10:00) BUKAN bentrok.
export function cariBentrokBooking(data, semester, { tanggal, jamMulai, jamSelesai, ruang }) {
  if (!data || !semester || !tanggal || !ruang) return [];
  const a = menitJam(jamMulai), b = menitJam(jamSelesai);
  if (a == null || b == null) return [];
  return slotPadaTanggal(data, semester, tanggal)
    .filter((s) => ruangSama(s.ruang, ruang) && beririsan([a, b], [menitJam(s.mulai), menitJam(s.selesai)]));
}

// Pemeriksa tunggal untuk semua form (usulan mahasiswa, penjadwalan admin, dst.):
// cari semester terbit yang mencakup tanggal usulan, lalu bandingkan dengan booking
// yang berlaku (kuliah berulang + booking bertanggal). Tanpa semester terbit yang
// mencakup tanggal itu, tidak ada yang bisa diperiksa -> {semester:null, bentrok:[]}.
// `abaikan` (opsional): fungsi booking->boolean untuk mengecualikan booking milik
// jadwal yang sedang diedit sendiri.
export function periksaUsulanRuang(data, { tanggal, jamMulai, jamSelesai, ruang }, { abaikan } = {}) {
  const semester = data ? semesterUntukTanggal(data.semesters, tanggal) : null;
  if (!semester) return { semester: null, bentrok: [] };
  const sumber = abaikan ? { ...data, bookings: data.bookings.filter((b) => !abaikan(b)) } : data;
  return { semester, bentrok: cariBentrokBooking(sumber, semester, { tanggal, jamMulai, jamSelesai, ruang }) };
}

export const teksBentrokRuang = (bentrok) => bentrok.map((s) => `${s.label} (${s.mulai}–${s.selesai})`).join('; ');

// ----- Tanggal di dalam teks sel Excel ("17 Sept 26", "25 Juni 2026", "3 Oktober - 16 Oktober") -----
// Sel bertanggal = kegiatan sekali jalan (satu tanggal) atau berulang terbatas (dua tanggal =
// rentang), BUKAN kuliah mingguan sepanjang semester.
const BULAN_ID = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6, jul: 7, agu: 8, agt: 8, sep: 9, okt: 10, nov: 11, des: 12 };
const POLA_TANGGAL = /(\d{1,2})\s*(jan|feb|mar|apr|mei|jun|jul|agu|agt|sep|okt|nov|des)[a-z]*\.?(?:\s*(\d{4}|\d{2}))?/gi;
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function tanggalDalamTeks(label, semester) {
  const hasil = [];
  for (const m of String(label).matchAll(POLA_TANGGAL)) {
    const d = Number(m[1]), bln = BULAN_ID[m[2].toLowerCase()];
    if (d < 1 || d > 31) continue;
    let tahun;
    if (m[3]) tahun = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    else {
      // Tanpa tahun: pilih tahun (tahun mulai / berikutnya) yang jatuh di dalam semester.
      const y0 = Number(semester.mulai.slice(0, 4));
      tahun = [y0, y0 + 1].find((y) => iso(y, bln, d) >= semester.mulai && iso(y, bln, d) <= semester.selesai) || y0;
    }
    hasil.push(iso(tahun, bln, d));
  }
  return hasil;
}

function tebakGedung(nama) { const m = /\b([A-E])\.?\s?\d{3}\b/i.exec(nama); return m ? m[1].toUpperCase() : ''; }
function tebakJenis(nama) {
  if (/sidang/i.test(nama)) return 'sidang';
  if (/seminar/i.test(nama)) return 'seminar';
  if (/rapat|kerja\s?sama/i.test(nama)) return 'rapat';
  return 'kuliah';
}

// Petakan hasil parse Excel ke ruang master + booking siap simpan.
// Ruang yang sudah ada (nama persis sama) dipakai ulang; sisanya dibuat baru.
// HANYA kuliah berulang yang diimpor (mingguan sepanjang semester). Seminar/sidang
// di Excel adalah kegiatan sekali jalan tanpa tanggal, jadi dilewati — dicatat
// per tanggal lewat booking 'sekali' (usulan mahasiswa/admin), bukan diulang tiap pekan.
export function rancangImpor(hasil, ruangAda, semester) {
  const ruangBaru = [];
  const peta = new Map();
  let urut = Math.max(0, ...ruangAda.map((r) => r.urut || 0));
  const terpakai = new Set(ruangAda.map((r) => r.id));
  hasil.ruang.forEach((nama) => {
    const ada = ruangAda.find((r) => ruangPersis(r.nama, nama));
    if (ada) { peta.set(nama, ada.id); return; }
    let id = slugRuang(nama);
    while (terpakai.has(id)) id += '-2';
    terpakai.add(id);
    urut += 1;
    ruangBaru.push({ id, nama, gedung: tebakGedung(nama), kapasitas: '', jenis: tebakJenis(nama), aktif: true, urut });
    peta.set(nama, id);
  });
  // Sel yang menyebut tanggal di teksnya -> booking bertanggal / berulang terbatas.
  // Cek: tanggal harus di dalam semester dan hari-nya cocok dengan sheet hari asalnya.
  const bertanggal = [];
  const tanggalDilewati = [];
  const sisa = [];
  hasil.slots.forEach((s) => {
    // Jadwal rekap sistem pusat (mingguan penuh): tidak ada tanggal di dalam teks.
    const tgl = s.mingguan ? [] : tanggalDalamTeks(s.label, semester);
    if (!tgl.length) { sisa.push(s); return; }
    const [awal, akhir] = [tgl[0], tgl[tgl.length - 1]];
    if (awal < semester.mulai || akhir > semester.selesai) { tanggalDilewati.push({ ...s, alasan: 'tanggal di luar semester' }); return; }
    if (awal === akhir) {
      if (hariDariTanggal(awal) !== s.hari) { tanggalDilewati.push({ ...s, alasan: 'hari pada tanggal tidak cocok dengan sheet' }); return; }
      bertanggal.push({ ...s, pola: 'sekali', tanggal: awal });
    } else {
      bertanggal.push({ ...s, pola: 'mingguan', dari: awal, sampai: akhir });
    }
  });
  // Seminar/sidang tanpa tanggal di teks tetap dilewati (tidak ada tanggal untuk dipakai).
  const sekaliDilewati = sisa.filter((s) => s.jenis === 'seminar');
  const bookingBertanggal = bertanggal.map((s, i) => ({
    id: `${semester.id}_imp_t${i}`, semesterId: semester.id, ruangId: peta.get(s.ruang),
    jenis: s.jenis === 'seminar' ? 'seminar' : 'kegiatan', pola: s.pola, hari: s.hari,
    ...(s.pola === 'sekali' ? { tanggal: s.tanggal } : { dari: s.dari, sampai: s.sampai }),
    mulai: s.mulai, selesai: s.selesai, judul: s.label, sumber: 'impor',
  }));
  const bookingBiasa = sisa.filter((s) => s.jenis !== 'seminar').map((s, i) => ({
    id: `${semester.id}_imp_${i}`,
    semesterId: semester.id,
    ruangId: peta.get(s.ruang),
    jenis: 'kuliah',
    pola: 'mingguan',
    hari: s.hari,
    dari: semester.mulai,
    sampai: semester.selesai,
    mulai: s.mulai,
    selesai: s.selesai,
    judul: s.label,
    ...(s.pj && s.pj.length ? { pj: s.pj } : {}),
    sumber: 'impor',
  }));
  const bookings = [...bookingBiasa, ...bookingBertanggal];
  return { ruangBaru, bookings, sekaliDilewati, bertanggal, tanggalDilewati };
}

// ---------- Perubahan jadwal (admin) ----------
// Kuliah berulang bisa diubah untuk: 'semua' pekan, 'mulai' tanggal tertentu dan
// seterusnya (memecah booking), atau 'sekali' pada satu tanggal (kelas pengganti /
// dipindah sementara). Booking sekali jalan selalu diubah langsung.
// Hasil: { set:[dokumen untuk ditulis], hapus:[id untuk dihapus] } — belum ada flag
// terbit (diisi saat menulis). Booking hasil impor yang diubah diberi diubah:true.
// Buang field khusus kuliah berulang dari booking yang jadi sekali jalan.
const sekaliSaja = ({ hari, dari, sampai, ...sisa }) => sisa;
const tandai = (b) => (b.sumber === 'impor' ? { ...b, diubah: true } : b);

export function rancangPerubahan(lama, baru, cakupan, tanggal, semester, idBaru) {
  if (lama.pola === 'sekali' || cakupan === 'semua' || (cakupan === 'mulai' && tanggal <= (lama.dari || semester.mulai))) {
    return { set: [tandai({ ...lama, ...baru })], hapus: [] };
  }
  if (cakupan === 'mulai') {
    const akhirAsli = lama.sampai || semester.selesai;
    return {
      set: [
        tandai({ ...lama, sampai: geserHari(tanggal, -1) }),
        { ...lama, ...baru, id: idBaru, dari: tanggal, sampai: baru.sampai || akhirAsli, kecuali: (lama.kecuali || []).filter((t) => t >= tanggal), sumber: 'manual', diubah: false },
      ],
      hapus: [],
    };
  }
  // 'sekali'
  const jenis = baru.jenis === 'kuliah' ? 'pengganti' : baru.jenis;
  return {
    set: [
      tandai({ ...lama, kecuali: [...(lama.kecuali || []), tanggal] }),
      { ...sekaliSaja(baru), id: idBaru, semesterId: lama.semesterId, pola: 'sekali', tanggal, jenis, sumber: 'manual' },
    ],
    hapus: [],
  };
}

export function rancangHapus(lama, cakupan, tanggal, semester) {
  if (lama.pola === 'sekali' || cakupan === 'semua' || (cakupan === 'mulai' && tanggal <= (lama.dari || semester.mulai))) return { set: [], hapus: [lama.id] };
  if (cakupan === 'mulai') return { set: [tandai({ ...lama, sampai: geserHari(tanggal, -1) })], hapus: [] };
  return { set: [tandai({ ...lama, kecuali: [...(lama.kecuali || []), tanggal] })], hapus: [] };
}

// Semua tanggal kejadian sebuah booking dalam semester (untuk cek bentrok booking baru).
export function tanggalKejadian(b, semester) {
  if (b.pola === 'sekali') return b.tanggal ? [b.tanggal] : [];
  const out = [];
  const akhir = b.sampai || semester.selesai;
  for (let t = b.dari || semester.mulai; t <= akhir; t = geserHari(t, 1)) {
    if (hariDariTanggal(t) === b.hari && !dalamBlackout(semester, t) && !(b.kecuali || []).includes(t)) out.push(t);
  }
  return out;
}

// Bentrok untuk booking yang hendak disimpan (semua kejadiannya), mengabaikan
// booking `abaikanId` (dirinya sendiri) dan booking bertumpuk dengan tanggal yang sama.
export function bentrokBookingBaru(data, semester, kandidat, abaikanId) {
  const ruang = (data.ruang || []).find((r) => r.id === kandidat.ruangId);
  if (!ruang) return [];
  const sumber = { ...data, bookings: data.bookings.filter((b) => b.id !== abaikanId) };
  const hasil = [];
  tanggalKejadian(kandidat, semester).forEach((tanggal) => {
    cariBentrokBooking(sumber, semester, { tanggal, jamMulai: kandidat.mulai, jamSelesai: kandidat.selesai, ruang: ruang.nama })
      .forEach((s) => hasil.push({ tanggal, ...s }));
  });
  return hasil;
}
