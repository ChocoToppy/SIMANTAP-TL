import React, { useState } from 'react';
import { kpDokumenPerTahap, formatTanggal, getJadwal } from '../utils/helpers.js';
import { generateDocument, getTemplateConfig } from '../utils/documentGenerator.js';
import { FileDropZone } from './ui.jsx';

// ===================== kpDocuments.jsx =====================
// Panel dokumen KP per tahap — dipakai bersama oleh Portal mahasiswa (dengan
// unggah berkas tanda tangan/nilai) dan panel admin (lihat semua, tanpa unggah).

export function KpDocumentPanel({ m, dosenByKode = {}, canUpload = false, role = 'student', onUpload, collapsible = true, title = 'Dokumen KP' }) {
  const [expanded, setExpanded] = useState(!collapsible);
  const grup = kpDokumenPerTahap(m);
  const [stageTab, setStageTab] = useState(grup[0] ? grup[0].stage : null);
  if (grup.length === 0) return null;
  const aktif = grup.find((g) => g.stage === stageTab) || grup[0];

  return (
    <div className="kp-dok-panel" style={{ marginTop: 8 }}>
      {collapsible ? (
        <button type="button" className="btn ghost" onClick={() => setExpanded((v) => !v)} style={{ width: '100%', textAlign: 'left' }}>
          {expanded ? '▾' : '▸'} {title}
        </button>
      ) : (
        <div className="sched-title">{title}</div>
      )}
      {expanded && (
        <div style={{ marginTop: 8 }}>
          <div className="tabs" style={{ marginBottom: 12 }}>
            {grup.map(({ stage }) => (
              <button key={stage} type="button" className={'tab' + (aktif.stage === stage ? ' active' : '')} onClick={() => setStageTab(stage)}>{stage}</button>
            ))}
          </div>
          <div className="kp-dok-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aktif.dokumen.map((d) => (
              <KpDokumenItem key={d.key} d={d} m={m} dosenByKode={dosenByKode} canUpload={canUpload} role={role} onUpload={onUpload} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpDokumenItem({ d, m, dosenByKode, canUpload, role, onUpload }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bolehUnggahDiSini = canUpload && (
    role === 'admin' ? !!d.adminUpload : d.studentUpload !== false
  );

  function unduh() {
    const config = getTemplateConfig(d.docType, m, dosenByKode, getJadwal(m, 'Seminar KP'));
    if (!config) return;
    generateDocument(config.template, config.filename, config.data);
  }

  async function pilihBerkas(file) {
    if (!file || !onUpload) return;
    setErr('');
    setBusy(true);
    try {
      await onUpload(d.key, file);
    } catch (ex) {
      setErr(ex.message || 'Gagal mengunggah berkas.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kp-dok-item" style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <span>{d.label}</span>
        {d.docType && (d.eligible ? (
          <button type="button" className="btn btn-primary" onClick={unduh}>Unduh (PDF)</button>
        ) : (
          <span className="hint">Belum tersedia</span>
        ))}
      </div>
      {!d.eligible && <div className="hint" style={{ marginTop: 2 }}>{d.syarat}</div>}

      {d.upload ? (
        <div className="callout callout-green" style={{ marginTop: 6 }}>
          Berkas terunggah: <a href={d.upload.url || d.upload.dataUrl} target="_blank" rel="noreferrer">{d.upload.fileName}</a>
          {d.upload.uploadedAt ? ` · ${formatTanggal(d.upload.uploadedAt)}` : ''}
        </div>
      ) : (
        bolehUnggahDiSini && d.eligible && <div className="hint" style={{ marginTop: 4 }}>Belum ada berkas yang ditandatangani/dinilai diunggah.</div>
      )}

      {bolehUnggahDiSini && d.eligible && (
        <div style={{ marginTop: 6 }}>
          <FileDropZone accept=".pdf" busy={busy} onFile={pilihBerkas} label={d.upload ? 'Ganti berkas' : 'Unggah berkas ditandatangani/dinilai'} />
          {err && <div className="login-err" style={{ marginTop: 4 }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
