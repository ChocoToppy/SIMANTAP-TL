import React, { useState } from 'react';
import { dokumenStatus, perpanjanganDocType, statusVerif, pernahDiverifikasi, bolehAksesBerkas, pembukuanDisetujui, kondisi, programOf, eventAktifAwal, bolehAjukanJadwal, formatTanggal, jamTampil, bidangLabel, programLabel, programDisplayLabel, jenisMagangOf, normalizeUrl, judulLabelFor } from '../../utils/helpers.js';
import { Badge, StageBar, StageStepper } from '../../components/ui.jsx';
import { IkonLanjut, IkonMap } from '../../components/DokIkon.jsx';
import { generateDocument, getTemplateConfig } from '../../utils/documentGenerator.js';
import bukuPanduanIcon from '../../assets/buku-panduan.png';
import { panduanUntukProgram } from './shared.js';

// Urutan kartu: identitas → tahapan → status tahap ini + tombol aksinya →
// pesan admin → dosen → dokumen → perpanjangan → edit/hapus. Yang perlu
// dilakukan mahasiswa sekarang selalu ada tepat di bawah tahapan.
export function KartuPengajuan({ m, allDosen = [], konten = {}, panduan = [], onEdit, onHapus, onJadwal, onPerpanjangan, onDokumen }) {
  const v = statusVerif(m);
  const k = kondisi(m);
  // Akses tombol/aksi mengikuti "pernah terverifikasi"; badge tetap status saat
  // ini (kembali "Menunggu verifikasi" tiap ada kiriman baru, lihat helpers.js).
  const aktif = pernahDiverifikasi(m);
  const program = programOf(m);
  const isMG = program === 'MG';
  // Magang/MKT: begitu dokumen Persetujuan tahap Bimbingan diunggah,
  // mahasiswa sudah boleh mengajukan jadwal Expo meski admin belum
  // memindahkan tahap dari "Bimbingan" secara resmi — lihat
  // eventAktifAwal/bolehUsulEventAwal di helpers.js.
  const evA = eventAktifAwal(m); // kegiatan yang dijadwalkan dari tahap ini
  const jEv = evA ? ((m.jadwal || {})[evA] || {}) : {};
  const dikonfirmasi = !!jEv.dikonfirmasi;
  const adaUsulan = !!(jEv.tanggal || jEv.berkasLink || jEv.jamMulai);
  const disetujui = dikonfirmasi && !!jEv.tanggal; // sah hanya jika jadwal benar-benar ada
  const sidang = !!(evA && evA.includes('Sidang'));
  const bolehAjukan = bolehAjukanJadwal(m);
  const dosenByKode = Object.fromEntries(allDosen.map((d) => [d.kode, d]));
  const pemb = [m.pembimbing1, m.pembimbing2].filter(Boolean);
  const peng = [m.penguji1, m.penguji2].filter(Boolean);
  const jadwalTeks = [jEv.tanggal ? formatTanggal(jEv.tanggal) : null, jamTampil(jEv), jEv.ruang].filter(Boolean).join(' · ');
  const panduanRelevan = panduanUntukProgram(panduan, program);
  const lulus = k.key === 'lulus';
  // Langkah KP tanpa jadwal: Bimbingan → unggah lembar pengesahan (membuka
  // Pembukuan), Pembukuan → kirim tautan folder → disetujui admin.
  const langkahKP = program === 'KP' && (m.tahap === 'Bimbingan' || m.tahap === 'Pembukuan')
    ? { tahap: m.tahap, linkTerkirim: !!(m.pembukuan || {}).berkasLink, disetujui: pembukuanDisetujui(m) }
    : null;
  const adaDokumen = ['KP', 'MG', 'TA'].includes(program);

  return (
    <div className="card kartu">
      <div className="kartu-head">
        <span className="kartu-prog">
          {programLabel(program)}
          {isMG && jenisMagangOf(m) === 'MKT' && <span className="chip chip-mkt" style={{ marginLeft: 6 }}>MKT</span>}
        </span>
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
      <div>
        <div className="kartu-judul">{m.judul || <span className="muted">({judulLabelFor(m).toLowerCase()} belum diisi)</span>}</div>
        <div className="cell-sub">{m.nim} · {bidangLabel(m.bidang)}{m.klasifikasi ? ` · ${m.klasifikasi}` : ''}</div>
      </div>

      <div className="stage-desktop"><StageBar program={program} tahap={m.tahap} /></div>
      <div className="stage-mobile"><StageStepper program={program} tahap={m.tahap} /></div>
      {!aktif && !lulus && (
        <div className="cell-sub">Batas: {formatTanggal(m.batasAkhir)} · <Badge tone={k.tone}>{k.label}</Badge></div>
      )}

      <StatusTahap
        v={v} aktif={aktif} lulus={lulus} tanggalLulus={m.tanggalLulus}
        evA={evA} jEv={jEv} sidang={sidang} disetujui={disetujui} adaUsulan={adaUsulan}
        bolehAjukan={bolehAjukan} jadwalTeks={jadwalTeks} onJadwal={onJadwal} terkunci={!bolehAksesBerkas(m)}
        langkahKP={langkahKP} onDokumen={onDokumen}
      />

      {m.catatan && (
        <div className={'callout' + (v.key === 'perbaikan' ? ' callout-red' : '')}>
          <strong>Pesan dari admin:</strong> {m.catatan}
        </div>
      )}

      {(pemb.length > 0 || peng.length > 0) && (
        <dl className="kartu-dosen">
          {pemb.length > 0 && <DosenBaris label="Pembimbing" kode={pemb} dosenByKode={dosenByKode} />}
          {peng.length > 0 && <DosenBaris label="Penguji" kode={peng} dosenByKode={dosenByKode} />}
        </dl>
      )}

      {adaDokumen && (
        <BarisDokumen m={m} program={program} konten={konten} onClick={onDokumen} />
      )}

      {adaDokumen && aktif && !lulus && (
        <Perpanjangan m={m} dosenByKode={dosenByKode} onPerpanjangan={onPerpanjangan} />
      )}

      <div className="kartu-aksi">
        <button className="btn" onClick={onEdit}>Edit pendaftaran</button>
        {!aktif && onHapus && <button className="btn btn-red" onClick={onHapus}>Hapus pengajuan</button>}
      </div>
    </div>
  );
}

// Status tahap saat ini beserta satu tombol aksi utamanya (ajukan jadwal /
// unggah berkas sidang), supaya "apa yang harus dilakukan sekarang" tidak
// terpisah jauh dari tombolnya.
function StatusTahap({ v, aktif, lulus, tanggalLulus, evA, jEv, sidang, disetujui, adaUsulan, bolehAjukan, jadwalTeks, onJadwal, langkahKP, onDokumen, terkunci }) {
  let pesan = null;
  // "Perlu perbaikan": semua kiriman & unduhan dikunci sampai pendaftaran dibetulkan.
  if (aktif && terkunci && !lulus) {
    return (
      <div className="kartu-status">
        <div className="callout callout-red"><strong>Perlu perbaikan.</strong> Unggah, unduh, dan pengajuan dikunci sampai data pendaftaran dibetulkan sesuai pesan admin lewat "Edit pendaftaran".</div>
      </div>
    );
  }
  if (aktif && langkahKP && !lulus) {
    let teks;
    if (langkahKP.tahap === 'Bimbingan') {
      teks = <div className="callout">Unduh dan tanda tangani <strong>Lembar Pengesahan KP</strong>, lalu unggah pindaiannya untuk masuk ke tahap Pembukuan.</div>;
    } else if (langkahKP.disetujui) {
      teks = <div className="callout callout-green"><strong>Pembukuan disetujui admin.</strong> Surat keterangan selesai pembukuan ada di halaman dokumen.</div>;
    } else if (langkahKP.linkTerkirim) {
      teks = <div className="callout">Tautan folder berkas final terkirim, menunggu diperiksa admin.</div>;
    } else {
      teks = <div className="callout">Tahap saat ini: <strong>Pembukuan</strong>. Kirim tautan folder Google Drive berisi berkas final KP.</div>;
    }
    return (
      <div className="kartu-status">
        {teks}
        <button className="btn btn-primary" onClick={onDokumen}>Buka dokumen {langkahKP.tahap}</button>
      </div>
    );
  }
  if (lulus) {
    pesan = <div className="callout callout-green"><strong>Lulus.</strong>{tanggalLulus ? ` Tanggal lulus: ${formatTanggal(tanggalLulus)}` : ''}</div>;
  } else if (!aktif && v.key === 'baru') {
    pesan = <div className="callout">Pendaftaran sedang menunggu diperiksa admin.</div>;
  } else if (aktif && !evA) {
    pesan = <div className="hint">Menunggu proses admin.</div>;
  } else if (aktif && sidang) {
    pesan = jEv.tanggal
      ? <div className={'callout ' + (disetujui ? 'callout-green' : 'callout-amber')}><strong>Jadwal Sidang ({disetujui ? 'final' : 'perkiraan'}):</strong> {jadwalTeks}</div>
      : <div className="callout">Menunggu admin menetapkan jadwal sidang.</div>;
  } else if (aktif) {
    if (disetujui) pesan = <div className="callout callout-green"><strong>Jadwal {evA} (disetujui admin):</strong> {jadwalTeks}</div>;
    else if (adaUsulan) pesan = <div className="callout">Usulan jadwal {evA} terkirim, menunggu verifikasi admin.</div>;
    else if (bolehAjukan) pesan = <div className="callout">Tahap saat ini: <strong>{evA}</strong>. Setelah sepakat dengan dosen, ajukan jadwalnya.</div>;
    else pesan = <div className="callout">Menunggu admin menetapkan dosen pembimbing.</div>;
  }

  let aksi = null;
  if (aktif && evA && bolehAjukan && !lulus) {
    aksi = sidang ? (
      <button className="btn btn-primary" onClick={() => onJadwal(evA)}>
        {jEv.berkasLink ? 'Perbarui draft & berkas sidang' : 'Unggah draft & berkas sidang'}
      </button>
    ) : (
      <button
        className="btn btn-primary"
        onClick={() => onJadwal(evA)}
        disabled={disetujui}
        title={disetujui ? 'Jadwal sudah dikunci admin. Hubungi admin untuk perubahan.' : undefined}
      >
        {disetujui ? `Jadwal ${evA} terkunci` : (adaUsulan ? `Revisi usulan ${evA}` : `Ajukan jadwal ${evA}`)}
      </button>
    );
  }

  if (!pesan && !aksi) return null;
  return (
    <div className="kartu-status">
      {pesan}
      {aksi}
    </div>
  );
}

// Pintu masuk ke halaman dokumen (HalamanDokumen.jsx). Ringkasannya dihitung
// dari status dokumen yang sama dengan isi halamannya.
function BarisDokumen({ m, program, konten, onClick }) {
  const semua = dokumenStatus(program, m, konten);
  if (semua.length === 0) return null;
  const terunggah = semua.filter((d) => d.upload).length;
  const siapUnduh = bolehAksesBerkas(m) ? semua.filter((d) => d.docType && d.eligible).length : 0;
  const ringkas = [`${terunggah} berkas terunggah`, siapUnduh > 0 ? `${siapUnduh} siap diunduh` : null, !bolehAksesBerkas(m) && pernahDiverifikasi(m) ? 'unduhan dikunci' : null].filter(Boolean).join(' · ');
  return (
    <button type="button" className="kartu-dok-entry" onClick={onClick}>
      <span className="kartu-dok-ikon"><IkonMap /></span>
      <span className="kartu-dok-teks">
        <span className="kartu-dok-judul">Dokumen {programDisplayLabel(m)}</span>
        <span className="kartu-dok-sub">{ringkas}</span>
      </span>
      <IkonLanjut />
    </button>
  );
}

function DosenBaris({ label, kode, dosenByKode }) {
  return (
    <div className="kartu-dosen-baris">
      <dt>{label}</dt>
      {kode.map((kd) => {
        const d = dosenByKode[kd];
        return <dd key={kd}>{d ? d.nama : kd}{d && <span className="kartu-dosen-kode"> ({d.kode})</span>}</dd>;
      })}
    </div>
  );
}

// Perpanjangan (KP / TA / Magang): ajukan → tunggu surat admin → unduh surat
// → unggah surat final yang sudah ditandatangani.
function Perpanjangan({ m, dosenByKode, onPerpanjangan }) {
  const [dlBusy, setDlBusy] = useState(false);
  const pp = m.perpanjangan || {};
  async function unduhSurat() {
    const config = getTemplateConfig(perpanjanganDocType(m), m, dosenByKode, {});
    if (!config) return;
    setDlBusy(true);
    try {
      await generateDocument(config.template, config.filename, config.data);
    } finally {
      setDlBusy(false);
    }
  }

  if (!pp.diminta && !pp.suratAdminTersedia) {
    return <div><button className="btn btn-amber perpanjangan-btn" onClick={() => onPerpanjangan('minta')}>Ajukan perpanjangan</button></div>;
  }
  if (!pp.suratAdminTersedia) {
    return <div className="callout">Perpanjangan diajukan{pp.tanggalDiminta ? ` (${formatTanggal(pp.tanggalDiminta)})` : ''}, menunggu surat dari admin.</div>;
  }
  if (!pp.suratFinal && !pp.suratFinalLink) {
    return (
      <div className="callout">
        <div>Surat perpanjangan sudah tersedia. Unduh, tanda tangani, lalu unggah kembali.</div>
        <button className="btn perpanjangan-btn" onClick={unduhSurat} disabled={dlBusy || !bolehAksesBerkas(m)} title={bolehAksesBerkas(m) ? undefined : 'Unduhan dikunci: perbaiki data pendaftaran sesuai pesan admin terlebih dahulu.'}>{dlBusy ? 'Menyiapkan PDF…' : `Unduh surat perpanjangan ${programDisplayLabel(m)} (PDF)`}</button>{' '}
        <button className="btn perpanjangan-btn" onClick={() => onPerpanjangan('final')} disabled={!bolehAksesBerkas(m)}>Unggah surat final (ditandatangani)</button>
      </div>
    );
  }
  const finalHref = pp.suratFinal ? (pp.suratFinal.url || pp.suratFinal.dataUrl) : pp.suratFinalLink;
  return (
    <div className="callout callout-green">
      Perpanjangan selesai. Surat final: <a href={finalHref} target="_blank" rel="noreferrer">buka</a>{' '}
      <button className="btn btn-sm perpanjangan-btn" onClick={() => onPerpanjangan('final')} disabled={!bolehAksesBerkas(m)}>Ganti surat final</button>
    </div>
  );
}
