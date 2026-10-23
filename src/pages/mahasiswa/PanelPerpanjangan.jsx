import React from 'react';
import { formatTanggal, normalizeUrl, programDisplayLabel, tenggat } from '../../utils/helpers.js';
import { aturanPerpanjangan, bolehPerpanjang, perpanjanganDisetujui } from '../../utils/nomorSurat.js';
import { periodePerpanjangan, riwayatPerpanjangan, teksKonfirmasiPerpanjangan, patchSetujuiPerpanjangan } from '../../utils/perpanjangan.js';
import { Badge, CheckIcon, PrintIcon } from '../../components/ui.jsx';

// Panel "Perpanjangan" di kolom kanan modal edit admin KP/Magang/TA. Yang perlu
// dilihat admin sekilas: ada pengajuan atau tidak (lencana), sisa jatah
// (meter di judul), dan tanggal batas akhir lama → baru sebelum menyetujui.
// Penjelasan lengkap ada di dialog konfirmasi (teksKonfirmasiPerpanjangan).
export function PanelPerpanjangan({ m, setM, onCetak, cetakBusy }) {
  const pp = m.perpanjangan || {};
  const aturan = aturanPerpanjangan(m);
  const riwayat = riwayatPerpanjangan(m);
  const dipakai = perpanjanganDisetujui(m);
  const terakhir = riwayat[riwayat.length - 1];
  // Pengajuan dianggap sudah ditangani bila ada persetujuan pada/setelah tanggal pengajuan.
  const menunggu = pp.diminta && !(terakhir && (!pp.tanggalDiminta || terakhir.disetujuiPada >= pp.tanggalDiminta));
  const suratFinalUrl = pp.suratFinal ? (pp.suratFinal.url || pp.suratFinal.dataUrl) : (pp.suratFinalLink ? normalizeUrl(pp.suratFinalLink) : '');

  function setujui() {
    if (!window.confirm(teksKonfirmasiPerpanjangan(m))) return;
    setM((prev) => ({ ...prev, ...patchSetujuiPerpanjangan(prev) }));
  }

  const berikut = aturan && tenggat(m) && bolehPerpanjang(m) ? periodePerpanjangan(m, riwayat.length) : null;

  return (
    <div className="sched pp-panel">
      <div className="pp-head">
        <div className="sched-title">Perpanjangan {programDisplayLabel(m)}</div>
        {aturan && (
          <div className="pp-jatah" title={`Jatah ${aturan.maks}× perpanjangan, masing-masing +${aturan.bulan} bulan`}>
            <span className="pp-meter" aria-hidden="true">
              {Array.from({ length: aturan.maks }, (_, i) => <span key={i} className={i < dipakai ? 'isi' : ''} />)}
            </span>
            <span>{dipakai}/{aturan.maks}</span>
          </div>
        )}
      </div>

      <div className="pp-status">
        {menunggu
          ? <Badge tone="amber">Diajukan{pp.tanggalDiminta ? ` ${formatTanggal(pp.tanggalDiminta)}` : ''}</Badge>
          : pp.diminta ? <Badge tone="green">Disetujui</Badge>
          : <Badge tone="gray">Tidak ada pengajuan</Badge>}
      </div>
      {pp.diminta && pp.alasan && <p className="pp-alasan">{pp.alasan}</p>}

      {riwayat.length > 0 && (
        <ul className="pp-riwayat">
          {riwayat.map((r, i) => (
            <li key={i}>
              <span className="pp-ke">Ke-{i + 1}</span>
              <span>{formatTanggal(r.dari)} → <strong>{formatTanggal(r.sampai)}</strong></span>
            </li>
          ))}
        </ul>
      )}

      {suratFinalUrl && (
        <a className="pp-file" href={suratFinalUrl} target="_blank" rel="noreferrer">
          Surat final: {pp.suratFinal ? pp.suratFinal.fileName : 'buka tautan'}
        </a>
      )}

      {aturan && !tenggat(m) && <div className="hint">{m.program === 'KP' ? 'Batas program belum ada: menunggu nomor surat (surat tugas).' : 'Isi batas akhir dulu.'}</div>}
      <div className="pp-aksi">
        {berikut && (
          <div className="pp-tanggal">
            <span className="muted">Batas akhir</span>
            <span>{formatTanggal(berikut.dari)} → <strong>{formatTanggal(berikut.sampai)}</strong></span>
          </div>
        )}
        <div className="pp-aksi-tombol">
          {berikut && (
            <button
              type="button"
              className={'icon-btn-outline pp-setujui-btn' + (menunggu ? ' siap' : '')}
              onClick={setujui}
              disabled={!menunggu}
              aria-label="Setujui perpanjangan"
              title={menunggu ? 'Setujui perpanjangan' : 'Belum ada pengajuan dari mahasiswa'}
            ><CheckIcon /></button>
          )}
          <button
            type="button"
            className="icon-btn-outline"
            onClick={onCetak}
            disabled={cetakBusy}
            aria-label="Cetak surat perpanjangan (PDF)"
            title={cetakBusy ? 'Menyiapkan PDF…' : 'Cetak surat perpanjangan (PDF)'}
          ><PrintIcon /></button>
        </div>
      </div>
    </div>
  );
}
