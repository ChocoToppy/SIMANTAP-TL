import React, { useState } from 'react';
import { buatId, idPengajuanBaru, todayISO, tambahHari, catatAktivitas, ringkasPerubahanPendaftaran, hitungPerubahanData, KLASIFIKASI, programLabel, dosenAktifUntuk, adaSuratBalasan } from '../../utils/helpers.js';
import { kpTemaUntukPilihan, bidangUntukPilihan, adalahKodeKpTema } from '../../utils/pilihan.js';
import { Field, KepalaForm } from '../../components/ui.jsx';
import { META, BUTIR_SYARAT, MEDAN_SURAT_BALASAN, kunciProgram, gayaKP, urutanForm, medanForm, galatWajib } from '../../utils/formPendaftaran.js';
import { PROGRAM_KEYS_PENDAFTARAN } from './shared.js';

// `pratinjau` (opsional) = mode editor Pengaturan → Form Pendaftaran: form yang SAMA
// dirender apa adanya (kontrol dinonaktifkan, tanpa tombol), tiap field dibungkus
// tombol pilih supaya admin mengeditnya langsung di tampilan yang dilihat mahasiswa.
// { program, jenisMagang, terpilih, onPilih(id) }
export function FormPendaftaran({ awal, nim, nama, allDosen, periodeBuka = [], angkatanAktif = [], konten = {}, programTerpakai = [], idAda = [], pratinjau, onCancel, onSave }) {
  const baru = pratinjau ? true : !awal;
  // Satu pengajuan per program: program yang sudah punya pengajuan tetap tampil di
  // pilihan tapi tidak bisa dipilih (hapus dulu pengajuan lamanya).
  const programBebas = PROGRAM_KEYS_PENDAFTARAN.find((k) => !programTerpakai.includes(k));
  const programAwal = pratinjau ? pratinjau.program : (programBebas || PROGRAM_KEYS_PENDAFTARAN[0] || 'TA');
  const [m, setM] = useState(() =>
    awal || {
      id: buatId(), program: programAwal, nama, nim, owner: nim,
      ...(pratinjau && pratinjau.jenisMagang ? { jenisMagang: pratinjau.jenisMagang } : {}),
      // Semua dropdown (kecuali program) mulai kosong & wajib dipilih: nilai awal
      // yang tampak sudah terisi membuat mahasiswa melewatinya (dulu bidang 'U'
      // tersimpan sebagai "Udara" walau layar menampilkan tema KP pertama).
      judul: '', periode: '', angkatan: '', klasifikasi: '', bidang: '',
      pembimbing1: '', pembimbing2: '', penguji1: '', penguji2: '',
      tahap: 'Pendaftaran', tanggalMulai: todayISO(), batasAkhir: tambahHari(todayISO(), 180),
      dibatalkan: false, catatan: '', jadwal: {}, verifikasi: 'baru',
      pendaftaran: { syaratSKS: false, ipk: '', statusKP: '', terdaftarKRS: false, sudahUGB: false, namaPersetujuanDosen: '', berkasLink: '', nomorWA: '' },
    }
  );
  const set = (k, v) => setM((p) => ({ ...p, [k]: v }));
  const setP = (k, v) => setM((p) => ({ ...p, pendaftaran: { ...(p.pendaftaran || {}), [k]: v } }));
  const p = m.pendaftaran || {};
  const [err, setErr] = useState('');
  // Susunan & teks field berasal dari registri (utils/formPendaftaran.js) yang bisa
  // disesuaikan admin di Pengaturan → Form Pendaftaran.
  const kunci = kunciProgram(m);
  const urutan = urutanForm(kunci, konten);
  const medan = (id) => medanForm(kunci, id, konten);
  // Pilihan program = yang diizinkan build ini (lihat PROGRAM_KEYS_PENDAFTARAN);
  // sertakan program lama kalau sedang edit data lama yang programnya sudah
  // tidak ada di daftar itu (mis. dari sebelum lingkup ini dipersempit), spy
  // select tidak kosong — tetap tidak bisa diganti karena disabled saat edit.
  const programOpsi = PROGRAM_KEYS_PENDAFTARAN.includes(m.program) ? PROGRAM_KEYS_PENDAFTARAN : [...PROGRAM_KEYS_PENDAFTARAN, m.program];
  // Pilihan periode = yang dibuka admin; sertakan periode lama jika sedang diedit.
  const periodeOpsi = Array.from(new Set([...periodeBuka, ...(m.periode ? [m.periode] : [])]));
  const belumAdaPeriode = periodeOpsi.length === 0;
  // Pilihan angkatan = yang diaktifkan admin; sertakan angkatan lama jika sedang diedit.
  const angkatanOpsi = Array.from(new Set([...angkatanAktif, ...(m.angkatan ? [String(m.angkatan)] : [])]));
  const dosenWaliOpsi = dosenAktifUntuk(allDosen, m.dosenWali);
  const dosenPersetujuanOpsi = dosenAktifUntuk(allDosen, p.namaPersetujuanDosen);

  function gantiProgram(prog) {
    setM((prev) => {
      const next = { ...prev, program: prog };
      const kpStyle = prog === 'KP' || prog === 'MG';
      // Tema KP (KP/Magang) dan Bidang (TA/Capstone/S2) memakai daftar kode
      // berbeda: pilihan yang tidak berlaku lagi dikosongkan, bukan diganti otomatis.
      const kpKode = adalahKodeKpTema(prev.bidang);
      if (prev.bidang && kpStyle !== kpKode) next.bidang = '';
      return next;
    });
  }

  function submit() {
    if (!(m.nama || '').trim()) { setErr('Nama wajib diisi.'); return; }
    if (!m.judul.trim()) { setErr(`${medan('judul').label} wajib diisi.`); return; }
    if (!m.periode) { setErr('Pilih periode pendaftaran terlebih dahulu.'); return; }
    // Dropdown tanpa nilai awal (lihat state awal) — wajib dipilih bila tampil di form.
    const tampil = (id) => urutan.includes(id);
    const belumDipilih = [
      tampil('jenis') && m.program === 'MG' && !m.jenisMagang && 'jenis',
      tampil('klasifikasi') && !m.klasifikasi && 'klasifikasi',
      tampil('bidang') && !m.bidang && 'bidang',
      tampil('syarat') && !p.statusKP && 'statusKP',
    ].find(Boolean);
    if (belumDipilih) { setErr(`Pilih ${medan(belumDipilih).label} terlebih dahulu.`); return; }
    const galat = galatWajib(kunci, m, konten);
    if (galat) { setErr(galat); return; }
    if (baru && programTerpakai.includes(m.program)) { setErr(`Kamu sudah punya pengajuan ${programLabel(m.program)}. Hapus pengajuan lama dulu untuk membuat yang baru.`); return; }
    setErr('');
    let rec = { ...m, angkatan: Number(m.angkatan) || m.angkatan, verifikasi: 'baru', ...(baru ? { id: idPengajuanBaru(nim, m.program, idAda) } : {}) };
    // Data yang tercetak di dokumen berubah setelah diverifikasi: unduhan dikunci
    // sampai admin memverifikasi ulang (hitungPerubahanData di helpers.js).
    if (!baru) rec = { ...rec, perubahanData: hitungPerubahanData(awal, rec) };
    const catatan = baru ? '' : ringkasPerubahanPendaftaran(awal, rec).join(', ');
    onSave(catatAktivitas(rec, baru ? 'daftar' : 'perbaikan', catatan));
  }

  // Satu <Field> per id. Kontrol tiap id tetap ditulis di sini (terikat ke bentuk
  // data yang dibaca generator surat); teks/wajib/urutannya dari medan().
  function bungkus(id, kontrol) {
    const f = medan(id);
    return (
      <Field key={id} label={<>{f.label}{f.wajib && <span className="req"> *</span>}</>} full={f.full}>
        {kontrol(f)}
        {f.hint && <div className="hint" style={{ marginTop: 6 }}>{f.hint}</div>}
      </Field>
    );
  }
  const dataPerusahaanTerkunci = !!awal && adaSuratBalasan(awal);
  const nilai = (id) => (META[id].di === 'p' ? p[META[id].kolom] : m[META[id].kolom]) || '';
  const ubah = (id, v) => (META[id].di === 'p' ? setP(META[id].kolom, v) : set(META[id].kolom, v));
  const opsiKosong = <option value="">—</option>;

  // Mode pratinjau: bungkus tiap field dengan tombol transparan penangkap klik.
  function slot(id) {
    const isi = renderMedan(id);
    if (!pratinjau) return isi;
    const f = medan(id);
    return (
      <div key={id} className={'ff-slot' + (f.full || id === 'syarat' ? ' field-full' : '') + (pratinjau.terpilih === id ? ' ff-slot-on' : '')}>
        {isi}
        {/* div, bukan <button>: tombol di dalam <fieldset disabled> ikut nonaktif dan tidak bisa diklik */}
        <div role="button" tabIndex={0} className="ff-slot-hit" onClick={() => pratinjau.onPilih(id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pratinjau.onPilih(id); } }}
          aria-label={`Ubah field ${f.label}`} />
      </div>
    );
  }

  function renderMedan(id) {
    switch (id) {
      case 'program':
        return bungkus(id, () => (
          <select value={m.program} onChange={(e) => gantiProgram(e.target.value)} disabled={!baru}>
            {programOpsi.map((k) => {
              const terpakai = baru && programTerpakai.includes(k);
              return <option key={k} value={k} disabled={terpakai}>{programLabel(k)}{terpakai ? ' (sudah ada pengajuan)' : ''}</option>;
            })}
          </select>
        ));
      case 'jenis':
        return bungkus(id, () => (
          <select value={m.jenisMagang || ''} onChange={(e) => set('jenisMagang', e.target.value)}>
            <option value="" disabled>— pilih jenis —</option>
            <option value="Magang">Magang</option>
            <option value="MKT">Mata Kuliah Terapan</option>
          </select>
        ));
      case 'periode':
        return bungkus(id, () => (
          <select value={m.periode} onChange={(e) => set('periode', e.target.value)} disabled={belumAdaPeriode}>
            <option value="">— pilih periode —</option>
            {periodeOpsi.map((pp) => <option key={pp} value={pp}>{pp}</option>)}
          </select>
        ));
      case 'nama':
        return bungkus(id, () => <input value={m.nama ?? nama} onChange={(e) => set('nama', e.target.value)} title="Perbaiki jika ada salah ketik pada nama akun" />);
      case 'angkatan':
        return bungkus(id, () => (
          <select value={m.angkatan ? String(m.angkatan) : ''} onChange={(e) => set('angkatan', e.target.value)}>
            <option value="">— pilih angkatan —</option>
            {angkatanOpsi.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        ));
      case 'dosenWali':
        return bungkus(id, () => (
          <select value={m.dosenWali || ''} onChange={(e) => set('dosenWali', e.target.value)}>
            {opsiKosong}
            {dosenWaliOpsi.map((d) => <option key={d.kode} value={d.kode}>{d.kode} — {d.nama}</option>)}
          </select>
        ));
      case 'semester':
        return bungkus(id, () => (
          <select value={p.semester || ''} onChange={(e) => setP('semester', e.target.value)}>
            {opsiKosong}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ));
      case 'klasifikasi':
        return bungkus(id, () => (
          <select value={m.klasifikasi || ''} onChange={(e) => set('klasifikasi', e.target.value)}>
            <option value="" disabled>— pilih klasifikasi —</option>
            {KLASIFIKASI.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        ));
      case 'bidang':
        return bungkus(id, () => (
          <select value={m.bidang || ''} onChange={(e) => set('bidang', e.target.value)}>
            <option value="" disabled>— pilih {gayaKP(kunci) ? 'tema' : 'bidang'} —</option>
            {(gayaKP(kunci) ? kpTemaUntukPilihan(m.bidang) : bidangUntukPilihan(m.bidang)).map((t) => <option key={t.kode} value={t.kode}>{t.label}</option>)}
          </select>
        ));
      case 'namaPersetujuanDosen':
        return bungkus(id, () => (
          <select value={p.namaPersetujuanDosen || ''} onChange={(e) => setP('namaPersetujuanDosen', e.target.value)}>
            {opsiKosong}
            {dosenPersetujuanOpsi.map((d) => <option key={d.kode} value={d.kode}>{d.kode} — {d.nama}</option>)}
          </select>
        ));
      case 'syarat':
        return renderSyarat();
      default: // text | textarea | date
        // Data perusahaan terkunci selama surat balasan ada (dataPerusahaanAman di firestore.rules).
        if (dataPerusahaanTerkunci && MEDAN_SURAT_BALASAN.includes(id)) {
          return bungkus(id, (f) => (
            <div className="isian-terkunci">
              <input type={f.tipe === 'date' ? 'date' : 'text'} value={nilai(id)} disabled aria-label={`${f.label} (terkunci)`} />
              <svg className="isian-terkunci-ikon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
          ));
        }
        return bungkus(id, (f) => (f.tipe === 'textarea'
          ? <textarea rows={2} value={nilai(id)} onChange={(e) => ubah(id, e.target.value)} placeholder={f.placeholder} />
          : <input type={f.tipe === 'date' ? 'date' : 'text'} value={nilai(id)} onChange={(e) => ubah(id, e.target.value)} placeholder={f.placeholder} />));
    }
  }

  function renderSyarat() {
    const t = medan('syarat');
    const [sks, ipk, , krs, ugb] = BUTIR_SYARAT.map(medan);
    const statusKP = medan('statusKP');
    return (
      <div key="syarat" className="sched field-full">
        <div className="sched-title">{t.label}</div>
        <label className="check"><input type="checkbox" checked={!!p.syaratSKS} onChange={(e) => setP('syaratSKS', e.target.checked)} /><span>{sks.label}</span></label>
        <div className="sched-grid" style={{ marginTop: 10 }}>
          <Field label={ipk.label}><input value={p.ipk || ''} onChange={(e) => setP('ipk', e.target.value)} placeholder={ipk.placeholder} /></Field>
          <Field label={<>{statusKP.label}{statusKP.wajib && <span className="req"> *</span>}</>}>
            <select value={p.statusKP || ''} onChange={(e) => setP('statusKP', e.target.value)}>
              <option value="" disabled>— pilih status —</option>
              <option value="Telah">Telah</option>
              <option value="Sedang">Sedang</option>
            </select>
          </Field>
        </div>
        <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={!!p.terdaftarKRS} onChange={(e) => setP('terdaftarKRS', e.target.checked)} /><span>{krs.label}</span></label>
        <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={!!p.sudahUGB} onChange={(e) => setP('sudahUGB', e.target.checked)} /><span>{ugb.label}</span></label>
      </div>
    );
  }

  return (
    <div className="portal-form card">
      <KepalaForm title={baru ? 'Ajukan pendaftaran' : 'Edit pendaftaran'} onClose={pratinjau ? undefined : onCancel} />
      {pratinjau ? (
        <fieldset disabled className="ff-fieldset"><div className="form-grid">{urutan.map((id) => slot(id))}</div></fieldset>
      ) : (
        <div className="form-grid">{urutan.map((id) => slot(id))}</div>
      )}
      {!pratinjau && (
        <>
          {belumAdaPeriode && <div className="callout" style={{ marginTop: 12 }}>Belum ada periode pendaftaran yang dibuka. Silakan hubungi admin.</div>}
          {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
          <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button className="btn" onClick={onCancel}>Batal</button>
            <button className="btn btn-primary" onClick={submit} disabled={belumAdaPeriode}>Kirim pengajuan</button>
          </div>
        </>
      )}
    </div>
  );
}
