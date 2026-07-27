import React, { useState, useMemo, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard.jsx';
import { Mahasiswa } from './pages/Mahasiswa.jsx';
import { Dosen } from './pages/Dosen.jsx';
import { Login } from './pages/Login.jsx';
import { Portal, DosenPortal } from './pages/Portal.jsx';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from './utils/helpers.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL } from './data/seed.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu } from './components/ui.jsx';
import { db } from './utils/firebase.js';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// ===================== App.js =====================
// App.js — akar: sesi login, simpan ke localStorage, render Login / Portal / Admin

const KEY = 'sistem-ta-v2';
const KEY_SESI = 'sistem-ta-sesi';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.dosen && p.mahasiswa) return { akun: AKUN_AWAL, periodeBuka: PERIODE_BUKA_AWAL, ...p };
    }
  } catch (e) { /* abaikan */ }
  return { dosen: DOSEN_AWAL, mahasiswa: MAHASISWA_AWAL, akun: AKUN_AWAL, periodeBuka: PERIODE_BUKA_AWAL };
}

function loadSesi() {
  try {
    const raw = localStorage.getItem(KEY_SESI);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* abaikan */ }
  return null;
}

export default function App() {
  const [data, setData] = useState(load);
  const [sesi, setSesi] = useState(loadSesi);
  const [tab, setTab] = useState('dashboard');
  const [showPeriode, setShowPeriode] = useState(false);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }, [data]);
  useEffect(() => {
    try {
      if (sesi) localStorage.setItem(KEY_SESI, JSON.stringify(sesi));
      else localStorage.removeItem(KEY_SESI);
    } catch (e) {}
  }, [sesi]);

  const updateData = (updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setDoc(doc(db, 'sistem_ta', 'global_state'), next).catch((e) => console.error("FB err:", e));
      return next;
    });
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'sistem_ta', 'global_state'), (snap) => {
      if (snap.exists()) setData(snap.data());
      else setDoc(doc(db, 'sistem_ta', 'global_state'), data).catch((e) => console.error("FB init err:", e));
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
    updateData((d) => {
      const ada = d.mahasiswa.some((x) => x.id === m.id);
      const mahasiswa = ada ? d.mahasiswa.map((x) => (x.id === m.id ? m : x)) : [...d.mahasiswa, m];
      return { ...d, mahasiswa };
    });
  }
  function hapusMahasiswa(id) { updateData((d) => ({ ...d, mahasiswa: d.mahasiswa.filter((x) => x.id !== id) })); }
  function simpanDosen(ds) {
    updateData((d) => {
      const ada = d.dosen.some((x) => x.kode === ds.kode);
      const dosen = ada ? d.dosen.map((x) => (x.kode === ds.kode ? ds : x)) : [...d.dosen, ds];
      return { ...d, dosen };
    });
  }
  function hapusDosen(kode) { updateData((d) => ({ ...d, dosen: d.dosen.filter((x) => x.kode !== kode) })); }
  function daftarAkun(akunBaru) { updateData((d) => ({ ...d, akun: [...(d.akun || []), akunBaru] })); }
  function bukaPeriode(p) {
    const v = (p || '').trim();
    if (!v) return;
    updateData((d) => {
      const list = d.periodeBuka || [];
      if (list.includes(v)) return d;
      return { ...d, periodeBuka: [...list, v] };
    });
  }
  function tutupPeriode(p) {
    updateData((d) => ({ ...d, periodeBuka: (d.periodeBuka || []).filter((x) => x !== p) }));
  }
  function resetData() {
    if (window.confirm('Kembalikan ke data contoh? Semua perubahan akan hilang.')) {
      updateData({ dosen: DOSEN_AWAL, mahasiswa: MAHASISWA_AWAL, akun: AKUN_AWAL, periodeBuka: PERIODE_BUKA_AWAL });
    }
  }

  // ----- Belum login -----
  if (!sesi) {
    return <Login akun={data.akun || []} dosen={data.dosen} onLogin={setSesi} onRegister={daftarAkun} />;
  }

  // ----- Login sebagai dosen -----
  if (sesi.peran === 'dosen') {
    const ds = data.dosen.find((x) => x.kode === sesi.kode);
    if (!ds) return <Login akun={data.akun || []} dosen={data.dosen} onLogin={setSesi} onRegister={daftarAkun} />;
    return (
      <DosenPortal
        dosen={ds}
        mahasiswa={data.mahasiswa}
        periodeList={periodeList}
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
          <span className="brand-mark">SM</span>
          <span className="brand-name">SIMANTAP</span>
        </div>
        <div className="topbar-right">
          <label className="periode-pick">
            <span>Periode</span>
            <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
              {periodeList.map((pp) => <option key={pp} value={pp}>{pp}</option>)}
              <option value={SEMUA}>Semua periode</option>
            </select>
          </label>
          <button className="btn ghost" onClick={() => setShowPeriode(true)}>Kelola periode</button>
          <button className="btn ghost" onClick={resetData} title="Kembalikan data contoh">Reset</button>
          <button className="btn ghost" onClick={() => setSesi(null)}>Keluar</button>
        </div>
      </header>

      {showPeriode && (
        <KelolaPeriode
          dibuka={periodeBuka}
          onBuka={bukaPeriode}
          onTutup={tutupPeriode}
          onClose={() => setShowPeriode(false)}
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

function KelolaPeriode({ dibuka, onBuka, onTutup, onClose }) {
  const [nilai, setNilai] = useState('');
  function tambah() {
    const v = nilai.trim();
    if (!v) return;
    onBuka(v);
    setNilai('');
  }
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

