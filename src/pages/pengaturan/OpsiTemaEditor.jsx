import React, { useState } from 'react';
import { semuaKpTema, semuaBidang } from '../../utils/pilihan.js';
import { TeksLive } from './TeksLive.jsx';

// ===================== OpsiTemaEditor.jsx =====================
// Editor pilihan dropdown Tema KP/Magang (jenis 'kpTema') atau Bidang
// TA/Capstone/S2 (jenis 'bidang'), dipakai di dalam kartu field "Tema / Bidang"
// pada Pengaturan → Form Pendaftaran. Disimpan di config/global →
// konten.pilihan (aturan bawaan, arsip & kode: lihat utils/pilihan.js).

// "Sistem Manajemen (SML)" -> "SistemManajemenSML". Unik di KEDUA daftar karena
// labelPilihan() mencari label lewat kode saja.
function buatKode(label, sudahAda) {
  const dasar = label.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, ' ').trim()
    .split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('').slice(0, 24) || 'Baru';
  let kode = dasar;
  for (let n = 2; sudahAda.has(kode); n++) kode = dasar + n;
  return kode;
}

export function OpsiTemaEditor({ jenis, konten = {}, onSimpan }) {
  const [baru, setBaru] = useState('');
  const [versi, setVersi] = useState(0); // naik saat reset agar kolom teks mengambil ulang nilainya
  const kpTema = semuaKpTema();
  const bidang = semuaBidang();
  const daftar = jenis === 'kpTema' ? kpTema : bidang;
  const semuaKode = new Set([...kpTema, ...bidang].map((x) => x.kode));

  function simpan(list) { onSimpan({ ...konten, pilihan: { ...(konten.pilihan || {}), [jenis]: list } }); }
  function reset() {
    const next = { ...(konten.pilihan || {}) };
    delete next[jenis];
    onSimpan({ ...konten, pilihan: next });
    setVersi((v) => v + 1);
  }
  function ubah(i, patch) { simpan(daftar.map((x, j) => (j === i ? { ...x, ...patch } : x))); }
  function geser(i, arah) {
    const j = i + arah;
    if (j < 0 || j >= daftar.length) return;
    const next = daftar.slice();
    [next[i], next[j]] = [next[j], next[i]];
    simpan(next);
  }
  function tambah() {
    const label = baru.trim();
    if (!label) return;
    simpan([...daftar, { kode: buatKode(label, semuaKode), label, isActive: true }]);
    setBaru('');
  }

  return (
    <div className="ff-opsi">
      <div className="ff-opsi-title">Pilihan dropdown</div>
      <p className="hint" style={{ margin: '0 0 8px' }}>
        Nonaktifkan (bukan hapus) pilihan yang tidak dipakai lagi — mahasiswa yang sudah memilihnya
        tetap tampil dengan namanya. Kode dibuat otomatis dan tidak bisa diubah.
      </p>
      <ul className="ff-opsi-list">
        {daftar.map((x, i) => (
          <li key={x.kode} className={x.isActive ? '' : 'ff-opsi-off'}>
            <TeksLive key={x.kode + versi} nilai={x.label} aria-label={`Nama pilihan ${x.kode}`}
              onUbah={(v) => { if (v.trim() && v.trim() !== x.label) ubah(i, { label: v.trim() }); }} />
            <code title="Kode tersimpan di data mahasiswa">{x.kode}</code>
            <button type="button" className="link-btn" onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Naikkan">↑</button>
            <button type="button" className="link-btn" onClick={() => geser(i, 1)} disabled={i === daftar.length - 1} aria-label="Turunkan">↓</button>
            <button type="button" className={'link-btn' + (x.isActive ? ' danger' : '')} onClick={() => ubah(i, { isActive: !x.isActive })}>
              {x.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </li>
        ))}
      </ul>
      <div className="ff-opsi-add">
        <input value={baru} onChange={(e) => setBaru(e.target.value)} placeholder="Tambah pilihan…"
          onKeyDown={(e) => { if (e.key === 'Enter') tambah(); }} />
        <button type="button" className="btn btn-primary" onClick={tambah}>Tambah</button>
      </div>
      <button type="button" className="link-btn" style={{ marginTop: 6 }}
        onClick={() => { if (window.confirm('Kembalikan daftar ini ke bawaan? Pilihan tambahan Anda tidak lagi muncul di dropdown (data mahasiswa tidak berubah).')) reset(); }}>
        Kembalikan ke bawaan
      </button>
    </div>
  );
}
