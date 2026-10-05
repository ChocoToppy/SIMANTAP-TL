import React from 'react';
import { normalizeUrl, formatTanggal, dokTA } from '../../utils/helpers.js';
import { cetakSuratPDF } from '../../utils/exportUtils.js';
import { FileDropZone } from '../../components/ui.jsx';

// Panel perpanjangan TA di sisi modal admin. Beda dari KP/Magang: suratnya
// belum digenerate dari template .docx, admin mencetak lalu mengunggah PDF-nya
// (alur yang sama dengan tata letak generik).
export function PerpanjanganTA({ m, dosenByKode, ppBusy, ppErr, berikanSuratPerpanjangan }) {
  const pp = m.perpanjangan || {};
  return (
    <div className="sched">
      <div className="sched-title">Perpanjangan Tugas Akhir</div>
      {pp.diminta
        ? <div className="verif-info"><div>Alasan mahasiswa: <strong>{pp.alasan || '—'}</strong>{pp.tanggalDiminta ? ` · ${formatTanggal(pp.tanggalDiminta)}` : ''}</div></div>
        : <div className="hint">Belum ada pengajuan perpanjangan dari mahasiswa.</div>}
      {pp.suratAdmin
        ? <div className="callout callout-green">Surat diberikan ke mahasiswa: <a href={pp.suratAdmin.url || pp.suratAdmin.dataUrl} target="_blank" rel="noreferrer">{pp.suratAdmin.fileName}</a></div>
        : <div className="hint">Surat perpanjangan belum diberikan ke mahasiswa.</div>}
      <div style={{ marginTop: 6 }}>
        <FileDropZone accept=".pdf" busy={ppBusy} onFile={berikanSuratPerpanjangan} label={pp.suratAdmin ? 'Ganti berkas & berikan ulang' : 'Berikan surat ke mahasiswa'} />
        {ppErr && <div className="login-err" style={{ marginTop: 4 }}>{ppErr}</div>}
      </div>
      {(pp.suratFinal || pp.suratFinalLink)
        ? <div className="callout callout-green">Surat final (ditandatangani) dari mahasiswa: <a href={pp.suratFinal ? (pp.suratFinal.url || pp.suratFinal.dataUrl) : normalizeUrl(pp.suratFinalLink)} target="_blank" rel="noreferrer">{pp.suratFinal ? pp.suratFinal.fileName : 'buka'}</a></div>
        : <div className="hint">Surat final dari mahasiswa belum diunggah.</div>}
      <div className="notif-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn" onClick={() => cetakSuratPDF(`Perpanjangan TA - ${m.nama}`, dokTA('perpanjangan', m, dosenByKode))}>Cetak surat perpanjangan (PDF)</button>
      </div>
    </div>
  );
}
