import React, { useState } from 'react';
import { SeksiPeriode } from './pengaturan/SeksiPeriode.jsx';
import { SeksiAngkatan } from './pengaturan/SeksiAngkatan.jsx';
import { SeksiPengumuman } from './pengaturan/SeksiPengumuman.jsx';
import { SeksiPanduan } from './pengaturan/SeksiPanduan.jsx';
import { SeksiKonten } from './pengaturan/SeksiKonten.jsx';
import { SeksiAkun } from './pengaturan/SeksiAkun.jsx';
import { SeksiStaf } from './pengaturan/SeksiStaf.jsx';
import { SeksiForm } from './pengaturan/SeksiForm.jsx';
import { SeksiNomorSurat } from './pengaturan/SeksiNomorSurat.jsx';
import { SeksiJadwalRuang } from '../modules/ruang';
import { FITUR_EKSPERIMENTAL } from '../utils/config.js';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import { TabIcon } from '../components/ui.jsx';
import { konfirmasiKeluar } from '../utils/perubahanBelumDisimpan.js';

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
  { key: 'periode', label: 'Periode', icon: 'kalender' },
  { key: 'angkatan', label: 'Angkatan', icon: 'mahasiswa' },
  { key: 'pengumuman', label: 'Pengumuman', icon: 'pengumuman' },
  { key: 'panduan', label: 'Kelola Panduan', icon: 'buku' },
  { key: 'form', label: 'Form Pendaftaran', icon: 'pengajuan' },
  { key: 'konten', label: 'Konten', icon: 'dokumen' },
  { key: 'nomorSurat', label: 'Registri Nomor Surat', icon: 'dokumen' },
  { key: 'akun', label: 'Akun Mahasiswa', icon: 'kunci' },
  { key: 'staf', label: 'Dosen & Admin', icon: 'akun' },
  // Eksperimental: hanya ada di build `full`, lihat FITUR_EKSPERIMENTAL.
  ...(FITUR_EKSPERIMENTAL ? [{ key: 'ruang', label: 'Jadwal Ruang', icon: 'ruang' }] : []),
];

export function Pengaturan({
  periodeBuka, periodeAktif, onBukaPeriode, onTutupPeriode, onSetPeriodeAktif,
  pengumuman, onSimpanPengumuman,
  panduan, onSimpanPanduan,
  konten = {}, onSimpanKonten,
  akun = [], dosen = [], mahasiswa = [], admin = [],
  onResetPassword, onCreateUser, onToggleAkunAktif, onDeleteAkun, onToggleDosenAktif, onEditDosen,
  isSuperAdmin = false, currentAdminUid, onDeleteAdmin, onClaimSuperAdmin, onUpdateSelfAdmin,
  angkatan = [], onTambahAngkatan, onToggleAngkatanAktif,
  jadwalRuang = null, aksiJadwalRuang,
}) {
  const [subTab, setSubTab] = useState(SUB_TABS[0].key);
  const aktif = SUB_TABS.find((t) => t.key === subTab) || SUB_TABS[0];
  // Pindah menu: minta konfirmasi bila editor visual masih punya draf yang belum disimpan.
  const pindahSeksi = (k) => { if (k === subTab || konfirmasiKeluar()) setSubTab(k); };

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
              onClick={() => pindahSeksi(t.key)}
            >
              <span className="pengaturan-nav-icon" aria-hidden="true"><TabIcon tabKey={t.icon} /></span>
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
        {subTab === 'angkatan' && (
          <SeksiAngkatan daftar={angkatan} onTambah={onTambahAngkatan} onToggleAktif={onToggleAngkatanAktif} />
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
        {subTab === 'form' && (
          <SeksiForm konten={konten} onSimpan={onSimpanKonten} bukaSeksi={pindahSeksi} dosen={dosen} angkatan={angkatan} periodeBuka={periodeBuka} />
        )}
        {subTab === 'nomorSurat' && <SeksiNomorSurat />}
        {subTab === 'akun' && (
          <SeksiAkun daftar={akun} onReset={onResetPassword} onToggleAktif={onToggleAkunAktif} onDelete={onDeleteAkun} />
        )}
        {subTab === 'ruang' && <ErrorBoundary><SeksiJadwalRuang data={jadwalRuang} dosen={dosen} mahasiswa={mahasiswa} aksi={aksiJadwalRuang} /></ErrorBoundary>}
        {subTab === 'staf' && (
          <SeksiStaf dosen={dosen} admin={admin} onReset={onResetPassword} onCreate={onCreateUser} onToggleDosenAktif={onToggleDosenAktif} onEditDosen={onEditDosen}
            isSuperAdmin={isSuperAdmin} currentAdminUid={currentAdminUid} onDeleteAdmin={onDeleteAdmin} onClaimSuperAdmin={onClaimSuperAdmin} onUpdateSelfAdmin={onUpdateSelfAdmin} />
        )}
      </div>
    </div>
  );
}
