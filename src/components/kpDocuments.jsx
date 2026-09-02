import React, { useEffect, useState } from 'react';
import { kpDokumenPerTahap, formatTanggal, getJadwal } from '../utils/helpers.js';
import { generateDocument, getTemplateConfig, prefetchTemplate, warmConverter } from '../utils/documentGenerator.js';
import { FileDropZone } from './ui.jsx';

// ===================== kpDocuments.jsx =====================
// Panel dokumen KP per tahap — dipakai bersama oleh Portal mahasiswa (dengan
// unggah berkas tanda tangan/nilai) dan panel admin (lihat semua, tanpa unggah).

export function KpDocumentPanel({ m, dosenByKode = {}, konten = {}, canUpload = false, role = 'student', onUpload, onDeleteUpload, collapsible = true, title = 'Dokumen KP' }) {
  const [expanded, setExpanded] = useState(!collapsible);
  const grup = kpDokumenPerTahap(m, konten);
  const [stageTab, setStageTab] = useState(grup[0] ? grup[0].stage : null);

  // Warm up the .docx templates and the PDF converter as soon as the panel is
  // shown, so the actual click on "Unduh" only pays for a fresh render + a
  // conversion against an already-warm converter instead of a cold start.
  // {tgl_cetak} itself is always computed at click time (never cached) so it
  // stays a true real-time print timestamp.
  useEffect(() => {
    let anyEligible = false;
    grup.forEach((g) => {
      g.dokumen.forEach((d) => {
        if (!d.docType || !d.eligible) return;
        anyEligible = true;
        const config = getTemplateConfig(d.docType, m, dosenByKode, getJadwal(m, 'Seminar KP'));
        if (config) prefetchTemplate(config.template);
      });
    });
    if (anyEligible) warmConverter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, dosenByKode]);

  if (grup.length === 0) return null;
  const aktif = grup.find((g) => g.stage === stageTab) || grup[0];

  return (
    <div className="kp-dok-panel" style={{ marginTop: 8 }}>
      {collapsible ? (
        <button
          type="button"
          className={'kp-dok-toggle' + (expanded ? ' expanded' : '')}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="kp-dok-chevron" aria-hidden="true">▸</span>
          {title}
        </button>
      ) : (
        <div className="kp-dok-heading">{title}</div>
      )}
      {expanded && (
        <div className="kp-dok-body">
          <select
            className="kp-dok-tabs-mobile"
            value={aktif.stage}
            onChange={(e) => setStageTab(e.target.value)}
            aria-label="Pilih tahapan dokumen"
          >
            {grup.map(({ stage }) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <div className="tabs kp-dok-tabs-desktop" style={{ marginBottom: 12 }}>
            {grup.map(({ stage }) => (
              <button key={stage} type="button" className={'tab' + (aktif.stage === stage ? ' active' : '')} onClick={() => setStageTab(stage)}>{stage}</button>
            ))}
          </div>
          <div className="kp-dok-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aktif.dokumen.map((d) => (
              <KpDokumenItem key={d.key} d={d} m={m} dosenByKode={dosenByKode} canUpload={canUpload} role={role} onUpload={onUpload} onDeleteUpload={onDeleteUpload} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpDokumenItem({ d, m, dosenByKode, canUpload, role, onUpload, onDeleteUpload }) {
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const bolehUnggahDiSini = canUpload && (
    role === 'admin' ? !!d.adminUpload : d.studentUpload !== false
  );

  async function unduh() {
    const config = getTemplateConfig(d.docType, m, dosenByKode, getJadwal(m, 'Seminar KP'));
    if (!config) return;
    setDlBusy(true);
    try {
      await generateDocument(config.template, config.filename, config.data);
    } finally {
      setDlBusy(false);
    }
  }

  async function pilihBerkas(file) {
    if (!file || !onUpload) return;
    setErr('');
    setBusy(true);
    try {
      await onUpload(d.key, file);
      setShowDrop(false); // ciutkan lagi setelah berhasil, supaya kotak unggah tidak terus terbuka
    } catch (ex) {
      setErr(ex.message || 'Gagal mengunggah berkas.');
    } finally {
      setBusy(false);
    }
  }

  function hapusBerkas() {
    if (!onDeleteUpload) return;
    if (!window.confirm(`Hapus berkas "${d.upload.fileName}"? Berkas akan dihapus permanen dari server.`)) return;
    onDeleteUpload(d.key);
  }

  return (
    <div className="kp-dok-item" style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <span>{d.label}</span>
        {d.docType && (d.eligible ? (
          <button type="button" className="btn btn-primary" onClick={unduh} disabled={dlBusy}>{dlBusy ? 'Menyiapkan PDF…' : 'Unduh (PDF)'}</button>
        ) : (
          <span className="hint">Belum tersedia</span>
        ))}
      </div>
      {!d.eligible && <div className="hint" style={{ marginTop: 2 }}>{d.syarat}</div>}

      {d.linkEksternal && role !== 'admin' && (
      <div className="hint" style={{ marginTop: 4 }}>
       <a href={d.linkEksternal} target="_blank" rel="noreferrer">{d.linkLabel || d.linkEksternal}</a>
        </div>
      )}

      {d.upload ? (
        <div className="callout callout-green" style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span>
            Berkas terunggah: <a href={d.upload.url || d.upload.dataUrl} target="_blank" rel="noreferrer">{d.upload.fileName}</a>
            {d.upload.uploadedAt ? ` · ${formatTanggal(d.upload.uploadedAt)}` : ''}
          </span>
          {bolehUnggahDiSini && onDeleteUpload && (
            <button type="button" className="link-btn danger" onClick={hapusBerkas}>Hapus</button>
          )}
        </div>
      ) : (
        bolehUnggahDiSini && d.eligible && <div className="hint" style={{ marginTop: 4 }}>Belum ada berkas yang ditandatangani/dinilai diunggah.</div>
      )}

      {bolehUnggahDiSini && d.eligible && (
        <div style={{ marginTop: 6 }}>
          {showDrop ? (
            <>
              <FileDropZone accept=".pdf" busy={busy} onFile={pilihBerkas} label={d.upload ? 'Ganti berkas' : 'Unggah berkas ditandatangani/dinilai'} />
              {!busy && <button type="button" className="btn ghost" style={{ marginTop: 4 }} onClick={() => setShowDrop(false)}>Batal</button>}
              {err && <div className="login-err" style={{ marginTop: 4 }}>{err}</div>}
            </>
          ) : (
            <button type="button" className="btn" onClick={() => setShowDrop(true)}>{d.upload ? 'Ganti berkas' : 'Unggah berkas'}</button>
          )}
        </div>
      )}
    </div>
  );
}