import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';

// ===================== ui.js =====================
// ui.js — komponen kecil yang dipakai berulang

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// Indikator tahap: segmen terisi sampai tahap saat ini (warna inline agar tahan
// terhadap perubahan CSS). Hijau bila sudah Lulus, indigo bila masih berjalan.
export function StageBar({ program, tahap }) {
  const stages = stagesFor(program);
  const total = Math.max(1, stages.length - 1); // tanpa "Lulus"
  const idx = stages.indexOf(tahap);
  const lulus = tahap === 'Lulus';
  const done = lulus ? total : (idx < 0 ? 0 : idx);
  const onColor = lulus ? 'var(--green)' : 'var(--accent)';
  return (
    <div className="stagebar" title={tahap}>
      <div className="stagebar-track">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="seg"
            style={{ flex: 1, height: 6, borderRadius: 3, background: i < done ? onColor : 'var(--border-strong)' }}
          />
        ))}
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

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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

