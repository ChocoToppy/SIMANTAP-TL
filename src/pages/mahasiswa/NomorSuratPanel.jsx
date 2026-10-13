import React, { useState } from 'react';
import { Badge, LampIcon } from '../../components/ui.jsx';
import { formatTanggal, orphanedUploadPaths } from '../../utils/helpers.js';
import { deleteUploadedFile } from '../../utils/fileUpload.js';
import { aturanPerpanjangan, perpanjanganDisetujui, perluDitinjau, patchDaftarUlang, formatNomor, KODE_NOMOR } from '../../utils/nomorSurat.js';
import { FITUR_EKSPERIMENTAL } from '../../utils/config.js';
import { pratinjauNomor, terbitkanNomor, akhiriNomor } from '../../utils/nomorSuratDb.js';

// Blok "Nomor Surat" di modal edit admin. Nomor tidak diketik tangan: admin
// meminta ("Ambil nomor"), sistem menyarankan nomor berikutnya, admin
// mengonfirmasi, lalu nomor itu tercatat di registri (nomorSurat/) dan
// terpasang ke mahasiswa. Aturan & format: utils/nomorSurat.js.
export function NomorSuratPanel(props) {
  // Fitur eksperimental: di build produksi nomor surat tetap diisi manual seperti sebelumnya.
  if (!FITUR_EKSPERIMENTAL) {
    return <NomorSuratManual {...props} />;
  }
  return <NomorSuratOtomatis {...props} />;
}

// Panduan format dibuka lewat tombol lampu di kanan isian.
// div, bukan <Field> (label): klik tombol di dalam label ikut memfokuskan input.
function NomorSuratManual({ m, setM }) {
  const [panduan, setPanduan] = useState(false);
  return (
    <div className="field field-full">
      <span className="field-label">Nomor Surat</span>
      <div className="nomor-surat-row">
        <input value={m.nomorSurat || ''} onChange={(e) => setM((prev) => ({ ...prev, nomorSurat: e.target.value }))} placeholder={`mis. ${CONTOH_NOMOR}`} />
        <button
          type="button"
          className={'icon-btn-outline lampu-btn' + (panduan ? ' aktif' : '')}
          onClick={() => setPanduan((v) => !v)}
          aria-expanded={panduan}
          aria-label="Panduan format nomor surat"
          title="Panduan format nomor surat"
        ><LampIcon /></button>
      </div>
      {panduan && <PanduanFormatNomor />}
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
    ['XII', 'Bulan surat diterbitkan, ditulis dengan angka Romawi (I untuk Januari sampai XII untuk Desember).'],
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
      </div>
    </div>
  );
}

function NomorSuratOtomatis({ m, setM, baru }) {
  const [usulan, setUsulan] = useState(null); // { nomor } saat menunggu konfirmasi
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const aturan = aturanPerpanjangan(m);
  const tinjau = perluDitinjau(m);

  async function jalankan(fn) {
    setErr('');
    setBusy(true);
    try { await fn(); } catch (e) { setErr(e.message || 'Gagal, coba lagi.'); } finally { setBusy(false); }
  }

  const minta = () => jalankan(async () => setUsulan(await pratinjauNomor()));
  const terbitkan = () => jalankan(async () => {
    const { id, nomor } = await terbitkanNomor(m);
    setM((prev) => ({ ...prev, nomorSurat: nomor, nomorSuratId: id }));
    setUsulan(null);
  });

  function akhiri(daftarUlang) {
    const alasan = window.prompt(
      daftarUlang
        ? 'Nomor ini akan dikedaluwarsakan, pembimbing dikosongkan, dan mahasiswa kembali ke tahap Pendaftaran dengan nomor baru nanti.\n\nAlasan (mis. dosen tidak melanjutkan membimbing):'
        : 'Nomor ini akan dikedaluwarsakan dan tidak bisa dipakai lagi.\n\nAlasan:',
      daftarUlang ? 'Dosen pembimbing tidak melanjutkan' : ''
    );
    if (alasan === null) return;
    jalankan(async () => {
      const patch = await akhiriNomor(m, alasan.trim() || '—', daftarUlang ? patchDaftarUlang(m) : {});
      orphanedUploadPaths(m, { ...m, ...patch }).forEach((p) => deleteUploadedFile(p));
      setM((prev) => ({ ...prev, ...patch }));
    });
  }

  return (
    <div className="field field-full nomor-surat">
      <span className="field-label">Nomor Surat</span>
      <input value={m.nomorSurat || ''} readOnly placeholder="Belum ada — klik “Ambil nomor”" />

      {m.nomorSurat ? (
        <>
          {!m.nomorSuratId && <div className="hint">Nomor lama ini tidak tercatat di registri. Akhiri nomor ini untuk mengambil nomor baru.</div>}
          {tinjau && (
            <div className="callout callout-amber" style={{ marginTop: 8 }}>
              ⚠ Batas akhir ({formatTanggal(m.batasAkhir)}) sudah lewat dan jatah perpanjangan habis. Jika dosen masih bersedia, ubah Batas akhir; jika tidak, pakai “Akhiri & daftar ulang”.
            </div>
          )}
          <div className="notif-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn" disabled={busy} onClick={() => akhiri(false)}>Akhiri nomor</button>
            <button type="button" className="btn" disabled={busy} onClick={() => akhiri(true)}>Akhiri & daftar ulang</button>
          </div>
        </>
      ) : usulan ? (
        <div className="callout" style={{ marginTop: 8 }}>
          Nomor berikutnya: <strong>{usulan.nomor}</strong>
          <div className="notif-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={terbitkan}>Terbitkan nomor ini</button>
            <button type="button" className="btn" disabled={busy} onClick={() => setUsulan(null)}>Batal</button>
          </div>
        </div>
      ) : baru ? (
        <div className="hint">Simpan data mahasiswa dulu, lalu ambil nomor surat.</div>
      ) : !m.pembimbing1 ? (
        <div className="hint">Tetapkan dosen pembimbing dulu, lalu ambil nomor surat.</div>
      ) : (
        <div className="notif-actions" style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={minta}>Ambil nomor</button>
        </div>
      )}

      {aturan && !baru && (
        <div className="hint" style={{ marginTop: 8 }}>
          Perpanjangan disetujui: {perpanjanganDisetujui(m)} / {aturan.maks} (+{aturan.bulan} bulan tiap kali, disetujui di bagian Perpanjangan).{' '}
          {perluDitinjau(m) && <Badge tone="amber">Perlu ditinjau</Badge>}
        </div>
      )}
      {err && <div className="login-err" style={{ marginTop: 6 }}>{err}</div>}
    </div>
  );
}
