import React, { useState } from 'react';
import { buatId, todayISO, tambahHari, punyaSyarat, punyaKlasifikasi, catatAktivitas, KP_TEMA, KLASIFIKASI, BIDANG, programLabel } from '../../utils/helpers.js';
import { Field } from '../../components/ui.jsx';
import { PROGRAM_KEYS_PENDAFTARAN } from './shared.js';

export function FormPendaftaran({ awal, nim, nama, allDosen, periodeBuka = [], onCancel, onSave }) {
  const baru = !awal;
  const [m, setM] = useState(() =>
    awal || {
      id: buatId(), program: PROGRAM_KEYS_PENDAFTARAN[0] || 'TA', nama, nim, owner: nim,
      judul: '', periode: periodeBuka[0] || '', angkatan: '', klasifikasi: 'Penelitian', bidang: 'U',
      pembimbing1: '', pembimbing2: '', penguji1: '', penguji2: '',
      tahap: 'Pendaftaran', tanggalMulai: todayISO(), batasAkhir: tambahHari(todayISO(), 180),
      dibatalkan: false, catatan: '', jadwal: {}, verifikasi: 'baru',
      pendaftaran: { syaratSKS: false, ipk: '', statusKP: 'Telah', terdaftarKRS: false, sudahUGB: false, namaPersetujuanDosen: '', berkasLink: '', nomorWA: '' },
    }
  );
  const set = (k, v) => setM((p) => ({ ...p, [k]: v }));
  const setP = (k, v) => setM((p) => ({ ...p, pendaftaran: { ...(p.pendaftaran || {}), [k]: v } }));
  const p = m.pendaftaran || {};
  const [err, setErr] = useState('');
  const isKPStyle = m.program === 'KP' || m.program === 'MG';
  const isKP = m.program === 'KP';
  const tampilSyarat = punyaSyarat(m.program);
  const labelMK = m.program === 'CAP' ? 'Capstone Design' : 'TA';
  // Pilihan program = yang diizinkan build ini (lihat PROGRAM_KEYS_PENDAFTARAN);
  // sertakan program lama kalau sedang edit data lama yang programnya sudah
  // tidak ada di daftar itu (mis. dari sebelum lingkup ini dipersempit), spy
  // select tidak kosong — tetap tidak bisa diganti karena disabled saat edit.
  const programOpsi = PROGRAM_KEYS_PENDAFTARAN.includes(m.program) ? PROGRAM_KEYS_PENDAFTARAN : [...PROGRAM_KEYS_PENDAFTARAN, m.program];
  // Pilihan periode = yang dibuka admin; sertakan periode lama jika sedang diedit.
  const periodeOpsi = Array.from(new Set([...periodeBuka, ...(m.periode ? [m.periode] : [])]));
  const belumAdaPeriode = periodeOpsi.length === 0;

  function gantiProgram(prog) {
    setM((prev) => {
      const next = { ...prev, program: prog };
      const kpStyle = prog === 'KP' || prog === 'MG';
      const kpKode = KP_TEMA.some((t) => t.kode === prev.bidang);
      if (kpStyle && !kpKode) next.bidang = KP_TEMA[0].kode;
      if (!kpStyle && kpKode) next.bidang = BIDANG[0].kode;
      return next;
    });
  }

  function submit() {
    if (!(m.nama || '').trim()) { setErr('Nama wajib diisi.'); return; }
    if (!m.judul.trim()) { setErr('Judul wajib diisi.'); return; }
    if (!m.periode) { setErr('Pilih periode pendaftaran terlebih dahulu.'); return; }
    setErr('');
    const rec = { ...m, angkatan: Number(m.angkatan) || m.angkatan, verifikasi: 'baru' };
    onSave(catatAktivitas(rec, baru ? 'daftar' : 'perbaikan'));
  }

  return (
    <div className="portal-form card">
      <h2 className="page-title">{baru ? 'Ajukan pendaftaran' : 'Edit pendaftaran'}</h2>
      <div className="form-grid">
        <Field label="Program">
          <select value={m.program} onChange={(e) => gantiProgram(e.target.value)} disabled={!baru}>
            {programOpsi.map((k) => <option key={k} value={k}>{programLabel(k)}</option>)}
          </select>
        </Field>
        <Field label="Periode">
          <select value={m.periode} onChange={(e) => set('periode', e.target.value)} disabled={belumAdaPeriode}>
            <option value="">— pilih periode —</option>
            {periodeOpsi.map((pp) => <option key={pp} value={pp}>{pp}</option>)}
          </select>
        </Field>
        <Field label="Nama"><input value={m.nama ?? nama} onChange={(e) => set('nama', e.target.value)} title="Perbaiki jika ada salah ketik pada nama akun" /></Field>
        <Field label="Angkatan"><input value={m.angkatan} onChange={(e) => set('angkatan', e.target.value)} placeholder="mis. 20" /></Field>
        <Field label={isKPStyle ? (isKP ? 'Judul Kerja Praktik (sementara)' : 'Judul Magang (sementara)') : 'Judul'} full>
          <textarea rows={2} value={m.judul} onChange={(e) => set('judul', e.target.value)} placeholder="Jangan pakai huruf kapital semua" />
        </Field>
        <Field label="Dosen Wali">
          <select value={m.dosenWali || ''} onChange={(e) => set('dosenWali', e.target.value)}>
            <option value="">—</option>
            {allDosen.map((d) => <option key={d.kode} value={d.kode}>{d.kode} — {d.nama}</option>)}
          </select>
        </Field>

        {isKPStyle ? (
          <>
            <Field label="Semester">
              <select value={p.semester || ''} onChange={(e) => setP('semester', e.target.value)}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Jumlah SKS / IPK"><input value={p.sksIpk || ''} onChange={(e) => setP('sksIpk', e.target.value)} placeholder="mis. 110 SKS / 3,20" /></Field>
            <Field label={isKP ? 'Tema Kerja Praktik' : 'Tema Magang'}>
              <select value={m.bidang} onChange={(e) => set('bidang', e.target.value)}>
                {KP_TEMA.map((t) => <option key={t.kode} value={t.kode}>{t.label}</option>)}
              </select>
            </Field>
            <Field label={isKP ? 'Tempat / Perusahaan KP' : 'Tempat / Perusahaan Magang'}><input value={p.tempatKP || ''} onChange={(e) => setP('tempatKP', e.target.value)} /></Field>
            <Field label="Instansi (Kota / Provinsi)"><input value={p.instansi || ''} onChange={(e) => setP('instansi', e.target.value)} placeholder="mis. Semarang, Jawa Tengah" /></Field>
            <Field label={isKP ? 'Mulai KP' : 'Mulai Magang'}><input type="date" value={m.tanggalMulai || ''} onChange={(e) => set('tanggalMulai', e.target.value)} /></Field>
            <Field label={isKP ? 'Berakhir KP' : 'Berakhir Magang'}><input type="date" value={m.batasAkhir || ''} onChange={(e) => set('batasAkhir', e.target.value)} /></Field>
            <Field label="Alamat lengkap" full><textarea rows={2} value={p.alamatWA || ''} onChange={(e) => setP('alamatWA', e.target.value)} /></Field>
            <Field label="Nomor WA"><input value={p.nomorWA || ''} onChange={(e) => setP('nomorWA', e.target.value)} placeholder="08xxxxxxxxxx" /></Field>
            <Field label={`Link berkas (${isKP ? 'Transkrip, IRS, KTM' : 'Surat penerimaan, Transkrip, IRS, KTM, Proposal Magang'}) — Google Drive`} full>
              <input value={p.berkasLink || ''} onChange={(e) => setP('berkasLink', e.target.value)} placeholder="https://drive.google.com/..." />
            </Field>
          </>
        ) : (
          <>
            {punyaKlasifikasi(m.program) && (
              <Field label="Klasifikasi">
                <select value={m.klasifikasi} onChange={(e) => set('klasifikasi', e.target.value)}>
                  {KLASIFIKASI.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </Field>
            )}
            <Field label="Topik / bidang">
              <select value={m.bidang} onChange={(e) => set('bidang', e.target.value)}>
                {BIDANG.map((b) => <option key={b.kode} value={b.kode}>{b.label}</option>)}
              </select>
            </Field>

            {tampilSyarat && (
            <div className="sched field-full">
              <div className="sched-title">Syarat pendaftaran</div>
              <label className="check"><input type="checkbox" checked={!!p.syaratSKS} onChange={(e) => setP('syaratSKS', e.target.checked)} /><span>Sudah lulus 120 SKS dengan IPK &ge; 2,00</span></label>
              <div className="sched-grid" style={{ marginTop: 10 }}>
                <Field label="IPK"><input value={p.ipk || ''} onChange={(e) => setP('ipk', e.target.value)} placeholder="mis. 3,20" /></Field>
                <Field label="Status Kerja Praktik">
                  <select value={p.statusKP || 'Telah'} onChange={(e) => setP('statusKP', e.target.value)}>
                    <option value="Telah">Telah</option>
                    <option value="Sedang">Sedang</option>
                  </select>
                </Field>
              </div>
              <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={!!p.terdaftarKRS} onChange={(e) => setP('terdaftarKRS', e.target.checked)} /><span>Terdaftar pada KRS mengambil mata kuliah {labelMK}</span></label>
              <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={!!p.sudahUGB} onChange={(e) => setP('sudahUGB', e.target.checked)} /><span>Telah menyusun Usulan Garis Besar (UGB) / proposal{m.program === 'CAP' ? ' Capstone Design' : ''}</span></label>
            </div>
            )}

            <Field label="Nama persetujuan projek dosen (opsional)" full>
              <select value={p.namaPersetujuanDosen || ''} onChange={(e) => setP('namaPersetujuanDosen', e.target.value)}>
                <option value="">—</option>
                {allDosen.map((d) => <option key={d.kode} value={d.kode}>{d.kode} — {d.nama}</option>)}
              </select>
            </Field>
            <Field label="Link berkas (Surat UGB, persetujuan dosen, transkrip, IRS, proposal) — Google Drive, opsional" full>
              <input value={p.berkasLink || ''} onChange={(e) => setP('berkasLink', e.target.value)} placeholder="https://drive.google.com/..." />
            </Field>
            <Field label="Nomor WA"><input value={p.nomorWA || ''} onChange={(e) => setP('nomorWA', e.target.value)} placeholder="08xxxxxxxxxx" /></Field>
          </>
        )}
      </div>
      {belumAdaPeriode && <div className="callout" style={{ marginTop: 12 }}>Belum ada periode pendaftaran yang dibuka. Silakan hubungi admin.</div>}
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <button className="btn" onClick={onCancel}>Batal</button>
        <button className="btn btn-primary" onClick={submit} disabled={belumAdaPeriode}>Kirim pengajuan</button>
      </div>
    </div>
  );
}
