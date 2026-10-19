import { BIDANG, KP_TEMA, labelPilihan } from './pilihan.js';
import { FITUR_EKSPERIMENTAL } from './config.js';
// Daftar BIDANG/KP_TEMA bawaan + override admin (Pengaturan → Tema & Bidang) ada di pilihan.js.
export { BIDANG, KP_TEMA };
// ===================== helpers.js =====================
// helpers.js — konstanta + semua logika murni (tanpa tampilan)

// ---------- Program & tahapan ----------
// Setiap program punya daftar tahap sendiri, event yang dijadwalkan
// (punya jam/ruang/checklist), dan apakah punya field Klasifikasi.
export const PROGRAMS = {
  TA: {
    label: 'Tugas Akhir',
    stages: ['Pendaftaran', 'Seminar Proposal', 'Seminar Hasil', 'Sidang', 'Lulus'],
    events: ['Seminar Proposal', 'Seminar Hasil', 'Sidang'],
    klasifikasi: true,
    syarat: true,
    // Sempro & Semhas: pembimbing + penguji 1. Sidang: pembimbing + penguji 1 & 2.
    pembimbing: 1,
    penguji: 2,
    pembimbingLabel: 'Dosen Pembimbing',
  },
  KP: {
    label: 'Kerja Praktik',
    // Pembukuan: mahasiswa mengirim tautan bukti laporan KP sudah diarsipkan
    // & ditandatangani (m.pembukuan), tanpa jadwal.
    stages: ['Pendaftaran', 'Bimbingan', 'Pembukuan', 'Lulus'],
    events: [],
    klasifikasi: false,
    pembimbing: 1,
    penguji: 0,
    pembimbingLabel: 'Dosen Pembimbing',
  },
  CAP: {
    label: 'Capstone Design',
    stages: ['Pendaftaran', 'Seminar Proposal', 'Expo', 'Lulus'],
    events: ['Seminar Proposal', 'Expo'],
    klasifikasi: false,
    syarat: true,
    pembimbing: 1,
    penguji: 2,
    pembimbingLabel: 'Dosen Pembimbing',
  },
  MG: {
    label: 'Magang',
    stages: ['Pendaftaran', 'Bimbingan', 'Expo', 'Lulus'],
    events: ['Expo'],
    klasifikasi: false,
    syarat: false,
    pembimbing: 1,
    penguji: 0,
    pembimbingLabel: 'Dosen Pembimbing/Penguji',
  },
  S2: {
    label: 'Tesis S2',
    stages: ['Pendaftaran', 'Penentuan Pembimbing', 'Seminar Proposal', 'Seminar Hasil', 'Sidang', 'Lulus'],
    events: ['Seminar Proposal', 'Seminar Hasil', 'Sidang'],
    klasifikasi: true,
    syarat: false, // syarat pendaftaran TA dihilangkan untuk Tesis S2
    pembimbing: 2,
    penguji: 2,
  },
};
export const PROGRAM_KEYS = ['TA', 'KP', 'CAP', 'MG', 'S2'];

export function programOf(m) { return PROGRAMS[m.program] ? m.program : 'TA'; }
export function programLabel(k) { return PROGRAMS[k] ? PROGRAMS[k].label : k; }
// Magang punya 2 jenis (Magang biasa / Mata Kuliah Terapan) yang berbagi
// field & alur yang sama persis — satu-satunya beda tampilan adalah label
// field "Judul" berganti jadi "Nama Mata Kuliah" untuk MKT.
export function jenisMagangOf(m) { return m.jenisMagang === 'MKT' ? 'MKT' : 'Magang'; }
// Nama program yang dipakai di judul panel dokumen, tombol cetak, dsb — beda
// dari kartu-prog (badge utama di Portal, sengaja tetap "Magang" + chip MKT
// terpisah, lihat KartuPengajuan.jsx) karena teks-teks ini spesifik per
// dokumen/aksi dan harus jelas menyebut MKT, bukan cuma "Magang".
export function programDisplayLabel(m) {
  if (programOf(m) === 'MG' && jenisMagangOf(m) === 'MKT') return 'MKT';
  return programLabel(programOf(m));
}
export function judulLabelFor(m) {
  if (programOf(m) === 'MG' && jenisMagangOf(m) === 'MKT') return 'Nama Mata Kuliah';
  if (programOf(m) === 'KP') return 'Judul Kerja Praktik';
  if (programOf(m) === 'MG') return 'Judul Magang';
  return 'Judul';
}
// docType surat perpanjangan per program (KP, TA, Magang/MKT).
export function perpanjanganDocType(m) {
  const prog = programOf(m);
  return prog === 'KP' ? 'Perpanjangan KP' : prog === 'TA' ? 'Perpanjangan TA' : 'Perpanjangan Magang';
}
export function stagesFor(program) { return (PROGRAMS[program] || PROGRAMS.TA).stages; }
export function eventsFor(program) { return (PROGRAMS[program] || PROGRAMS.TA).events; }
export function punyaKlasifikasi(program) { return (PROGRAMS[program] || PROGRAMS.TA).klasifikasi; }
export function punyaSyarat(program) { return !!(PROGRAMS[program] || PROGRAMS.TA).syarat; }
export function rolesFor(program) {
  const p = PROGRAMS[program] || PROGRAMS.TA;
  return { pembimbing: p.pembimbing, penguji: p.penguji, pembimbingLabel: p.pembimbingLabel };
}
export function syaratLabel(ev) {
  if (ev.includes('Sidang')) return 'Syarat Sidang';
  if (ev.includes('Expo')) return 'Syarat Expo';
  return 'Syarat Seminar';
}
export function getJadwal(m, ev) { return (m.jadwal && m.jadwal[ev]) || {}; }

// Tahap default TA (kompatibilitas).
export const STAGES = PROGRAMS.TA.stages;

export const KLASIFIKASI = ['Penelitian', 'Perencanaan'];

// Hari (untuk isian hari pada jadwal kegiatan).
export const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Minggu'];

export function bidangLabel(kode) {
  return labelPilihan(kode) || kode || '-';
}

// ---------- Tanggal (disimpan sebagai 'YYYY-MM-DD') ----------
export function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function daysBetween(fromISO, toISO) {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  if (!a || !b) return null;
  return Math.round((b - a) / 86400000);
}

export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function formatTanggal(s) {
  const d = parseISO(s);
  if (!d) return '-';
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------- Status / kondisi mahasiswa ----------
export function kondisi(mhs) {
  if (mhs.dibatalkan) return { key: 'batal', label: 'Ditutup', tone: 'gray', daysLeft: null };
  if (mhs.tahap === 'Lulus') return { key: 'lulus', label: 'Lulus', tone: 'green', daysLeft: null };
  const daysLeft = daysBetween(todayISO(), mhs.batasAkhir);
  if (daysLeft === null) return { key: 'aman', label: 'Aktif', tone: 'blue', daysLeft: null };
  if (daysLeft < 0) return { key: 'lewat', label: `Lewat ${Math.abs(daysLeft)} hari`, tone: 'red', daysLeft };
  if (daysLeft <= 30) return { key: 'mendekati', label: `Sisa ${daysLeft} hari`, tone: 'amber', daysLeft };
  return { key: 'aman', label: `Sisa ${daysLeft} hari`, tone: 'green', daysLeft };
}

export function isAktif(mhs) { return !mhs.dibatalkan && mhs.tahap !== 'Lulus'; }

export function indexTahap(tahap, program) {
  const s = stagesFor(program);
  const i = s.indexOf(tahap);
  return i < 0 ? 0 : i;
}

// ---------- Beban dosen (otomatis) ----------
// opts.semua = true -> hitung semua status kecuali dibatalkan (termasuk Lulus).
// default -> hanya mahasiswa aktif (belum lulus & tidak dibatalkan).
export function hitungBeban(mahasiswa, kodeDosen, opts = {}) {
  const { semua = false } = opts;
  let bimbingan = 0;
  let penguji = 0;
  mahasiswa.forEach((m) => {
    if (m.dibatalkan) return;
    if (!semua && m.tahap === 'Lulus') return;
    if (m.pembimbing1 === kodeDosen) bimbingan++;
    if (m.pembimbing2 === kodeDosen) bimbingan++;
    if (m.penguji1 === kodeDosen) penguji++;
    if (m.penguji2 === kodeDosen) penguji++;
  });
  return { bimbingan, penguji, total: bimbingan + penguji };
}

// Beban hanya untuk satu program tertentu.
export function hitungBebanProgram(mahasiswa, kodeDosen, program, opts) {
  return hitungBeban(mahasiswa.filter((m) => programOf(m) === program), kodeDosen, opts);
}

// Rincian beban per program untuk tabel Dosen.
export function hitungBebanRinci(mahasiswa, kodeDosen, opts) {
  const ta = hitungBebanProgram(mahasiswa, kodeDosen, 'TA', opts);
  const cap = hitungBebanProgram(mahasiswa, kodeDosen, 'CAP', opts);
  const kp = hitungBebanProgram(mahasiswa, kodeDosen, 'KP', opts);
  const mg = hitungBebanProgram(mahasiswa, kodeDosen, 'MG', opts);
  const s2 = hitungBebanProgram(mahasiswa, kodeDosen, 'S2', opts);
  return {
    bimbinganTA: ta.bimbingan,
    pengujiTA: ta.penguji,
    bimbinganCAP: cap.bimbingan,
    pengujiCAP: cap.penguji,
    bimbinganKP: kp.bimbingan, // KP: 1 pembimbing
    bimbinganMG: mg.bimbingan, // Magang: 1 pembimbing/penguji
    bimbinganS2: s2.bimbingan,
    pengujiS2: s2.penguji,
    total:
      ta.bimbingan + ta.penguji + cap.bimbingan + cap.penguji + kp.bimbingan +
      mg.bimbingan + s2.bimbingan + s2.penguji,
  };
}

// ---------- Periode ----------
export const SEMUA = 'SEMUA';
export function filterByPeriode(mahasiswa, periode) {
  if (!periode || periode === SEMUA) return mahasiswa;
  return mahasiswa.filter((m) => m.periode === periode);
}
export function daftarPeriode(mahasiswa) {
  const set = new Set(mahasiswa.map((m) => m.periode).filter(Boolean));
  return Array.from(set).sort();
}
// Dosen aktif untuk pilihan dropdown (pembimbing/penguji/wali), tapi tetap
// sertakan dosen yang sedang terpasang di salah satu field (`current`) walau
// sudah dinonaktifkan — supaya penugasan lama tidak mendadak hilang dari
// tampilan hanya karena dosennya diarsipkan admin.
export function dosenAktifUntuk(allDosen, ...current) {
  const terpasang = new Set(current.filter(Boolean));
  return (allDosen || []).filter((d) => d.isActive !== false || terpasang.has(d.kode));
}
export function buatId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
// ID pengajuan buatan mahasiswa: satu dokumen per (NIM, program). Harus sama
// persis dengan aturan create di firestore.rules.
export function idPengajuan(nim, program) {
  return `${nim}_${program}`;
}
// Pengajuan yang ditutup admin (field lama `dibatalkan`) tetap tersimpan sebagai
// arsip; mahasiswa boleh mendaftar ulang program yang sama dengan ID bernomor
// ({nim}_{program}_2, _3, …) — satu pengajuan TERBUKA per program.
export function ditutup(m) { return !!(m && m.dibatalkan); }
export function idPengajuanBaru(nim, program, idAda = []) {
  const dasar = idPengajuan(nim, program);
  if (!idAda.includes(dasar)) return dasar;
  let n = 2;
  while (idAda.includes(`${dasar}_${n}`)) n++;
  return `${dasar}_${n}`;
}

// ===================== Verifikasi pendaftaran =====================
// Autentikasi (login/registrasi/reset password) kini ditangani Firebase
// Authentication + Cloud Functions — lihat src/utils/auth.js dan
// functions/index.js. Tidak ada lagi password bersama/hardcoded di sini.

// Periode default untuk pendaftaran baru oleh mahasiswa.
export const PERIODE_AKTIF = '2021 Ganjil';

// Pilihan topik = sama dengan daftar Bidang.
export const TOPIK = BIDANG;

export const VERIFIKASI = {
  baru: { label: 'Menunggu verifikasi', tone: 'amber' },
  terverifikasi: { label: 'Terverifikasi', tone: 'green' },
  perbaikan: { label: 'Perlu perbaikan', tone: 'red' },
};

export function statusVerif(m) {
  const key = m.verifikasi && VERIFIKASI[m.verifikasi] ? m.verifikasi : 'baru';
  return { key, label: VERIFIKASI[key].label, tone: VERIFIKASI[key].tone };
}

// Status verifikasi = antrean pekerjaan admin. Hanya kiriman yang menuntut
// tindakan admin yang mengembalikan status ke "Menunggu verifikasi"
// (tandaiMenungguVerifikasi): surat balasan (admin menetapkan pembimbing),
// tautan folder Pembukuan KP (admin menyetujui), usulan jadwal/berkas sidang,
// dan perpanjangan. Unggahan biasa (mis. lembar pengesahan, yang langsung
// memindahkan KP ke Pembukuan) tidak. Akses fitur mengikuti pernahDiverifikasi,
// bukan status saat ini, supaya mahasiswa tidak terkunci selama menunggu.
export function pernahDiverifikasi(m) {
  return m.verifikasi === 'terverifikasi' || !!m.pernahTerverifikasi;
}
// Unduh template & kirim berkas/tautan (sisi mahasiswa): dikunci saat "Perlu
// perbaikan" sampai data pendaftaran dibetulkan, karena data yang tercetak di
// dokumen (mis. judul) mungkin masih salah. Sama dengan perbaikanTerkunci di
// firestore.rules dan storage.rules.
export function bolehAksesBerkas(m) {
  return pernahDiverifikasi(m) && statusVerif(m).key !== 'perbaikan';
}
export function tandaiMenungguVerifikasi(rec) {
  return {
    ...rec,
    verifikasi: 'baru',
    ...(rec.verifikasi === 'terverifikasi' ? { pernahTerverifikasi: true } : {}),
  };
}

// Tambah n hari ke 'YYYY-MM-DD'
export function tambahHari(iso, n) {
  const d = iso ? new Date(iso) : new Date();
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Label ramah untuk field pendaftaran (dipakai panel verifikasi admin).
export const LABEL_PENDAFTARAN = {
  syaratSKS: 'Lulus 120 SKS & IPK\u22652',
  ipk: 'IPK',
  statusKP: 'Status KP',
  terdaftarKRS: 'Terdaftar KRS TA',
  sudahUGB: 'Sudah UGB/Proposal',
  namaPersetujuanDosen: 'Persetujuan projek dosen',
  semester: 'Semester',
  sksIpk: 'Jumlah SKS / IPK',
  alamatWA: 'Alamat lengkap',
  tempatKP: 'Tempat/Perusahaan KP',
  instansi: 'Instansi (Kota/Provinsi)',
  nomorWA: 'Nomor WA',
};

// Ubah objek pendaftaran menjadi daftar {label,nilai} untuk ditampilkan.
export function ringkasPendaftaran(p) {
  if (!p) return [];
  const lewati = ['berkasLink', 'submittedAt'];
  return Object.keys(p)
    .filter((k) => !lewati.includes(k) && p[k] !== '' && p[k] != null)
    .map((k) => {
      let nilai = p[k];
      if (typeof nilai === 'boolean') nilai = nilai ? 'Ya' : 'Tidak';
      if (k === 'namaPersetujuanDosen') nilai = String(nilai);
      return { label: LABEL_PENDAFTARAN[k] || k, nilai: String(nilai) };
    });
}

// ===================== Ruang, jadwal & deteksi bentrok =====================

export const RUANG = [
  'Ruang Sidang 1', 'Ruang Sidang 2', 'Ruang Kerjasama', 'Ruang Seminar KP',
  'Ruang Kuliah E101', 'Ruang Kuliah E102', 'Fasade',
];

export function menitJam(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Rentang waktu sebuah jadwal dalam menit: [mulai, selesai] atau null.
export function rentangJadwal(j) {
  if (!j) return null;
  if (j.jamMulai && j.jamSelesai) {
    const a = menitJam(j.jamMulai), b = menitJam(j.jamSelesai);
    if (a != null && b != null && b > a) return [a, b];
  }
  if (j.jam) {
    const m = /(\d{1,2}):(\d{2})\s*[-\u2013]\s*(\d{1,2}):(\d{2})/.exec(j.jam);
    if (m) {
      const a = Number(m[1]) * 60 + Number(m[2]);
      const b = Number(m[3]) * 60 + Number(m[4]);
      if (b > a) return [a, b];
    }
  }
  return null;
}

export function jamTampil(j) {
  if (j && j.jamMulai && j.jamSelesai) return `${j.jamMulai}\u2013${j.jamSelesai}`;
  return (j && j.jam) || '';
}

// Jadwal kegiatan yang DIGANTI (tanggal/jam/ruang berubah, atau hasilnya dihapus) dan sebelumnya
// sudah final/berhasil dinilai dipindah ke m.riwayatJadwal supaya mahasiswa punya log lengkap.
// Usulan yang belum dikonfirmasi tidak diarsipkan (cuma draf yang diubah-ubah).
export function arsipkanJadwal(lama, baru) {
  if (!lama) return baru;
  const arsip = [];
  Object.keys(lama.jadwal || {}).forEach((ev) => {
    const a = lama.jadwal[ev] || {};
    const b = (baru.jadwal || {})[ev] || {};
    if (!a.tanggal || !(a.dikonfirmasi || a.hasil)) return;
    const berubah = a.tanggal !== b.tanggal || a.jamMulai !== b.jamMulai || a.ruang !== b.ruang || (a.hasil && a.hasil !== b.hasil);
    if (berubah) arsip.push({ ev, ...a, diarsipkan: new Date().toISOString() });
  });
  return arsip.length ? { ...baru, riwayatJadwal: [...(baru.riwayatJadwal || lama.riwayatJadwal || []), ...arsip] } : baru;
}

export function beririsan(a, b) { return a[0] < b[1] && b[0] < a[1]; }

export function dosenTerlibat(m) {
  return [m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2].filter(Boolean);
}

// Dosen yang hadir pada satu kegiatan. TA: penguji 2 hanya ikut Sidang.
export function dosenEvent(m, ev) {
  if (programOf(m) === 'TA' && ev !== 'Sidang') return [m.pembimbing1, m.penguji1].filter(Boolean);
  return dosenTerlibat(m);
}

// Kumpulkan semua event terjadwal (punya tanggal) dari daftar mahasiswa.
export function kumpulkanEvent(mahasiswa) {
  const out = [];
  mahasiswa.forEach((m) => {
    if (m.dibatalkan) return;
    eventsFor(programOf(m)).forEach((ev) => {
      const j = (m.jadwal && m.jadwal[ev]) || {};
      if (!j.tanggal) return;
      out.push({
        key: m.id + '|' + ev, m, ev, tanggal: j.tanggal,
        ruang: j.ruang || '', jam: jamTampil(j), rentang: rentangJadwal(j),
        dosen: dosenEvent(m, ev),
      });
    });
  });
  out.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    const am = a.rentang ? a.rentang[0] : 0, bm = b.rentang ? b.rentang[0] : 0;
    return am - bm;
  });
  return out;
}

// Cari bentrok untuk semua event milik calonM terhadap mahasiswa lain.
// Mengembalikan { bentrok: [], kelompok: [] } (kosong = aman).
export function cariBentrok(semuaMahasiswa, calonM) {
  const lain = (semuaMahasiswa || []).filter((x) => x.id !== calonM.id && !x.dibatalkan);
  const lainEvents = kumpulkanEvent(lain);
  const pesanBentrok = [];
  const pesanKelompok = [];
  
  const normalizeJudul = (j) => (j || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const calonJudul = normalizeJudul(calonM.judul);

  eventsFor(programOf(calonM)).forEach((ev) => {
    const j = (calonM.jadwal && calonM.jadwal[ev]) || {};
    if (!j.tanggal) return;
    const rentang = rentangJadwal(j);
    if (!rentang) return; // tak bisa cek tanpa jam mulai/selesai
    const myDosen = dosenEvent(calonM, ev);
    lainEvents.forEach((e) => {
      if (e.tanggal !== j.tanggal || !e.rentang) return;
      if (!beririsan(rentang, e.rentang)) return;
      
      const eJudul = normalizeJudul(e.m.judul);
      const isKelompok = calonJudul !== '' && eJudul !== '' && calonJudul === eJudul;

      if (j.ruang && e.ruang && j.ruang === e.ruang) {
        if (isKelompok) {
          pesanKelompok.push(`Ruang "${j.ruang}" pada ${j.tanggal} ${jamTampil(j)} bersama kelompok: ${e.m.nama} (${e.ev}).`);
        } else {
          pesanBentrok.push(`Ruang "${j.ruang}" pada ${j.tanggal} ${jamTampil(j)} bentrok dengan ${e.m.nama} (${e.ev}).`);
        }
      }
      const sama = myDosen.filter((d) => e.dosen.includes(d));
      if (sama.length) {
        if (isKelompok) {
          pesanKelompok.push(`Dosen ${sama.join(', ')} terjadwal pada waktu sama dengan anggota kelompok: ${e.m.nama} (${e.ev}).`);
        } else {
          pesanBentrok.push(`Dosen ${sama.join(', ')} terjadwal ganda pada ${j.tanggal} ${jamTampil(j)}: ${ev} vs ${e.m.nama} (${e.ev}).`);
        }
      }
    });
  });
  return { bentrok: pesanBentrok, kelompok: pesanKelompok };
}

// ===================== Notifikasi (komposer WA / email) =====================

export function pesanNotifikasi(m) {
  const prog = programDisplayLabel(m);
  const j = (m.jadwal && m.jadwal[m.tahap]) || {};
  const jt = jamTampil(j);
  const jadwalTxt = j.tanggal
    ? ` Jadwal: ${formatTanggal(j.tanggal)}${jt ? ' ' + jt : ''}${j.ruang ? ' di ' + j.ruang : ''}.`
    : '';
  return `Halo ${m.nama} (${m.nim}), tahap ${prog} Anda saat ini: "${m.tahap}".${jadwalTxt} Mohon menyiapkan berkas terkait. Terima kasih. — Koordinator TA/KP`;
}

export function waLink(nomor, teks) {
  let n = (nomor || '').replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(teks || '')}`;
}

export function mailtoLink(email, subjek, teks) {
  return `mailto:${email || ''}?subject=${encodeURIComponent(subjek || '')}&body=${encodeURIComponent(teks || '')}`;
}

// Ambil nomor WA mahasiswa dari data pendaftaran (field nomorWA; alamatWA dipakai sbg fallback utk data lama).
export function waMahasiswa(m) {
  const p = m.pendaftaran || {};
  const kandidat = p.nomorWA || p.alamatWA || '';
  const digit = kandidat.replace(/[^0-9]/g, '');
  return digit.length >= 8 ? kandidat : '';
}

// ===================== Alur tahap (state machine) =====================
// Durasi baku tiap kegiatan (menit) + jam kerja.
export const DURASI_EVENT = { 'Seminar Proposal': 60, 'Seminar Hasil': 60, 'Sidang': 120, 'Expo': 60 };
export const JAM_KERJA = { mulai: '08:00', selesai: '16:30' };
export function durasiEvent(ev) { return DURASI_EVENT[ev] || 60; }

export function jamTambah(hhmm, menit) {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!m) return '';
  let t = Number(m[1]) * 60 + Number(m[2]) + menit;
  const h = Math.floor(t / 60), mm = t % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

export function dalamJamKerja(jamMulai, jamSelesai) {
  if (!jamMulai || !jamSelesai) return true; // tak diisi -> tak diblok di sini
  return jamMulai >= JAM_KERJA.mulai && jamSelesai <= JAM_KERJA.selesai && jamSelesai > jamMulai;
}

// Indeks urutan tahap dalam suatu program (-1 bila tak ditemukan).
export function tahapIndex(program, tahap) {
  return stagesFor(program).indexOf(tahap);
}

// Tahap berikutnya sesuai urutan program.
export function tahapBerikut(program, tahap) {
  const s = stagesFor(program);
  const i = s.indexOf(tahap);
  return i >= 0 && i < s.length - 1 ? s[i + 1] : null;
}

// Tahap sebelumnya (kebalikan tahapBerikut) — admin punya wewenang penuh untuk
// mengembalikan/rollback tahap mahasiswa kapan pun, termasuk dari "Lulus".
export function tahapSebelumnya(program, tahap) {
  const s = stagesFor(program);
  const i = s.indexOf(tahap);
  return i > 0 ? s[i - 1] : null;
}

// Kegiatan yang sedang berlangsung pada tahap saat ini
// (= nama tahap bila tahap tsb berupa event terjadwal), else null.
export function eventAktif(m) {
  const t = m.tahap;
  return eventsFor(programOf(m)).includes(t) ? t : null;
}

// Key dokumen "Persetujuan" yang membuka tombol "Ajukan jadwal" Expo
// Magang/MKT begitu mahasiswa
// mengunggahnya — dicek murni dari keberadaan berkasnya, TIDAK dari tahap
// saat ini, supaya begitu terunggah tombolnya tetap ada (persisten) baik
// sebelum admin resmi memindahkan tahap dari "Bimbingan" MAUPUN sesudah
// mahasiswa lulus (jejak riwayat jadwal tetap terlihat). Hanya berlaku
// untuk program dengan satu event tunggal (Magang/MKT); TA/CAP/S2
// (event berjenjang: sempro -> semhas -> sidang) tidak punya jalur ini.
const PERSETUJUAN_AWAL_KEY = {
  MG: (m) => (jenisMagangOf(m) === 'MKT' ? 'persetujuanSmkpMkt' : 'persetujuanSmMagang'),
};
export function bolehUsulEventAwal(m) {
  const prog = programOf(m);
  const evs = eventsFor(prog);
  if (evs.length !== 1) return false;
  const keyFn = PERSETUJUAN_AWAL_KEY[prog];
  if (!keyFn) return false;
  const field = dokumenFieldFor(prog);
  return !!field && !!((m[field] || {})[keyFn(m)]);
}

// eventAktif() diperluas dengan jalur pintas di atas — dipakai Portal
// mahasiswa untuk menampilkan tombol "Ajukan jadwal" begitu dokumen
// Persetujuan diunggah, bukan hanya setelah admin resmi memindahkan tahap.
export function eventAktifAwal(m) {
  return eventAktif(m) || (bolehUsulEventAwal(m) ? eventsFor(programOf(m))[0] : null);
}

// Deskripsi dokumen yang harus diunggah per kegiatan (bisa diubah di sini).
// Tiap array = satu item; dirender sebagai daftar bernomor di UI.
export const BERKAS_SYARAT = {
  'Seminar Proposal': ['Proposal/UGB', 'Lembar persetujuan pembimbing', 'Kartu bimbingan', 'Transkrip & IRS'],
  'Seminar Hasil': ['Draft laporan lengkap', 'Lembar persetujuan', 'Kartu bimbingan', 'Bukti lulus Seminar Proposal'],
  'Sidang': ['Draft akhir', 'Hasil cek Turnitin', 'Lembar persetujuan pembimbing', 'Kartu bimbingan', 'Bukti lulus Seminar Hasil'],
  'Expo': ['Poster/produk', 'Laporan akhir', 'Lembar persetujuan pembimbing'],
};
export function berkasSyarat(ev, konten = {}) {
  const override = (konten && konten.berkasSyarat) || {};
  return override[ev] || BERKAS_SYARAT[ev] || ['Dokumen persyaratan sesuai ketentuan tahap ini.'];
}

// Tautan yang diketik pengguna sendiri (link berkas persyaratan, Turnitin,
// dst.) sering tanpa skema (mis. "google.com" atau "drive.google.com/xyz").
// Tanpa ini, <a href> memperlakukannya sebagai URL relatif dan menempelkannya
// ke domain aplikasi sendiri alih-alih membuka tautan eksternal yang dimaksud.
export function normalizeUrl(url) {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed)) return trimmed; // sudah punya skema (https:, mailto:, //...)
  return `https://${trimmed}`;
}

// Apakah mahasiswa boleh mengajukan jadwal (pernah terverifikasi & sudah ada pembimbing).
export function bolehAjukanJadwal(m) {
  return pernahDiverifikasi(m) && !!(m.pembimbing1 || m.pembimbing2);
}

// ===================== Dokumen KP per-tahap (generate & unggah) =====================
// Satu sumber kebenaran dipakai bersama oleh Portal mahasiswa & panel admin, supaya
// syarat kelayakan tiap dokumen tidak dobel-tulis di beberapa tempat.
export const KP_DOKUMEN = [
  {
    key: 'kelayakanKP', stage: 'Pendaftaran', label: 'Surat Kelayakan KP', docType: 'Kelayakan KP',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'kelayakanProposalKP', stage: 'Pendaftaran', label: 'Surat Kelayakan Proposal KP', docType: 'Kelayakan Proposal KP',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    // Diunduh sebagai Word (docx: true di getTemplateConfig) supaya bisa dilengkapi.
    key: 'lembarPengesahanProposalKP', stage: 'Pendaftaran', label: 'Lembar Pengesahan Proposal KP', docType: 'Lembar Pengesahan Proposal KP',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'permohonan', stage: 'Pendaftaran', label: 'Permohonan KP', docType: null,
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin.',
    catatan: 'Unggah berkas permohonan dari perusahaan tempat Anda diterima KP.',
    eligible: pernahDiverifikasi,
    linkEksternal: 'https://mandala.undip.ac.id/',
    linkLabel: 'Untuk membuat formulir Permohonan KP silahkan kunjungi Mandala UNDIP',
  },
  {
    key: 'suratBalasan', stage: 'Pendaftaran', label: 'Surat Balasan Perusahaan', docType: null,
    syarat: 'Unggah bukti diterima magang/KP dari perusahaan setelah pendaftaran diverifikasi admin.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'stPembimbing', stage: 'Bimbingan', label: 'ST Pembimbing KP', docType: 'ST Pembimbing KP',
    syarat: `Tersedia setelah surat balasan perusahaan diunggah dan admin menetapkan dosen pembimbing${FITUR_EKSPERIMENTAL ? ' serta nomor surat' : ''}.`,
    eligible: (m) => tahapIndex('KP', m.tahap) >= tahapIndex('KP', 'Bimbingan') && !!m.pembimbing1 && (!FITUR_EKSPERIMENTAL || !!m.nomorSurat),
    studentUpload: false,
  },
  {
    // Template diunduh sebagai Word (bisa diedit), yang diunggah kembali
    // adalah pindaian PDF bertanda tangan. Unggahan ini memindahkan mahasiswa
    // dari Bimbingan ke Pembukuan (uploadDokumenKP di Portal.jsx).
    key: 'lembarPengesahanKP', stage: 'Bimbingan', label: 'Lembar Pengesahan KP', docType: 'Lembar Pengesahan KP',
    syarat: 'Tersedia setelah tahap Bimbingan dimulai dan admin menetapkan dosen pembimbing.',
    catatan: '',
    catatanAdminSaja: true, // tidak ditampilkan di halaman dokumen mahasiswa
    eligible: (m) => tahapIndex('KP', m.tahap) >= tahapIndex('KP', 'Bimbingan') && !!m.pembimbing1,
  },
  {
    // Menggantikan BA Seminar KP. Dinilai dosen pembimbing di kertas lalu
    // dikembalikan ke admin, jadi hanya admin yang mengunggah hasilnya.
    // Nilai di tab Lulus diisi dari lembar ini, jadi di panel admin ikut tampil
    // di tahap Lulus (adminJugaDiTahap, lihat dokumenPerTahap).
    key: 'penilaianKP', stage: 'Bimbingan', adminJugaDiTahap: ['Lulus'], label: 'Berita Acara & Penilaian KP', docType: 'Penilaian KP',
    syarat: 'Tersedia setelah tahap Bimbingan dimulai dan admin menetapkan dosen pembimbing.',
    catatan: '',
    catatanAdminSaja: true,
    eligible: (m) => tahapIndex('KP', m.tahap) >= tahapIndex('KP', 'Bimbingan') && !!m.pembimbing1,
    studentUpload: false, adminUpload: true,
  },
  {
    // Bukan berkas: mahasiswa mengirim tautan folder Google Drive, disimpan di
    // m.pembukuan.berkasLink (linkField). Hanya bisa diisi saat tahap Pembukuan.
    // Mengirim tautan mengembalikan status ke "Menunggu verifikasi" (kirimTautan di Portal.jsx).
    key: 'pembukuan', stage: 'Pembukuan', label: 'Folder Berkas Final KP', docType: null,
    syarat: 'Tersedia saat tahap Pembukuan dimulai.',
    catatan: 'Tautan folder Google Drive berisi berkas final Kerja Praktik.',
    eligible: (m) => m.tahap === 'Pembukuan',
    studentUpload: false, linkInput: true, linkField: 'pembukuan',
  },
  {
    // Template menyusul: selama getTemplateConfig belum punya case ini,
    // dokumen tampil "Template surat belum tersedia" walau sudah eligible.
    key: 'suratPembukuanKP', stage: 'Pembukuan', label: 'Surat Keterangan Selesai Pembukuan', docType: 'Surat Pembukuan KP',
    syarat: 'Tersedia setelah admin memverifikasi tautan folder berkas final.',
    eligible: (m) => pembukuanDisetujui(m),
    studentUpload: false,
  },
];

// Surat balasan perusahaan (KP & Magang/MKT) membuka tahap Bimbingan dan
// mengunci data perusahaan di form pendaftaran (MEDAN_SURAT_BALASAN di
// formPendaftaran.js). Mengunggah/mengganti lewat FormSuratBalasan (konfirmasi
// data dulu); menghapusnya mengembalikan mahasiswa ke Pendaftaran dan membuka
// kunci. Sejak tahap setelah Bimbingan, suratnya final (tidak bisa diganti/
// dihapus mahasiswa). Sama dengan aturan sb* di firestore.rules.
export const KUNCI_SURAT_BALASAN = ['suratBalasan', 'suratBalasanMagang', 'suratBalasanMkt'];
export function adaSuratBalasan(m) {
  const f = dokumenFieldFor(programOf(m));
  return !!f && KUNCI_SURAT_BALASAN.some((k) => (m[f] || {})[k]);
}
export function suratBalasanFinal(m) {
  return ['KP', 'MG'].includes(programOf(m)) && !['Pendaftaran', 'Bimbingan'].includes(m.tahap);
}

// Pembukuan KP disetujui admin: status Terverifikasi + centang "Sudah
// diperiksa" pada tautan folder. Membuka Surat Keterangan Selesai Pembukuan.
export function pembukuanDisetujui(m) {
  const p = m.pembukuan || {};
  return programOf(m) === 'KP' && statusVerif(m).key === 'terverifikasi' && !!p.berkasLink && p.berkasDiperiksa === true;
}

// Petunjuk folder berkas final KP (tahap Pembukuan). Mahasiswa melihat format
// nama + daftar berkas, admin hanya daftar berkas (lihat PetunjukPembukuan.jsx).
export const PEMBUKUAN_FORMAT_NAMA = {
  pola: 'NamaLengkap_NIM_JenisDokumen',
  contoh: ['BudiSetiawan_123456789_LaporanKerjaPraktik', 'BudiSetiawan_123456789_Jurnal', 'BudiSetiawan_123456789_PPT'],
};
export const PEMBUKUAN_SYARAT_LAPORAN = 'Final Laporan Kerja Praktik (Word dan PDF) wajib sudah memuat Lembar Pengesahan yang telah ditandatangani di dalamnya.';
export const PEMBUKUAN_DAFTAR_BERKAS = [
  'Final Laporan Kerja Praktik (Word)',
  'Final Laporan Kerja Praktik (PDF)',
  'Final Jurnal Kerja Praktik (Word)',
  'Final Jurnal Kerja Praktik (PDF)',
  'Final PPT Kerja Praktik (PPT)',
  'Final PPT Kerja Praktik (PDF)',
];

// Deskripsi dokumen per-tahap untuk Magang — sama pola & tahapan dengan
// KP_DOKUMEN di atas (Pendaftaran → Bimbingan → Expo). Key dibuat unik
// (bukan 'permohonan'/'suratBalasan' polos) supaya override teks admin
// (konten.dokumen[key]) tidak tabrakan dengan punya KP.
export const MAGANG_DOKUMEN = [
  {
    key: 'kelayakanMagang', stage: 'Pendaftaran', label: 'Surat Kelayakan Magang', docType: 'Kelayakan Magang',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'kelayakanProposalMagang', stage: 'Pendaftaran', label: 'Surat Kelayakan Proposal Magang', docType: 'Kelayakan Proposal Magang',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'permohonanMagang', stage: 'Pendaftaran', label: 'Permohonan Magang', docType: null,
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin.',
    catatan: 'Unggah berkas permohonan dari perusahaan/instansi tempat Anda diterima Magang.',
    eligible: pernahDiverifikasi,
    linkEksternal: 'https://mandala.undip.ac.id/',
    linkLabel: 'Untuk membuat formulir Permohonan Magang silahkan kunjungi Mandala UNDIP',
  },
  {
    key: 'suratBalasanMagang', stage: 'Pendaftaran', label: 'Surat Balasan Perusahaan', docType: null,
    syarat: 'Unggah bukti diterima magang dari perusahaan/instansi setelah pendaftaran diverifikasi admin.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'stPembimbingMagang', stage: 'Bimbingan', label: 'ST Pembimbing Magang', docType: 'ST Pembimbing Magang',
    syarat: `Tersedia setelah surat balasan perusahaan diunggah dan admin menetapkan dosen pembimbing${FITUR_EKSPERIMENTAL ? ' serta nomor surat' : ''}.`,
    eligible: (m) => tahapIndex('MG', m.tahap) >= tahapIndex('MG', 'Bimbingan') && !!m.pembimbing1 && (!FITUR_EKSPERIMENTAL || !!m.nomorSurat),
    studentUpload: false,
  },
  {
    key: 'persetujuanSmMagang', stage: 'Bimbingan', label: 'Persetujuan Expo Magang', docType: 'Persetujuan Expo Magang',
    syarat: 'Tersedia sejak tahap Bimbingan dimulai. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: (m) => tahapIndex('MG', m.tahap) >= tahapIndex('MG', 'Bimbingan'),
  },
  {
    key: 'kuesionerMagang', stage: 'Bimbingan', label: 'Formulir Kuesioner Magang', docType: null,
    syarat: 'Unggah formulir kuesioner magang yang sudah diisi setelah tahap Bimbingan dimulai.',
    eligible: (m) => tahapIndex('MG', m.tahap) >= tahapIndex('MG', 'Bimbingan'),
  },
  {
    key: 'monevMagang', stage: 'Bimbingan', label: 'Dokumen Monev', docType: null,
    syarat: 'Tautan Dokumen Monev belum diatur admin.',
    eligible: pernahDiverifikasi,
    studentUpload: false, adminUpload: false,
    linkEksternal: '', linkLabel: 'Dokumen Monev', linkConfigurable: true, linkButton: true,
  },
  {
    // Diunggah admin, bukan mahasiswa.
    key: 'baExpo', stage: 'Expo', label: 'Berita Acara Expo Magang', docType: 'BA Expo Magang',
    syarat: 'Tersedia setelah jadwal Expo dikonfirmasi admin.',
    eligible: (m) => { const j = getJadwal(m, 'Expo'); return !!(j.dikonfirmasi && j.tanggal); },
    studentUpload: false, adminUpload: true,
  },
];

// Deskripsi dokumen per-tahap untuk Mata Kuliah Terapan (MKT) — sub-jenis
// Magang yang berbagi alur & docType (lihat documentGenerator.js, yang
// memilih berkas -magang.docx vs -mkt.docx otomatis dari m.jenisMagang) tapi
// punya berkas .docx & label sendiri, jadi array + key admin-override-nya
// dipisah dari MAGANG_DOKUMEN supaya admin bisa menulis teks berbeda untuk
// tiap jenis di Pengaturan → Konten.
export const MKT_DOKUMEN = [
  {
    key: 'kelayakanMkt', stage: 'Pendaftaran', label: 'Surat Kelayakan MKT', docType: 'Kelayakan Magang',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'kelayakanProposalMkt', stage: 'Pendaftaran', label: 'Surat Kelayakan Proposal MKT', docType: 'Kelayakan Proposal Magang',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'permohonanMkt', stage: 'Pendaftaran', label: 'Permohonan MKT', docType: null,
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin.',
    catatan: 'Unggah berkas permohonan dari perusahaan/instansi tempat Anda diterima MKT.',
    eligible: pernahDiverifikasi,
    linkEksternal: 'https://mandala.undip.ac.id/',
    linkLabel: 'Untuk membuat formulir Permohonan MKT silahkan kunjungi Mandala UNDIP',
  },
  {
    key: 'suratBalasanMkt', stage: 'Pendaftaran', label: 'Surat Balasan Perusahaan', docType: null,
    syarat: 'Unggah bukti diterima MKT dari perusahaan/instansi setelah pendaftaran diverifikasi admin.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'stPembimbingMkt', stage: 'Bimbingan', label: 'ST Pembimbing MKT', docType: 'ST Pembimbing Magang',
    syarat: `Tersedia setelah surat balasan perusahaan diunggah dan admin menetapkan dosen pembimbing${FITUR_EKSPERIMENTAL ? ' serta nomor surat' : ''}.`,
    eligible: (m) => tahapIndex('MG', m.tahap) >= tahapIndex('MG', 'Bimbingan') && !!m.pembimbing1 && (!FITUR_EKSPERIMENTAL || !!m.nomorSurat),
    studentUpload: false,
  },
  {
    key: 'persetujuanSmkpMkt', stage: 'Bimbingan', label: 'Seminar Expo MKT', docType: 'Persetujuan Expo Magang',
    syarat: 'Tersedia sejak tahap Bimbingan dimulai. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: (m) => tahapIndex('MG', m.tahap) >= tahapIndex('MG', 'Bimbingan'),
  },
  {
    key: 'kuesionerMkt', stage: 'Bimbingan', label: 'Formulir Kuesioner MKT', docType: null,
    syarat: 'Unggah formulir kuesioner MKT yang sudah diisi setelah tahap Bimbingan dimulai.',
    eligible: (m) => tahapIndex('MG', m.tahap) >= tahapIndex('MG', 'Bimbingan'),
  },
  {
    key: 'monevMkt', stage: 'Bimbingan', label: 'Dokumen Monev MKT', docType: null,
    syarat: 'Tautan Dokumen Monev MKT belum diatur admin.',
    eligible: pernahDiverifikasi,
    studentUpload: false, adminUpload: false,
    linkEksternal: '', linkLabel: 'Dokumen Monev MKT', linkConfigurable: true, linkButton: true,
  },
  {
    key: 'baExpoMkt', stage: 'Expo', label: 'Berita Acara Expo MKT', docType: 'BA Expo Magang',
    syarat: 'Tersedia setelah jadwal Expo dikonfirmasi admin.',
    eligible: (m) => { const j = getJadwal(m, 'Expo'); return !!(j.dikonfirmasi && j.tanggal); },
    studentUpload: false, adminUpload: true,
  },
];

// Dokumen per-tahap Tugas Akhir. Tata letaknya saja: label & syarat sudah
// final, tapi isi tag template masih sementara. `event` = kegiatan yang jadwalnya
// dipakai dokumen itu (TA punya 3 event, tidak seperti KP/Magang yang cuma satu).
// docType null = belum ada template (kelayakan-ta) — tampil tanpa tombol unduh.
const jadwalFinal = (ev) => (m) => { const j = getJadwal(m, ev); return !!(j.dikonfirmasi && j.tanggal); };
export const TA_DOKUMEN = [
  {
    key: 'persetujuanUgbTA', stage: 'Pendaftaran', label: 'Persetujuan UGB', docType: 'Persetujuan UGB TA',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'persetujuanDosbingTA', stage: 'Pendaftaran', label: 'Persetujuan Dosen Pembimbing', docType: 'Persetujuan Dosbing TA',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'kelayakanTA', stage: 'Pendaftaran', label: 'Surat Kelayakan TA', docType: null,
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: pernahDiverifikasi,
  },
  {
    key: 'baSemproTA', stage: 'Seminar Proposal', label: 'Berita Acara Seminar Proposal', docType: 'BA Sempro TA', event: 'Seminar Proposal',
    syarat: 'Tersedia setelah jadwal Seminar Proposal dikonfirmasi admin.',
    eligible: jadwalFinal('Seminar Proposal'),
    studentUpload: false, adminUpload: true,
  },
  {
    key: 'baSemhasTA', stage: 'Seminar Hasil', label: 'Berita Acara Seminar Hasil', docType: 'BA Semhas TA', event: 'Seminar Hasil',
    syarat: 'Tersedia setelah jadwal Seminar Hasil dikonfirmasi admin.',
    eligible: jadwalFinal('Seminar Hasil'),
    studentUpload: false, adminUpload: true,
  },
  {
    key: 'baSidangTA', stage: 'Sidang', label: 'Berita Acara Sidang', docType: 'BA Sidang TA', event: 'Sidang',
    syarat: 'Tersedia setelah jadwal Sidang dikonfirmasi admin.',
    eligible: jadwalFinal('Sidang'),
    studentUpload: false, adminUpload: true,
  },
];

// Satu sumber kebenaran KP_DOKUMEN/MAGANG_DOKUMEN/MKT_DOKUMEN + field Storage
// tempat berkasnya disimpan pada record mahasiswa, dikunci per kode program.
// Magang & MKT berbagi field Storage yang sama (dokumenMagang) — key-nya
// sudah unik per jenis (mis. kelayakanMagang vs kelayakanMkt) jadi tidak
// tabrakan meski disimpan di objek yang sama.
const DOKUMEN_CONFIG = { KP: KP_DOKUMEN, MG: MAGANG_DOKUMEN, TA: TA_DOKUMEN };
const DOKUMEN_FIELD = { KP: 'dokumenKP', MG: 'dokumenMagang', TA: 'dokumenTA' };
// m opsional: kalau program === 'MG' dan m.jenisMagang === 'MKT', pakai
// MKT_DOKUMEN alih-alih MAGANG_DOKUMEN. Tanpa m (mis. dipanggil hanya dengan
// key+program dari kode lama), jatuh ke default MAGANG_DOKUMEN.
export function dokumenConfigFor(program, m) {
  if (program === 'MG' && m && jenisMagangOf(m) === 'MKT') return MKT_DOKUMEN;
  return DOKUMEN_CONFIG[program] || null;
}
export function dokumenFieldFor(program) { return DOKUMEN_FIELD[program] || null; }

// Status tiap dokumen (KP/Magang) untuk seorang mahasiswa: kelayakan + berkas
// yang sudah diunggah. `konten` (opsional) = override teks admin dari halaman
// Pengaturan → Konten (lihat KONTEN_DEFAULT/config.konten) — label/syarat
// bawaan tetap dipakai untuk field yang belum di-override.
export function dokumenStatus(program, m, konten = {}) {
  const list = dokumenConfigFor(program, m);
  if (!list) return [];
  const field = DOKUMEN_FIELD[program];
  const override = (konten && konten.dokumen) || {};
  return list.map((d) => {
    const o = override[d.key] || {};
    return {
      ...d,
      label: o.label || d.label,
      syarat: o.syarat || d.syarat,
      ...(d.linkConfigurable ? {
        linkEksternal: o.linkEksternal || d.linkEksternal,
        linkLabel: o.linkLabel || d.linkLabel,
      } : {}),
      eligible: d.eligible(m),
      upload: (m[field] || {})[d.key] || null,
      // Berkas yang sudah tidak boleh diganti/dihapus mahasiswa.
      final: KUNCI_SURAT_BALASAN.includes(d.key) && suratBalasanFinal(m),
      ...(d.linkInput ? {
        linkTerkirim: (m[d.linkField] || {}).berkasLink || '',
        linkDisetujui: (m[d.linkField] || {}).berkasDiperiksa === true && statusVerif(m).key === 'terverifikasi',
      } : {}),
    };
  });
}

// Kelompokkan status dokumen per tahap, urutan sesuai PROGRAMS[program].stages.
// opts.admin: dokumen dengan `adminJugaDiTahap` ikut tampil di tahap-tahap itu
// juga (dokumen yang sama, bukan salinan), hanya di panel admin.
export function dokumenPerTahap(program, m, konten = {}, opts = {}) {
  const status = dokumenStatus(program, m, konten);
  const diTahap = (d, stage) => d.stage === stage || (opts.admin && (d.adminJugaDiTahap || []).includes(stage));
  return stagesFor(program)
    .map((stage) => ({ stage, dokumen: status.filter((d) => diTahap(d, stage)) }))
    .filter((g) => g.dokumen.length > 0);
}

// Semua path Storage yang tercatat pada satu record mahasiswa (dokumen
// KP/Magang + surat perpanjangan) — dipakai untuk membersihkan berkas yatim
// di Storage saat sebuah record diubah/disimpan (lihat orphanedUploadPaths
// di bawah).
export function collectUploadPaths(m) {
  const paths = new Set();
  Object.values((m && m.dokumenKP) || {}).forEach((u) => { if (u && u.path) paths.add(u.path); });
  Object.values((m && m.dokumenMagang) || {}).forEach((u) => { if (u && u.path) paths.add(u.path); });
  Object.values((m && m.dokumenTA) || {}).forEach((u) => { if (u && u.path) paths.add(u.path); });
  const pp = (m && m.perpanjangan) || {};
  if (pp.suratAdmin && pp.suratAdmin.path) paths.add(pp.suratAdmin.path);
  if (pp.suratFinal && pp.suratFinal.path) paths.add(pp.suratFinal.path);
  return paths;
}

// Path yang ada di record LAMA tapi sudah tidak ada di record BARU (diganti
// atau dihapus) — inilah yang perlu dihapus dari Storage supaya tidak
// menumpuk sebagai sampah setiap kali berkas diganti/dihapus.
export function orphanedUploadPaths(oldM, newM) {
  const before = collectUploadPaths(oldM);
  const after = collectUploadPaths(newM);
  return [...before].filter((p) => !after.has(p));
}

// ===================== Riwayat aktivitas mahasiswa =====================
// Log ringkas tiap kali mahasiswa melakukan sesuatu yang perlu dilihat/ditindaklanjuti
// admin (daftar, ajukan jadwal, unggah berkas, ajukan perpanjangan, dst). Dipakai untuk
// urutkan tabel berdasarkan tanggal & tampilkan riwayat "update" per mahasiswa.
export const AKTIVITAS_LABEL = {
  dibuat: 'Data dibuat oleh admin',
  daftar: 'Pendaftaran dikirim',
  perbaikan: 'Perbaikan pendaftaran dikirim ulang',
  jadwal: 'Mengajukan/memperbarui jadwal',
  unggah: 'Mengunggah dokumen',
  hapusBerkas: 'Menghapus dokumen',
  tahapBimbingan: 'Memasuki tahap Bimbingan (surat balasan perusahaan diterima)',
  tahapPembukuan: 'Memasuki tahap Pembukuan (lembar pengesahan diunggah)',
  kembaliPendaftaran: 'Kembali ke tahap Pendaftaran (surat balasan dihapus)',
  pembukuan: 'Mengirim tautan folder berkas final KP',
  perpanjanganMinta: 'Mengajukan perpanjangan',
  perpanjanganFinal: 'Mengunggah surat perpanjangan final',
};

// Warna & ikon per tipe aktivitas, dipakai RiwayatAktivitas untuk kartu berwarna.
export const AKTIVITAS_WARNA = {
  dibuat: 'gray',
  daftar: 'green',
  perbaikan: 'amber',
  jadwal: 'blue',
  unggah: 'violet',
  hapusBerkas: 'red',
  tahapBimbingan: 'green',
  tahapPembukuan: 'green',
  kembaliPendaftaran: 'amber',
  pembukuan: 'blue',
  perpanjanganMinta: 'amber',
  perpanjanganFinal: 'green',
};
// Versi singkat AKTIVITAS_LABEL, dipakai sebagai teks badge di kolom Aktivitas
// tabel (ruang sempit — label lengkap seperti "Perbaikan pendaftaran dikirim
// ulang" tidak muat).
export const AKTIVITAS_LABEL_SINGKAT = {
  dibuat: 'Dibuat',
  daftar: 'Daftar',
  perbaikan: 'Edit',
  jadwal: 'Jadwal',
  unggah: 'Unggah',
  hapusBerkas: 'Hapus',
  tahapBimbingan: 'Bimbingan',
  tahapPembukuan: 'Pembukuan',
  kembaliPendaftaran: 'Mundur',
  pembukuan: 'Folder',
  perpanjanganMinta: 'Perpanjangan',
  perpanjanganFinal: 'Final',
};

// Field pendaftaran yang bisa diedit mahasiswa saat mengirim ulang (perbaikan) —
// dipakai ringkasPerubahanPendaftaran untuk menyebut field mana saja yang berubah,
// alih-alih cuma mencatat "diedit" tanpa detail.
const FIELD_LABEL_PENDAFTARAN = {
  periode: 'Periode', nama: 'Nama', angkatan: 'Angkatan', dosenWali: 'Dosen Wali',
  klasifikasi: 'Klasifikasi', bidang: 'Topik/Bidang', tanggalMulai: 'Tanggal mulai', batasAkhir: 'Tanggal berakhir',
};
const FIELD_LABEL_DETAIL_PENDAFTARAN = {
  semester: 'Semester', sksIpk: 'Jumlah SKS/IPK', tempatKP: 'Tempat/Perusahaan', instansi: 'Instansi',
  alamatWA: 'Alamat', nomorWA: 'Nomor WA', berkasLink: 'Link berkas', ipk: 'IPK',
  statusKP: 'Status Kerja Praktik', terdaftarKRS: 'Status KRS', sudahUGB: 'Status UGB/proposal',
  namaPersetujuanDosen: 'Persetujuan dosen',
};

// Bandingkan data pendaftaran lama vs baru, kembalikan daftar label field yang
// berubah (mis. ['Judul', 'Nomor WA']) — dipakai sebagai catatan riwayat aktivitas
// saat mahasiswa mengirim ulang pendaftaran, supaya admin tahu persis apa yang diedit.
export function ringkasPerubahanPendaftaran(lama, baru) {
  const berubah = [];
  if ((lama.judul || '') !== (baru.judul || '')) berubah.push(judulLabelFor(baru));
  for (const [key, label] of Object.entries(FIELD_LABEL_PENDAFTARAN)) {
    if ((lama[key] ?? '') !== (baru[key] ?? '')) berubah.push(label);
  }
  const pLama = lama.pendaftaran || {};
  const pBaru = baru.pendaftaran || {};
  for (const [key, label] of Object.entries(FIELD_LABEL_DETAIL_PENDAFTARAN)) {
    if ((pLama[key] ?? '') !== (pBaru[key] ?? '')) berubah.push(label);
  }
  return berubah;
}

// ---------- Perubahan data setelah diverifikasi (m.perubahanData) ----------
// Mahasiswa yang sudah pernah diverifikasi lalu mengubah data pendaftaran (Edit
// pendaftaran) atau data perusahaan (mengunggah ulang surat balasan): data yang
// tercetak di dokumen berubah, jadi unduhan dokumen dikunci (bolehUnduhDokumen)
// sampai admin menyimpan status Terverifikasi lagi (FormMahasiswa submit
// mengosongkannya). Bentuk: { at, item: { [kunci]: { label, lama, baru } } }.
// `lama` = nilai saat terakhir diverifikasi; beberapa kali edit sebelum admin
// memeriksa digabung, dan field yang dikembalikan ke nilai lamanya dibuang.
// Kontak & link berkas tidak tercetak di dokumen, jadi tidak dihitung.
const TIDAK_TERCETAK = ['nomorWA', 'alamatWA', 'berkasLink'];

function tampilNilai(v) {
  if (v === true) return 'Ya';
  if (v === false) return 'Tidak';
  return v == null || v === '' ? '' : String(v);
}

export function hitungPerubahanData(lama, baru) {
  if (!pernahDiverifikasi(lama)) return null; // belum pernah diverifikasi: belum ada yang perlu dikunci
  const item = { ...((lama.perubahanData && lama.perubahanData.item) || {}) };
  const cek = (kunci, label, a, b) => {
    const asal = item[kunci] ? item[kunci].lama : tampilNilai(a);
    const kini = tampilNilai(b);
    if (kini === asal) delete item[kunci];
    else if (item[kunci] || tampilNilai(a) !== kini) item[kunci] = { label, lama: asal, baru: kini };
  };
  cek('judul', judulLabelFor(baru), lama.judul, baru.judul);
  for (const [k, label] of Object.entries(FIELD_LABEL_PENDAFTARAN)) cek(k, label, lama[k], baru[k]);
  const pLama = lama.pendaftaran || {};
  const pBaru = baru.pendaftaran || {};
  for (const [k, label] of Object.entries(FIELD_LABEL_DETAIL_PENDAFTARAN)) {
    if (!TIDAK_TERCETAK.includes(k)) cek(`p.${k}`, label, pLama[k], pBaru[k]);
  }
  if (!Object.keys(item).length) return null;
  // `sejak` = edit pertama (tetap), dipakai memilih berkas yang diunggah sebelum
  // data berubah; `at` = edit terakhir.
  const sejak = (lama.perubahanData && lama.perubahanData.sejak) || nowStamp();
  return { sejak, at: nowStamp(), item };
}

// Berkas bertanda tangan (versi isi template yang diunggah mahasiswa) yang
// diunggah sebelum data berubah: calon "minta unggah ulang" di banner admin.
// Surat balasan dikecualikan karena justru sumber datanya. Tanggal unggah hanya
// berupa tanggal, jadi unggahan di hari yang sama ikut ditawarkan.
export function berkasSebelumPerubahan(m) {
  if (!adaPerubahanData(m)) return [];
  const p = m.perubahanData;
  const batas = String(p.sejak || p.at || '').slice(0, 10);
  return dokumenStatus(programOf(m), m)
    .filter((d) => d.docType && d.upload && d.studentUpload !== false && !KUNCI_SURAT_BALASAN.includes(d.key)
      && (d.upload.uploadedAt || '') <= batas);
}

// Berkas yang diminta admin untuk diunggah ulang (upload.perluUlang). Tandanya
// hilang sendiri saat mahasiswa mengunggah pengganti (objek berkas diganti).
export function jumlahPerluUlang(m) {
  const field = dokumenFieldFor(programOf(m));
  return Object.values((field && m[field]) || {}).filter((u) => u && u.perluUlang).length;
}

export function adaPerubahanData(m) {
  return !!(m && m.perubahanData && Object.keys(m.perubahanData.item || {}).length);
}

// Unduh dokumen hasil template (sisi mahasiswa): seperti bolehAksesBerkas, ditambah
// terkunci selama ada perubahan data yang belum diverifikasi ulang. Unggah/kirim
// tautan tetap memakai bolehAksesBerkas.
export function bolehUnduhDokumen(m) {
  return bolehAksesBerkas(m) && !adaPerubahanData(m);
}

// Alasan unduhan terkunci, untuk tooltip/keterangan di sisi mahasiswa.
export function alasanUnduhTerkunci(m) {
  if (statusVerif(m).key === 'perbaikan') return 'Dikunci: perbaiki data sesuai pesan admin.';
  if (adaPerubahanData(m)) return 'Dikunci: menunggu verifikasi ulang data.';
  return 'Belum tersedia.';
}

export function nowStamp() { return new Date().toISOString(); }

// Format tanggal+jam dari timestamp ISO lengkap (beda dari formatTanggal yang
// hanya menerima 'YYYY-MM-DD').
export function formatWaktu(iso) {
  if (!iso) return '-';
  // Tanggal polos 'YYYY-MM-DD' (data lama tanpa jam) -> pakai parseISO (lokal,
  // tanpa pergeseran hari) lalu tampilkan tanpa jam. Timestamp lengkap (log
  // aktivitas baru) -> new Date() biasa.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d = parseISO(iso);
    return d ? `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}` : '-';
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const jam = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} · ${jam}`;
}

// Format sangat ringkas dd-Mmm (mis. "24-Sep") — dipakai kartu kecil di kolom
// Aktivitas tabel; tahun & jam ada di riwayat detail (modal edit).
export function formatHariBulan(iso) {
  if (!iso) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseISO(iso) : new Date(iso);
  if (!d || isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}-${BULAN[d.getMonth()].slice(0, 3)}`;
}

// Format tanggal ringkas dd-mm-yyyy tanpa jam — dipakai di kolom Aktivitas tabel
// (ruang sempit & bisa diresize pengguna), beda dari formatWaktu yang panjang.
export function formatTanggalSingkat(iso) {
  if (!iso) return '-';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseISO(iso) : new Date(iso);
  if (!d || isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// Tambahkan satu entri riwayat aktivitas (immutable) — panggil sebelum onSave
// setiap kali mahasiswa melakukan aksi yang perlu dilihat admin.
export function catatAktivitas(m, tipe, catatan = '') {
  const entri = { at: nowStamp(), tipe, catatan };
  return { ...m, aktivitas: [...(m.aktivitas || []), entri] };
}

// Tanggal "entri pertama kali dibuat" (order of submission): dari log aktivitas
// bila ada, jika tidak fallback ke submittedAt/tanggalMulai (data lama tanpa log).
export function tanggalDibuat(m) {
  const log = m.aktivitas || [];
  if (log.length) return log[0].at;
  return (m.pendaftaran && m.pendaftaran.submittedAt) || m.tanggalMulai || '';
}

// Entri aktivitas paling baru, atau null bila belum ada log sama sekali.
export function aktivitasTerakhir(m) {
  const log = m.aktivitas || [];
  return log.length ? log[log.length - 1] : null;
}

// ===================== Nomor urut tetap (per periode & per angkatan) =====================
// Nomor "identitas" tiap mahasiswa dalam suatu periode/angkatan, berdasarkan urutan
// pendaftaran pertama kali (tanggalDibuat) — dihitung dari SELURUH data (tidak
// terpengaruh filter/pencarian/sortir tabel) supaya nomor tidak berubah-ubah.
export function hitungNomorUrut(allMahasiswa) {
  const out = {};
  const grup = (keyFn, field) => {
    const bucket = {};
    (allMahasiswa || []).forEach((m) => {
      const k = keyFn(m);
      if (k == null || k === '') return;
      (bucket[k] = bucket[k] || []).push(m);
    });
    Object.values(bucket).forEach((list) => {
      list
        .slice()
        .sort((a, b) => String(tanggalDibuat(a)).localeCompare(String(tanggalDibuat(b))))
        .forEach((m, i) => {
          out[m.id] = out[m.id] || {};
          out[m.id][field] = i + 1;
        });
    });
  };
  grup((m) => m.periode, 'periode');
  grup((m) => m.angkatan, 'angkatan');
  return out;
}

