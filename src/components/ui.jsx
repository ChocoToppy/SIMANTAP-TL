import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';
import { getTextSize, setTextSize } from '../utils/textSize.js';
import { getTheme, setTheme } from '../utils/theme.js';

// ===================== ui.js =====================
// ui.js — komponen kecil yang dipakai berulang

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
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

// Pengatur mode terang/gelap.
export function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  }
  return (
    <button type="button" className="btn ghost theme-toggle" onClick={toggle} title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

// Indikator tahap: bilah tersegmen — hijau untuk tahap yang sudah dilewati,
// amber untuk tahap yang sedang berjalan, biru muda untuk yang belum dicapai.
export function StageBar({ program, tahap }) {
  const stages = stagesFor(program);
  const total = Math.max(1, stages.length - 1); // tanpa "Lulus"
  const idx = stages.indexOf(tahap);
  const lulus = tahap === 'Lulus';
  return (
    <div className="stagebar" title={tahap}>
      <div className="stagebar-track">
        {Array.from({ length: total }).map((_, i) => {
          const cls = lulus || i < idx ? 'seg seg-done' : i === idx ? 'seg seg-active' : 'seg';
          return <span key={i} className={cls} />;
        })}
      </div>
      <span className="stagebar-label">{tahap}</span>
    </div>
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

