import React from 'react';
import { adaPerubahanData, berkasSebelumPerubahan, dokumenFieldFor, formatWaktu, programOf } from '../../utils/helpers.js';

// Di atas modal edit admin: data yang diubah mahasiswa setelah diverifikasi
// (m.perubahanData, lihat hitungPerubahanData di helpers.js), lama → baru per
// field, plus berkas bertanda tangan yang diunggah sebelum perubahan itu. Centang
// = minta unggah ulang (upload.perluUlang); berkasnya tidak dihapus. Banner hilang
// setelah admin menyimpan status Terverifikasi (submit FormMahasiswa).
export function BannerPerubahanData({ m, setM }) {
  if (!adaPerubahanData(m)) return null;
  const { at, item } = m.perubahanData;
  const berkas = berkasSebelumPerubahan(m);
  const field = dokumenFieldFor(programOf(m));

  function mintaUlang(key, v) {
    setM((prev) => {
      const dok = prev[field] || {};
      return { ...prev, [field]: { ...dok, [key]: { ...dok[key], perluUlang: v } } };
    });
  }

  return (
    <div className="banner-perubahan">
      <div className="banner-perubahan-head">
        <strong>Data diubah mahasiswa</strong>
        {at && <span className="banner-perubahan-tgl">{formatWaktu(at)}</span>}
      </div>
      <ul className="banner-perubahan-list">
        {Object.entries(item).map(([k, v]) => (
          <li key={k}>
            <span className="banner-perubahan-label">{v.label}</span>
            <span><s>{v.lama || '(kosong)'}</s> → <strong>{v.baru || '(kosong)'}</strong></span>
          </li>
        ))}
      </ul>
      {berkas.length > 0 && field && (
        <div className="banner-perubahan-berkas">
          <span className="banner-perubahan-label">Minta unggah ulang</span>
          {berkas.map((d) => (
            <label key={d.key} className="check" title={d.upload.fileName}>
              <input type="checkbox" checked={!!d.upload.perluUlang} onChange={(e) => mintaUlang(d.key, e.target.checked)} />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
