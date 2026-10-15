import React from 'react';
import { adaPerubahanData } from '../../utils/helpers.js';

// Pemberitahuan untuk mahasiswa (kartu & halaman dokumen) saat data yang tercetak
// di dokumen diubah setelah diverifikasi (m.perubahanData). Unduhan dokumen
// dikunci sampai admin memverifikasi ulang (bolehUnduhDokumen di helpers.js).
export function PerubahanDataNotice({ m, style }) {
  if (!adaPerubahanData(m)) return null;
  const label = Object.values(m.perubahanData.item).map((v) => v.label);
  return (
    <div className="callout callout-amber notice-perubahan" style={style}>
      <div><strong>Perubahan data terdeteksi.</strong> Tunggu verifikasi ulang oleh admin.</div>
      <div className="notice-perubahan-chips">
        {label.map((l) => <span key={l} className="notice-perubahan-chip">{l}</span>)}
      </div>
    </div>
  );
}
