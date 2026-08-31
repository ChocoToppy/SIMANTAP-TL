import React, { useState } from 'react';
import { ThemeToggle, TextSizeToggle } from '../components/ui.jsx';
import { loginWithIdentifier, registerStudent, sendReset } from '../utils/auth.js';
import logoTl from '../assets/logo-tl.png';

// ===================== Login.jsx =====================
// Login.jsx — layar masuk: pilih peran, lalu masuk/daftar. Sejak migrasi ke
// Firebase Authentication, form ini hanya mengumpulkan input & menampilkan
// pesan error — verifikasi kredensial sepenuhnya ditangani Firebase Auth
// lewat src/utils/auth.js (lihat loginWithIdentifier/registerStudent).

function pesanErrorAuth(e) {
  const code = e && e.code;
  if (e && e.message === 'NOT_FOUND') return 'Akun tidak ditemukan.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Kombinasi identitas/password salah.';
  if (code === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.';
  if (code === 'auth/email-already-in-use') return 'NIM/email ini sudah terdaftar. Silakan masuk.';
  if (code === 'functions/already-exists') return 'NIM sudah terdaftar. Silakan masuk.';
  return (e && e.message) || 'Terjadi kesalahan. Coba lagi.';
}

export function Login({ pengumuman = [], periodeAktif = '' }) {
  const [peran, setPeran] = useState(null); // null | 'mahasiswa' | 'dosen' | 'admin'

  return (
    <div className="login-wrap">
      <div className="login-topbar">
        <ThemeToggle />
        <TextSizeToggle />
      </div>
      {periodeAktif && (
        <div className="periode-aktif-banner">Periode saat ini: <strong>{periodeAktif}</strong></div>
      )}
      <div className="login-container">
        <div className="login-announcements">
          <h3>Pengumuman Akademik</h3>
          <div className="announcement-list">
            {pengumuman.length === 0 ? (
              <p className="hint">Belum ada pengumuman.</p>
            ) : pengumuman.map((p) => (
              <div className="announcement-item" key={p.id}>
                <span className="announcement-date">{p.tanggal}</span>
                <h4>{p.judul}</h4>
                <p>{p.isi}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="login-card">
        <div className="login-brand">
          <img className="brand-mark" src={logoTl} alt="TL Undip" />
          <div>
            <div className="login-title">SIMANTAP</div>
            <div className="login-sub">Sistem Manajemen Tugas Akhir &amp; Praktik</div>
          </div>
        </div>

        {!peran && (
          <div className="login-roles">
            <p className="login-hint">Masuk sebagai:</p>
            <button className="btn btn-primary block" onClick={() => setPeran('mahasiswa')}>Mahasiswa</button>
            <button className="btn block" onClick={() => setPeran('dosen')}>Dosen</button>
            <button className="btn block" onClick={() => setPeran('admin')}>Admin / Koordinator</button>
          </div>
        )}

        {peran === 'mahasiswa' && (
          <FormMahasiswaLogin onBack={() => setPeran(null)} />
        )}

        {peran === 'dosen' && (
          <FormDosenLogin onBack={() => setPeran(null)} />
        )}

        {peran === 'admin' && (
          <FormAdminLogin onBack={() => setPeran(null)} />
        )}
      </div>
      </div>
      <p className="login-foot">SIMANTAP © 2026 Universitas Diponegoro</p>
    </div>
  );
}

function LupaPassword({ tipe }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  if (tipe === 'admin') return null; // admin login sudah pakai email langsung, lihat FormAdminLogin

  async function kirim() {
    setStatus('');
    if (!email.trim()) { setStatus('Isi email yang terdaftar di akun Anda.'); return; }
    try {
      await sendReset(email);
      setStatus('Tautan reset password sudah dikirim ke email tersebut (bila terdaftar).');
    } catch (e) {
      setStatus(pesanErrorAuth(e));
    }
  }

  return (
    <details className="login-lupa">
      <summary>Lupa password?</summary>
      <div style={{ marginTop: 8 }}>
        <label className="field"><span className="field-label">Email terdaftar</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="btn" onClick={kirim} type="button">Kirim tautan reset</button>
        {status && <div className="hint" style={{ marginTop: 6 }}>{status}</div>}
      </div>
    </details>
  );
}

function FormMahasiswaLogin({ onBack }) {
  const [sub, setSub] = useState('masuk'); // 'masuk' | 'daftar'
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function masuk() {
    setErr('');
    if (!nim.trim() || !password) { setErr('NIM dan password wajib diisi.'); return; }
    setLoading(true);
    try {
      await loginWithIdentifier('mahasiswa', nim, password);
    } catch (e) {
      setErr(pesanErrorAuth(e));
    } finally {
      setLoading(false);
    }
  }

  async function daftar() {
    setErr('');
    if (!nama.trim() || !nim.trim() || !email.trim() || !password) { setErr('Nama, NIM, email, dan password wajib diisi.'); return; }
    if (password !== konfirmasi) { setErr('Konfirmasi password tidak cocok.'); return; }
    if (password.length < 6) { setErr('Password minimal 6 karakter.'); return; }
    setLoading(true);
    try {
      await registerStudent({ nim, nama, email, password });
    } catch (e) {
      setErr(pesanErrorAuth(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-form">
      <div className="login-tabs">
        <button className={'login-tab' + (sub === 'masuk' ? ' active' : '')} onClick={() => { setSub('masuk'); setErr(''); }}>Masuk</button>
        <button className={'login-tab' + (sub === 'daftar' ? ' active' : '')} onClick={() => { setSub('daftar'); setErr(''); }}>Daftar akun</button>
      </div>

      {sub === 'daftar' && (
        <label className="field"><span className="field-label">Nama lengkap</span>
          <input value={nama} onChange={(e) => setNama(e.target.value)} /></label>
      )}
      <label className="field"><span className="field-label">NIM</span>
        <input value={nim} onChange={(e) => setNim(e.target.value)} /></label>
      {sub === 'daftar' && (
        <label className="field"><span className="field-label">Email aktif</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="untuk reset password bila lupa" /></label>
      )}
      <label className="field"><span className="field-label">Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && sub === 'masuk') masuk(); }} /></label>
      {sub === 'daftar' && (
        <label className="field"><span className="field-label">Konfirmasi password</span>
          <input type="password" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} /></label>
      )}

      {err && <div className="login-err">{err}</div>}

      {sub === 'masuk'
        ? <button className="btn btn-primary block" onClick={masuk} disabled={loading}>{loading ? 'Memproses…' : 'Masuk'}</button>
        : <button className="btn btn-primary block" onClick={daftar} disabled={loading}>{loading ? 'Memproses…' : 'Daftar & masuk'}</button>}
      {sub === 'masuk' && <LupaPassword tipe="mahasiswa" />}
      <button className="btn ghost block" onClick={onBack}>Kembali</button>
    </div>
  );
}

function FormDosenLogin({ onBack }) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function masuk() {
    setErr('');
    const target = nip.trim().replace(/\s/g, '');
    if (!target || !password) { setErr('NIP dan password wajib diisi.'); return; }
    setLoading(true);
    try {
      await loginWithIdentifier('dosen', target, password);
    } catch (e) {
      setErr(pesanErrorAuth(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-form">
      <label className="field"><span className="field-label">NIP</span>
        <input value={nip} onChange={(e) => setNip(e.target.value)} /></label>
      <label className="field"><span className="field-label">Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') masuk(); }} /></label>
      {err && <div className="login-err">{err}</div>}
      <button className="btn btn-primary block" onClick={masuk} disabled={loading}>{loading ? 'Memproses…' : 'Masuk sebagai dosen'}</button>
      <LupaPassword tipe="dosen" />
      <button className="btn ghost block" onClick={onBack}>Kembali</button>
    </div>
  );
}

function FormAdminLogin({ onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function masuk() {
    setErr('');
    if (!email.trim() || !password) { setErr('Email dan password wajib diisi.'); return; }
    setLoading(true);
    try {
      await loginWithIdentifier('admin', email, password);
    } catch (e) {
      setErr(pesanErrorAuth(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-form">
      <label className="field"><span className="field-label">Email admin</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="field"><span className="field-label">Password admin</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') masuk(); }} /></label>
      {err && <div className="login-err">{err}</div>}
      <button className="btn btn-primary block" onClick={masuk} disabled={loading}>{loading ? 'Memproses…' : 'Masuk sebagai admin'}</button>
      <button className="btn ghost block" onClick={onBack}>Kembali</button>
    </div>
  );
}
