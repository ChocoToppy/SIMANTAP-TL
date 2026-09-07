import React, { useState } from 'react';
import { catatAktivitas, dokumenConfigFor, dokumenFieldFor, eventAktif, programOf } from '../utils/helpers.js';
import { Empty, TextSizeToggle, ThemeToggle, TabIcon } from '../components/ui.jsx';
import { readFileForUpload } from '../utils/fileUpload.js';
import logoTl from '../assets/logo-tl.png';
import { AkunForm } from './portal/AkunForm.jsx';
import { PenggunaanRuangPortal } from './portal/PenggunaanRuangPortal.jsx';
import { KartuPengajuan } from './portal/KartuPengajuan.jsx';
import { FormPendaftaran } from './portal/FormPendaftaran.jsx';
import { FormJadwalMhs } from './portal/FormJadwalMhs.jsx';
import { FormPerpanjangan } from './portal/FormPerpanjangan.jsx';

// ===================== Portal.jsx =====================
// Portal.jsx — tampilan untuk mahasiswa (Rute A)
//
// Ini hanya jadi shell (tabs + routing antar view) — sub-form/kartu masing-
// masing hidup di file sendiri di folder ./portal/. Lihat juga PanduanPage.jsx
// dan DosenPortal.jsx (halaman terpisah yang dulunya ada di file ini juga).

const PORTAL_TABS = [
  { key: 'pengajuan', label: 'Pengajuan' },
  { key: 'ruang', label: 'Penggunaan Ruang' },
  { key: 'akun', label: 'Akun' },
];

export function Portal({ nim, nama, email, mahasiswa, allDosen, periodeBuka = [], panduan = [], konten = {}, onSave, onSimpanAkun, onLogout, onOpenPanduan, initialTab = 'pengajuan' }) {
  const mine = mahasiswa.filter((m) => m.owner === nim);
  const [tab, setTab] = useState(initialTab);
  const [view, setView] = useState({ mode: 'list' });

  function simpan(rec) { onSave(rec); setView({ mode: 'list' }); }

  async function uploadDokumenKP(m, key, file) {
    const hasil = await readFileForUpload(file, `${m.id}/${key}`);
    const field = dokumenFieldFor(programOf(m)) || 'dokumenKP';
    const label = ((dokumenConfigFor(programOf(m)) || []).find((d) => d.key === key) || {}).label || key;
    let rec = { ...m, [field]: { ...(m[field] || {}), [key]: hasil } };
    rec = catatAktivitas(rec, 'unggah', label);
    if (key === 'suratBalasan' && m.tahap === 'Pendaftaran') {
      rec = { ...rec, tahap: 'Bimbingan' };
      rec = catatAktivitas(rec, 'tahapBimbingan');
    }
    onSave(rec);
  }

  // Berkas lama (bila ada) dibersihkan dari Storage otomatis oleh
  // simpanMahasiswa di App.jsx begitu record baru ini (tanpa key tsb.)
  // tersimpan — di sini cukup keluarkan key-nya dari dokumen program ini.
  function hapusDokumenKP(m, key) {
    const field = dokumenFieldFor(programOf(m)) || 'dokumenKP';
    if (!(m[field] || {})[key]) return;
    const label = ((dokumenConfigFor(programOf(m)) || []).find((d) => d.key === key) || {}).label || key;
    const dokumen = { ...(m[field] || {}) };
    delete dokumen[key];
    let rec = { ...m, [field]: dokumen };
    rec = catatAktivitas(rec, 'hapusBerkas', label);
    onSave(rec);
  }

  const editing = view.id ? mine.find((m) => m.id === view.id) : null;

  return (
    <div className="app">
      <header className="topbar topbar-identity">
        <div className="brand brand-identity">
          <img className="brand-mark" src={logoTl} alt="TL Undip" />
          <div className="brand-identity-text">
            <div className="brand-identity-name" title={nama}>{(nama || '').trim().split(/\s+/).slice(0, 2).join(' ') || nama}</div>
            <div className="brand-identity-nim">{nim}</div>
          </div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={onOpenPanduan}>Panduan</button>
          <ThemeToggle square />
          <TextSizeToggle />
        </div>
      </header>
      <div className="masthead-rule" />

      <nav className="tabs">
        {PORTAL_TABS.map((t) => (
          <button key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
            <TabIcon tabKey={t.key} />
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'pengajuan' && (
          <>
            {view.mode === 'list' && (
              <div className="portal">
                <div className="toolbar">
                  <h2 className="page-title">Pengajuan saya</h2>
                  <button className="btn btn-primary push" onClick={() => setView({ mode: 'daftar' })}>+ Ajukan pendaftaran</button>
                </div>
                {mine.length === 0 ? (
                  <Empty>Belum ada pengajuan. Klik "Ajukan pendaftaran" untuk memulai.</Empty>
                ) : (
                  <div className="cards">
                    {mine.map((m) => (
                      <KartuPengajuan key={m.id} m={m} allDosen={allDosen} konten={konten} panduan={panduan}
                        onEdit={() => setView({ mode: 'edit', id: m.id })}
                        onJadwal={(ev) => setView({ mode: 'jadwal', id: m.id, ev })}
                        onPerpanjangan={(mode) => setView({ mode: 'pp-' + mode, id: m.id })}
                        onUploadDokumenKP={(key, file) => uploadDokumenKP(m, key, file)}
                        onDeleteDokumenKP={(key) => hapusDokumenKP(m, key)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {(view.mode === 'daftar' || view.mode === 'edit') && (
              <FormPendaftaran
                awal={editing}
                nim={nim}
                nama={nama}
                allDosen={allDosen}
                periodeBuka={periodeBuka}
                onCancel={() => setView({ mode: 'list' })}
                onSave={simpan}
              />
            )}

            {view.mode === 'jadwal' && editing && (
              <FormJadwalMhs awal={editing} ev={view.ev || eventAktif(editing)} konten={konten} onCancel={() => setView({ mode: 'list' })} onSave={simpan} />
            )}

            {(view.mode === 'pp-minta' || view.mode === 'pp-final') && editing && (
              <FormPerpanjangan awal={editing} allDosen={allDosen} mode={view.mode === 'pp-final' ? 'final' : 'minta'} onCancel={() => setView({ mode: 'list' })} onSave={simpan} />
            )}
          </>
        )}

        {tab === 'ruang' && <PenggunaanRuangPortal mahasiswa={mahasiswa} />}

        {tab === 'akun' && <AkunForm nama={nama} nim={nim} email={email} onSimpan={onSimpanAkun} onLogout={onLogout} />}
      </main>
    </div>
  );
}
