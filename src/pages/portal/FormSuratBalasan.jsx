import React, { useState } from 'react';
import { formatTanggal } from '../../utils/helpers.js';
import { MEDAN_SURAT_BALASAN, META, kunciProgram, medanForm } from '../../utils/formPendaftaran.js';
import { Field, KepalaForm } from '../../components/ui.jsx';

// Konfirmasi sebelum surat balasan perusahaan diunggah (pertama kali atau
// mengganti): mahasiswa memeriksa sekali lagi data perusahaan yang tertera di
// surat, karena data ini terkunci begitu dikirim (lihat adaSuratBalasan di
// helpers.js). Hanya field MEDAN_SURAT_BALASAN, bukan seluruh form pendaftaran.
export function FormSuratBalasan({ awal, file, konten = {}, onCancel, onKirim }) {
  const kunci = kunciProgram(awal);
  const [nilai, setNilai] = useState(() => Object.fromEntries(MEDAN_SURAT_BALASAN.map((id) => {
    const meta = META[id];
    const v = meta.di === 'p' ? (awal.pendaftaran || {})[meta.kolom] : awal[meta.kolom];
    return [id, v || ''];
  })));
  const [sesuai, setSesuai] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (id, v) => setNilai((p) => ({ ...p, [id]: v }));

  async function kirim() {
    const kosong = MEDAN_SURAT_BALASAN.find((id) => !String(nilai[id] || '').trim());
    if (kosong) { setErr(`${medanForm(kunci, kosong, konten).label} wajib diisi.`); return; }
    if (nilai.batasAkhir < nilai.tanggalMulai) { setErr(`Tanggal berakhir tidak boleh sebelum ${formatTanggal(nilai.tanggalMulai)}.`); return; }
    setErr('');
    setBusy(true);
    try {
      await onKirim(Object.fromEntries(MEDAN_SURAT_BALASAN.map((id) => [id, String(nilai[id]).trim()])));
    } catch (ex) {
      setErr(ex.message || 'Gagal mengunggah berkas.');
      setBusy(false);
    }
  }

  return (
    <div className="portal-form card">
      <KepalaForm title="Periksa data surat balasan" onClose={busy ? undefined : onCancel} />
      <p className="hint">Pastikan data di bawah sama persis dengan yang tertera di surat balasan perusahaan. Setelah dikirim, data ini <strong>terkunci</strong> dan hanya bisa diubah dengan menghapus atau mengganti surat balasan.</p>
      <div className="cell-sub" style={{ marginBottom: 12 }}>Berkas: <strong>{file.name}</strong></div>
      <div className="form-grid">
        {MEDAN_SURAT_BALASAN.map((id) => {
          const f = medanForm(kunci, id, konten);
          return (
            <Field key={id} label={f.label}>
              <input type={f.tipe === 'date' ? 'date' : 'text'} value={nilai[id]} onChange={(e) => set(id, e.target.value)} placeholder={f.placeholder} />
            </Field>
          );
        })}
      </div>
      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" checked={sesuai} onChange={(e) => setSesuai(e.target.checked)} />
        <span>Data di atas sudah sesuai dengan surat balasan</span>
      </label>
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <button className="btn" onClick={onCancel} disabled={busy}>Batal</button>
        <button className="btn btn-primary" onClick={kirim} disabled={!sesuai || busy}>{busy ? 'Mengunggah…' : 'Kirim & kunci data'}</button>
      </div>
    </div>
  );
}
