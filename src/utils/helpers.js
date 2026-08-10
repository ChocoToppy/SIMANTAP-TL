import logoUndip from '../assets/logo-undip.png';
// ===================== helpers.js =====================
// helpers.js — konstanta + semua logika murni (tanpa tampilan)

// ---------- Program & tahapan ----------
// Setiap program punya daftar tahap sendiri, event yang dijadwalkan
// (punya jam/ruang/checklist), dan apakah punya field Klasifikasi.
export const PROGRAMS = {
  TA: {
    label: 'Tugas Akhir',
    stages: ['Pendaftaran', 'Penentuan Pembimbing', 'Seminar Proposal', 'Seminar Hasil', 'Sidang', 'Lulus'],
    events: ['Seminar Proposal', 'Seminar Hasil', 'Sidang'],
    klasifikasi: true,
    syarat: true,
    pembimbing: 2,
    penguji: 2,
  },
  KP: {
    label: 'Kerja Praktik',
    stages: ['Pendaftaran', 'Bimbingan', 'Seminar KP', 'Lulus'],
    events: ['Seminar KP'],
    klasifikasi: false,
    pembimbing: 1,
    penguji: 0,
    pembimbingLabel: 'Dosen Pembimbing/Penguji',
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
    stages: ['Pendaftaran', 'Expo', 'Lulus'],
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

// Bidang TA — kode + label. Tinggal tambah/ubah di sini.
export const BIDANG = [
  { kode: 'U', label: 'Udara' },
  { kode: 'S', label: 'Sampah' },
  { kode: 'DL', label: 'Drainase Lingkungan' },
  { kode: 'AL', label: 'Air Limbah' },
  { kode: 'AB', label: 'Air Bersih' },
  { kode: 'K3L', label: 'K3L' },
  { kode: 'MIX', label: 'Mixed' },
];

// Tema khusus Kerja Praktik (sesuai Form Permohonan KP).
export const KP_TEMA = ['SML', 'K3', 'SPAM', 'PBPAB', 'PBPAM', 'Persampahan', 'B3', 'Proper', 'Pencemaran Udara']
  .map((x) => ({ kode: x, label: x }));

// Hari (untuk jadwal seminar KP).
export const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu', 'Minggu'];

export function bidangLabel(kode) {
  const b = BIDANG.find((x) => x.kode === kode) || KP_TEMA.find((x) => x.kode === kode);
  return b ? b.label : kode || '-';
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
  if (mhs.dibatalkan) return { key: 'batal', label: 'Dibatalkan', tone: 'gray', daysLeft: null };
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
    bimbinganKP: kp.bimbingan, // KP: 1 pembimbing/penguji, dihitung sebagai bimbingan
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
export function buatId() {
  return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ===================== Autentikasi & verifikasi (Rute A / lokal) =====================

// Password admin untuk prototipe (ganti sesuai kebutuhan).
export const ADMIN_PASSWORD = 'admin123';

// Password bersama untuk login dosen (username = NIP).
export const DOSEN_PASSWORD = 'dosen123';

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

export function beririsan(a, b) { return a[0] < b[1] && b[0] < a[1]; }

export function dosenTerlibat(m) {
  return [m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2].filter(Boolean);
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
        dosen: dosenTerlibat(m),
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
  const myDosen = dosenTerlibat(calonM);
  const pesanBentrok = [];
  const pesanKelompok = [];
  
  const normalizeJudul = (j) => (j || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const calonJudul = normalizeJudul(calonM.judul);

  eventsFor(programOf(calonM)).forEach((ev) => {
    const j = (calonM.jadwal && calonM.jadwal[ev]) || {};
    if (!j.tanggal) return;
    const rentang = rentangJadwal(j);
    if (!rentang) return; // tak bisa cek tanpa jam mulai/selesai
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
  const prog = programLabel(programOf(m));
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

// ===================== Surat tugas (mail-merge, sisi klien) =====================
// Placeholder yang tersedia: {{kegiatan}} {{nomorST}} {{nama}} {{nim}} {{program}}
// {{judul}} {{periode}} {{angkatan}} {{bidang}} {{hari}} {{tanggal}} {{jam}} {{ruang}}
// {{pembimbing}} {{penguji}} {{pembimbing1}} {{pembimbing2}} {{penguji1}} {{penguji2}}
// {{tanggalSurat}}
// Tambahkan template khusus per-event di TEMPLATE_SURAT (mis. 'Seminar Hasil'); jika
// tidak ada, dipakai TEMPLATE_SURAT.default.
export const TEMPLATE_SURAT = {
  default: `KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
UNIVERSITAS DIPONEGORO — FAKULTAS TEKNIK
DEPARTEMEN TEKNIK LINGKUNGAN

SURAT TUGAS
Nomor: {{nomorST}}

Ketua Departemen Teknik Lingkungan menugaskan dosen pembimbing dan penguji
untuk melaksanakan {{kegiatan}} mahasiswa berikut:

  Nama      : {{nama}}
  NIM       : {{nim}}
  Program   : {{program}}
  Judul     : {{judul}}

Pelaksanaan:
  Hari/Tanggal : {{hari}} {{tanggal}}
  Waktu        : {{jam}}
  Tempat/Ruang : {{ruang}}

  Dosen Pembimbing : {{pembimbing}}
  Dosen Penguji    : {{penguji}}

Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.

Semarang, {{tanggalSurat}}
Ketua Departemen,



(  ............................................  )
NIP. ......................................`,

  'Penentuan Pembimbing': `KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
UNIVERSITAS DIPONEGORO — FAKULTAS TEKNIK
DEPARTEMEN TEKNIK LINGKUNGAN

SURAT TUGAS PEMBIMBING
Nomor: {{nomorST}}

Ketua Departemen Teknik Lingkungan menugaskan dosen berikut sebagai
pembimbing {{program}} mahasiswa:

  Nama      : {{nama}}
  NIM       : {{nim}}
  Program   : {{program}}
  Judul     : {{judul}}
  Periode   : {{periode}}

  Dosen Pembimbing : {{pembimbing}}

Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.

Semarang, {{tanggalSurat}}
Ketua Departemen,



(  ............................................  )
NIP. ......................................`,
};

export function tokenSurat(m, ev, dosenByKode = {}) {
  const j = (m.jadwal && m.jadwal[ev]) || {};
  const nm = (k) => (k && dosenByKode[k] ? dosenByKode[k].nama : (k || ''));
  const pemb = [m.pembimbing1, m.pembimbing2].filter(Boolean).map(nm).join(', ');
  const peng = [m.penguji1, m.penguji2].filter(Boolean).map(nm).join(', ');
  return {
    kegiatan: ev,
    program: programLabel(programOf(m)),
    nama: m.nama || '', nim: m.nim || '', judul: m.judul || '',
    periode: m.periode || '', angkatan: m.angkatan || '', bidang: bidangLabel(m.bidang),
    nomorST: j.nomorST || '', hari: j.hari || '',
    tanggal: j.tanggal ? formatTanggal(j.tanggal) : '', jam: jamTampil(j), ruang: j.ruang || '',
    pembimbing: pemb || '-', penguji: peng || '-',
    pembimbing1: nm(m.pembimbing1), pembimbing2: nm(m.pembimbing2),
    penguji1: nm(m.penguji1), penguji2: nm(m.penguji2),
    tanggalSurat: formatTanggal(todayISO()),
  };
}

export function renderSurat(ev, tokens) {
  const tpl = TEMPLATE_SURAT[ev] || TEMPLATE_SURAT.default;
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (tokens[k] != null ? String(tokens[k]) : ''));
}

// ===================== Generator dokumen resmi TA (mail-merge) =====================
// Pejabat penanda tangan (mudah diubah bila berganti).
export const PEJABAT = { ketua: 'Dr. Ir. Budi Prasetyo Samadikun, S.T., M.Si., IPU., ASEAN Eng.', ketuaNip: '19780514 200501 1 001' };
export const KOP_SURAT = `KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
UNIVERSITAS DIPONEGORO
FAKULTAS TEKNIK — PROGRAM STUDI TEKNIK LINGKUNGAN
Jl. Prof. Soedarto, S.H., Tembalang, Semarang 50275
============================================================`;

export const KOP_SURAT_HTML = `
<table style="width:100%; border-bottom:3px solid black; margin-bottom:12px; border-collapse:collapse;">
  <tr>
    <td style="width:12%; text-align:left; border:none; padding-bottom:8px; vertical-align:top;">
      <img src="${logoUndip}" alt="Logo Undip" style="width:90px; height:auto;">
    </td>
    <td style="width:58%; text-align:left; border:none; padding-bottom:8px; line-height:1.2; vertical-align:top;">
      <span style="font-size:12pt; font-weight:bold; color:navy;">KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI</span><br>
      <span style="font-size:14pt; font-weight:bold; color:navy;">UNIVERSITAS DIPONEGORO</span><br>
      <span style="font-size:12pt; font-weight:bold; color:navy;">FAKULTAS TEKNIK</span><br>
      <span style="font-size:12pt; font-weight:bold; color:navy;">PROGRAM STUDI TEKNIK LINGKUNGAN</span>
    </td>
    <td style="width:30%; text-align:right; border:none; padding-bottom:8px; font-size:9pt; line-height:1.1; color:navy; vertical-align:top;">
      Jalan Prof. Sudarto, S.H.<br>
      Tembalang Semarang Kode Pos 50275<br>
      Tel. (024) 76480678, Faks. (024) 7460053<br>
      www.ft.undip.ac.id | email: enveng@live.undip.ac.id
    </td>
  </tr>
</table>
`;

export function evKeyDok(ev) {
  if (!ev) return 'umum';
  if (ev.includes('Sidang')) return 'sidang';
  if (ev.includes('Proposal')) return 'sempro';
  if (ev.includes('Hasil') || ev.includes('Expo')) return 'semhas';
  return 'umum';
}

// jenis: 'pembimbing' | 'st' | 'ba' | 'pengesahan' | 'perpanjangan'
export function dokTA(jenis, m, dosenByKode = {}, ev = '') {
  const nm = (k) => (k && dosenByKode[k] ? dosenByKode[k].nama : (k || '—'));
  const nip = (k) => (k && dosenByKode[k] ? (dosenByKode[k].nip || '—') : '—');
  const nama = m.nama || '', nim = m.nim || '', judul = m.judul || '';
  const p1 = nm(m.pembimbing1), p1n = nip(m.pembimbing1);
  const p2 = nm(m.pembimbing2), p2n = nip(m.pembimbing2);
  const u1 = nm(m.penguji1), u1n = nip(m.penguji1);
  const u2 = nm(m.penguji2), u2n = nip(m.penguji2);
  const j = (m.jadwal && m.jadwal[ev]) || {};
  const waktu = j.jamMulai ? (j.jamSelesai ? `${j.jamMulai} - ${j.jamSelesai} WIB` : `${j.jamMulai} WIB`) : '..........';
  const tgl = j.tanggal ? formatTanggal(j.tanggal) : '..........';
  const hariTgl = [j.hari, j.tanggal ? formatTanggal(j.tanggal) : ''].filter(Boolean).join(', ') || '..........';
  const tempat = j.ruang || '..........';
  const nomor = j.nomorST || '............................................';
  const tglSurat = formatTanggal(todayISO());
  const K = PEJABAT.ketua, KN = PEJABAT.ketuaNip;
  const key = evKeyDok(ev);
  const judulEv = key === 'sidang' ? 'SIDANG TUGAS AKHIR' : key === 'sempro' ? 'SEMINAR PROPOSAL TUGAS AKHIR' : key === 'semhas' ? 'SEMINAR HASIL EXPO TUGAS AKHIR' : `${(ev || '').toUpperCase()} TUGAS AKHIR`;
  const labelEv = key === 'sidang' ? 'Sidang Tugas Akhir' : key === 'sempro' ? 'Seminar Proposal Tugas Akhir' : key === 'semhas' ? 'Seminar Hasil Expo Tugas Akhir' : `${ev} Tugas Akhir`;
  const blokKetua = `Semarang, ${tglSurat}\nProgram Studi Teknik Lingkungan\nFakultas Teknik, Universitas Diponegoro\nKetua,\n\n\n${K}\nNIP. ${KN}`;

  const stEventHTML = () => {
    return `${KOP_SURAT_HTML}
<div style="text-align:center; margin-top:10px; font-weight:bold; font-size:12pt; font-family:'Times New Roman', Times, serif;">
  SURAT TUGAS ${judulEv}
</div>
<div style="text-align:center; margin-bottom:15px; font-family:'Times New Roman', Times, serif;">
  No: ${nomor}
</div>
<div style="margin-bottom:10px; font-family:'Times New Roman', Times, serif; text-align:justify;">
  Program Studi Teknik Lingkungan Fakultas Teknik Universitas Diponegoro Semarang dengan ini memberikan tugas kepada:
</div>
<table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-family:'Times New Roman', Times, serif; font-size:11pt;">
  <thead>
    <tr>
      <th style="border:1px solid black; padding:4px; width:40px; text-align:center;">NO.</th>
      <th style="border:1px solid black; padding:4px; text-align:center;">NAMA</th>
      <th style="border:1px solid black; padding:4px; text-align:center; white-space:nowrap;">NIP</th>
      <th style="border:1px solid black; padding:4px; width:120px; text-align:center;">TUGAS</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border:1px solid black; padding:4px; text-align:center;">1</td>
      <td style="border:1px solid black; padding:4px;">${p1}</td>
      <td style="border:1px solid black; padding:4px;">${p1n}</td>
      <td style="border:1px solid black; padding:4px; text-align:center;">Pembimbing I</td>
    </tr>
    <tr>
      <td style="border:1px solid black; padding:4px; text-align:center;">2</td>
      <td style="border:1px solid black; padding:4px;">${p2}</td>
      <td style="border:1px solid black; padding:4px;">${p2n}</td>
      <td style="border:1px solid black; padding:4px; text-align:center;">Pembimbing II</td>
    </tr>
    ${key === 'sidang' ? `
    <tr>
      <td style="border:1px solid black; padding:4px; text-align:center;">3</td>
      <td style="border:1px solid black; padding:4px;">${u1}</td>
      <td style="border:1px solid black; padding:4px;">${u1n}</td>
      <td style="border:1px solid black; padding:4px; text-align:center;">Ketua Penguji</td>
    </tr>
    <tr>
      <td style="border:1px solid black; padding:4px; text-align:center;">4</td>
      <td style="border:1px solid black; padding:4px;">${u2}</td>
      <td style="border:1px solid black; padding:4px;">${u2n}</td>
      <td style="border:1px solid black; padding:4px; text-align:center;">Anggota Penguji</td>
    </tr>
    ` : ''}
  </tbody>
</table>
<div style="margin-bottom:10px; font-family:'Times New Roman', Times, serif;">Untuk menguji ${labelEv} mahasiswa tersebut di bawah ini:</div>
<table style="border:none; margin-bottom:15px; width:100%; font-family:'Times New Roman', Times, serif;">
  <tr><td style="width:70px; border:none; padding:2px;">Nama</td><td style="width:10px; border:none; padding:2px;">:</td><td style="border:none; padding:2px;">${nama}</td></tr>
  <tr><td style="width:70px; border:none; padding:2px;">NIM</td><td style="width:10px; border:none; padding:2px;">:</td><td style="border:none; padding:2px;">${nim}</td></tr>
  <tr><td style="width:70px; border:none; padding:2px; vertical-align:top;">Judul TA</td><td style="width:10px; border:none; padding:2px; vertical-align:top;">:</td><td style="border:none; padding:2px; text-align:justify;">${judul}</td></tr>
</table>
<div style="margin-bottom:10px; font-family:'Times New Roman', Times, serif;">${labelEv} akan dilaksanakan pada:</div>
<table style="border:none; margin-bottom:15px; width:100%; font-family:'Times New Roman', Times, serif;">
  <tr><td style="width:70px; border:none; padding:2px;">Hari/Tgl</td><td style="width:10px; border:none; padding:2px;">:</td><td style="border:none; padding:2px;">${hariTgl}</td></tr>
  <tr><td style="width:70px; border:none; padding:2px;">Waktu</td><td style="width:10px; border:none; padding:2px;">:</td><td style="border:none; padding:2px;">${waktu}</td></tr>
  <tr><td style="width:70px; border:none; padding:2px;">Tempat</td><td style="width:10px; border:none; padding:2px;">:</td><td style="border:none; padding:2px;">${tempat}</td></tr>
</table>
<div style="margin-bottom:20px; font-family:'Times New Roman', Times, serif; text-align:justify;">Demikian Surat Tugas ini dibuat untuk dapat dilaksanakan dengan baik.</div>
<table style="width:100%; border:none; margin-bottom:15px; font-family:'Times New Roman', Times, serif;">
  <tr>
    <td style="width:50%; border:none;"></td>
    <td style="width:50%; border:none;">
      Semarang, ${tglSurat}<br>
      Program Studi Teknik Lingkungan<br>
      Fakultas Teknik<br>
      Universitas Diponegoro<br>
      Ketua,<br><br><br><br>
      <u>${K}</u><br>
      NIP. ${KN}
    </td>
  </tr>
</table>
<div style="font-size:9pt; line-height:1.2; font-family:'Times New Roman', Times, serif;">
  Ket. Di copy 4 X untuk<br>
  - Dosbing I dan Dosbing II<br>
  - Penguji I dan Penguji II
</div>
`;
  };

  const stEvent = () => {
    const dosen = key === 'sidang'
      ? `  1. ${p1}\n     NIP. ${p1n}  —  Pembimbing I\n  2. ${p2}\n     NIP. ${p2n}  —  Pembimbing II\n  3. ${u1}\n     NIP. ${u1n}  —  Ketua Penguji\n  4. ${u2}\n     NIP. ${u2n}  —  Anggota Penguji`
      : `  1. ${p1}\n     NIP. ${p1n}  —  Pembimbing I\n  2. ${p2}\n     NIP. ${p2n}  —  Pembimbing II`;
    const utk = key === 'sidang' ? 'Untuk menguji Sidang Tugas Akhir mahasiswa tersebut di bawah ini:' : `Untuk membimbing ${labelEv} mahasiswa tersebut di bawah ini:`;
    return `${KOP_SURAT}\n\nSURAT TUGAS\n${judulEv}\nNo: ${nomor}\n\nProgram Studi Teknik Lingkungan Fakultas Teknik Universitas Diponegoro\nSemarang dengan ini memberikan tugas kepada:\n\n${dosen}\n\n${utk}\n  Nama     : ${nama}\n  NIM      : ${nim}\n  Judul TA : ${judul}\n\n${labelEv} akan dilaksanakan pada:\n  Hari/Tgl : ${hariTgl}\n  Waktu    : ${waktu}\n  Tempat   : ${tempat}\n\nDemikian Surat Tugas ini dibuat untuk dapat dilaksanakan dengan baik.\n\n${blokKetua}`;
  };

  const baEvent = () => {
    if (key === 'sidang') {
      return `BERITA ACARA\nSIDANG TUGAS AKHIR\n\nPada hari ini : ${j.hari || '..........'}\nTanggal       : ${tgl}\nTempat        : ${tempat}\n\nTelah dilangsungkan Sidang Tugas Akhir mahasiswa berikut:\n  Nama  : ${nama}\n  NIM   : ${nim}\n  Judul : ${judul}\n\nTim Pembimbing dan Penguji memberikan nilai sebagai berikut:\n  1. ${p1}\n     ....... x 30 % = .......\n  2. ${p2}\n     ....... x 30 % = .......\n  3. ${u1}\n     ....... x 20 % = .......\n  4. ${u2}\n     ....... x 20 % = .......\n  JUMLAH : .......\n\nBerdasarkan hasil penilaian Sidang Tugas Akhir, mahasiswa tersebut:\n  Dinyatakan : LULUS MUTLAK / LULUS DGN PERBAIKAN / TIDAK LULUS\n  Dengan nilai : ..........\n  Catatan : ...............................................................\n\nSemarang, ${tgl}\nKetua Tim Sidang Tugas Akhir,\n\n\n${u1}\nNIP. ${u1n}\n\n------------------------------------------------------------\n\nBERITA ACARA KELULUSAN / EVALUASI AKHIR PROGRAM\nNomor: ${nomor}\n\nTelah dilaksanakan Sidang Ujian Akhir Program (UAP) bagi mahasiswa:\n  Nama              : ${nama}\n  NIM               : ${nim}\n  Program Studi S1  : Teknik Lingkungan\n  Judul Tugas Akhir : ${judul}\n  Hari / Tanggal    : ${hariTgl}\n  Jam               : ${waktu}\n  Nilai UAP         : .............. (angka)  /  .............. (huruf)\n\nYang bersangkutan dinyatakan LULUS STUDI pada tanggal ..............................\n\nSemarang, ${tglSurat}\nKetua Program Studi Teknik Lingkungan,\n\n\n${K}\nNIP. ${KN}`;
    }
    const timBlok = `  1. ${p1}\n     NIP. ${p1n}                         (....................)\n  2. ${p2}\n     NIP. ${p2n}                         (....................)`;
    return `BERITA ACARA\n${judulEv}\n\nHari, Tanggal : ${hariTgl}\nTempat        : ${tempat}\n\nTelah dilangsungkan ${labelEv} mahasiswa berikut:\n  Nama          : ${nama}\n  NIM           : ${nim}\n  Judul         : ${judul}\n  Pembimbing I  : ${p1}\n  Pembimbing II : ${p2}\n\nBerdasarkan hasil Keputusan Tim Pembimbing & Penguji, mahasiswa tersebut:\n  Dinyatakan : LULUS / MENGULANG / TIDAK LULUS\n  Catatan    : ...............................................................\n\nTanda tangan:\n${timBlok}\n\nSemarang, ${hariTgl}\nKetua Tim ${labelEv},\n\n\n${p1}\nNIP. ${p1n}`;
  };

  if (jenis === 'pembimbing') {
    return `${KOP_SURAT}\n\nSURAT TUGAS\nPEMBIMBING TUGAS AKHIR\nNo: ............................................\n\nProgram Studi Teknik Lingkungan Fakultas Teknik Universitas Diponegoro\nSemarang dengan ini memberikan tugas kepada:\n\n  1. ${p1}\n     NIP. ${p1n}  —  Pembimbing I\n  2. ${p2}\n     NIP. ${p2n}  —  Pembimbing II\n\nUntuk membimbing Tugas Akhir mahasiswa tersebut di bawah ini:\n  Nama     : ${nama}\n  NIM      : ${nim}\n  Judul TA : ${judul}\n\nDemikian Surat Tugas ini dibuat untuk dapat dilaksanakan dengan baik.\n\n${blokKetua}`;
  }
  if (jenis === 'stHTML') return stEventHTML();
  if (jenis === 'st') return stEvent();
  if (jenis === 'ba') return `${stEvent()}\n\n\n============================================================\n\n${baEvent()}`;
  if (jenis === 'pengesahan') {
    return `HALAMAN PENGESAHAN\n\nSkripsi ini diajukan oleh:\n  Nama              : ${nama}\n  NIM               : ${nim}\n  Departemen        : Teknik Lingkungan, Fakultas Teknik, Universitas Diponegoro\n  Judul Skripsi     : ${judul}\n\nTelah berhasil dipertahankan di hadapan Tim Penguji dan diterima sebagai bagian\npersyaratan yang diperlukan untuk memperoleh gelar Sarjana pada Departemen\nTeknik Lingkungan, Fakultas Teknik, Universitas Diponegoro.\n\nTim Penguji:\n  Pembimbing I    : ${p1}\n                    NIP. ${p1n}          .............................\n  Pembimbing II   : ${p2}\n                    NIP. ${p2n}          .............................\n  Ketua Penguji   : ${u1}\n                    NIP. ${u1n}          .............................\n  Anggota Penguji : ${u2}\n                    NIP. ${u2n}          .............................\n\nSemarang, ${m.tanggalLulus ? formatTanggal(m.tanggalLulus) : tglSurat}\nProgram Studi Teknik Lingkungan, Fakultas Teknik Undip\nKetua,\n\n\n${K}\nNIP. ${KN}`;
  }
  if (jenis === 'perpanjangan') {
    const pp = m.perpanjangan || {};
    const mulai = m.tanggalMulai ? formatTanggal(m.tanggalMulai) : '..........';
    const akhir = m.batasAkhir ? formatTanggal(m.batasAkhir) : '..........';
    const alasanTahap = pp.alasan ? `Alasan: ${pp.alasan}` : 'Alasan: ..........................................................';
    return `Kepada Yth. Koordinator Tugas Akhir\nDepartemen Teknik Lingkungan, Fakultas Teknik Undip\n\nHal: Permohonan Perpanjangan Tugas Akhir\n\nDengan hormat, saya yang bertanda tangan di bawah ini:\n  Nama     : ${nama}\n  NIM      : ${nim}\n  Judul TA : ${judul}\n  Waktu TA : ${mulai} s.d. ${akhir}\n\nMemohon perpanjangan penyelesaian Tugas Akhir selama 1 (satu) bulan.\n${alasanTahap}\n\nDemikian surat ini dibuat untuk dapat dipergunakan sebagaimana perlunya.\n\nSemarang, ${pp.tanggalDiminta ? formatTanggal(pp.tanggalDiminta) : tglSurat}\nPemohon,\n\n\n${nama}\nNIM. ${nim}\n\nMenyetujui,\nDosen Pembimbing I                         Dosen Pembimbing II\n\n\n${p1}                     ${p2}\nNIP. ${p1n}               NIP. ${p2n}\n\n============================================================\n\nPERPANJANGAN TUGAS AKHIR\nNo: ............................................\n\nMahasiswa berikut ini:\n  Nama            : ${nama}\n  NIM             : ${nim}\n  Dosen Pemb. I   : ${p1}\n  Dosen Pemb. II  : ${p2}\n  Judul           : ${judul}\n\nBerdasarkan Surat Tugas terdahulu yang berakhir pada tanggal ${akhir}, dan mengingat\nTugas Akhir mahasiswa tersebut belum dapat diselesaikan, maka diberikan perpanjangan\nwaktu penyelesaian Tugas Akhir selama 1 (satu) bulan terhitung sejak ${akhir}.\n\nSemarang, ${tglSurat}\nDepartemen Teknik Lingkungan, Fakultas Teknik, Universitas Diponegoro\nKetua,\n\n\n${K}\nNIP. ${KN}`;
  }
  return stEvent();
}

// ===================== Alur tahap (state machine) =====================
// Durasi baku tiap kegiatan (menit) + jam kerja.
export const DURASI_EVENT = { 'Seminar Proposal': 60, 'Seminar Hasil': 60, 'Sidang': 120, 'Expo': 60, 'Seminar KP': 60 };
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

// Deskripsi dokumen yang harus diunggah per kegiatan (bisa diubah di sini).
export const BERKAS_SYARAT = {
  'Seminar Proposal': 'Proposal/UGB, lembar persetujuan pembimbing, kartu bimbingan, transkrip & IRS.',
  'Seminar Hasil': 'Draft laporan lengkap, lembar persetujuan, kartu bimbingan, bukti lulus Seminar Proposal.',
  'Sidang': 'Draft akhir, hasil cek Turnitin, lembar persetujuan pembimbing, kartu bimbingan, bukti lulus Seminar Hasil.',
  'Expo': 'Poster/produk, laporan akhir, lembar persetujuan pembimbing.',
  'Seminar KP': 'Lembar persetujuan & asistensi, lembar kehadiran seminar min. 3x, handout/draft artikel jurnal, draft laporan KP.',
};
export function berkasSyarat(ev) { return BERKAS_SYARAT[ev] || 'Dokumen persyaratan sesuai ketentuan tahap ini.'; }

// Apakah mahasiswa boleh mengajukan jadwal (terverifikasi & sudah ada pembimbing).
export function bolehAjukanJadwal(m) {
  return statusVerif(m).key === 'terverifikasi' && !!(m.pembimbing1 || m.pembimbing2);
}

// ===================== Dokumen KP per-tahap (generate & unggah) =====================
// Satu sumber kebenaran dipakai bersama oleh Portal mahasiswa & panel admin, supaya
// syarat kelayakan tiap dokumen tidak dobel-tulis di beberapa tempat.
export const KP_DOKUMEN = [
  {
    key: 'permohonan', stage: 'Pendaftaran', label: 'Permohonan KP', docType: 'Permohonan KP',
    syarat: 'Tersedia setelah pendaftaran diverifikasi admin.',
    eligible: (m) => statusVerif(m).key === 'terverifikasi',
  },
  {
    key: 'stPembimbing', stage: 'Pendaftaran', label: 'ST Pembimbing KP', docType: 'ST Pembimbing KP',
    syarat: 'Tersedia setelah admin menetapkan dosen pembimbing.',
    eligible: (m) => statusVerif(m).key === 'terverifikasi' && !!m.pembimbing1,
  },
  {
    key: 'suratBalasan', stage: 'Bimbingan', label: 'Surat Balasan Perusahaan', docType: null,
    syarat: 'Unggah bukti diterima magang/KP dari perusahaan setelah menerima ST Pembimbing.',
    eligible: (m) => !!((m.dokumenKP || {}).stPembimbing),
  },
  {
    key: 'persetujuanSmkp', stage: 'Bimbingan', label: 'Persetujuan SMKP', docType: 'Persetujuan SMKP',
    syarat: 'Tersedia sejak tahap Bimbingan dimulai. Unduh, tanda tangani, lalu unggah kembali.',
    eligible: (m) => tahapIndex('KP', m.tahap) >= tahapIndex('KP', 'Bimbingan'),
  },
  {
    key: 'baSeminar', stage: 'Seminar KP', label: 'Berita Acara Seminar KP', docType: 'BA Seminar KP',
    syarat: 'Tersedia setelah jadwal Seminar KP dikonfirmasi admin.',
    eligible: (m) => { const j = getJadwal(m, 'Seminar KP'); return !!(j.dikonfirmasi && j.tanggal); },
  },
];

// Status tiap dokumen KP untuk seorang mahasiswa: kelayakan + berkas yang sudah diunggah.
export function kpDokumenStatus(m) {
  return KP_DOKUMEN.map((d) => ({ ...d, eligible: d.eligible(m), upload: (m.dokumenKP || {})[d.key] || null }));
}

// Kelompokkan status dokumen KP per tahap, urutan sesuai PROGRAMS.KP.stages.
export function kpDokumenPerTahap(m) {
  const status = kpDokumenStatus(m);
  return stagesFor('KP')
    .map((stage) => ({ stage, dokumen: status.filter((d) => d.stage === stage) }))
    .filter((g) => g.dokumen.length > 0);
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
  tahapBimbingan: 'Memasuki tahap Bimbingan (surat balasan perusahaan diterima)',
  perpanjanganMinta: 'Mengajukan perpanjangan',
  perpanjanganFinal: 'Mengunggah surat perpanjangan final',
};

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

