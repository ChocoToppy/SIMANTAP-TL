import React, { useEffect, useState } from 'react';
import { bolehAksesBerkas, bolehUnduhDokumen, alasanUnduhTerkunci, dokumenPerTahap, eventsFor, formatTanggal, getJadwal, normalizeUrl, stagesFor } from '../utils/helpers.js';
import { generateDocument, getTemplateConfig, prefetchTemplate, warmConverter } from '../utils/documentGenerator.js';
import { FileDropZone, PrintIcon } from './ui.jsx';

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
  const grup = dokumenPerTahap(program, m, konten, { admin: role === 'admin' });
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
                // Dokumen dari tahap lain (adminJugaDiTahap, mis. Penilaian KP di Lulus): tampilan ringkas baca-saja.
                const ringkas = d.stage !== aktif.stage;
                const item = <KpDokumenItem key={d.key} d={d} m={m} jEv={jadwalDok(d)} dosenByKode={dosenByKode} canUpload={canUpload && !ringkas} ringkas={ringkas} role={role} onUpload={onUpload} onDeleteUpload={onDeleteUpload} />;
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

// Satu status per dokumen, supaya pembaca tidak perlu menyimpulkan sendiri dari
// kombinasi tombol & keterangan. Ditampilkan sebagai ikon berwarna (warna sama
// dengan Badge); labelnya jadi tooltip & teks pembaca layar.
function statusDokumen(d, bolehUnggah) {
  if (d.linkInput) {
    if (d.linkDisetujui) return { tone: 'green', label: 'Disetujui', ikon: 'centang' };
    if (d.linkTerkirim) return { tone: 'amber', label: 'Menunggu diperiksa', ikon: 'jam' };
    return d.eligible ? { tone: 'amber', label: 'Belum dikirim', ikon: 'tautan' } : { tone: 'gray', label: 'Belum tersedia', ikon: 'kunci' };
  }
  if (d.upload && d.upload.perluUlang) return { tone: 'amber', label: 'Diminta unggah ulang', ikon: 'unggah' };
  if (d.upload) return { tone: 'green', label: 'Terunggah', ikon: 'centang' };
  if (!d.eligible) return { tone: 'gray', label: 'Belum tersedia', ikon: 'kunci' };
  if (d.docType) return { tone: 'blue', label: 'Siap diunduh', ikon: 'unduh' };
  if (bolehUnggah) return { tone: 'amber', label: 'Belum diunggah', ikon: 'unggah' };
  return null;
}

const IKON_STATUS = {
  centang: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  jam: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></>,
  tautan: <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" /></>,
  kunci: <><rect x="5.5" y="11" width="13" height="9" rx="1" /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></>,
  unduh: <><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" /><path d="M5 19h14" /></>,
  unggah: <><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" /><path d="M5 19h14" /></>,
  kosong: <><path d="M7 3h7l4 4v14H7z" /><path d="M5 5l14 14" /></>,
};

// Ikon kecil di depan berkas terunggah / tautan terkirim.
function IkonBerkas({ jenis }) {
  return (
    <svg className="kp-dok-file-ikon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {jenis === 'tautan' ? IKON_STATUS.tautan : <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></>}
    </svg>
  );
}

function StatusIkon({ tone, label, ikon }) {
  return (
    <span className={`status-ikon badge-${tone}`} title={label} role="img" aria-label={label}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {IKON_STATUS[ikon]}
      </svg>
    </span>
  );
}

// ringkas: salinan baca-saja di tahap lain (adminJugaDiTahap). Yang dibutuhkan
// di sana hanya berkas terunggahnya, jadi tanpa unduh templat dan tanpa aksi.
function KpDokumenItem({ d, m, jEv, dosenByKode, canUpload, ringkas = false, role, onUpload, onDeleteUpload }) {
  const [busy, setBusy] = useState(false);
  const [dlBusy, setDlBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const bolehUnggahDiSini = canUpload && (
    role === 'admin' ? !!d.adminUpload : d.studentUpload !== false
  );
  const config = d.docType ? getTemplateConfig(d.docType, m, dosenByKode, jEv) : null;
  const tanpaTemplate = !!d.docType && d.eligible && !config; // template menyusul
  let status = ringkas
    ? (d.upload ? { tone: 'green', label: 'Terunggah', ikon: 'centang' } : { tone: 'gray', label: 'Belum diunggah (unggah di tab Bimbingan)', ikon: 'unggah' })
    : tanpaTemplate ? { tone: 'gray', label: 'Template belum ada', ikon: 'kosong' } : statusDokumen(d, bolehUnggahDiSini);
  if (role === 'admin' && status && status.ikon === 'kunci' && d.syarat) status = { ...status, label: `${status.label}. ${d.syarat}` };
  // Status di panel admin menggambarkan sisi mahasiswa: "Siap diunduh" berubah jadi
  // gembok kuning saat unduhan mahasiswa dikunci (Perlu perbaikan / perubahan data
  // belum diverifikasi ulang). Admin sendiri tetap bisa mengunduh lewat ikon printer.
  if (role === 'admin' && status && status.ikon === 'unduh' && !bolehUnduhDokumen(m)) {
    const alasan = alasanUnduhTerkunci(m).replace(/^Dikunci: /, '').replace(/\.$/, '');
    status = { tone: 'amber', ikon: 'kunci', label: `Terkunci untuk mahasiswa (${alasan})` };
  }
  // Mahasiswa berstatus "Perlu perbaikan" tidak bisa mengunduh/mengunggah; admin selalu bisa.
  const aksesMhs = role === 'admin' || bolehAksesBerkas(m);
  const bisaUnduh = !ringkas && d.docType && d.eligible && !!config && (role === 'admin' || bolehUnduhDokumen(m));
  const bisaUnggah = bolehUnggahDiSini && d.eligible && aksesMhs;
  const bisaHapus = d.upload && bolehUnggahDiSini && onDeleteUpload;
  const tautan = role !== 'admin' && d.linkEksternal;

  const docx = !!(config && config.docx);
  const unduhIkon = role === 'admin' && bisaUnduh;
  const labelUnduh = docx ? 'Unduh Word' : 'Unduh PDF';

  async function unduh() {
    if (!config) return;
    setDlBusy(true);
    try {
      await generateDocument(config.template, config.filename, config.data, config);
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
        {/* Admin: unduh templat lewat tombol ikon printer (sama dengan cetak surat perpanjangan). */}
        {unduhIkon && (
          <button
            type="button"
            className="icon-btn-outline kp-dok-cetak"
            onClick={unduh}
            disabled={dlBusy}
            aria-label={labelUnduh}
            title={dlBusy ? 'Menyiapkan…' : labelUnduh}
          ><PrintIcon /></button>
        )}
        {status && <StatusIkon {...status} />}
      </div>

      {d.upload && (
        <a className="kp-dok-file" href={d.upload.url || d.upload.dataUrl} target="_blank" rel="noreferrer" title={d.upload.fileName}>
          <IkonBerkas jenis="file" />
          <span className="kp-dok-file-teks">
            <span className="kp-dok-file-nama">{d.upload.fileName}</span>
            {d.upload.uploadedAt && <span className="kp-dok-file-tgl">{formatTanggal(d.upload.uploadedAt)}</span>}
          </span>
        </a>
      )}
      {d.linkTerkirim && (
        <a className="kp-dok-file" href={normalizeUrl(d.linkTerkirim)} target="_blank" rel="noreferrer" title={d.linkTerkirim}>
          <IkonBerkas jenis="tautan" />
          <span className="kp-dok-file-teks">
            <span className="kp-dok-file-nama">{d.linkTerkirim}</span>
          </span>
        </a>
      )}
      {/* Admin: syarat cukup di tooltip ikon gembok, tidak sebagai kalimat. */}
      {!d.eligible && !d.upload && !d.linkTerkirim && d.syarat && role !== 'admin' && <div className="hint">{d.syarat}</div>}
      {/* Catatan dokumen ditulis untuk mahasiswa ("Anda …"), jadi tidak tampil untuk admin. */}
      {d.catatan && role !== 'admin' && <div className="hint">{d.catatan}</div>}
      {d.linkButton && role !== 'admin' && !d.linkEksternal && <div className="hint">Tautan belum tersedia.</div>}
      {/* linkLabel non-tombol berupa kalimat, jadi tampil sebagai tautan teks. */}
      {tautan && !d.linkButton && (
        <div className="hint"><a href={d.linkEksternal} target="_blank" rel="noreferrer">{d.linkLabel || d.linkEksternal}</a></div>
      )}

      {((bisaUnduh && !unduhIkon) || bisaUnggah || bisaHapus || (tautan && d.linkButton)) && !showDrop && (
        <div className="kp-dok-aksi">
          {bisaUnduh && !unduhIkon && (
            <button type="button" className={'btn' + (d.upload ? '' : ' btn-primary')} onClick={unduh} disabled={dlBusy}>
              {dlBusy ? (docx ? 'Menyiapkan…' : 'Menyiapkan PDF…') : (docx ? 'Unduh Word' : 'Unduh PDF')}
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
