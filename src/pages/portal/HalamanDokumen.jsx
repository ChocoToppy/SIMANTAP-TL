import React, { useEffect, useMemo, useState } from 'react';
import { bolehAksesBerkas, bolehUnduhDokumen, alasanUnduhTerkunci, pernahDiverifikasi, dokumenPerTahap, eventsFor, formatTanggal, getJadwal, normalizeUrl, programDisplayLabel, programOf, stagesFor } from '../../utils/helpers.js';
import { generateDocument, getTemplateConfig, prefetchTemplate, warmConverter } from '../../utils/documentGenerator.js';
import { PetunjukPembukuan } from '../../components/PetunjukPembukuan.jsx';
import { IkonKembali, IkonKirim, IkonLanjut, IkonPdf, IkonSebelum, IkonSelesai, IkonTautan, IkonTerkunci, IkonUnggah } from '../../components/DokIkon.jsx';
import { PerubahanDataNotice } from './PerubahanDataNotice.jsx';

// ===================== HalamanDokumen.jsx =====================
// Halaman dokumen satu pengajuan (Portal mahasiswa), dibuka dari baris
// "Dokumen" di kartu. Per tahap ada dua bagian:
//  1. Template terisi otomatis: dokumen yang dibuat aplikasi (unduh PDF) dan
//     tautan luar.
//  2. Unggah berkas: satu slot per dokumen yang bisa/sudah diunggah, berisi
//     berkas terunggah (ganti/hapus) atau kotak unggah.
// Panel admin & pratinjau Pengaturan tetap memakai KpDocumentPanel.

// Tahap yang dibuka pertama: tahap mahasiswa saat ini kalau ada dokumennya,
// kalau tidak tahap berdokumen terakhir sebelum itu, kalau tidak juga yang pertama.
function tahapAwal(grup, program, tahap) {
  if (grup.length === 0) return null;
  const urutan = stagesFor(program);
  const idx = tahap === 'Lulus' ? urutan.length : urutan.indexOf(tahap);
  const sebelum = grup.filter((g) => urutan.indexOf(g.stage) <= idx);
  return (sebelum.length ? sebelum[sebelum.length - 1] : grup[0]).stage;
}

export function HalamanDokumen({ m, allDosen = [], konten = {}, onBack, onUpload, onDeleteUpload, onKirimTautan }) {
  const program = programOf(m);
  const dosenByKode = useMemo(() => Object.fromEntries(allDosen.map((d) => [d.kode, d])), [allDosen]);
  const grup = dokumenPerTahap(program, m, konten);
  const [tahap, setTahap] = useState(() => tahapAwal(grup, program, m.tahap));
  const aktif = grup.find((g) => g.stage === tahap) || grup[0];
  const jadwalDok = (d) => getJadwal(m, d.event || eventsFor(program)[0]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Siapkan template & konverter PDF lebih awal supaya klik "Unduh" tidak
  // menunggu cold start (sama seperti KpDocumentPanel).
  useEffect(() => {
    let ada = false;
    grup.forEach((g) => g.dokumen.forEach((d) => {
      if (!d.docType || !d.eligible) return;
      ada = true;
      const config = getTemplateConfig(d.docType, m, dosenByKode, jadwalDok(d));
      if (config) prefetchTemplate(config.template);
    }));
    if (ada) warmConverter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, dosenByKode]);

  const unduhan = aktif ? aktif.dokumen.filter((d) => d.docType || d.linkEksternal || d.linkButton) : [];
  const unggahan = aktif ? aktif.dokumen.filter((d) => d.upload || d.studentUpload !== false) : [];
  const tautanMhs = aktif ? aktif.dokumen.filter((d) => d.linkInput) : [];
  const terkunci = !bolehAksesBerkas(m);

  return (
    <div className="dok-page">
      <div className="dok-page-head">
        <button type="button" className="dok-back" onClick={onBack} aria-label="Kembali ke daftar pengajuan"><IkonKembali /></button>
        <h2 className="dok-page-title">Dokumen</h2>
        <span className="dok-page-prog">{programDisplayLabel(m)}</span>
      </div>

      <PerubahanDataNotice m={m} style={{ marginBottom: 16 }} />
      {terkunci && pernahDiverifikasi(m) && (
        <div className="callout callout-red" style={{ marginBottom: 16 }}>
          <strong>Perlu perbaikan.</strong> Unduh dan unggah dikunci sampai data dibetulkan lewat Edit pendaftaran.
        </div>
      )}

      {grup.length === 0 ? (
        <p className="hint dok-kosong">Program ini belum punya dokumen.</p>
      ) : (
        <>
          <div className="dok-tabs" role="tablist" aria-label="Tahapan dokumen">
            {grup.map(({ stage }) => (
              <button
                key={stage} type="button" role="tab" aria-selected={aktif.stage === stage}
                className={'dok-tab' + (aktif.stage === stage ? ' active' : '')}
                onClick={() => setTahap(stage)}
              >
                {stage}
                {stage === m.tahap && <span className="dok-tab-now">sekarang</span>}
              </button>
            ))}
          </div>
          <PemilihTahap grup={grup} aktif={aktif.stage} tahapMhs={m.tahap} onPilih={setTahap} />

          {unduhan.length > 0 && (
            <section className="dok-seksi">
              <h3 className="dok-eyebrow">Template terisi otomatis</h3>
              <ul className="dok-list">
                {unduhan.map((d) => <BarisUnduh key={d.key} d={d} m={m} jEv={jadwalDok(d)} dosenByKode={dosenByKode} />)}
              </ul>
            </section>
          )}

          {unggahan.length > 0 && (
            <section className="dok-seksi">
              <h3 className="dok-eyebrow">Unggah berkas</h3>
              <p className="hint dok-seksi-hint">Unggah versi yang sudah ditandatangani dalam format PDF.</p>
              <div className="dok-slots">
                {unggahan.map((d) => <SlotUnggah key={d.key} d={d} terkunci={terkunci} onUpload={onUpload} onDeleteUpload={onDeleteUpload} />)}
              </div>
            </section>
          )}

          {tautanMhs.length > 0 && (
            <section className="dok-seksi">
              <h3 className="dok-eyebrow">Kirim tautan</h3>
              <div className="dok-slots">
                {tautanMhs.map((d) => <SlotTautan key={d.key} d={d} terkunci={terkunci} onKirim={(url) => onKirimTautan(d.linkField, url)} />)}
              </div>
            </section>
          )}

          {unduhan.length === 0 && unggahan.length === 0 && tautanMhs.length === 0 && <p className="hint dok-kosong">Tidak ada dokumen pada tahap ini.</p>}
        </>
      )}
    </div>
  );
}

// Pengganti tab tahap di layar sempit: satu tahap tampil penuh, pindah lewat
// panah, jadi tidak perlu menggeser deretan tab ke samping. Berhenti di
// tahap pertama/terakhir (tidak memutar) supaya ujung daftarnya jelas.
function PemilihTahap({ grup, aktif, tahapMhs, onPilih }) {
  const i = grup.findIndex((g) => g.stage === aktif);
  const n = grup.length;
  if (n < 2) return null;
  return (
    <div className="dok-cycler">
      <button type="button" className="dok-cycler-btn" onClick={() => onPilih(grup[i - 1].stage)} disabled={i <= 0}
        aria-label={i > 0 ? `Tahap sebelumnya: ${grup[i - 1].stage}` : 'Tahap sebelumnya'}>
        <IkonSebelum size={22} />
      </button>
      <div className="dok-cycler-label" aria-live="polite">
        <span className="dok-cycler-nama">
          {aktif}
          {aktif === tahapMhs && <span className="dok-tab-now">sekarang</span>}
        </span>
        <span className="dok-cycler-pos">{i + 1} dari {n}</span>
      </div>
      <button type="button" className="dok-cycler-btn" onClick={() => onPilih(grup[i + 1].stage)} disabled={i >= n - 1}
        aria-label={i < n - 1 ? `Tahap berikutnya: ${grup[i + 1].stage}` : 'Tahap berikutnya'}>
        <IkonLanjut size={22} />
      </button>
    </div>
  );
}

function BarisUnduh({ d, m, jEv, dosenByKode }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const tautan = !d.docType;
  const config = tautan ? null : getTemplateConfig(d.docType, m, dosenByKode, jEv);
  const tanpaTemplate = !tautan && d.eligible && !config; // docType sudah ada, template menyusul
  const dikunci = !tautan && !bolehUnduhDokumen(m); // "Perlu perbaikan" atau perubahan data belum diverifikasi ulang
  const siap = tautan ? !!d.linkEksternal : d.eligible && !!config && !dikunci;
  const docx = !!(config && config.docx);

  async function unduh() {
    const config = getTemplateConfig(d.docType, m, dosenByKode, jEv);
    if (!config) return;
    setErr('');
    setBusy(true);
    try {
      await generateDocument(config.template, config.filename, config.data, config);
    } catch (ex) {
      setErr(ex.message || 'Gagal menyiapkan PDF. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  let keterangan = null;
  if (!siap) keterangan = <span className="dok-syarat">{tautan ? 'Tautan belum tersedia.' : dikunci && d.eligible ? alasanUnduhTerkunci(m) : tanpaTemplate ? 'Template surat belum tersedia.' : (d.syarat || 'Belum tersedia.')}</span>;
  else if (d.catatan && !d.catatanAdminSaja) keterangan = <span>{d.catatan}</span>;

  return (
    <li className={'dok-row' + (siap ? '' : ' dok-row-off')}>
      <span className={'dok-row-ikon' + (siap ? '' : ' off')}>{!siap ? <IkonTerkunci /> : tautan ? <IkonTautan /> : <IkonPdf label={docx ? 'DOC' : 'PDF'} />}</span>
      <div className="dok-row-teks">
        <div className="dok-row-nama">{d.label}</div>
        {keterangan && <div className="dok-row-sub">{keterangan}</div>}
        {/* linkLabel non-tombol berupa kalimat (mis. "Untuk membuat formulir
            Permohonan KP silahkan kunjungi Mandala UNDIP"), jadi tampil sebagai
            tautan teks; tombolnya cukup "Buka". */}
        {tautan && siap && !d.linkButton && d.linkLabel && (
          <a className="dok-row-tautan" href={d.linkEksternal} target="_blank" rel="noreferrer">{d.linkLabel}</a>
        )}
        {err && <div className="login-err">{err}</div>}
      </div>
      {tautan ? (
        siap
          ? <a className="btn dok-btn" href={d.linkEksternal} target="_blank" rel="noreferrer">{(d.linkButton && d.linkLabel) || 'Buka'}</a>
          : <button type="button" className="btn dok-btn" disabled>Buka</button>
      ) : (
        <button type="button" className="btn dok-btn" onClick={unduh} disabled={!siap || busy}>{busy ? 'Menyiapkan…' : (docx ? 'Unduh Word' : 'Unduh')}</button>
      )}
    </li>
  );
}

// terkunci = status "Perlu perbaikan" (bolehAksesBerkas); menghapus berkas tetap boleh.
function SlotUnggah({ d, terkunci, onUpload, onDeleteUpload }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ganti, setGanti] = useState(false);
  const bolehUnggah = d.studentUpload !== false;

  async function pilihBerkas(file) {
    if (!file || !onUpload) return;
    setErr('');
    setBusy(true);
    try {
      await onUpload(d.key, file);
      setGanti(false);
    } catch (ex) {
      setErr(ex.message || 'Gagal mengunggah berkas.');
    } finally {
      setBusy(false);
    }
  }

  function hapus() {
    if (!window.confirm(`Hapus berkas "${d.upload.fileName}"? Berkas akan dihapus permanen dari server.`)) return;
    onDeleteUpload(d.key);
  }

  if (d.upload && !ganti) {
    // perluUlang: admin meminta unggah ulang karena data berubah setelah berkas ini diunggah.
    const ulang = !!d.upload.perluUlang;
    return (
      <div className="dok-slot">
        <div className="dok-slot-nama">{d.label}</div>
        <div className={'dok-terunggah' + (ulang ? ' dok-perlu-ulang' : '')}>
          <span className="dok-terunggah-ikon">{ulang ? <IkonUnggah /> : <IkonSelesai />}</span>
          <div className="dok-row-teks">
            <a className="dok-terunggah-file" href={d.upload.url || d.upload.dataUrl} target="_blank" rel="noreferrer">{d.upload.fileName}</a>
            <div className="dok-terunggah-meta" title={ulang ? 'Data berubah setelah berkas ini diunggah' : undefined}>
              {ulang ? 'Unggah ulang' : `Terunggah${d.upload.uploadedAt ? ` ${formatTanggal(d.upload.uploadedAt)}` : ''}`}
            </div>
          </div>
          {bolehUnggah && (
            <div className="dok-terunggah-aksi">
              {d.eligible && !terkunci && <button type="button" className="link-btn dok-link" onClick={() => setGanti(true)}>Ganti</button>}
              {onDeleteUpload && <button type="button" className="link-btn danger dok-link" onClick={hapus}>Hapus</button>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!d.eligible || terkunci) {
    return (
      <div className="dok-slot">
        <div className="dok-slot-nama">{d.label}</div>
        <div className="dok-slot-off">
          <IkonTerkunci size={22} />
          <span>{terkunci && d.eligible ? 'Dikunci: perbaiki data sesuai pesan admin.' : `Belum bisa diunggah.${!d.docType && d.syarat ? ` ${d.syarat}` : ''}`}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dok-slot">
      <div className="dok-slot-nama">{d.label}</div>
      <KotakUnggah busy={busy} onFile={pilihBerkas} />
      {err && <div className="login-err">{err}</div>}
      {ganti && !busy && <button type="button" className="btn ghost dok-batal" onClick={() => { setGanti(false); setErr(''); }}>Batal ganti</button>}
    </div>
  );
}

// Slot tautan Google Drive yang diisi mahasiswa (mis. folder berkas final KP).
// Setelah terkirim tampil sebagai tautan dengan tombol "Ganti" selama masih
// boleh diisi (eligible).
function SlotTautan({ d, terkunci, onKirim }) {
  const [edit, setEdit] = useState(false);
  const [nilai, setNilai] = useState(d.linkTerkirim || '');
  const [err, setErr] = useState('');

  function kirim() {
    if (!nilai.trim()) { setErr('Isi tautan terlebih dahulu.'); return; }
    setErr('');
    onKirim(nilai.trim());
    setEdit(false);
  }

  if (d.linkTerkirim && !edit) {
    return (
      <div className="dok-slot">
        <div className="dok-slot-nama">{d.label}</div>
        <div className="dok-terunggah">
          <span className="dok-terunggah-ikon"><IkonSelesai /></span>
          <div className="dok-row-teks">
            <a className="dok-terunggah-file" href={normalizeUrl(d.linkTerkirim)} target="_blank" rel="noreferrer">{d.linkTerkirim}</a>
            <div className="dok-terunggah-meta">{d.linkDisetujui ? 'Disetujui admin' : 'Terkirim, menunggu diperiksa admin'}</div>
          </div>
          {d.eligible && !terkunci && (
            <div className="dok-terunggah-aksi">
              <button type="button" className="link-btn dok-link" onClick={() => { setNilai(d.linkTerkirim); setEdit(true); }}>Ganti</button>
            </div>
          )}
        </div>
        {d.key === 'pembukuan' && <PetunjukPembukuan denganFormat />}
      </div>
    );
  }

  if (!d.eligible || terkunci) {
    return (
      <div className="dok-slot">
        <div className="dok-slot-nama">{d.label}</div>
        <div className="dok-slot-off">
          <IkonTerkunci size={22} />
          <span>{terkunci && d.eligible ? 'Dikunci: perbaiki data sesuai pesan admin.' : `Belum bisa dikirim. ${d.syarat}`}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dok-slot">
      <div className="dok-slot-nama">{d.label}</div>
      {d.catatan && <p className="hint" style={{ margin: 0 }}>{d.catatan}</p>}
      <div className="dok-kirim-row">
        <input value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="https://drive.google.com/..." aria-label={`Tautan ${d.label}`} />
        <button type="button" className="btn btn-primary dok-kirim-btn" onClick={kirim} aria-label="Kirim tautan" title="Kirim tautan"><IkonKirim /></button>
      </div>
      {err && <div className="login-err">{err}</div>}
      {edit && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn ghost" onClick={() => { setEdit(false); setErr(''); }}>Batal</button>
        </div>
      )}
      {d.key === 'pembukuan' && <PetunjukPembukuan denganFormat />}
    </div>
  );
}

// Kotak unggah: seluruh kotak bisa diklik/diketuk (label untuk input file)
// dan menerima seret-lepas di layar lebar.
function KotakUnggah({ busy, onFile }) {
  const [over, setOver] = useState(false);
  const id = useMemo(() => `dok-unggah-${Math.random().toString(36).slice(2)}`, []);
  return (
    <label
      htmlFor={id}
      className={'dok-drop' + (over ? ' over' : '') + (busy ? ' busy' : '')}
      onDragOver={(e) => { e.preventDefault(); if (!busy) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
    >
      <input id={id} type="file" accept=".pdf,application/pdf" disabled={busy}
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
      <span className="dok-drop-ikon"><IkonUnggah /></span>
      <span className="dok-drop-hint">.pdf · maks 25 MB</span>
      <span className="btn btn-primary dok-drop-btn">{busy ? 'Mengunggah…' : 'Pilih berkas'}</span>
    </label>
  );
}
