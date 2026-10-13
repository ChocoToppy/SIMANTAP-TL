import React, { useEffect, useState } from 'react';
import { dokumenPerTahap, eventsFor, formatTanggal, getJadwal, normalizeUrl, stagesFor } from '../utils/helpers.js';
import { generateDocument, getTemplateConfig, prefetchTemplate, warmConverter } from '../utils/documentGenerator.js';
import { Badge, FileDropZone } from './ui.jsx';

// ===================== kpDocuments.jsx =====================
// Panel dokumen per tahap (KP/Magang/TA) — dipakai bersama oleh Portal
// mahasiswa (dengan unggah berkas tanda tangan/nilai), panel admin (lihat
// semua, unggah khusus admin) dan pratinjau editor Konten di Pengaturan.

// Tahap dokumen yang dibuka pertama kali: tahap mahasiswa saat ini kalau ada
// dokumennya, kalau tidak tahap berdokumen terakhir sebelum itu, kalau tidak
// ada juga (mis. masih Pendaftaran tapi dokumennya baru mulai di Bimbingan)
// tahap berdokumen pertama.
function tahapAwal(grup, program, tahap) {
  if (grup.length === 0) return null;
  const urutan = stagesFor(program);
  const idx = tahap === 'Lulus' ? urutan.length : urutan.indexOf(tahap);
  const sebelum = grup.filter((g) => urutan.indexOf(g.stage) <= idx);
  return (sebelum.length ? sebelum[sebelum.length - 1] : grup[0]).stage;
}

export function KpDocumentPanel({ m, program = 'KP', dosenByKode = {}, konten = {}, canUpload = false, role = 'student', onUpload, onDeleteUpload, collapsible = true, title = 'Dokumen Kerja Praktek', activeStage, pratinjau }) {
  const [expanded, setExpanded] = useState(!collapsible);
  const grup = dokumenPerTahap(program, m, konten);
  // Dokumen yang butuh jadwal (mis. BA Expo) merujuk `d.event`; kalau tidak
  // diisi, pakai kegiatan utama program (Magang cuma punya satu, TA tiga).
  const jadwalDok = (d) => getJadwal(m, d.event || eventsFor(program)[0]);
  const [stageTabInternal, setStageTabInternal] = useState(() => tahapAwal(grup, program, m.tahap));
  // Saat activeStage diberikan (mis. modal admin KP), panel ini mengikuti tab
  // tahap yang sama dengan panel utama — tidak punya tab sendiri lagi.
  const terkontrol = activeStage != null;
  const stageTab = terkontrol ? activeStage : stageTabInternal;
  const setStageTab = terkontrol ? () => {} : setStageTabInternal;

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
        const config = getTemplateConfig(d.docType, m, dosenByKode, jadwalDok(d));
        if (config) prefetchTemplate(config.template);
      });
    });
    if (anyEligible) warmConverter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, dosenByKode]);

  if (grup.length === 0) return null;
  const aktif = grup.find((g) => g.stage === stageTab) || (terkontrol ? null : grup[0]);

  return (
    <div className="kp-dok-panel">
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
          {!terkontrol && grup.length > 1 && (
            <>
              <div className="kp-dok-pills" role="tablist" aria-label="Tahapan dokumen">
                {grup.map(({ stage }) => (
                  <button
                    key={stage} type="button" role="tab" aria-selected={aktif.stage === stage}
                    className={'kp-dok-pill' + (aktif.stage === stage ? ' active' : '')}
                    onClick={() => setStageTab(stage)}
                  >
                    {stage}
                    {stage === m.tahap && <span className="kp-dok-pill-now">sekarang</span>}
                  </button>
                ))}
              </div>
              <div className="tabs kp-dok-tabs-desktop" style={{ marginBottom: 12 }}>
                {grup.map(({ stage }) => (
                  <button key={stage} type="button" className={'tab' + (aktif.stage === stage ? ' active' : '')} onClick={() => setStageTab(stage)}>{stage}</button>
                ))}
              </div>
            </>
          )}
          {aktif ? (
            <div className="kp-dok-group">
              {aktif.dokumen.map((d) => {
                const item = <KpDokumenItem key={d.key} d={d} m={m} jEv={jadwalDok(d)} dosenByKode={dosenByKode} canUpload={canUpload} role={role} onUpload={onUpload} onDeleteUpload={onDeleteUpload} />;
                if (!pratinjau) return item;
                // Mode pratinjau (editor Pengaturan → Konten): tiap dokumen bisa dipilih untuk diedit.
                return (
                  <div key={d.key} className={'ff-slot ff-slot-rapat' + (pratinjau.terpilih === d.key ? ' ff-slot-on' : '')}>
                    {item}
                    <button type="button" className="ff-slot-hit" onClick={() => pratinjau.onPilih(d.key)} aria-label={`Ubah dokumen ${d.label}`} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hint">Tidak ada dokumen pada tahap ini.</div>
          )}
        </div>
      )}
    </div>
  );
}

// Satu label status per dokumen, supaya mahasiswa tidak perlu menyimpulkan
// sendiri dari kombinasi tombol & keterangan.
function statusDokumen(d, bolehUnggah) {
  if (d.linkInput) {
    if (d.linkTerkirim) return { tone: 'green', label: 'Terkirim' };
    return d.eligible ? { tone: 'amber', label: 'Belum dikirim' } : { tone: 'gray', label: 'Belum tersedia' };
  }
  if (d.upload) return { tone: 'green', label: 'Terunggah' };
  if (!d.eligible) return { tone: 'gray', label: 'Belum tersedia' };
  if (d.docType) return { tone: 'blue', label: 'Siap diunduh' };
  if (bolehUnggah) return { tone: 'amber', label: 'Belum diunggah' };
  return null;
}

function KpDokumenItem({ d, m, jEv, dosenByKode, canUpload, role, onUpload, onDeleteUpload }) {
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const bolehUnggahDiSini = canUpload && (
    role === 'admin' ? !!d.adminUpload : d.studentUpload !== false
  );
  const status = statusDokumen(d, bolehUnggahDiSini);
  const bisaUnduh = d.docType && d.eligible;
  const bisaUnggah = bolehUnggahDiSini && d.eligible;
  const bisaHapus = d.upload && bolehUnggahDiSini && onDeleteUpload;
  const tautan = role !== 'admin' && d.linkEksternal;

  async function unduh() {
    const config = getTemplateConfig(d.docType, m, dosenByKode, jEv);
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
    if (!window.confirm(`Hapus berkas "${d.upload.fileName}"? Berkas akan dihapus permanen dari server.`)) return;
    onDeleteUpload(d.key);
  }

  return (
    <div className="kp-dok-item">
      <div className="kp-dok-item-head">
        <span className="kp-dok-item-nama">{d.label}</span>
        {status && <Badge tone={status.tone}>{status.label}</Badge>}
      </div>

      {d.upload && (
        <div className="kp-dok-berkas">
          <a href={d.upload.url || d.upload.dataUrl} target="_blank" rel="noreferrer">{d.upload.fileName}</a>
          {d.upload.uploadedAt ? <span className="kp-dok-tgl"> · {formatTanggal(d.upload.uploadedAt)}</span> : null}
        </div>
      )}
      {d.linkTerkirim && (
        <div className="kp-dok-berkas" style={{ overflowWrap: 'anywhere' }}>
          <a href={normalizeUrl(d.linkTerkirim)} target="_blank" rel="noreferrer">{d.linkTerkirim}</a>
        </div>
      )}
      {!d.eligible && !d.upload && !d.linkTerkirim && d.syarat && <div className="hint">{d.syarat}</div>}
      {d.catatan && <div className="hint">{d.catatan}</div>}
      {d.linkButton && role !== 'admin' && !d.linkEksternal && <div className="hint">Tautan belum tersedia.</div>}
      {/* linkLabel non-tombol berupa kalimat, jadi tampil sebagai tautan teks. */}
      {tautan && !d.linkButton && (
        <div className="hint"><a href={d.linkEksternal} target="_blank" rel="noreferrer">{d.linkLabel || d.linkEksternal}</a></div>
      )}

      {(bisaUnduh || bisaUnggah || bisaHapus || (tautan && d.linkButton)) && !showDrop && (
        <div className="kp-dok-aksi">
          {bisaUnduh && (
            <button type="button" className={'btn' + (d.upload ? '' : ' btn-primary')} onClick={unduh} disabled={dlBusy}>
              {dlBusy ? 'Menyiapkan PDF…' : 'Unduh PDF'}
            </button>
          )}
          {tautan && d.linkButton && (
            <a className="btn btn-primary" href={d.linkEksternal} target="_blank" rel="noreferrer">{d.linkLabel || 'Buka tautan'}</a>
          )}
          {bisaUnggah && (
            <button type="button" className={'btn' + (!d.upload && !bisaUnduh ? ' btn-primary' : '')} onClick={() => setShowDrop(true)}>
              {d.upload ? 'Ganti berkas' : 'Unggah berkas'}
            </button>
          )}
          {bisaHapus && <button type="button" className="link-btn danger kp-dok-hapus" onClick={hapusBerkas}>Hapus</button>}
        </div>
      )}

      {showDrop && (
        <div className="kp-dok-drop">
          <FileDropZone accept=".pdf" busy={busy} onFile={pilihBerkas} label={d.upload ? 'Ganti berkas' : 'Unggah berkas ditandatangani/dinilai'} />
          {!busy && <button type="button" className="btn ghost" onClick={() => { setShowDrop(false); setErr(''); }}>Batal</button>}
          {err && <div className="login-err">{err}</div>}
        </div>
      )}
    </div>
  );
}
