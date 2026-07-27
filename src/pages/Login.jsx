import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL } from '../data/seed.js';
import { csvEscape, triggerDownload, downloadCSV, downloadDoc, cetakSuratPDF, loadXLSX } from '../utils/exportUtils.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu } from '../components/ui.jsx';

// ===================== Login.jsx =====================
// Login.jsx — layar masuk: pilih peran, lalu masuk/daftar

export function Login({ akun, dosen = [], onLogin, onRegister }) {
  const [peran, setPeran] = useState(null); // null | 'mahasiswa' | 'dosen' | 'admin'

  return (
    <div className="login-wrap">
      <div className="login-container">
        <div className="login-announcements">
          <h3>Pengumuman Akademik</h3>
          <div className="announcement-list">
            <div className="announcement-item">
              <span className="announcement-date">17 Juli 2026</span>
              <h4>Batas Akhir Pendaftaran Sidang Gelombang II</h4>
              <p>Diberitahukan kepada seluruh mahasiswa tingkat akhir bahwa pendaftaran sidang Gelombang II akan ditutup pada tanggal 25 Juli 2026.</p>
            </div>
            <div className="announcement-item">
              <span className="announcement-date">10 Juli 2026</span>
              <h4>Pengumpulan Berkas Syarat Ujian</h4>
              <p>Berkas fisik persyaratan ujian wajib diserahkan ke ruang admin paling lambat H-3 sebelum pelaksanaan ujian.</p>
            </div>
            <div className="announcement-item">
              <span className="announcement-date">1 Juli 2026</span>
              <h4>Peluncuran Sistem SIMANTAP</h4>
              <p>Sistem Informasi Manajemen Tugas Akhir dan Praktik (SIMANTAP) kini telah resmi digunakan secara penuh.</p>
            </div>
          </div>
        </div>
        <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">SM</span>
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
          <FormMahasiswaLogin akun={akun} onLogin={onLogin} onRegister={onRegister} onBack={() => setPeran(null)} />
        )}

        {peran === 'dosen' && (
          <FormDosenLogin dosen={dosen} onLogin={onLogin} onBack={() => setPeran(null)} />
        )}

        {peran === 'admin' && (
          <FormAdminLogin onLogin={onLogin} onBack={() => setPeran(null)} />
        )}
      </div>
      </div>
      <p className="login-foot">SIMANTAP © 2026 Universitas Diponegoro</p>
    </div>
  );
}

function FormMahasiswaLogin({ akun, onLogin, onRegister, onBack }) {
  const [sub, setSub] = useState('masuk'); // 'masuk' | 'daftar'
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [err, setErr] = useState('');

  function masuk() {
    setErr('');
    const a = akun.find((x) => x.nim === nim.trim());
    if (!a) { setErr('NIM belum terdaftar. Silakan daftar akun dulu.'); return; }
    if (a.password !== password) { setErr('Password salah.'); return; }
    onLogin({ peran: 'mahasiswa', nim: a.nim });
  }

  function daftar() {
    setErr('');
    if (!nama.trim() || !nim.trim() || !password) { setErr('Nama, NIM, dan password wajib diisi.'); return; }
    if (password !== konfirmasi) { setErr('Konfirmasi password tidak cocok.'); return; }
    if (akun.some((x) => x.nim === nim.trim())) { setErr('NIM sudah terdaftar. Silakan masuk.'); return; }
    onRegister({ nim: nim.trim(), nama: nama.trim(), password });
    onLogin({ peran: 'mahasiswa', nim: nim.trim() });
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
      <label className="field"><span className="field-label">Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {sub === 'daftar' && (
        <label className="field"><span className="field-label">Konfirmasi password</span>
          <input type="password" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} /></label>
      )}

      {err && <div className="login-err">{err}</div>}

      {sub === 'masuk'
        ? <button className="btn btn-primary block" onClick={masuk}>Masuk</button>
        : <button className="btn btn-primary block" onClick={daftar}>Daftar &amp; masuk</button>}
      <button className="btn ghost block" onClick={onBack}>Kembali</button>
    </div>
  );
}

function FormDosenLogin({ dosen, onLogin, onBack }) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  function masuk() {
    setErr('');
    const target = nip.trim().replace(/\s/g, '');
    const d = dosen.find((x) => (x.nip || '').replace(/\s/g, '') === target);
    if (!d) { setErr('NIP tidak ditemukan.'); return; }
    if (password !== DOSEN_PASSWORD) { setErr('Password salah.'); return; }
    onLogin({ peran: 'dosen', kode: d.kode });
  }
  return (
    <div className="login-form">
      <label className="field"><span className="field-label">NIP</span>
        <input value={nip} onChange={(e) => setNip(e.target.value)} /></label>
      <label className="field"><span className="field-label">Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') masuk(); }} /></label>
      {err && <div className="login-err">{err}</div>}
      <button className="btn btn-primary block" onClick={masuk}>Masuk sebagai dosen</button>
      <button className="btn ghost block" onClick={onBack}>Kembali</button>
    </div>
  );
}

function FormAdminLogin({ onLogin, onBack }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  function masuk() {
    if (password !== ADMIN_PASSWORD) { setErr('Password admin salah.'); return; }
    onLogin({ peran: 'admin' });
  }
  return (
    <div className="login-form">
      <label className="field"><span className="field-label">Password admin</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') masuk(); }} /></label>
      {err && <div className="login-err">{err}</div>}
      <button className="btn btn-primary block" onClick={masuk}>Masuk sebagai admin</button>
      <button className="btn ghost block" onClick={onBack}>Kembali</button>
    </div>
  );
}

