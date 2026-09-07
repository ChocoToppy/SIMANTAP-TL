import React, { useState } from 'react';
import { SeksiPeriode } from './pengaturan/SeksiPeriode.jsx';
import { SeksiPengumuman } from './pengaturan/SeksiPengumuman.jsx';
import { SeksiPanduan } from './pengaturan/SeksiPanduan.jsx';
import { SeksiKonten } from './pengaturan/SeksiKonten.jsx';
import { SeksiAkun } from './pengaturan/SeksiAkun.jsx';
import { SeksiStaf } from './pengaturan/SeksiStaf.jsx';

// ===================== Pengaturan.jsx =====================
// Halaman admin "Pengaturan" — dulunya tiga modal terpisah (Kelola periode /
// pengumuman / panduan) yang dipicu dari tombol-tombol di topbar. Sekarang
// halaman sendiri (alamat /pengaturan, lihat App.jsx) dengan sidebar navigasi
// sendiri (gaya halaman Settings), sengaja dibuat terlihat beda dari tab-tab
// admin lain supaya jelas ini "ruang" terpisah — dan supaya menambah bagian
// baru di masa depan (mis. editor konten teks) tinggal jadi satu item sidebar
// lagi tanpa menambah apa pun di topbar.
//
// Tiap seksi (Periode/Pengumuman/Panduan/Konten/Akun/Staf) hidup di file
// sendiri di folder ./pengaturan/ — halaman ini hanya jadi sidebar + router.

const SUB_TABS = [
  { key: 'periode', label: 'Periode', icon: '🗓️' },
  { key: 'pengumuman', label: 'Pengumuman', icon: '📢' },
  { key: 'panduan', label: 'Kelola Panduan', icon: '📘' },
  { key: 'konten', label: 'Konten', icon: '📝' },
  { key: 'akun', label: 'Akun Mahasiswa', icon: '🔑' },
  { key: 'staf', label: 'Dosen & Admin', icon: '👤' },
];

export function Pengaturan({
  periodeBuka, periodeAktif, onBukaPeriode, onTutupPeriode, onSetPeriodeAktif,
  pengumuman, onSimpanPengumuman,
  panduan, onSimpanPanduan,
  konten = {}, onSimpanKonten,
  akun = [], dosen = [], admin = [],
  onResetPassword, onCreateUser, onToggleAkunAktif, onDeleteAkun, onToggleDosenAktif, onEditDosen,
  isSuperAdmin = false, currentAdminUid, onDeleteAdmin, onClaimSuperAdmin, onUpdateSelfAdmin,
}) {
  const [subTab, setSubTab] = useState(SUB_TABS[0].key);
  const aktif = SUB_TABS.find((t) => t.key === subTab) || SUB_TABS[0];

  return (
    <div className="pengaturan-layout">
      <div className="pengaturan-side">
        <h2 className="page-title" style={{ marginBottom: 20 }}>Pengaturan</h2>
        <nav className="pengaturan-nav">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={'pengaturan-nav-item' + (subTab === t.key ? ' active' : '')}
              onClick={() => setSubTab(t.key)}
            >
              <span className="pengaturan-nav-icon" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pengaturan-main">
        <div className="pengaturan-section-title">{aktif.label}</div>

        {subTab === 'periode' && (
          <SeksiPeriode
            dibuka={periodeBuka}
            periodeAktif={periodeAktif}
            onBuka={onBukaPeriode}
            onTutup={onTutupPeriode}
            onSetAktif={onSetPeriodeAktif}
          />
        )}
        {subTab === 'pengumuman' && (
          <SeksiPengumuman daftar={pengumuman} onSimpan={onSimpanPengumuman} />
        )}
        {subTab === 'panduan' && (
          <SeksiPanduan daftar={panduan} onSimpan={onSimpanPanduan} />
        )}
        {subTab === 'konten' && (
          <SeksiKonten konten={konten} onSimpan={onSimpanKonten} />
        )}
        {subTab === 'akun' && (
          <SeksiAkun daftar={akun} onReset={onResetPassword} onToggleAktif={onToggleAkunAktif} onDelete={onDeleteAkun} />
        )}
        {subTab === 'staf' && (
          <SeksiStaf dosen={dosen} admin={admin} onReset={onResetPassword} onCreate={onCreateUser} onToggleDosenAktif={onToggleDosenAktif} onEditDosen={onEditDosen}
            isSuperAdmin={isSuperAdmin} currentAdminUid={currentAdminUid} onDeleteAdmin={onDeleteAdmin} onClaimSuperAdmin={onClaimSuperAdmin} onUpdateSelfAdmin={onUpdateSelfAdmin} />
        )}
      </div>
    </div>
  );
}
