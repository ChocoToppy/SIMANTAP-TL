import React, { useState } from 'react';
import { Badge } from '../../components/ui.jsx';
import { formatTanggal, orphanedUploadPaths } from '../../utils/helpers.js';
import { deleteUploadedFile } from '../../utils/fileUpload.js';
import { aturanPerpanjangan, bolehPerpanjang, perpanjanganDisetujui, perluDitinjau, tambahBulan, patchDaftarUlang } from '../../utils/nomorSurat.js';
import { pratinjauNomor, terbitkanNomor, akhiriNomor } from '../../utils/nomorSuratDb.js';

// Blok "Nomor Surat" di modal edit admin. Nomor tidak diketik tangan: admin
// meminta ("Ambil nomor"), sistem menyarankan nomor berikutnya, admin
// mengonfirmasi, lalu nomor itu tercatat di registri (nomorSurat/) dan
// terpasang ke mahasiswa. Aturan & format: utils/nomorSurat.js.
export function NomorSuratPanel({ m, setM, baru }) {
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

  function setujuiPerpanjangan() {
    setM((prev) => ({
      ...prev,
      batasAkhir: tambahBulan(prev.batasAkhir, aturan.bulan),
      perpanjangan: { ...(prev.perpanjangan || {}), disetujui: perpanjanganDisetujui(prev) + 1 },
    }));
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
          Perpanjangan disetujui: {perpanjanganDisetujui(m)} / {aturan.maks} (+{aturan.bulan} bulan tiap kali).{' '}
          {bolehPerpanjang(m) && <button type="button" className="btn btn-sm" onClick={setujuiPerpanjangan}>Setujui perpanjangan</button>}
          {perluDitinjau(m) && <Badge tone="amber">Perlu ditinjau</Badge>}
        </div>
      )}
      {err && <div className="login-err" style={{ marginTop: 6 }}>{err}</div>}
    </div>
  );
}
