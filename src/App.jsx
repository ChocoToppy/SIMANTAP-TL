import React, { useState, useMemo, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard.jsx';
import { Mahasiswa } from './pages/Mahasiswa.jsx';
import { Dosen } from './pages/Dosen.jsx';
import { Login } from './pages/Login.jsx';
import { Portal, DosenPortal } from './pages/Portal.jsx';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from './utils/helpers.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL, PENGUMUMAN_AWAL, PERIODE_AKTIF_AWAL, PANDUAN_AWAL } from './data/seed.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu, TextSizeToggle, ThemeToggle } from './components/ui.jsx';
import { db } from './utils/firebase.js';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import logoTl from './assets/logo-tl.png';

// ===================== App.js =====================
// App.js — akar: sesi login, simpan ke localStorage, render Login / Portal / Admin

const KEY = 'sistem-ta-v2';
const KEY_SESI = 'sistem-ta-sesi';

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

function loadSesi() {
  try {
    const raw = localStorage.getItem(KEY_SESI);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* abaikan */ }
  return null;
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
  AKUN_AWAL.forEach((a) => batch.set(doc(db, 'akun', a.nim), a));
  await batch.commit();
}

export default function App() {
  const [mahasiswaList, setMahasiswaList] = useState(() => load().mahasiswa);
  const [dosenList, setDosenList] = useState(() => load().dosen);
  const [akunList, setAkunList] = useState(() => load().akun);
  const [config, setConfig] = useState(() => {
    const l = load();
    return { periodeBuka: l.periodeBuka, pengumuman: l.pengumuman, periodeAktif: l.periodeAktif, panduan: l.panduan };
  });
  const [sesi, setSesi] = useState(loadSesi);
  const [tab, setTab] = useState('dashboard');
  const [showPeriode, setShowPeriode] = useState(false);
  const [showPengumuman, setShowPengumuman] = useState(false);
  const [showPanduan, setShowPanduan] = useState(false);

  // Digabung untuk dipakai komponen di bawah (Login/Portal/Mahasiswa/Dosen dst.)
  // supaya tidak perlu mengubah semua pemakaian data.mahasiswa/data.dosen/dst.
  const data = useMemo(() => ({
    mahasiswa: mahasiswaList, dosen: dosenList, akun: akunList, ...config,
  }), [mahasiswaList, dosenList, akunList, config]);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }, [data]);
  useEffect(() => {
    try {
      if (sesi) localStorage.setItem(KEY_SESI, JSON.stringify(sesi));
      else localStorage.removeItem(KEY_SESI);
    } catch (e) {}
  }, [sesi]);

  // Setiap mahasiswa (satu program yang diikuti = satu dokumen), dosen, dan akun
  // disimpan sebagai dokumen Firestore sendiri-sendiri dalam koleksi masing-
  // masing, bukan satu dokumen raksasa untuk seluruh sekolah. Data konfigurasi
  // kecil (periode dibuka, pengumuman, panduan) tetap satu dokumen ringkas di
  // config/global karena ukurannya jauh di bawah batas & jarang berubah drastis.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'mahasiswa'), (snap) => {
      setMahasiswaList(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dosen'), (snap) => {
      setDosenList(snap.docs.map((d) => ({ ...d.data(), kode: d.id })));
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'akun'), (snap) => {
      setAkunList(snap.docs.map((d) => ({ ...d.data(), nim: d.id })));
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    const configRef = doc(db, 'config', 'global');
    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) setConfig((prev) => ({ ...prev, ...snap.data() }));
      else seedFirestore().catch((e) => console.error('FB seed err:', e));
    });
    return () => unsub();
  }, []);

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
    setMahasiswaList((prev) => {
      const ada = prev.some((x) => x.id === m.id);
      return ada ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
    });
    writeDoc('mahasiswa', m.id, m, 'mahasiswa');
  }
  function hapusMahasiswa(id) {
    setMahasiswaList((prev) => prev.filter((x) => x.id !== id));
    hapusDoc('mahasiswa', id);
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
  function daftarAkun(akunBaru) {
    setAkunList((prev) => [...prev, akunBaru]);
    writeDoc('akun', akunBaru.nim, akunBaru, 'akun');
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

  // ----- Belum login -----
  if (!sesi) {
    return <Login akun={data.akun || []} dosen={data.dosen} pengumuman={data.pengumuman || PENGUMUMAN_AWAL} periodeAktif={data.periodeAktif || ''} onLogin={setSesi} onRegister={daftarAkun} />;
  }

  // ----- Login sebagai dosen -----
  if (sesi.peran === 'dosen') {
    const ds = data.dosen.find((x) => x.kode === sesi.kode);
    if (!ds) return <Login akun={data.akun || []} dosen={data.dosen} pengumuman={data.pengumuman || PENGUMUMAN_AWAL} periodeAktif={data.periodeAktif || ''} onLogin={setSesi} onRegister={daftarAkun} />;
    return (
      <DosenPortal
        dosen={ds}
        allDosen={data.dosen}
        mahasiswa={data.mahasiswa}
        periodeList={periodeList}
        onGradeSave={simpanNilaiKP}
        onLogout={() => setSesi(null)}
      />
    );
  }

  // ----- Login sebagai mahasiswa -----
  if (sesi.peran === 'mahasiswa') {
    const akun = (data.akun || []).find((a) => a.nim === sesi.nim);
    return (
      <Portal
        nim={sesi.nim}
        nama={akun ? akun.nama : sesi.nim}
        mahasiswa={data.mahasiswa}
        allDosen={data.dosen}
        periodeBuka={periodeBuka}
        panduan={data.panduan || []}
        onSave={simpanMahasiswa}
        onLogout={() => setSesi(null)}
      />
    );
  }

  // ----- Login sebagai admin -----
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
          <button className="btn ghost" onClick={() => setShowPeriode(true)}>Kelola periode</button>
          <button className="btn ghost" onClick={() => setShowPengumuman(true)}>Kelola pengumuman</button>
          <button className="btn ghost" onClick={() => setShowPanduan(true)}>Kelola panduan</button>
          <button className="btn ghost" onClick={() => setSesi(null)}>Keluar</button>
        </div>
      </header>
      <div className="masthead-rule" />

      {showPeriode && (
        <KelolaPeriode
          dibuka={periodeBuka}
          periodeAktif={data.periodeAktif || ''}
          onBuka={bukaPeriode}
          onTutup={tutupPeriode}
          onSetAktif={setPeriodeAktif}
          onClose={() => setShowPeriode(false)}
        />
      )}

      {showPengumuman && (
        <KelolaPengumuman
          daftar={data.pengumuman || PENGUMUMAN_AWAL}
          onSimpan={simpanPengumuman}
          onClose={() => setShowPengumuman(false)}
        />
      )}

      {showPanduan && (
        <KelolaPanduan
          daftar={data.panduan || []}
          onSimpan={simpanPanduan}
          onClose={() => setShowPanduan(false)}
        />
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </nav>

      <main className="content">
        {tab === 'dashboard' && <Dashboard mahasiswa={mhsPeriode} dosen={data.dosen} />}
        {tab === 'mahasiswa' && (
          <Mahasiswa mahasiswa={mhsPeriode} allMahasiswa={data.mahasiswa} allDosen={data.dosen} periode={periode} periodeList={periodeList} onSave={simpanMahasiswa} onDelete={hapusMahasiswa} />
        )}
        {tab === 'dosen' && (
          <Dosen dosen={data.dosen} mahasiswa={mhsPeriode} periodeLabel={periode === SEMUA ? 'semua periode' : periode} onSave={simpanDosen} onDelete={hapusDosen} />
        )}
      </main>

      <footer className="foot">SIMANTAP © 2026 Universitas Diponegoro</footer>
    </div>
  );
}

function KelolaPeriode({ dibuka, periodeAktif, onBuka, onTutup, onSetAktif, onClose }) {
  const [nilai, setNilai] = useState('');
  const [aktif, setAktif] = useState(periodeAktif || '');
  function tambah() {
    const v = nilai.trim();
    if (!v) return;
    onBuka(v);
    setNilai('');
  }
  function simpanAktif() { onSetAktif(aktif.trim()); }
  return (
    <Modal
      title="Kelola periode pendaftaran"
      onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Selesai</button>}
    >
      <p className="hint" style={{ marginTop: 0 }}>
        Periode yang dibuka di sini akan muncul sebagai pilihan saat mahasiswa mendaftar.
      </p>
      <div className="form-grid">
        <Field label="Periode aktif saat ini (ditampilkan di halaman login)" full>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={aktif} onChange={(e) => setAktif(e.target.value)} placeholder="mis. Genap 2026"
              onKeyDown={(e) => { if (e.key === 'Enter') simpanAktif(); }} />
            <button className="btn" onClick={simpanAktif}>Simpan</button>
          </div>
        </Field>
        <Field label="Buka periode baru" full>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="mis. 2025 Ganjil"
              onKeyDown={(e) => { if (e.key === 'Enter') tambah(); }} />
            <button className="btn btn-primary" onClick={tambah}>Buka</button>
          </div>
        </Field>
      </div>
      <div className="sched" style={{ marginTop: 12 }}>
        <div className="sched-title">Periode yang sedang dibuka</div>
        {dibuka.length === 0 ? (
          <Empty>Belum ada periode yang dibuka.</Empty>
        ) : (
          <ul className="periode-list">
            {dibuka.map((p) => (
              <li key={p} className="periode-item">
                <span>{p}</span>
                <button className="link-btn danger" onClick={() => onTutup(p)}>Tutup</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function KelolaPengumuman({ daftar, onSimpan, onClose }) {
  const [tanggal, setTanggal] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [editId, setEditId] = useState(null);

  function kosongkan() { setTanggal(''); setJudul(''); setIsi(''); setEditId(null); }

  function simpan() {
    if (!tanggal.trim() || !judul.trim()) return;
    if (editId) {
      onSimpan(daftar.map((p) => (p.id === editId ? { ...p, tanggal: tanggal.trim(), judul: judul.trim(), isi: isi.trim() } : p)));
    } else {
      onSimpan([{ id: buatId(), tanggal: tanggal.trim(), judul: judul.trim(), isi: isi.trim() }, ...daftar]);
    }
    kosongkan();
  }

  function edit(p) { setEditId(p.id); setTanggal(p.tanggal); setJudul(p.judul); setIsi(p.isi); }
  function hapus(id) { if (window.confirm('Hapus pengumuman ini?')) onSimpan(daftar.filter((p) => p.id !== id)); if (editId === id) kosongkan(); }

  return (
    <Modal
      title="Kelola pengumuman"
      onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Selesai</button>}
    >
      <p className="hint" style={{ marginTop: 0 }}>
        Pengumuman ini tampil di halaman login, terbaru di atas.
      </p>
      <div className="form-grid">
        <Field label="Tanggal" full><input value={tanggal} onChange={(e) => setTanggal(e.target.value)} placeholder="mis. 17 Juli 2026" /></Field>
        <Field label="Judul" full><input value={judul} onChange={(e) => setJudul(e.target.value)} /></Field>
        <Field label="Isi" full><textarea rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} /></Field>
      </div>
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        {editId && <button className="btn" onClick={kosongkan}>Batal edit</button>}
        <button className="btn btn-primary" onClick={simpan}>{editId ? 'Simpan perubahan' : 'Tambah pengumuman'}</button>
      </div>
      <div className="sched" style={{ marginTop: 12 }}>
        <div className="sched-title">Pengumuman saat ini</div>
        {daftar.length === 0 ? (
          <Empty>Belum ada pengumuman.</Empty>
        ) : (
          <ul className="periode-list">
            {daftar.map((p) => (
              <li key={p.id} className="periode-item">
                <span>{p.tanggal} — {p.judul}</span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button className="link-btn" onClick={() => edit(p)}>Edit</button>
                  <button className="link-btn danger" onClick={() => hapus(p.id)}>Hapus</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function KelolaPanduan({ daftar, onSimpan, onClose }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [editId, setEditId] = useState(null);

  function kosongkan() { setLabel(''); setUrl(''); setEditId(null); }

  function simpan() {
    if (!label.trim() || !url.trim()) return;
    if (editId) {
      onSimpan(daftar.map((p) => (p.id === editId ? { ...p, label: label.trim(), url: url.trim() } : p)));
    } else {
      onSimpan([...daftar, { id: buatId(), label: label.trim(), url: url.trim() }]);
    }
    kosongkan();
  }

  function edit(p) { setEditId(p.id); setLabel(p.label); setUrl(p.url); }
  function hapus(id) { if (window.confirm('Hapus tautan panduan ini?')) onSimpan(daftar.filter((p) => p.id !== id)); if (editId === id) kosongkan(); }

  return (
    <Modal
      title="Kelola panduan"
      onClose={onClose}
      footer={<button className="btn btn-primary" onClick={onClose}>Selesai</button>}
    >
      <p className="hint" style={{ marginTop: 0 }}>
        Daftar unduhan (Panduan KP, Panduan TA, dst.) yang tampil di Portal mahasiswa. Tautkan ke Google Drive atau sumber lain.
      </p>
      <div className="form-grid">
        <Field label="Label" full><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Panduan KP" /></Field>
        <Field label="Tautan" full><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." /></Field>
      </div>
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        {editId && <button className="btn" onClick={kosongkan}>Batal edit</button>}
        <button className="btn btn-primary" onClick={simpan}>{editId ? 'Simpan perubahan' : 'Tambah panduan'}</button>
      </div>
      <div className="sched" style={{ marginTop: 12 }}>
        <div className="sched-title">Panduan saat ini</div>
        {daftar.length === 0 ? (
          <Empty>Belum ada panduan.</Empty>
        ) : (
          <ul className="periode-list">
            {daftar.map((p) => (
              <li key={p.id} className="periode-item">
                <span>{p.label}</span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button className="link-btn" onClick={() => edit(p)}>Edit</button>
                  <button className="link-btn danger" onClick={() => hapus(p.id)}>Hapus</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

