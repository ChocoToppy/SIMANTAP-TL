import React, { useState } from 'react';
import { normalizeUrl } from '../../utils/helpers.js';

// Kotak tautan berkas yang diisi mahasiswa (berkas persyaratan, Turnitin,
// folder sidang). Admin umumnya hanya memeriksa & meneruskannya, jadi kolomnya
// terkunci dengan tombol Salin/Buka di sampingnya; ikon pensil membuka kunci
// kalau admin perlu mengetik/mengoreksi sendiri. Centang "sudah diperiksa"
// umumnya catatan admin saja, kecuali tautan folder Pembukuan KP: di sana
// centang + status Terverifikasi = persetujuan (pembukuanDisetujui di helpers.js).
const ikon = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const IkonSalin = () => (<svg {...ikon}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>);
const IkonBuka = () => (<svg {...ikon}><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>);
const IkonPensil = () => (<svg {...ikon}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>);
const IkonCek = () => (<svg {...ikon}><path d="M20 6 9 17l-5-5" /></svg>);

const tombolIkon = { width: 38, height: 38, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' };

export function LinkBerkasRow({ label, url, onUbah, diperiksa, onDiperiksa }) {
  const [tersalin, setTersalin] = useState(false);
  const [mengedit, setMengedit] = useState(false);
  const ada = !!url;

  function salin() {
    navigator.clipboard.writeText(normalizeUrl(url)).catch(() => {});
    setTersalin(true);
    setTimeout(() => setTersalin(false), 1500);
  }

  return (
    <div className="field-full" style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.85rem' }}>{label}</strong>
        {ada && !mengedit && <span className="hint" style={{ margin: 0 }}>{tersalin ? 'Tersalin ke clipboard' : 'Diunggah mahasiswa'}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          style={{ flex: 1, minWidth: 0 }}
          value={url || ''}
          readOnly={!mengedit}
          onChange={(e) => onUbah(e.target.value)}
          placeholder={mengedit ? 'https://drive.google.com/...' : 'Mahasiswa belum mengunggah link'}
          title={url || ''}
        />
        <button type="button" className="btn" style={tombolIkon} onClick={() => setMengedit((v) => !v)} title={mengedit ? 'Selesai mengedit' : 'Edit tautan'} aria-label={mengedit ? 'Selesai mengedit' : 'Edit tautan'}>
          {mengedit ? <IkonCek /> : <IkonPensil />}
        </button>
        <button type="button" className="btn btn-primary" style={tombolIkon} onClick={salin} disabled={!ada} title="Salin tautan" aria-label="Salin tautan">
          {tersalin ? <IkonCek /> : <IkonSalin />}
        </button>
        {ada ? (
          <a className="btn" style={tombolIkon} href={normalizeUrl(url)} target="_blank" rel="noreferrer" title="Buka tautan" aria-label="Buka tautan"><IkonBuka /></a>
        ) : (
          <button type="button" className="btn" style={tombolIkon} disabled title="Buka tautan" aria-label="Buka tautan"><IkonBuka /></button>
        )}
      </div>
      <label className="check" style={ada ? undefined : { opacity: 0.5 }}>
        <input type="checkbox" checked={!!diperiksa} disabled={!ada} onChange={(e) => onDiperiksa(e.target.checked)} />
        <span>Sudah diperiksa</span>
      </label>
    </div>
  );
}
