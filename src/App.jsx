import React, { useState, useMemo, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard.jsx';
import { Mahasiswa } from './pages/Mahasiswa.jsx';
import { Dosen } from './pages/Dosen.jsx';
import { Pengaturan } from './pages/Pengaturan.jsx';
import { Login } from './pages/Login.jsx';
import { Portal, DosenPortal, PanduanPage } from './pages/Portal.jsx';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal, orphanedUploadPaths } from './utils/helpers.js';
import { deleteUploadedFile, deleteUploadedFolder } from './utils/fileUpload.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL, PENGUMUMAN_AWAL, PERIODE_AKTIF_AWAL, PANDUAN_AWAL } from './data/seed.js';
import { Badge, StageBar, ExportMenu, TextSizeToggle, ThemeToggle, RolePill } from './components/ui.jsx';
import { db, auth } from './utils/firebase.js';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { readClaims, logout, changeOwnPassword, adminCreateUser, adminResetPassword } from './utils/auth.js';
import logoTl from './assets/logo-tl.png';
import gearIcon from './assets/gear.png';

// ===================== App.js =====================
// App.js — akar: sesi login (Firebase Auth + custom claims), render Login / Portal / Admin

const KEY = 'sistem-ta-v2';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.dosen && p.mahasiswa) return { akun: AKUN_AWAL, periodeBuka: PERIODE_BUKA_AWAL, pengumuman: PENGUMUMAN_AWAL, periodeAktif: PERIODE_AKTIF_AWAL, panduan: PANDUAN_AWAL, ...p };
    }
  } catch (e) { /* abaikan */ }
  return { dosen: DOSEN_AWAL, mahasiswa: MAHASISWA_AWAL, akun: AKUN_AWAL, periodeBuka: PERIODE_BUKA_AWAL, pengumuman: PENGUMUMAN_AWAL, periodeAktif: PERIODE_AKTIF_AWAL, panduan: PANDUAN_AWAL };
}

// Setiap mahasiswa/dosen/akun kini disimpan sebagai dokumen Firestore sendiri
// (bukan satu dokumen raksasa untuk seluruh aplikasi seperti sebelumnya), supaya
// satu berkas besar atau satu record tidak bisa menimpa/menggagalkan data orang
// lain. Batas 1 MiB tetap berlaku, tapi sekarang per-dokumen (per mahasiswa/
// dosen/akun), bukan per seluruh sekolah.
const DOC_SAFE_LIMIT = 900_000; // sisakan margin di bawah batas 1 MiB per dokumen Firestore

function writeDoc(collectionName, id, value, label) {
  const perkiraanUkuran = new Blob([JSON.stringify(value)]).size;
  if (perkiraanUkuran > DOC_SAFE_LIMIT) {
    alert(`Gagal menyimpan: data ${label} sudah ${Math.round(perkiraanUkuran / 1024)} KB, mendekati/melebihi batas 1 MiB per dokumen Firestore. Coba unggah berkas dengan ukuran lebih kecil, atau hubungi admin.`);
    return;
  }
  setDoc(doc(db, collectionName, id), value).catch((e) => {
    console.error('FB err:', e);
    alert('Gagal menyimpan perubahan ke server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
  });
}

function hapusDoc(collectionName, id) {
  deleteDoc(doc(db, collectionName, id)).catch((e) => {
    console.error('FB err:', e);
    alert('Gagal menghapus data di server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
  });
}

// Isi Firestore pertama kali (koleksi mahasiswa/dosen/akun kosong & belum ada
// config/global) dengan data contoh, ditulis sekaligus lewat batch.
async function seedFirestore() {
  const batch = writeBatch(db);
  batch.set(doc(db, 'config', 'global'), {
    periodeBuka: PERIODE_BUKA_AWAL, pengumuman: PENGUMUMAN_AWAL,
    periodeAktif: PERIODE_AKTIF_AWAL, panduan: PANDUAN_AWAL,
  });
  DOSEN_AWAL.forEach((d) => batch.set(doc(db, 'dosen', d.kode), d));
  MAHASISWA_AWAL.forEach((m) => batch.set(doc(db, 'mahasiswa', m.id), m));
  await batch.commit();
}

// ----- Layar wajib ganti password (akun baru dibuat admin / hasil reset) -----
function GantiPasswordWajib({ onSelesai, onLogout }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function simpan() {
    setErr('');
    if (p1.length < 6) { setErr('Password minimal 6 karakter.'); return; }
    if (p1 !== p2) { setErr('Konfirmasi password tidak cocok.'); return; }
    setLoading(true);
    try {
      await onSelesai(p1);
    } catch (e) {
      setErr(e.message || 'Gagal menyimpan password baru. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-container">
        <div className="login-card">
          <div className="login-brand">
            <img className="brand-mark" src={logoTl} alt="TL Undip" />
            <div>
              <div className="login-title">Ganti Password</div>
              <div className="login-sub">Akun Anda memakai password sementara — buat password baru untuk melanjutkan.</div>
            </div>
          </div>
          <div className="login-form">
            <label className="field"><span className="field-label">Password baru</span>
              <input type="password" value={p1} onChange={(e) => setP1(e.target.value)} /></label>
            <label className="field"><span className="field-label">Konfirmasi password baru</span>
              <input type="password" value={p2} onChange={(e) => setP2(e.target.value)} /></label>
            {err && <div className="login-err">{err}</div>}
            <button className="btn btn-primary block" onClick={simpan} disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan & lanjutkan'}</button>
            <button className="btn ghost block" onClick={onLogout}>Keluar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mahasiswaList, setMahasiswaList] = useState(() => load().mahasiswa);
  const [dosenList, setDosenList] = useState(() => load().dosen);
  const [akunList, setAkunList] = useState(() => load().akun);
  const [adminList, setAdminList] = useState([]);
  const [config, setConfig] = useState(() => {
    const l = load();
    return { periodeBuka: l.periodeBuka, pengumuman: l.pengumuman, periodeAktif: l.periodeAktif, panduan: l.panduan };
  });

  // ----- Sesi: Firebase Auth + custom claims (role/kode), bukan localStorage -----
  const [authUser, setAuthUser] = useState(undefined); // undefined = belum diketahui (loading)
  const [claims, setClaims] = useState(null); // { role, kode }
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user || null);
      if (!user) { setClaims(null); return; }
      try {
        setClaims(await readClaims(user));
      } catch (e) {
        console.error('Gagal membaca klaim:', e);
        setClaims(null);
      }
    });
    return () => unsub();
  }, []);

  const [tab, setTab] = useState('dashboard');

  // Rute sederhana berbasis path asli (tanpa library router) — hanya dipakai
  // untuk memberi halaman Pengaturan alamatnya sendiri (/pengaturan), terpisah
  // dari tab admin utama. Firebase Hosting sudah mengarahkan semua path ke
  // index.html (lihat firebase.json), jadi refresh/buka langsung di alamat ini
  // tetap berfungsi.
  const [route, setRoute] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  function navigate(path) {
    if (path !== window.location.pathname) window.history.pushState(null, '', path);
    setRoute(path);
  }
  function keluar() {
    logout();
    navigate('/');
  }

  // Digabung untuk dipakai komponen di bawah (Login/Portal/Mahasiswa/Dosen dst.)
  // supaya tidak perlu mengubah semua pemakaian data.mahasiswa/data.dosen/dst.
  const data = useMemo(() => ({
    mahasiswa: mahasiswaList, dosen: dosenList, akun: akunList, ...config,
  }), [mahasiswaList, dosenList, akunList, config]);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }, [data]);

  // Setiap mahasiswa (satu program yang diikuti = satu dokumen), dosen, dan akun
  // disimpan sebagai dokumen Firestore sendiri-sendiri dalam koleksi masing-
  // masing, bukan satu dokumen raksasa untuk seluruh sekolah. Data konfigurasi
  // kecil (periode dibuka, pengumuman, panduan) tetap satu dokumen ringkas di
  // config/global karena ukurannya jauh di bawah batas & jarang berubah drastis.
  //
  // PENTING: query Firestore "list" (collection()/onSnapshot atas koleksi)
  // harus terbukti valid untuk SEMUA kemungkinan dokumen di koleksi itu —
  // Firestore tidak memfilter dokumen satu per satu berdasarkan rules. Karena
  // itu mahasiswa/dosen hanya boleh me-listen koleksi 'mahasiswa'/'akun' TANPA
  // where() bila mereka admin (aturan admin berlaku rata utk semua dokumen);
  // selain admin, query harus disertai where() yang cocok dengan
  // firestore.rules (lihat catatan di sana), atau dokumen tunggal (bukan list).
  useEffect(() => {
    if (claims?.role === 'admin') {
      const unsub = onSnapshot(collection(db, 'mahasiswa'), (snap) => {
        setMahasiswaList(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      }, () => setMahasiswaList([]));
      return () => unsub();
    }
    if (claims?.role === 'student' && claims.nim) {
      const q = query(collection(db, 'mahasiswa'), where('owner', '==', claims.nim));
      const unsub = onSnapshot(q, (snap) => {
        setMahasiswaList(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      }, () => setMahasiswaList([]));
      return () => unsub();
    }
    if (claims?.role === 'lecturer' && claims.kode) {
      // Tidak ada satu query tunggal untuk "salah satu dari 4 field ini" —
      // dengarkan masing-masing field lalu gabungkan hasilnya (di-dedup per id).
      const byId = new Map();
      const fields = ['pembimbing1', 'pembimbing2', 'penguji1', 'penguji2'];
      const perField = new Map(fields.map((f) => [f, []]));
      function republish() {
        const merged = new Map();
        perField.forEach((docs) => docs.forEach((d) => merged.set(d.id, d)));
        setMahasiswaList(Array.from(merged.values()));
      }
      const unsubs = fields.map((f) => onSnapshot(
        query(collection(db, 'mahasiswa'), where(f, '==', claims.kode)),
        (snap) => { perField.set(f, snap.docs.map((d) => ({ ...d.data(), id: d.id }))); republish(); },
        () => { perField.set(f, []); republish(); },
      ));
      return () => unsubs.forEach((u) => u());
    }
    setMahasiswaList([]);
  }, [claims]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dosen'), (snap) => {
      setDosenList(snap.docs.map((d) => ({ ...d.data(), kode: d.id })));
    }, () => setDosenList([]));
    return () => unsub();
  }, [authUser]);
  useEffect(() => {
    if (claims?.role === 'admin') {
      const unsub = onSnapshot(collection(db, 'akun'), (snap) => {
        setAkunList(snap.docs.map((d) => ({ ...d.data(), nim: d.id })));
      }, () => setAkunList([]));
      return () => unsub();
    }
    if (claims?.role === 'student' && claims.nim) {
      // Dokumen tunggal (bukan "list") — sepenuhnya boleh mengandalkan rules
      // dinamis (lihat firestore.rules: akun/{nim}).
      const unsub = onSnapshot(doc(db, 'akun', claims.nim), (snap) => {
        setAkunList(snap.exists() ? [{ ...snap.data(), nim: snap.id }] : []);
      }, () => setAkunList([]));
      return () => unsub();
    }
    setAkunList([]);
  }, [claims]);
  useEffect(() => {
    if (claims?.role !== 'admin') { setAdminList([]); return; }
    const unsub = onSnapshot(collection(db, 'admin'), (snap) => {
      setAdminList(snap.docs.map((d) => ({ ...d.data(), uid: d.id })));
    }, () => setAdminList([]));
    return () => unsub();
  }, [claims]);
  useEffect(() => {
    const configRef = doc(db, 'config', 'global');
    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) setConfig((prev) => ({ ...prev, ...snap.data() }));
      else if (claims?.role === 'admin') seedFirestore().catch((e) => console.error('FB seed err:', e));
    });
    return () => unsub();
  }, [claims]);

  const periodeBuka = useMemo(() => (data.periodeBuka || []).slice().sort(), [data.periodeBuka]);
  const periodeList = useMemo(() => {
    const set = new Set([...daftarPeriode(data.mahasiswa), ...periodeBuka]);
    return Array.from(set).sort();
  }, [data.mahasiswa, periodeBuka]);
  const [periode, setPeriode] = useState(() => {
    const list = daftarPeriode(load().mahasiswa);
    return list.length ? list[list.length - 1] : SEMUA;
  });
  useEffect(() => {
    if (periode !== SEMUA && !periodeList.includes(periode)) {
      setPeriode(periodeList.length ? periodeList[periodeList.length - 1] : SEMUA);
    }
  }, [periodeList, periode]);

  const mhsPeriode = useMemo(() => filterByPeriode(data.mahasiswa, periode), [data.mahasiswa, periode]);

  function simpanMahasiswa(m) {
    // Berkas KP/perpanjangan yang ada di record lama tapi tidak lagi ada di
    // record baru (diganti atau dihapus) sudah tidak dirujuk siapa pun —
    // hapus dari Storage sekarang juga supaya tidak menumpuk jadi sampah.
    const lama = mahasiswaList.find((x) => x.id === m.id);
    if (lama) orphanedUploadPaths(lama, m).forEach((p) => deleteUploadedFile(p));
    setMahasiswaList((prev) => {
      const ada = prev.some((x) => x.id === m.id);
      return ada ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
    });
    writeDoc('mahasiswa', m.id, m, 'mahasiswa');
  }
  function hapusMahasiswa(id) {
    setMahasiswaList((prev) => prev.filter((x) => x.id !== id));
    hapusDoc('mahasiswa', id);
    // Semua berkas mahasiswa ini disimpan di bawah uploads/{id}/... — hapus
    // seluruh folder sekaligus supaya tidak ada sisa berkas yatim di Storage.
    deleteUploadedFolder(`uploads/${id}`);
  }
  // Dosen hanya boleh mengubah nilai/hasil pada event yang mereka tangani sendiri —
  // jangan pakai simpanMahasiswa (itu menimpa seluruh record, termasuk field admin).
  function simpanNilaiKP(id, ev, hasil) {
    const target = mahasiswaList.find((x) => x.id === id);
    if (!target) return;
    const next = { ...target, jadwal: { ...(target.jadwal || {}), [ev]: { ...((target.jadwal || {})[ev] || {}), hasil } } };
    setMahasiswaList((prev) => prev.map((x) => (x.id === id ? next : x)));
    writeDoc('mahasiswa', id, next, 'mahasiswa');
  }
  function simpanDosen(ds) {
    setDosenList((prev) => {
      const ada = prev.some((x) => x.kode === ds.kode);
      return ada ? prev.map((x) => (x.kode === ds.kode ? ds : x)) : [...prev, ds];
    });
    writeDoc('dosen', ds.kode, ds, 'dosen');
  }
  function hapusDosen(kode) {
    setDosenList((prev) => prev.filter((x) => x.kode !== kode));
    hapusDoc('dosen', kode);
  }
  function simpanConfig(next) {
    setConfig(next);
    const perkiraanUkuran = new Blob([JSON.stringify(next)]).size;
    if (perkiraanUkuran > DOC_SAFE_LIMIT) {
      alert(`Gagal menyimpan: data konfigurasi sudah ${Math.round(perkiraanUkuran / 1024)} KB, mendekati/melebihi batas 1 MiB per dokumen Firestore. Perubahan ini TIDAK disimpan.`);
      return;
    }
    setDoc(doc(db, 'config', 'global'), next).catch((e) => {
      console.error('FB err:', e);
      alert('Gagal menyimpan perubahan ke server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
    });
  }
  function bukaPeriode(p) {
    const v = (p || '').trim();
    if (!v) return;
    const list = config.periodeBuka || [];
    if (list.includes(v)) return;
    simpanConfig({ ...config, periodeBuka: [...list, v] });
  }
  function tutupPeriode(p) {
    simpanConfig({ ...config, periodeBuka: (config.periodeBuka || []).filter((x) => x !== p) });
  }
  function simpanPengumuman(list) {
    simpanConfig({ ...config, pengumuman: list });
  }
  function setPeriodeAktif(v) {
    simpanConfig({ ...config, periodeAktif: v });
  }
  function simpanPanduan(list) {
    simpanConfig({ ...config, panduan: list });
  }
  function simpanKonten(next) {
    simpanConfig({ ...config, konten: next });
  }

  // ----- Belum diketahui status login (Firebase Auth belum selesai cek) -----
  if (authUser === undefined) {
    return <div className="login-wrap"><div className="login-container"><p className="hint">Memuat…</p></div></div>;
  }

  // ----- Belum login -----
  if (!authUser || !claims) {
    return <Login pengumuman={data.pengumuman || PENGUMUMAN_AWAL} periodeAktif={data.periodeAktif || ''} />;
  }

  // ----- Profil sesuai peran (dari custom claim), untuk cek mustChangePassword & data tampilan -----
  const profilAkun = claims.role === 'student' ? (data.akun || []).find((a) => a.uid === authUser.uid) : null;
  const profilDosen = claims.role === 'lecturer' ? (data.dosen || []).find((d) => d.kode === claims.kode) : null;
  const profilAdmin = claims.role === 'admin' ? adminList.find((a) => a.uid === authUser.uid) : null;
  const profil = profilAkun || profilDosen || profilAdmin;
  const profilRefPath = profilAkun ? ['akun', profilAkun.nim] : profilDosen ? ['dosen', profilDosen.kode] : profilAdmin ? ['admin', profilAdmin.uid] : null;

  if (profil && profilRefPath && profil.mustChangePassword) {
    return (
      <GantiPasswordWajib
        onLogout={keluar}
        onSelesai={(passwordBaru) => changeOwnPassword(passwordBaru, doc(db, ...profilRefPath))}
      />
    );
  }

  // ----- Login sebagai dosen -----
  if (claims.role === 'lecturer') {
    const ds = profilDosen;
    if (!ds) return <div className="login-wrap"><div className="login-container"><p className="hint">Memuat profil dosen…</p></div></div>;
    return (
      <DosenPortal
        dosen={ds}
        allDosen={data.dosen}
        mahasiswa={data.mahasiswa}
        periodeList={periodeList}
        onGradeSave={simpanNilaiKP}
        onLogout={keluar}
      />
    );
  }

  // ----- Login sebagai mahasiswa -----
  if (claims.role === 'student') {
    const akunProfil = profilAkun;
    if (!akunProfil) return <div className="login-wrap"><div className="login-container"><p className="hint">Memuat profil mahasiswa…</p></div></div>;
    const nim = akunProfil.nim;
    const namaMhs = akunProfil.nama || nim;
    // Alamat sendiri (/panduan), sama pola dengan /pengaturan di bawah —
    // supaya bisa dibuka langsung/dibagikan, bukan cuma dropdown di header.
    if (route === '/panduan') {
      return (
        <PanduanPage
          nama={namaMhs}
          nim={nim}
          panduan={data.panduan || []}
          onBack={() => navigate('/')}
          onLogout={keluar}
        />
      );
    }
    return (
      <Portal
        nim={nim}
        nama={namaMhs}
        mahasiswa={data.mahasiswa}
        allDosen={data.dosen}
        periodeBuka={periodeBuka}
        panduan={data.panduan || []}
        konten={data.konten || {}}
        onSave={simpanMahasiswa}
        onLogout={keluar}
        onOpenPanduan={() => navigate('/panduan')}
      />
    );
  }

  // ----- Login sebagai admin -----
  if (claims.role !== 'admin' || !profilAdmin) {
    return <div className="login-wrap"><div className="login-container"><p className="hint">Memuat profil admin…</p></div></div>;
  }

  // ----- Halaman Pengaturan (admin) — alamat terpisah (/pengaturan), bukan tab -----
  if (route === '/pengaturan') {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <img className="brand-mark" src={logoTl} alt="TL Undip" />
            <span className="brand-name">SIMANTAP</span>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <TextSizeToggle />
            <RolePill peran="admin" nama={profilAdmin.nama} />
            <button className="btn ghost" onClick={() => navigate('/')}>← Kembali</button>
            <button className="btn ghost" onClick={keluar}>Keluar</button>
          </div>
        </header>
        <div className="masthead-rule" />
        <main className="content">
          <Pengaturan
            periodeBuka={periodeBuka}
            periodeAktif={data.periodeAktif || ''}
            onBukaPeriode={bukaPeriode}
            onTutupPeriode={tutupPeriode}
            onSetPeriodeAktif={setPeriodeAktif}
            pengumuman={data.pengumuman || PENGUMUMAN_AWAL}
            onSimpanPengumuman={simpanPengumuman}
            panduan={data.panduan || []}
            onSimpanPanduan={simpanPanduan}
            konten={data.konten || {}}
            onSimpanKonten={simpanKonten}
            akun={data.akun || []}
            dosen={data.dosen || []}
            admin={adminList}
            onResetPassword={adminResetPassword}
            onCreateUser={adminCreateUser}
            onEditDosen={simpanDosen}
            onToggleAkunAktif={(nim, isActive) => writeDoc('akun', nim, { ...(data.akun || []).find((a) => a.nim === nim), isActive }, 'akun')}
            onToggleDosenAktif={(kode, isActive) => writeDoc('dosen', kode, { ...(data.dosen || []).find((d) => d.kode === kode), isActive }, 'dosen')}
          />
        </main>
        <footer className="foot">SIMANTAP © 2026 Universitas Diponegoro</footer>
      </div>
    );
  }

  const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'mahasiswa', label: 'Mahasiswa' },
    { key: 'dosen', label: 'Dosen' },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={logoTl} alt="TL Undip" />
          <span className="brand-name">SIMANTAP</span>
        </div>
        <div className="topbar-right">
          <ThemeToggle />
          <TextSizeToggle />
          <label className="periode-pick">
            <span>Periode</span>
            <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
              {periodeList.map((pp) => <option key={pp} value={pp}>{pp}</option>)}
              <option value={SEMUA}>Semua periode</option>
            </select>
          </label>
          <button className="icon-btn" onClick={() => navigate('/pengaturan')} title="Pengaturan" aria-label="Pengaturan">
            <img src={gearIcon} alt="" width={20} height={20} className="gear-icon" />
          </button>
          <RolePill peran="admin" nama={profilAdmin.nama} />
          <button className="btn ghost" onClick={keluar}>Keluar</button>
        </div>
      </header>
      <div className="masthead-rule" />

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </nav>

      <main className="content">
        {tab === 'dashboard' && <Dashboard mahasiswa={mhsPeriode} dosen={data.dosen} />}
        {tab === 'mahasiswa' && (
          <Mahasiswa mahasiswa={mhsPeriode} allMahasiswa={data.mahasiswa} allDosen={data.dosen} periode={periode} periodeList={periodeList} konten={data.konten || {}} onSave={simpanMahasiswa} onDelete={hapusMahasiswa} />
        )}
        {tab === 'dosen' && (
          <Dosen dosen={data.dosen} mahasiswa={mhsPeriode} periodeLabel={periode === SEMUA ? 'semua periode' : periode} onSave={simpanDosen} onDelete={hapusDosen} />
        )}
      </main>

      <footer className="foot">SIMANTAP © 2026 Universitas Diponegoro</footer>
    </div>
  );
}
