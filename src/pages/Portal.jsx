import React, { useState } from 'react';
import { catatAktivitas, ditutup, tandaiMenungguVerifikasi, hitungPerubahanData, KUNCI_SURAT_BALASAN, dokumenConfigFor, dokumenFieldFor, eventAktif, programOf, programLabel } from '../utils/helpers.js';
import { PROGRAM_KEYS_PENDAFTARAN } from './portal/shared.js';
import { Empty, TextSizeToggle, ThemeToggle, TabIcon } from '../components/ui.jsx';
import { readFileForUpload } from '../utils/fileUpload.js';
import logoTl from '../assets/logo-tl.png';
import { AkunForm } from './portal/AkunForm.jsx';
import { JadwalMahasiswa } from './portal/JadwalMahasiswa.jsx';
import { KartuPengajuan } from './portal/KartuPengajuan.jsx';
import { HalamanDokumen } from './portal/HalamanDokumen.jsx';
import { FormPendaftaran } from './portal/FormPendaftaran.jsx';
import { FormJadwalMhs } from './portal/FormJadwalMhs.jsx';
import { FormPerpanjangan } from './portal/FormPerpanjangan.jsx';
import { FormSuratBalasan } from './portal/FormSuratBalasan.jsx';
import { MEDAN_SURAT_BALASAN, META } from '../utils/formPendaftaran.js';

// ===================== Portal.jsx =====================
// Portal.jsx — tampilan untuk mahasiswa (Rute A)
//
// Ini hanya jadi shell (tabs + routing antar view) — sub-form/kartu masing-
// masing hidup di file sendiri di folder ./portal/. Lihat juga PanduanPage.jsx
// dan DosenPortal.jsx (halaman terpisah yang dulunya ada di file ini juga).

const PORTAL_TABS = [
  { key: 'pengajuan', label: 'Pengajuan' },
  { key: 'ruang', label: 'Jadwal' },
  { key: 'akun', label: 'Akun' },
];

export function Portal({ nim, nama, email, mahasiswa, allDosen, periodeBuka = [], angkatanAktif = [], panduan = [], konten = {}, jadwalRuang = null, onSave, onDelete, onSimpanAkun, onLogout, onOpenPanduan, initialTab = 'pengajuan' }) {
  // Pengajuan yang ditutup admin tampil paling bawah sebagai arsip.
  const mine = mahasiswa.filter((m) => m.owner === nim).sort((a, b) => Number(ditutup(a)) - Number(ditutup(b)));
  // Satu pengajuan TERBUKA per program (lihat idPengajuanBaru & firestore.rules).
  const programTerpakai = mine.filter((m) => !ditutup(m)).map((m) => programOf(m));
  const semuaTerpakai = PROGRAM_KEYS_PENDAFTARAN.every((k) => programTerpakai.includes(k));
  const [tab, setTab] = useState(initialTab);
  const [view, setView] = useState({ mode: 'list' });

  function simpan(rec) { onSave(rec); setView({ mode: 'list' }); }
  // Kiriman yang perlu diperiksa admin (usulan jadwal, berkas sidang,
  // perpanjangan) → status kembali "Menunggu verifikasi".
  function simpanAjuan(rec) { simpan(tandaiMenungguVerifikasi(rec)); }

  // dataPerusahaan diisi FormSuratBalasan. Surat balasan tanpa data itu belum
  // diunggah: mahasiswa diarahkan dulu ke form konfirmasi.
  async function uploadDokumenKP(m, key, file, dataPerusahaan = null) {
    const suratBalasan = KUNCI_SURAT_BALASAN.includes(key);
    if (suratBalasan && !dataPerusahaan) { setView({ mode: 'suratBalasan', id: m.id, key, file }); return; }
    const hasil = await readFileForUpload(file, `${m.id}/${key}`);
    const field = dokumenFieldFor(programOf(m)) || 'dokumenKP';
    const label = ((dokumenConfigFor(programOf(m), m) || []).find((d) => d.key === key) || {}).label || key;
    let rec = { ...m, [field]: { ...(m[field] || {}), [key]: hasil } };
    rec = catatAktivitas(rec, 'unggah', label);
    // Surat balasan: data perusahaan ikut tersimpan (lalu terkunci), tahap ke
    // Bimbingan, dan admin memeriksa (menetapkan pembimbing / mengecek data baru).
    if (suratBalasan) {
      const pendaftaran = { ...(rec.pendaftaran || {}) };
      MEDAN_SURAT_BALASAN.forEach((id) => {
        const { di, kolom } = META[id];
        if (di === 'p') pendaftaran[kolom] = dataPerusahaan[id];
        else rec = { ...rec, [kolom]: dataPerusahaan[id] };
      });
      rec = { ...rec, pendaftaran };
      // Data perusahaan yang tercetak di dokumen ikut berubah: kunci unduhan sampai diverifikasi ulang.
      rec = { ...rec, perubahanData: hitungPerubahanData(m, rec) };
      if (m.tahap === 'Pendaftaran') {
        rec = { ...rec, tahap: 'Bimbingan' };
        rec = catatAktivitas(rec, 'tahapBimbingan');
      }
      rec = tandaiMenungguVerifikasi(rec);
    }
    // Lembar pengesahan → Pembukuan langsung, tanpa verifikasi admin.
    if (key === 'lembarPengesahanKP' && m.tahap === 'Bimbingan') {
      rec = { ...rec, tahap: 'Pembukuan' };
      rec = catatAktivitas(rec, 'tahapPembukuan');
    }
    onSave(rec);
  }

  // Berkas lama (bila ada) dibersihkan dari Storage otomatis oleh
  // simpanMahasiswa di App.jsx begitu record baru ini (tanpa key tsb.)
  // tersimpan — di sini cukup keluarkan key-nya dari dokumen program ini.
  function hapusDokumenKP(m, key) {
    const field = dokumenFieldFor(programOf(m)) || 'dokumenKP';
    if (!(m[field] || {})[key]) return;
    const label = ((dokumenConfigFor(programOf(m), m) || []).find((d) => d.key === key) || {}).label || key;
    const dokumen = { ...(m[field] || {}) };
    delete dokumen[key];
    let rec = { ...m, [field]: dokumen };
    rec = catatAktivitas(rec, 'hapusBerkas', label);
    // Tanpa surat balasan, mahasiswa kembali ke Pendaftaran (pembimbing & nomor
    // surat tetap) dan data perusahaan bisa diubah lagi.
    if (KUNCI_SURAT_BALASAN.includes(key) && m.tahap === 'Bimbingan') {
      rec = { ...rec, tahap: 'Pendaftaran' };
      rec = catatAktivitas(rec, 'kembaliPendaftaran');
    }
    onSave(rec);
  }

  // Tautan yang dikirim dari halaman dokumen (saat ini hanya folder berkas final
  // KP → m.pembukuan.berkasLink). Mencabut centang "Sudah diperiksa" supaya admin
  // memeriksa ulang sebelum surat selesai pembukuan terbuka (pembukuanDisetujui).
  function kirimTautan(m, field, url) {
    const rec = { ...m, [field]: { ...(m[field] || {}), berkasLink: url, berkasDiperiksa: false } };
    onSave(tandaiMenungguVerifikasi(catatAktivitas(rec, field)));
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
          <ThemeToggle />
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
                  <button className="btn btn-primary push" onClick={() => setView({ mode: 'daftar' })} disabled={semuaTerpakai}
                    title={semuaTerpakai ? 'Setiap program hanya bisa diajukan sekali. Hapus pengajuan lama untuk membuat yang baru.' : undefined}>+ Ajukan pendaftaran</button>
                </div>
                {mine.length === 0 ? (
                  <Empty>Belum ada pengajuan. Klik "Ajukan pendaftaran" untuk memulai.</Empty>
                ) : (
                  <div className="cards">
                    {mine.map((m) => (
                      <KartuPengajuan key={m.id} m={m} allDosen={allDosen} konten={konten} panduan={panduan}
                        onEdit={() => setView({ mode: 'edit', id: m.id })}
                        onHapus={() => { if (window.confirm(`Hapus pengajuan ${programLabel(programOf(m))}? Semua berkas yang sudah diunggah ikut terhapus.`)) onDelete(m.id); }}
                        onJadwal={(ev) => setView({ mode: 'jadwal', id: m.id, ev })}
                        onPerpanjangan={(mode) => setView({ mode: 'pp-' + mode, id: m.id })}
                        onDokumen={() => setView({ mode: 'dokumen', id: m.id })} />
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
                angkatanAktif={angkatanAktif}
                konten={konten}
                programTerpakai={programTerpakai}
                idAda={mine.map((m) => m.id)}
                onCancel={() => setView({ mode: 'list' })}
                onSave={simpan}
              />
            )}

            {view.mode === 'dokumen' && editing && (
              <HalamanDokumen m={editing} allDosen={allDosen} konten={konten}
                onBack={() => setView({ mode: 'list' })}
                onUpload={(key, file) => uploadDokumenKP(editing, key, file)}
                onDeleteUpload={(key) => hapusDokumenKP(editing, key)}
                onKirimTautan={(field, url) => kirimTautan(editing, field, url)} />
            )}

            {view.mode === 'suratBalasan' && editing && (
              <FormSuratBalasan awal={editing} file={view.file} konten={konten}
                onCancel={() => setView({ mode: 'dokumen', id: editing.id })}
                onKirim={async (data) => {
                  await uploadDokumenKP(editing, view.key, view.file, data);
                  setView({ mode: 'dokumen', id: editing.id });
                }} />
            )}

            {view.mode === 'jadwal' && editing && (
              <FormJadwalMhs awal={editing} ev={view.ev || eventAktif(editing)} konten={konten} jadwalRuang={jadwalRuang} onCancel={() => setView({ mode: 'list' })} onSave={simpanAjuan} />
            )}

            {(view.mode === 'pp-minta' || view.mode === 'pp-final') && editing && (
              <FormPerpanjangan awal={editing} allDosen={allDosen} mode={view.mode === 'pp-final' ? 'final' : 'minta'} onCancel={() => setView({ mode: 'list' })} onSave={simpanAjuan} />
            )}
          </>
        )}

        {tab === 'ruang' && <JadwalMahasiswa semua={mahasiswa} />}

        {tab === 'akun' && <AkunForm nama={nama} nim={nim} email={email} onSimpan={onSimpanAkun} onLogout={onLogout} />}
      </main>
    </div>
  );
}
