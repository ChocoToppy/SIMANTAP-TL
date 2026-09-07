import React, { useState } from 'react';
import { statusVerif, kondisi, programOf, eventAktif, bolehAjukanJadwal, formatTanggal, jamTampil, bidangLabel, programLabel, normalizeUrl } from '../../utils/helpers.js';
import { Badge, StageBar, StageListVertical } from '../../components/ui.jsx';
import { KpDocumentPanel } from '../../components/kpDocuments.jsx';
import { generateDocument, getTemplateConfig } from '../../utils/documentGenerator.js';
import bukuPanduanIcon from '../../assets/buku-panduan.png';
import { panduanUntukProgram } from './shared.js';

export function KartuPengajuan({ m, allDosen = [], konten = {}, panduan = [], onEdit, onJadwal, onPerpanjangan, onUploadDokumenKP, onDeleteDokumenKP }) {
  const v = statusVerif(m);
  const k = kondisi(m);
  const terverifikasi = v.key === 'terverifikasi';
  const isKP = programOf(m) === 'KP';
  const isMG = programOf(m) === 'MG';
  // KP: begitu Persetujuan SMKP diunggah, mahasiswa sudah boleh mengajukan jadwal Seminar
  // KP meski admin belum memindahkan tahap dari "Bimbingan" ke "Seminar KP" secara resmi.
  const bolehUsulSeminarKPAwal = isKP && m.tahap === 'Bimbingan' && !!((m.dokumenKP || {}).persetujuanSmkp);
  const evA = eventAktif(m) || (bolehUsulSeminarKPAwal ? 'Seminar KP' : null); // kegiatan yang dijadwalkan dari tahap ini
  const jEv = evA ? ((m.jadwal || {})[evA] || {}) : {};
  const dikonfirmasi = !!jEv.dikonfirmasi;
  const adaUsulan = !!(jEv.tanggal || jEv.berkasLink || jEv.jamMulai);
  const disetujui = dikonfirmasi && !!jEv.tanggal; // sah hanya jika jadwal benar-benar ada
  const sidang = !!(evA && evA.includes('Sidang'));
  const bolehAjukan = bolehAjukanJadwal(m);
  const namaDosen = (kode) => { const d = allDosen.find((x) => x.kode === kode); return d ? `${d.kode} — ${d.nama}` : kode; };
  const pemb = [m.pembimbing1, m.pembimbing2].filter(Boolean);
  const peng = [m.penguji1, m.penguji2].filter(Boolean);
  const jadwalTeks = [jEv.tanggal ? formatTanggal(jEv.tanggal) : null, jamTampil(jEv), jEv.ruang].filter(Boolean).join(' · ');
  const dosenByKode = Object.fromEntries(allDosen.map((d) => [d.kode, d]));
  const isTA = programOf(m) === 'TA';
  const panduanRelevan = panduanUntukProgram(panduan, programOf(m));
  const [dlBusy, setDlBusy] = useState(false);
  async function unduhPerpanjanganKP() {
    const config = getTemplateConfig('Perpanjangan KP', m, dosenByKode, {});
    if (!config) return;
    setDlBusy(true);
    try {
      await generateDocument(config.template, config.filename, config.data);
    } finally {
      setDlBusy(false);
    }
  }

  return (
    <div className="card kartu">
      <div className="kartu-head">
        <span className="kartu-prog">{programLabel(programOf(m))}</span>
        <div className="kartu-head-right">
          {panduanRelevan.map((p) => (
            <React.Fragment key={p.id}>
              <a className="btn btn-primary btn-sm panduan-link-desktop" href={normalizeUrl(p.url)} target="_blank" rel="noreferrer">{p.label}</a>
              <a className="panduan-link-mobile" href={normalizeUrl(p.url)} target="_blank" rel="noreferrer" title={p.label} aria-label={p.label}>
                <img src={bukuPanduanIcon} alt="" width={18} height={18} />
              </a>
            </React.Fragment>
          ))}
          <Badge tone={v.tone}>{v.label}</Badge>
        </div>
      </div>
      <div className="kartu-judul">{m.judul || <span className="muted">(judul belum diisi)</span>}</div>
      <div className="cell-sub">{m.nim} · {bidangLabel(m.bidang)}{m.klasifikasi ? ` · ${m.klasifikasi}` : ''}</div>
      <div className="stage-desktop" style={{ margin: '10px 0' }}><StageBar program={programOf(m)} tahap={m.tahap} /></div>
      <div className="stage-mobile" style={{ margin: '10px 0' }}><StageListVertical program={programOf(m)} tahap={m.tahap} /></div>
      {!terverifikasi && k.key !== 'lulus' && (
        <div className="cell-sub">Batas: {formatTanggal(m.batasAkhir)} · <Badge tone={k.tone}>{k.label}</Badge></div>
      )}

      {/* Pesan admin — tampil di setiap tahap */}
      {m.catatan && (
        <div className={'callout' + (v.key === 'perbaikan' ? ' callout-red' : '')}>
          <strong>Pesan dari admin:</strong> {m.catatan}
        </div>
      )}
      {v.key === 'baru' && <div className="callout">Pendaftaran sedang menunggu diperiksa admin.</div>}

      {/* Dosen pembimbing / penguji setelah ditentukan */}
      {(pemb.length > 0 || peng.length > 0) && (
        <div className="verif-info" style={{ marginTop: 8 }}>
          {pemb.length > 0 && <div>Pembimbing: <strong>{pemb.map(namaDosen).join('; ')}</strong></div>}
          {peng.length > 0 && <div>Penguji: <strong>{peng.map(namaDosen).join('; ')}</strong></div>}
        </div>
      )}

      {/* Status kegiatan pada tahap saat ini */}
      {terverifikasi && evA && (
        <div style={{ marginTop: 8 }}>
          {sidang ? (
            jEv.tanggal ? (
              <div className={'callout ' + (disetujui ? 'callout-green' : 'callout-amber')}>
                <strong>Jadwal Sidang ({disetujui ? 'final' : 'perkiraan'}):</strong> {jadwalTeks}
              </div>
            ) : (
              <div className="callout">Menunggu admin menetapkan jadwal sidang.</div>
            )
          ) : disetujui ? (
            <div className="callout callout-green"><strong>Jadwal {evA} (disetujui admin):</strong> {jadwalTeks}</div>
          ) : adaUsulan ? (
            <div className="callout">Usulan jadwal {evA} terkirim — menunggu verifikasi admin.</div>
          ) : bolehAjukan ? (
            <div className="callout">Tahap saat ini: <strong>{evA}</strong>. Setelah sepakat dengan dosen, ajukan jadwalnya.</div>
          ) : (
            <div className="callout">Menunggu admin menetapkan dosen pembimbing.</div>
          )}
        </div>
      )}

      {/* Tanggal lulus */}
      {k.key === 'lulus' && (
        <div className="callout callout-green"><strong>Lulus.</strong>{m.tanggalLulus ? ` Tanggal lulus: ${formatTanggal(m.tanggalLulus)}` : ''}</div>
      )}

    {/* Dokumen KP/Magang per tahap: unduh (PDF) & unggah berkas ditandatangani/dinilai */}
      {(isKP || isMG) && (
        <KpDocumentPanel m={m} program={programOf(m)} title={`Dokumen ${programLabel(programOf(m))}`} dosenByKode={dosenByKode} konten={konten} canUpload onUpload={onUploadDokumenKP} onDeleteUpload={onDeleteDokumenKP} />
      )}

      {/* Perpanjangan (KP / TA / Magang) */}
      {['TA', 'KP', 'MG'].includes(programOf(m)) && terverifikasi && k.key !== 'lulus' && (() => {
        const pp = m.perpanjangan || {};
        const isKPProgram = programOf(m) === 'KP';
        const suratSiap = isKPProgram ? pp.suratAdminTersedia : pp.suratAdmin;
        if (!pp.diminta && !suratSiap) {
          return <div style={{ marginTop: 8 }}><button className="btn btn-amber perpanjangan-btn" onClick={() => onPerpanjangan('minta')}>Ajukan perpanjangan</button></div>;
        }
        if (!suratSiap) {
          return <div className="callout" style={{ marginTop: 8 }}>Perpanjangan diajukan{pp.tanggalDiminta ? ` (${formatTanggal(pp.tanggalDiminta)})` : ''} — menunggu surat dari admin.</div>;
        }
        if (!pp.suratFinal && !pp.suratFinalLink) {
          return (
            <div className="callout" style={{ marginTop: 8 }}>
              {isKPProgram ? (
                <button className="btn perpanjangan-btn" onClick={unduhPerpanjanganKP} disabled={dlBusy}>{dlBusy ? 'Menyiapkan PDF…' : 'Unduh surat perpanjangan KP (PDF)'}</button>
              ) : (
                <>Surat perpanjangan dari admin: <a href={pp.suratAdmin.url || pp.suratAdmin.dataUrl} target="_blank" rel="noreferrer">{pp.suratAdmin.fileName}</a>.{' '}</>
              )}{' '}
              <button className="btn perpanjangan-btn" onClick={() => onPerpanjangan('final')}>Unggah surat final (ditandatangani)</button>
            </div>
          );
        }
        const finalHref = pp.suratFinal ? (pp.suratFinal.url || pp.suratFinal.dataUrl) : pp.suratFinalLink;
        return <div className="callout callout-green" style={{ marginTop: 8 }}>Perpanjangan selesai. Surat final: <a href={finalHref} target="_blank" rel="noreferrer">buka</a></div>;
      })()}


      <div className="kartu-aksi">
        <button className="btn" onClick={onEdit}>Edit pendaftaran</button>
        {terverifikasi && evA && bolehAjukan && sidang && (
          <button className="btn btn-primary" onClick={() => onJadwal(evA)}>
            {jEv.berkasLink ? 'Perbarui draft & berkas sidang' : 'Unggah draft & berkas sidang'}
          </button>
        )}
        {terverifikasi && evA && bolehAjukan && !sidang && !disetujui && (
          <button className="btn btn-primary" onClick={() => onJadwal(evA)}>
            {adaUsulan ? `Revisi usulan ${evA}` : `Ajukan jadwal ${evA}`}
          </button>
        )}
        {terverifikasi && evA && !sidang && disetujui && <span className="hint">Jadwal sudah disetujui admin. Menunggu pelaksanaan &amp; hasil.</span>}
        {terverifikasi && !evA && k.key !== 'lulus' && <span className="hint">Menunggu proses admin.</span>}
      </div>
    </div>
  );
}
