import React, { useState } from 'react';
import { todayISO, catatAktivitas, programOf, programLabel } from '../../utils/helpers.js';
import { generateDocument, getTemplateConfig } from '../../utils/documentGenerator.js';
import { readFileForUpload } from '../../utils/fileUpload.js';
import { Field, FileDropZone } from '../../components/ui.jsx';

export function FormPerpanjangan({ awal, allDosen = [], mode, onCancel, onSave }) {
  const pp = awal.perpanjangan || {};
  const dosenByKode = Object.fromEntries(allDosen.map((d) => [d.kode, d]));
  const [alasan, setAlasan] = useState(pp.alasan || '');
  const [upload, setUpload] = useState(pp.suratFinal || null);
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [err, setErr] = useState('');
  const minta = mode === 'minta';
  async function unduhPerpanjanganKP() {
    const config = getTemplateConfig('Perpanjangan KP', awal, dosenByKode, {});
    if (!config) return;
    setDlBusy(true);
    try {
      await generateDocument(config.template, config.filename, config.data);
    } finally {
      setDlBusy(false);
    }
  }
  async function pilihBerkas(f) {
    setErr('');
    setBusy(true);
    try {
      const hasil = await readFileForUpload(f, `${awal.id}/perpanjangan-final`);
      setUpload(hasil);
    } catch (ex) {
      setErr(ex.message || 'Gagal mengunggah berkas.');
    } finally {
      setBusy(false);
    }
  }
  function submit() {
    if (minta) {
      const rec = { ...awal, perpanjangan: { ...pp, diminta: true, alasan, tanggalDiminta: todayISO() } };
      onSave(catatAktivitas(rec, 'perpanjanganMinta'));
    } else {
      if (!upload) { setErr('Unggah berkas surat final terlebih dahulu.'); return; }
      const ppNext = { ...pp, suratFinal: upload };
      delete ppNext.suratFinalLink;
      const rec = { ...awal, perpanjangan: ppNext };
      onSave(catatAktivitas(rec, 'perpanjanganFinal'));
    }
  }
  return (
    <div className="portal-form card">
      <h2 className="page-title">{minta ? `Ajukan perpanjangan ${programLabel(programOf(awal))}` : 'Unggah surat perpanjangan final'}</h2>
      <div className="form-grid">
        {minta ? (
          <Field label="Alasan perpanjangan" full><textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Jelaskan alasan & rencana penyelesaian" /></Field>
        ) : (
          <>
            {programOf(awal) === 'KP' && pp.suratAdminTersedia && (
              <div className="callout field-full">
                Surat dari admin sudah tersedia.{' '}
                <button type="button" className="btn" onClick={unduhPerpanjanganKP} disabled={dlBusy}>{dlBusy ? 'Menyiapkan PDF…' : 'Unduh surat perpanjangan KP (PDF)'}</button>{' '}
                Unduh, tanda tangani, lalu unggah berkasnya di bawah.
              </div>
            )}
            {pp.suratAdmin && <div className="callout field-full">Surat dari admin: <a href={pp.suratAdmin.url || pp.suratAdmin.dataUrl} target="_blank" rel="noreferrer">{pp.suratAdmin.fileName}</a>. Unduh, tanda tangani, lalu unggah berkasnya di bawah.</div>}
            <Field label="Berkas surat perpanjangan yang sudah ditandatangani" full>
              <FileDropZone accept=".pdf" busy={busy} onFile={pilihBerkas} label={upload ? 'Ganti berkas' : 'Unggah berkas'} />
              {upload && <div className="hint" style={{ marginTop: 4 }}>Berkas terpilih: {upload.fileName}</div>}
            </Field>
          </>
        )}
      </div>
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <button className="btn" onClick={onCancel}>Batal</button>
        <button className="btn btn-primary" onClick={submit}>{minta ? 'Ajukan' : 'Simpan'}</button>
      </div>
    </div>
  );
}
