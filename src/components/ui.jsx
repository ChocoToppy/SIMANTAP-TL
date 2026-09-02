import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';
import { getTextSize, setTextSize } from '../utils/textSize.js';
import { getTheme, setTheme } from '../utils/theme.js';

// ===================== ui.js =====================
// ui.js — komponen kecil yang dipakai berulang

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// Lencana identitas login di topbar — satu warna per peran (mahasiswa/dosen/
// admin) supaya langsung terlihat sedang masuk sebagai apa. `sub` opsional
// untuk info tambahan kecil (mis. kode dosen) di sebelah nama.
export function RolePill({ peran, nama, sub }) {
  if (!nama) return null;
  return (
    <span className={`role-pill role-pill-${peran}`}>
      <span className="role-pill-dot" aria-hidden="true" />
      {nama}
      {sub && <span className="role-pill-sub">· {sub}</span>}
    </span>
  );
}

// Pengatur ukuran teks (aksesibilitas): kecil / normal / besar.
export function TextSizeToggle() {
  const [size, setSize] = useState(getTextSize);
  function pilih(s) { setSize(s); setTextSize(s); }
  return (
    <div className="text-size-toggle" role="group" aria-label="Ukuran teks">
      <button type="button" className={size === 'sm' ? 'active' : ''} onClick={() => pilih('sm')} title="Teks kecil">A</button>
      <button type="button" className={size === 'md' ? 'active' : ''} onClick={() => pilih('md')} title="Teks normal">A</button>
      <button type="button" className={size === 'lg' ? 'active' : ''} onClick={() => pilih('lg')} title="Teks besar">A</button>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

// Pengatur mode terang/gelap. `square`: gaya ikon kotak bergaris (dipakai di
// header Portal mahasiswa mobile, meniru referensi desain) — defaultnya tetap
// tombol ghost lama (dipakai di topbar admin/dosen/lainnya, tidak diubah).
export function ThemeToggle({ square = false }) {
  const [theme, setThemeState] = useState(getTheme);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  }
  const label = theme === 'dark' ? 'Mode terang' : 'Mode gelap';
  if (square) {
    return (
      <button type="button" className="icon-btn-outline" onClick={toggle} title={label} aria-label={label}>
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }
  return (
    <button type="button" className="btn ghost theme-toggle" onClick={toggle} title={label}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

// Status satu tahap relatif terhadap tahap saat ini — 'done' | 'active' | 'upcoming'.
// Dipakai bersama oleh StageBar (bilah horizontal) dan StageListVertical (daftar
// vertikal ringkas, tampilan layar sempit) supaya logikanya selalu konsisten.
export function stageStatus(stages, tahap, i) {
  const idx = stages.indexOf(tahap);
  if (tahap === 'Lulus' || i < idx) return 'done';
  if (i === idx) return 'active';
  return 'upcoming';
}

// Indikator tahap: bilah tersegmen — hijau untuk tahap yang sudah dilewati,
// amber untuk tahap yang sedang berjalan, biru muda untuk yang belum dicapai.
export function StageBar({ program, tahap }) {
  const stages = stagesFor(program);
  const total = Math.max(1, stages.length - 1); // tanpa "Lulus"
  return (
    <div className="stagebar" title={tahap}>
      <div className="stagebar-track">
        {Array.from({ length: total }).map((_, i) => {
          const status = stageStatus(stages, tahap, i);
          return <span key={i} className={'seg' + (status === 'done' ? ' seg-done' : status === 'active' ? ' seg-active' : '')} />;
        })}
      </div>
      <span className="stagebar-label">{tahap}</span>
    </div>
  );
}

// Versi vertikal ringkas dari StageBar untuk layar sempit (mobile) — daftar
// semua tahap dengan titik status per tahap. Sengaja TANPA tanggal per-tahap:
// data itu tidak tersimpan per-tahap saat ini (hanya tahap aktif yang dilacak),
// jadi ini murni tampilan ulang StageBar, bukan fitur baru.
export function StageListVertical({ program, tahap }) {
  const stages = stagesFor(program);
  return (
    <ul className="stage-list" aria-label={`Tahapan saat ini: ${tahap}`}>
      {stages.map((s, i) => (
        <li key={s} className={'stage-list-item stage-' + stageStatus(stages, tahap, i)}>
          <span className="stage-list-dot" aria-hidden="true" />
          <span className="stage-list-label">{s}</span>
        </li>
      ))}
    </ul>
  );
}

// Ikon SVG kecil untuk nav bawah (tampilan mobile) — inline, tanpa dependensi
// pustaka ikon (konsisten dengan pendekatan proyek ini: emoji/glyph polos, no
// icon library). Set minimal, satu per kunci tab yang dipakai App.jsx/Portal.jsx.
const TAB_ICON_PATHS = {
  dashboard: 'M4 12h4v8H4v-8Zm6-8h4v16h-4V4Zm6 4h4v12h-4V8Z',
  mahasiswa: 'M12 3 3 8l9 5 7-3.9V16h2V8L12 3Zm-5 9.2V16c0 2.2 3.3 4 5 4s5-1.8 5-4v-2.8l-5 2.7-5-2.7Z',
  dosen: 'M4 4h16v12H8l-4 4V4Zm3 3v2h10V7H7Zm0 4v2h7v-2H7Z',
  pengajuan: 'M9 2h6v2h3v18H6V4h3V2Zm2 2v1h2V4h-2ZM8 9h8v2H8V9Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z',
  ruang: 'M4 3h16v18H4V3Zm2 2v14h12V5H6Zm2 2h3v3H8V7Zm5 0h3v3h-3V7Zm-5 5h3v3H8v-3Zm5 0h3v3h-3v-3Z',
  akun: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z',
};

export function TabIcon({ tabKey }) {
  const d = TAB_ICON_PATHS[tabKey];
  if (!d) return null;
  return (
    <svg className="tab-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Field({ label, children, full }) {
  return (
    <label className={'field' + (full ? ' field-full' : '')}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={'modal' + (wide ? ' modal-wide' : '')} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// Layar "Memuat…" (menunggu Firebase Auth/Firestore) — dipakai di App.jsx
// sebelum sesi/profil diketahui. Kalau ini tidak kunjung selesai (server
// lambat, atau internet mati sama sekali seperti navigator.onLine === false),
// tampilkan pesan yang jelas + tombol "Coba lagi", bukan spinner selamanya —
// pengguna dulu bingung dikira aplikasi macet padahal cuma koneksi bermasalah.
export function Muat({ children = 'Memuat…' }) {
  const [status, setStatus] = useState(() => (
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'loading'
  ));
  useEffect(() => {
    if (status === 'offline') return;
    const timer = setTimeout(() => setStatus((s) => (s === 'loading' ? 'lambat' : s)), 9000);
    const keOffline = () => setStatus('offline');
    const keOnline = () => setStatus('loading');
    window.addEventListener('offline', keOffline);
    window.addEventListener('online', keOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('offline', keOffline);
      window.removeEventListener('online', keOnline);
    };
  }, [status]);

  if (status === 'loading') {
    return <div className="login-wrap"><div className="login-container"><p className="hint">{children}</p></div></div>;
  }

  return (
    <div className="login-wrap">
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <p className="login-err">
            {status === 'offline'
              ? 'Tidak ada koneksi internet. Periksa jaringan Anda, lalu coba lagi.'
              : 'Koneksi ke server lambat atau gagal. Periksa internet Anda, lalu coba lagi.'}
          </p>
          <button type="button" className="btn btn-primary block" onClick={() => window.location.reload()}>Coba lagi</button>
        </div>
      </div>
    </div>
  );
}

// Kotak unggah berkas drag-&-drop (klik untuk telusuri berkas juga bisa) —
// dipakai di semua tempat unggah berkas mahasiswa/admin agar seragam.
export function FileDropZone({ accept, onFile, busy, label, hint = 'Seret & lepas berkas di sini, atau klik untuk memilih' }) {
  const [dragOver, setDragOver] = useState(false);
  const inputId = useMemo(() => `filedrop-${Math.random().toString(36).slice(2)}`, []);
  function handleFiles(files) {
    const f = files && files[0];
    if (f) onFile(f);
  }
  return (
    <label
      htmlFor={inputId}
      className={'file-drop' + (dragOver ? ' file-drop-over' : '') + (busy ? ' file-drop-busy' : '')}
      onDragOver={(e) => { e.preventDefault(); if (!busy) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!busy) handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={busy}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
      <span className="file-drop-icon" aria-hidden="true">⬆</span>
      <span className="file-drop-label">{busy ? 'Mengunggah…' : label}</span>
      {!busy && <span className="file-drop-hint">{hint}</span>}
    </label>
  );
}

// Pegangan drag di tepi kanan header tabel untuk mengubah lebar kolom (seperti Excel).
export function ColResizeHandle({ onMouseDown }) {
  return <span className="col-resize-handle" onMouseDown={onMouseDown} onClick={(e) => e.stopPropagation()} />;
}

// Tombol "Ekspor" dengan menu kecil (Excel / CSV).
export function ExportMenu({ label = 'Ekspor', onXLSX, onCSV }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="exp-wrap">
      <button className="btn" onClick={() => setOpen((o) => !o)}>{label} ▾</button>
      {open && (
        <>
          <div className="exp-backdrop" onClick={() => setOpen(false)} />
          <div className="exp-menu">
            <button onClick={() => { setOpen(false); onXLSX(); }}>Excel (.xlsx)</button>
            <button onClick={() => { setOpen(false); onCSV(); }}>CSV (.csv)</button>
          </div>
        </>
      )}
    </div>
  );
}

