import React, { useState } from 'react';
import { Field, Empty } from '../../components/ui.jsx';

export function SeksiPeriode({ dibuka, periodeAktif, onBuka, onTutup, onSetAktif }) {
  const [nilai, setNilai] = useState('');
  const [aktif, setAktif] = useState(periodeAktif || '');
  function tambah() {
    const v = nilai.trim();
    if (!v) return;
    onBuka(v);
    setNilai('');
  }
  function simpanAktif() { onSetAktif(aktif.trim()); }
  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Periode yang dibuka di sini akan muncul sebagai pilihan saat mahasiswa mendaftar.
      </p>
      <div className="form-grid">
        <Field label="Periode aktif saat ini (ditampilkan di halaman login)" full>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={aktif} onChange={(e) => setAktif(e.target.value)} placeholder="mis. Genap 2026"
              onKeyDown={(e) => { if (e.key === 'Enter') simpanAktif(); }} />
            <button className="btn" onClick={simpanAktif}>Simpan</button>
          </div>
        </Field>
        <Field label="Buka periode baru" full>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="mis. 2025 Ganjil"
              onKeyDown={(e) => { if (e.key === 'Enter') tambah(); }} />
            <button className="btn btn-primary" onClick={tambah}>Buka</button>
          </div>
        </Field>
      </div>
      <div className="sched" style={{ marginTop: 12 }}>
        <div className="sched-title">Periode yang sedang dibuka</div>
        {dibuka.length === 0 ? (
          <Empty>Belum ada periode yang dibuka.</Empty>
        ) : (
          <ul className="periode-list">
            {dibuka.map((p) => (
              <li key={p} className="periode-item">
                <span>{p}</span>
                <button className="link-btn danger" onClick={() => onTutup(p)}>Tutup</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
