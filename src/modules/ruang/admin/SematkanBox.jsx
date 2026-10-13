import React, { useState } from 'react';
import { Field } from '../host.js';

const BASAWAL = /localhost|127\.0\.0\.1/.test(window.location.hostname) ? 'https://simantap-tl.web.app' : window.location.origin;

// Kotak "Sematkan di situs lain": menyusun alamat halaman sematan (embed/ruang.html) dan
// kode iframe siap tempel untuk WordPress. Tidak mengubah data apa pun.
export function SematkanBox({ ruang = [] }) {
  const [basis, setBasis] = useState(BASAWAL);
  const [view, setView] = useState('minggu');
  const [pilih, setPilih] = useState([]); // kosong = semua ruang
  const [tersalin, setTersalin] = useState('');

  const aktif = ruang.filter((r) => r.aktif !== false).sort((a, b) => (a.urut || 0) - (b.urut || 0));
  const url = `${basis.replace(/\/+$/, '')}/embed/ruang.html?view=${view}${pilih.length ? `&ruang=${pilih.map(encodeURIComponent).join(',')}` : ''}`;
  const kode = `<iframe id="jadwal-ruang" src="${url}"
        style="width:100%;border:0;min-height:600px" loading="lazy" title="Jadwal ruang"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.data && e.data.ruangEmbedTinggi) document.getElementById('jadwal-ruang').style.height = e.data.ruangEmbedTinggi + 'px';
  });
</script>`;

  async function salin(apa, teks) {
    try { await navigator.clipboard.writeText(teks); setTersalin(apa); setTimeout(() => setTersalin(''), 2000); } catch { setTersalin('gagal'); }
  }
  const toggle = (nama) => setPilih((p) => (p.includes(nama) ? p.filter((x) => x !== nama) : [...p, nama]));

  return (
    <details className="card" style={{ padding: 12, marginBottom: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Sematkan di situs lain (WordPress, dll.)</summary>
      <p className="hint">Menampilkan jadwal ruang yang sudah terbit sebagai tabel hanya-baca di situs lain, tanpa login. Nama mahasiswa dan penanggung jawab tidak ikut tampil. Tempel kode di bawah ke blok “HTML Kustom”.</p>
      <div className="form-grid">
        <Field label="Alamat situs SIMANTAP (Firebase)"><input value={basis} onChange={(e) => setBasis(e.target.value)} /></Field>
        <Field label="Tampilan awal">
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="hari">Harian</option>
            <option value="minggu">Mingguan</option>
            <option value="bulan">Bulanan</option>
          </select>
        </Field>
        <Field label={`Ruang yang ditampilkan (${pilih.length ? pilih.length + ' dipilih' : 'semua'})`} full>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {aktif.map((r) => (
              <label key={r.id} className="check"><input type="checkbox" checked={pilih.includes(r.nama)} onChange={() => toggle(r.nama)} /><span>{r.nama}</span></label>
            ))}
            {!aktif.length && <span className="hint">Belum ada ruang.</span>}
          </div>
        </Field>
        <Field label="Alamat halaman" full>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-sm" onClick={() => salin('url', url)}>{tersalin === 'url' ? 'Tersalin' : 'Salin'}</button>
            <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">Buka</a>
          </div>
        </Field>
        <Field label="Kode untuk WordPress" full>
          <textarea readOnly rows={7} value={kode} onFocus={(e) => e.target.select()} style={{ fontFamily: 'monospace', fontSize: '0.78rem' }} />
          <div style={{ marginTop: 6 }}><button type="button" className="btn btn-sm btn-primary" onClick={() => salin('kode', kode)}>{tersalin === 'kode' ? 'Tersalin' : tersalin === 'gagal' ? 'Gagal — salin manual' : 'Salin kode'}</button></div>
        </Field>
      </div>
    </details>
  );
}
