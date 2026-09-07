import React from 'react';
import { PROGRAM_KEYS, programLabel, normalizeUrl } from '../utils/helpers.js';
import { Empty, ThemeToggle, TextSizeToggle, RolePill } from '../components/ui.jsx';
import logoTl from '../assets/logo-tl.png';

// Halaman /panduan — daftar SEMUA panduan (dikelola admin di Pengaturan >
// Kelola Panduan), dikelompokkan per program; item tanpa program masuk "Umum".
// Alamat sendiri (bukan tab/dropdown) supaya bisa dibuka langsung/dibagikan,
// sama seperti /pengaturan di App.jsx.
export function PanduanPage({ nama, nim, panduan = [], onBack, onLogout }) {
  const grup = [
    { key: '', label: 'Umum (semua program)' },
    ...PROGRAM_KEYS.map((p) => ({ key: p, label: programLabel(p) })),
  ]
    .map((g) => ({ ...g, items: panduan.filter((p) => (p.program || '') === g.key) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="app">
      <header className="topbar">
        <button className="btn btn-logout btn-sm" onClick={onLogout}>Logout</button>
        <div className="brand">
          <img className="brand-mark" src={logoTl} alt="TL Undip" />
          <span className="brand-name">SIMANTAP</span>
        </div>
        <div className="topbar-right">
          <ThemeToggle />
          <TextSizeToggle />
          <RolePill peran="mahasiswa" nama={nama} />
          <button className="btn ghost" onClick={onBack}>← Kembali</button>
        </div>
      </header>
      <div className="masthead-rule" />
      <main className="content">
        <div className="portal">
          <div className="toolbar">
            <h2 className="page-title">Panduan</h2>
          </div>
          {grup.length === 0 ? (
            <Empty>Belum ada panduan yang diunggah admin.</Empty>
          ) : (
            grup.map((g) => (
              <div className="card" key={g.key || 'umum'} style={{ marginBottom: 16 }}>
                <h3 className="card-title">{g.label}</h3>
                <ul className="periode-list">
                  {g.items.map((p) => (
                    <li key={p.id} className="periode-item">
                      <span>{p.label}</span>
                      <a className="btn btn-primary btn-sm" href={normalizeUrl(p.url)} target="_blank" rel="noreferrer">Baca Panduan</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </main>
      <footer className="foot">SIMANTAP © 2026 Universitas Diponegoro</footer>
    </div>
  );
}
