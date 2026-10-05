import React, { useState } from 'react';

// Kolom teks untuk editor visual: tiap ketikan langsung masuk ke draf (pratinjau ikut
// berubah), tapi yang tampil tetap apa yang sedang diketik — tidak dipaksa kembali ke
// nilai bawaan saat kolom sementara dikosongkan. Beri `key` baru untuk memaksa
// mengambil ulang `nilai` (mis. setelah "Kembalikan ke bawaan").
export function TeksLive({ nilai, onUbah, area, rows = 3, ...sisa }) {
  const [v, setV] = useState(nilai);
  const ganti = (e) => { setV(e.target.value); onUbah(e.target.value); };
  return area
    ? <textarea rows={rows} value={v} onChange={ganti} {...sisa} />
    : <input value={v} onChange={ganti} {...sisa} />;
}
