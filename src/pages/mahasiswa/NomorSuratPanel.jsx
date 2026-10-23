import React, { useState } from 'react';
import { LampIcon } from '../../components/ui.jsx';
import { formatTanggal, tenggat } from '../../utils/helpers.js';
import { perluDitinjau, suratBalasanBerganti, formatNomor, bacaNomor, KODE_NOMOR } from '../../utils/nomorSurat.js';
import { nomorBerikutnya } from '../../utils/nomorSuratDb.js';
import { LangkahSuratTugas } from './LangkahSuratTugas.jsx';

// Blok "Nomor Surat" di modal edit admin. Admin mengetik nomor sendiri, atau menekan
// "Ambil nomor" untuk mengisi nomor urut terkecil yang belum dipakai tahun
// ini (tetap bisa diubah). Nomor dicatat di registri (nomorSurat/) saat Simpan, lihat
// submit() di FormMahasiswa.jsx. Aturan & format: utils/nomorSurat.js.
// div, bukan <Field> (label): klik tombol di dalam label ikut memfokuskan input.
export function NomorSuratPanel({ m, setM, baru, terpakai = () => [] }) {
  const [panduan, setPanduan] = useState(false);
  // KP: nomor = surat tugas; tanggalnya ditetapkan dulu (LangkahSuratTugas).
  const kp = m.program === 'KP';
  const [cocok, setCocok] = useState(false);
  const [ganti, setGanti] = useState(false);
  // Surat balasan diganti setelah nomor terbit: langkah tanggal terbuka lagi tanpa klik.
  const sbBerganti = suratBalasanBerganti(m);
  const terkunci = kp && !!m.nomorSuratId && !!m.mulaiProgram && !ganti && !sbBerganti;
  const siapAmbil = !kp || (cocok && !!m.mulaiProgram && !terkunci);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const tinjau = perluDitinjau(m);
  const nomor = (m.nomorSurat || '').trim();

  async function jalankan(fn) {
    setErr('');
    setBusy(true);
    try { await fn(); } catch (e) { setErr(e.message || 'Gagal, coba lagi.'); } finally { setBusy(false); }
  }

  const isiBerikutnya = () => jalankan(async () => {
    const saran = await nomorBerikutnya(terpakai, kp ? m.mulaiProgram : '');
    if (nomor && nomor !== saran && !window.confirm(`Ganti ${nomor} dengan ${saran}?`)) return;
    setM((prev) => ({ ...prev, nomorSurat: saran, nomorDisarankan: saran }));
  });

  return (
    <div className="field field-full nomor-surat">
      <span className="field-label">Nomor Surat{kp ? ' (surat tugas)' : ''}</span>
      {sbBerganti && (
        <div className="callout callout-amber" style={{ marginTop: 6 }}>
          {(m.dokumenKP || {}).suratBalasan
            ? <>Surat balasan diganti setelah nomor {m.nomorSurat} terbit. Cocokkan ulang tanggalnya, lalu ambil nomor baru. Nomor lama otomatis kedaluwarsa saat disimpan.</>
            : <>Surat balasan dihapus mahasiswa setelah nomor {m.nomorSurat} terbit. Setelah surat balasan baru masuk, cocokkan ulang tanggalnya dan ambil nomor baru.</>}
        </div>
      )}
      {kp && <LangkahSuratTugas m={m} setM={setM} cocok={cocok} setCocok={setCocok} terkunci={terkunci} ulang={sbBerganti} onGanti={() => { setGanti(true); setCocok(false); }} />}
      <div className="nomor-surat-row">
        <input value={m.nomorSurat || ''} onChange={(e) => setM((prev) => ({ ...prev, nomorSurat: e.target.value }))} placeholder={`mis. ${CONTOH_NOMOR}`} />
        <button type="button" className="btn" disabled={busy || !siapAmbil} onClick={isiBerikutnya} title={siapAmbil ? 'Isi nomor urut terkecil yang belum dipakai tahun surat ini' : 'Cocokkan tanggal mulai KP & tentukan tanggal surat tugas dulu'}>{busy ? 'Mencari…' : 'Ambil nomor'}</button>
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
          ⚠ {m.program === 'KP' ? 'Batas program' : 'Batas akhir'} ({formatTanggal(tenggat(m))}) sudah lewat dan jatah perpanjangan habis. Jika dosen masih bersedia, {m.program === 'KP' ? 'ganti tanggal surat tugas (dengan nomor baru) di atas' : 'ubah Batas akhir lewat Edit data'}. Jika tidak, centang Ditutup (di bawah kotak identitas) supaya mahasiswa bisa mendaftar ulang.
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
    ['013', 'Nomor urut, selalu tiga digit (001, 002, dst.). Satu urutan dipakai bersama untuk semua program, dan dimulai lagi dari 001 setiap bulan.'],
    [fakultas, 'Kode fakultas.'],
    [penandatangan, 'Kode penandatangan, yaitu Ketua Program Studi S1.'],
    [hal, 'Kode hal surat: Pendidikan dan Pelatihan.'],
    ['XII', 'Bulan surat diterbitkan, ditulis dengan angka Romawi (I untuk Januari sampai XII untuk Desember). Tidak boleh melewati bulan ini, kecuali KP: bulan tanggal surat tugas, yang boleh bulan depan.'],
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
        Tombol "Ambil nomor" mengisi nomor urut terkecil yang belum dipakai di tahun surat (KP: tahun & bulan tanggal surat tugas); nomor dicatat di Registri saat Simpan.
      </div>
    </div>
  );
}
