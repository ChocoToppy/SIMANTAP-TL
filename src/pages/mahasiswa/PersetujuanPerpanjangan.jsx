import React from 'react';
import { formatTanggal } from '../../utils/helpers.js';
import { aturanPerpanjangan, bolehPerpanjang, perpanjanganDisetujui } from '../../utils/nomorSurat.js';
import { periodePerpanjangan, riwayatPerpanjangan, teksKonfirmasiPerpanjangan, patchSetujuiPerpanjangan } from '../../utils/perpanjangan.js';

// Bagian "Perpanjangan" di modal edit admin: riwayat perpanjangan yang sudah
// disetujui + tombol setujui. Menyetujui memajukan batas akhir, jadi selalu
// lewat konfirmasi yang menyebut tanggal lama → baru (lihat utils/perpanjangan.js).
export function PersetujuanPerpanjangan({ m, setM }) {
  const aturan = aturanPerpanjangan(m);
  if (!aturan) return null;
  const riwayat = riwayatPerpanjangan(m);
  const berikut = periodePerpanjangan(m, riwayat.length);

  function setujui() {
    if (!window.confirm(teksKonfirmasiPerpanjangan(m))) return;
    setM((prev) => ({ ...prev, ...patchSetujuiPerpanjangan(prev) }));
  }

  return (
    <div style={{ marginTop: 8 }}>
      {riwayat.map((p, i) => (
        <div key={i} className="callout callout-green">
          Perpanjangan ke-{i + 1}: batas akhir {formatTanggal(p.dari)} → <strong>{formatTanggal(p.sampai)}</strong>
          {p.disetujuiPada ? ` · disetujui ${formatTanggal(p.disetujuiPada)}` : ''}
        </div>
      ))}
      {!m.batasAkhir ? (
        <div className="hint">Isi Batas akhir terlebih dahulu sebelum menyetujui perpanjangan.</div>
      ) : bolehPerpanjang(m) ? (
        <>
          <div className="callout callout-amber">
            Menyetujui perpanjangan memajukan batas akhir dari {formatTanggal(berikut.dari)} menjadi{' '}
            <strong>{formatTanggal(berikut.sampai)}</strong> (+{aturan.bulan} bulan) dan menampilkan surat perpanjangan ke mahasiswa.
          </div>
          <button type="button" className="btn btn-primary" onClick={setujui}>Setujui perpanjangan &amp; kirim surat</button>
        </>
      ) : (
        <div className="hint">Jatah perpanjangan sudah habis ({perpanjanganDisetujui(m)}/{aturan.maks}).</div>
      )}
    </div>
  );
}
