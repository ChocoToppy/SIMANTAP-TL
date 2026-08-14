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

export default function App() {
  const [data, setData] = useState(load);
  const [sesi, setSesi] = useState(loadSesi);
  const [tab, setTab] = useState('dashboard');
  const [showPeriode, setShowPeriode] = useState(false);
  const [showPengumuman, setShowPengumuman] = useState(false);
  const [showPanduan, setShowPanduan] = useState(false);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }, [data]);
  useEffect(() => {
    try {
      if (sesi) localStorage.setItem(KEY_SESI, JSON.stringify(sesi));
      else localStorage.removeItem(KEY_SESI);
    } catch (e) {}
  }, [sesi]);

  // Seluruh data aplikasi (semua mahasiswa, dosen, berkas terunggah) tersimpan
  // dalam SATU dokumen Firestore yang dibatasi 1 MiB (1.048.576 byte) oleh
  // Firestore sendiri. Cek ukuran di sisi klien dulu sebelum menulis, supaya
  // kegagalan (mis. berkas terlalu besar) ketahuan SEKARANG dan tidak
  // menimpa data lokal dengan optimis lalu "hilang lagi" saat onSnapshot
  // berikutnya menarik versi lama dari server.
  const FIRESTORE_DOC_LIMIT = 1_048_576;
  const SAFE_DOC_LIMIT = 950_000; // sisakan margin untuk overhead field Firestore

  const updateData = (updater) => {
    setData((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const perkiraanUkuran = new Blob([JSON.stringify(next)]).size;
      if (perkiraanUkuran > SAFE_DOC_LIMIT) {
        alert(`Gagal menyimpan: total data sudah ${Math.round(perkiraanUkuran / 1024)} KB, mendekati/melebihi batas ${Math.round(FIRESTORE_DOC_LIMIT / 1024)} KB per dokumen Firestore. Perubahan ini TIDAK disimpan. Coba unggah berkas dengan ukuran lebih kecil (kompres/scan ulang resolusi rendah), atau hubungi admin.`);
        return prev;
      }
      setDoc(doc(db, 'sistem_ta', 'global_state'), next).catch((e) => {
        console.error("FB err:", e);
        alert('Gagal menyimpan perubahan ke server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
      });
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
  // Dosen hanya boleh mengubah nilai/hasil pada event yang mereka tangani sendiri —
  // jangan pakai simpanMahasiswa (itu menimpa seluruh record, termasuk field admin).
  function simpanNilaiKP(id, ev, hasil) {
    updateData((d) => ({
      ...d,
      mahasiswa: d.mahasiswa.map((x) =>
        x.id === id
          ? { ...x, jadwal: { ...(x.jadwal || {}), [ev]: { ...((x.jadwal || {})[ev] || {}), hasil } } }
          : x
      ),
    }));
  }
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
  function simpanPengumuman(list) {
    updateData((d) => ({ ...d, pengumuman: list }));
  }
  function setPeriodeAktif(v) {
    updateData((d) => ({ ...d, periodeAktif: v }));
  }
  function simpanPanduan(list) {
    updateData((d) => ({ ...d, panduan: list }));
  }
  function resetData() {
    if (window.confirm('Kembalikan ke data contoh? Semua perubahan akan hilang.')) {
      updateData({ dosen: DOSEN_AWAL, mahasiswa: MAHASISWA_AWAL, akun: AKUN_AWAL, periodeBuka: PERIODE_BUKA_AWAL, pengumuman: PENGUMUMAN_AWAL, periodeAktif: PERIODE_AKTIF_AWAL, panduan: PANDUAN_AWAL });
    }
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
          <span className="brand-mark">SM</span>
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
          {/* <button className="btn ghost" onClick={resetData} title="Kembalikan data contoh">Reset</button> */}
          <button className="btn ghost" onClick={() => setSesi(null)}>Keluar</button>
        </div>
      </header>

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

