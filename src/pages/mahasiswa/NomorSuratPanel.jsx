import React, { useState } from 'react';
import { Badge, LampIcon } from '../../components/ui.jsx';
import { formatTanggal, orphanedUploadPaths } from '../../utils/helpers.js';
import { deleteUploadedFile } from '../../utils/fileUpload.js';
import { aturanPerpanjangan, perpanjanganDisetujui, perluDitinjau, patchDaftarUlang, formatNomor, bacaNomor, KODE_NOMOR } from '../../utils/nomorSurat.js';
import { nomorBerikutnya, akhiriNomor } from '../../utils/nomorSuratDb.js';

// Blok "Nomor Surat" di modal edit admin. Admin mengetik nomor sendiri, atau menekan
// "Isi nomor berikutnya" untuk mengisi nomor urut terkecil yang belum dipakai tahun
// ini (tetap bisa diubah). Nomor dicatat di registri (nomorSurat/) saat Simpan, lihat
// submit() di FormMahasiswa.jsx. Aturan & format: utils/nomorSurat.js.
// div, bukan <Field> (label): klik tombol di dalam label ikut memfokuskan input.
export function NomorSuratPanel({ m, setM, baru, terpakai = [] }) {
  const [panduan, setPanduan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const aturan = aturanPerpanjangan(m);
  const tinjau = perluDitinjau(m);
  const nomor = (m.nomorSurat || '').trim();

  async function jalankan(fn) {
    setErr('');
    setBusy(true);
    try { await fn(); } catch (e) { setErr(e.message || 'Gagal, coba lagi.'); } finally { setBusy(false); }
  }

  const isiBerikutnya = () => jalankan(async () => {
    const saran = await nomorBerikutnya(terpakai);
    if (nomor && nomor !== saran && !window.confirm(`Ganti ${nomor} dengan ${saran}?`)) return;
    setM((prev) => ({ ...prev, nomorSurat: saran, nomorDisarankan: saran }));
  });

  function daftarUlang() {
    const alasan = window.prompt(
      'Nomor ini akan dikedaluwarsakan, pembimbing dikosongkan, dan mahasiswa kembali ke tahap Pendaftaran.\n\nAlasan (mis. dosen tidak melanjutkan membimbing):',
      'Dosen pembimbing tidak melanjutkan'
    );
    if (alasan === null) return;
    jalankan(async () => {
      const patch = await akhiriNomor(m, alasan.trim() || '-', patchDaftarUlang(m));
      orphanedUploadPaths(m, { ...m, ...patch }).forEach((p) => deleteUploadedFile(p));
      setM((prev) => ({ ...prev, ...patch }));
    });
  }

  return (
    <div className="field field-full nomor-surat">
      <span className="field-label">Nomor Surat</span>
      <div className="nomor-surat-row">
        <input value={m.nomorSurat || ''} onChange={(e) => setM((prev) => ({ ...prev, nomorSurat: e.target.value }))} placeholder={`mis. ${CONTOH_NOMOR}`} />
        <button type="button" className="btn" disabled={busy} onClick={isiBerikutnya}>{busy ? 'Mencari…' : 'Isi nomor berikutnya'}</button>
        <button
          type="button"
          className={'icon-btn-outline lampu-btn' + (panduan ? ' aktif' : '')}
          onClick={() => setPanduan((v) => !v)}
          aria-expanded={panduan}
          aria-label="Panduan format nomor surat"
          title="Panduan format nomor surat"
        ><LampIcon /></button>
      </div>
      {nomor && !bacaNomor(nomor) && (
        <div className="login-err" style={{ marginTop: 6 }}>Format belum sesuai panduan (contoh: {CONTOH_NOMOR}). Nomor baru atau yang diubah harus mengikuti format ini.</div>
      )}
      {panduan && <PanduanFormatNomor />}

      {tinjau && (
        <div className="callout callout-amber" style={{ marginTop: 8 }}>
          ⚠ Batas akhir ({formatTanggal(m.batasAkhir)}) sudah lewat dan jatah perpanjangan habis. Jika dosen masih bersedia, ubah Batas akhir; jika tidak, pakai “Akhiri & daftar ulang”.
        </div>
      )}
      {!baru && m.nomorSuratId && (
        <div className="notif-actions" style={{ marginTop: 8 }}>
          <button type="button" className="btn" disabled={busy} onClick={daftarUlang}>Akhiri & daftar ulang</button>
        </div>
      )}
      {aturan && !baru && (
        <div className="hint" style={{ marginTop: 8 }}>
          Perpanjangan disetujui: {perpanjanganDisetujui(m)} / {aturan.maks} (+{aturan.bulan} bulan tiap kali, disetujui di bagian Perpanjangan).{' '}
          {tinjau && <Badge tone="amber">Perlu ditinjau</Badge>}
        </div>
      )}
      {err && <div className="login-err" style={{ marginTop: 6 }}>{err}</div>}
    </div>
  );
}

const CONTOH_NOMOR = formatNomor(13, 12, 2025);

// Panduan untuk admin yang mengetik nomor manual. Kode diambil dari KODE_NOMOR
// supaya panduan ikut berubah kalau kodenya diganti.
function PanduanFormatNomor() {
  const { fakultas, penandatangan, hal } = KODE_NOMOR;
  const bagian = [
    ['013', 'Nomor urut, selalu tiga digit (001, 002, dst.). Satu urutan dipakai bersama untuk semua program, dan dimulai lagi dari 001 setiap tahun.'],
    [fakultas, 'Kode fakultas.'],
    [penandatangan, 'Kode penandatangan, yaitu Ketua Program Studi S1.'],
    [hal, 'Kode hal surat: Pendidikan dan Pelatihan.'],
    ['XII', 'Bulan surat diterbitkan, ditulis dengan angka Romawi (I untuk Januari sampai XII untuk Desember). Tidak boleh melewati bulan ini.'],
    ['2025', 'Tahun surat diterbitkan.'],
  ];
  return (
    <div className="callout" style={{ marginTop: 8 }}>
      <div>Contoh: <strong>{CONTOH_NOMOR}</strong></div>
      <table className="tbl" style={{ marginTop: 8 }}>
        <thead><tr><th>Bagian</th><th>Arti</th></tr></thead>
        <tbody>
          {bagian.map(([kode, arti]) => (
            <tr key={kode}><td><strong>{kode}</strong></td><td>{arti}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="hint" style={{ marginBottom: 0 }}>
        Bagian {fakultas}.{penandatangan}/{hal} selalu sama. Yang berubah hanya nomor urut, bulan, dan tahun.
        Tombol "Isi nomor berikutnya" mengisi nomor urut terkecil yang belum dipakai tahun ini; nomor dicatat di Registri saat Simpan.
      </div>
    </div>
  );
}
