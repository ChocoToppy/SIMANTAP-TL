import React, { useState } from 'react';
import { programOf, durasiEvent, jamTambah, dalamJamKerja, formatTanggal, berkasSyarat, JAM_KERJA, HARI, RUANG, catatAktivitas } from '../../utils/helpers.js';
import { Field } from '../../components/ui.jsx';

export function FormJadwalMhs({ awal, ev, konten = {}, onCancel, onSave }) {
  const isSidang = ev.includes('Sidang');
  const isKP = programOf(awal) === 'KP' || ev.includes('KP');
  // Seminar KP tidak dibatasi rentang mulai/akhir KP: durasi KP terikat kerja
  // lapangan mahasiswa, bukan jadwal seminar — begitu berkas siap, mahasiswa
  // boleh mengajukan seminar meski tanggalnya melewati batasAkhir KP.
  const bebasRentangKP = ev === 'Seminar KP';
  const durasi = durasiEvent(ev);
  const [j, setJ] = useState(() => ({ ...(awal.jadwal && awal.jadwal[ev] ? awal.jadwal[ev] : {}) }));
  const [err, setErr] = useState('');
  const set = (k, v) => setJ((p) => ({ ...p, [k]: v }));
  function setMulai(v) { setJ((p) => ({ ...p, jamMulai: v, jamSelesai: v ? jamTambah(v, durasi) : '' })); }

  function submit() {
    if (!isSidang) {
      if (j.tanggal && !bebasRentangKP) {
        if (awal.tanggalMulai && j.tanggal < awal.tanggalMulai) { setErr(`Tanggal harus pada/setelah ${formatTanggal(awal.tanggalMulai)} (tanggal mulai).`); return; }
        if (awal.batasAkhir && j.tanggal > awal.batasAkhir) { setErr(`Tanggal harus pada/sebelum ${formatTanggal(awal.batasAkhir)} (batas akhir).`); return; }
      }
      if (j.jamMulai && !dalamJamKerja(j.jamMulai, j.jamSelesai || jamTambah(j.jamMulai, durasi))) {
        setErr(`Jadwal harus dalam jam kerja ${JAM_KERJA.mulai}–${JAM_KERJA.selesai}.`); return;
      }
    }
    setErr('');
    if (isSidang) {
      // Sidang: mahasiswa hanya mengunggah berkas; jadwal (tanggal/jam/ruang) & status ditetapkan admin.
      const lama = (awal.jadwal || {})[ev] || {};
      const rec = { ...awal, jadwal: { ...(awal.jadwal || {}), [ev]: { ...lama, berkasLink: j.berkasLink || '', turnitinLink: j.turnitinLink || '', folderLink: j.folderLink || '' } } };
      onSave(catatAktivitas(rec, 'jadwal', ev));
    } else {
      const rec = { ...awal, jadwal: { ...(awal.jadwal || {}), [ev]: { ...j, jamSelesai: j.jamMulai ? jamTambah(j.jamMulai, durasi) : j.jamSelesai, dikonfirmasi: false, hasil: '' } } };
      onSave(catatAktivitas(rec, 'jadwal', ev));
    }
  }

  return (
    <div className="portal-form card">
      <h2 className="page-title">{isSidang ? 'Unggah draft & berkas sidang' : `Ajukan jadwal ${ev}`}</h2>
      <p className="hint">
        {isSidang
          ? 'Jadwal sidang ditetapkan admin. Anda cukup mengunggah draft & berkas di sini.'
          : `Durasi ${ev} otomatis ${durasi} menit, dalam jam kerja ${JAM_KERJA.mulai}–${JAM_KERJA.selesai}. Nomor surat tugas & persetujuan jadwal ditentukan admin.`}
      </p>
      <div className="callout" style={{ marginBottom: 12 }}>
        <strong>Dokumen yang perlu disiapkan:</strong>
        <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
          {berkasSyarat(ev, konten).map((item, i) => <li key={i}>{item}</li>)}
        </ol>
      </div>
      <div className="form-grid">
        {!isSidang && (
          <>
            <Field label="Rencana tanggal"><input type="date" value={j.tanggal || ''} min={bebasRentangKP ? undefined : (awal.tanggalMulai || undefined)} max={bebasRentangKP ? undefined : (awal.batasAkhir || undefined)} onChange={(e) => set('tanggal', e.target.value)} /></Field>
            {isKP && (
              <Field label="Hari seminar">
                <select value={j.hari || ''} onChange={(e) => set('hari', e.target.value)}>
                  <option value="">—</option>
                  {HARI.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
            )}
            <Field label="Jam mulai"><input type="time" min={JAM_KERJA.mulai} max={JAM_KERJA.selesai} value={j.jamMulai || ''} onChange={(e) => setMulai(e.target.value)} /></Field>
            <Field label={`Jam selesai (otomatis +${durasi} menit)`}><input type="time" value={j.jamMulai ? jamTambah(j.jamMulai, durasi) : (j.jamSelesai || '')} readOnly /></Field>
            <Field label="Ruang">
              <select value={j.ruang || ''} onChange={(e) => set('ruang', e.target.value)}>
                <option value="">— pilih ruang —</option>
                {RUANG.map((r) => <option key={r} value={r}>{r}</option>)}
                {j.ruang && !RUANG.includes(j.ruang) && <option value={j.ruang}>{j.ruang}</option>}
              </select>
            </Field>
          </>
        )}
        <Field label="Link berkas persyaratan (Google Drive)" full>
          <input value={j.berkasLink || ''} onChange={(e) => set('berkasLink', e.target.value)} placeholder="https://drive.google.com/..." />
        </Field>
        {isSidang && (
          <>
            <Field label="Link hasil Turnitin" full><input value={j.turnitinLink || ''} onChange={(e) => set('turnitinLink', e.target.value)} placeholder="https://drive.google.com/..." /></Field>
            <Field label="Link folder berkas sidang" full><input value={j.folderLink || ''} onChange={(e) => set('folderLink', e.target.value)} placeholder="https://drive.google.com/..." /></Field>
          </>
        )}
      </div>
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <button className="btn" onClick={onCancel}>Batal</button>
        <button className="btn btn-primary" onClick={submit}>Kirim</button>
      </div>
    </div>
  );
}
