import React from 'react';
import { PEMBUKUAN_FORMAT_NAMA, PEMBUKUAN_DAFTAR_BERKAS, PEMBUKUAN_SYARAT_LAPORAN } from '../utils/helpers.js';

// Petunjuk isi folder Google Drive tahap Pembukuan KP. Portal mahasiswa
// memakai denganFormat (format nama berkas + contoh); modal admin cukup
// daftar berkasnya untuk memeriksa kelengkapan.
export function PetunjukPembukuan({ denganFormat = false }) {
  return (
    <div className="callout" style={{ margin: 0 }}>
      {denganFormat && (
        <>
          <strong>Format nama berkas:</strong>
          <div><code>{PEMBUKUAN_FORMAT_NAMA.pola}</code></div>
          <div style={{ marginTop: 6 }}>Contoh:</div>
          <ul style={{ margin: '2px 0 10px', paddingLeft: 20 }}>
            {PEMBUKUAN_FORMAT_NAMA.contoh.map((c) => <li key={c}><code style={{ overflowWrap: 'anywhere' }}>{c}</code></li>)}
          </ul>
        </>
      )}
      <strong>Daftar berkas dalam folder</strong>
      {denganFormat && <div>Folder Google Drive wajib berisi {PEMBUKUAN_DAFTAR_BERKAS.length} berkas berikut:</div>}
      <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
        {PEMBUKUAN_DAFTAR_BERKAS.map((b) => <li key={b}>{b}</li>)}
      </ol>
      {denganFormat && <p style={{ margin: '10px 0 0' }}><strong>Penting:</strong> {PEMBUKUAN_SYARAT_LAPORAN}</p>}
    </div>
  );
}
