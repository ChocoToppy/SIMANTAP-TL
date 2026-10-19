import React from 'react';
import { PROGRAM_KEYS, programLabel, punyaKlasifikasi, KLASIFIKASI, ringkasPendaftaran } from '../../utils/helpers.js';
import { bidangUntukPilihan } from '../../utils/pilihan.js';
import { Field, Modal } from '../../components/ui.jsx';
import { LinkBerkasRow } from './LinkBerkasRow.jsx';
import { PenutupanPengajuan, BannerDitutup } from './PenutupanPengajuan.jsx';
import { BannerPerubahanData } from './BannerPerubahanData.jsx';
import { RiwayatAktivitas } from './AktivitasCells.jsx';
import { NomorSuratPanel } from './NomorSuratPanel.jsx';
import { PengingatPesan } from './PengingatPesan.jsx';

// Tata letak generik (non-KP) di dalam modal FormMahasiswa (lihat
// FormMahasiswa.jsx) — dipakai untuk Capstone Design dan Tesis S2 (TA, KP, dan
// Magang memakai FormMahasiswaKP.jsx). Semua state/handler dikelola di
// FormMahasiswa.jsx, komponen ini murni presentasional (props saja).
export function FormMahasiswaGeneric({
  m, setM, set, gantiProgram, periodeList, daftarAngkatan = [],
  roles, pembimbing1Label, penguji1Label, dosenOpts, bebanBlok, stages, events, jadwalBlok,
  alurTahapBlok, notifikasiBlok, peringatanBlok, p,
  verifAwal, nomorTerpakai, baru, onCancel, submit, tersimpan, navEntri, modalOpsi, adaPengganti,
}) {
  return (
    <Modal
      title={baru ? 'Tambah mahasiswa' : 'Edit mahasiswa'}
      onClose={onCancel}
      headExtra={navEntri}
      opsi={modalOpsi}
      footer={
        <>
          <button className="btn" onClick={onCancel}>{baru ? 'Batal' : 'Tutup'}</button>
          <button className="btn btn-primary" onClick={submit}>{tersimpan ? 'Tersimpan ✓' : 'Simpan'}</button>
        </>
      }
    >
      <BannerDitutup m={m} setM={setM} adaPengganti={adaPengganti} />
      <BannerPerubahanData m={m} setM={setM} />
      <div className="form-grid">
        <div className="sched field-full">
          <div className="sched-title">Verifikasi pendaftaran</div>
          {ringkasPendaftaran(p).length > 0 ? (
            <div className="verif-info">
              {ringkasPendaftaran(p).map((r) => (
                <div key={r.label}>{r.label}: <strong>{r.nilai}</strong></div>
              ))}
            </div>
          ) : <div className="hint">Data dibuat manual oleh admin (tanpa pengajuan mahasiswa).</div>}
          <div style={{ marginTop: 10 }}>
            <LinkBerkasRow label="Link berkas pendaftaran" url={p.berkasLink} onUbah={(v) => setM((prev) => ({ ...prev, pendaftaran: { ...(prev.pendaftaran || {}), berkasLink: v } }))} diperiksa={p.berkasDiperiksa} onDiperiksa={(v) => setM((prev) => ({ ...prev, pendaftaran: { ...(prev.pendaftaran || {}), berkasDiperiksa: v } }))} />
          </div>
          <div className="sched-grid" style={{ marginTop: 10 }}>
            <Field label="Status verifikasi">
              <select value={m.verifikasi || 'terverifikasi'} onChange={(e) => set('verifikasi', e.target.value)}>
                <option value="baru">Menunggu verifikasi</option>
                <option value="terverifikasi">Terverifikasi</option>
                <option value="perbaikan">Perlu perbaikan</option>
              </select>
            </Field>
            <NomorSuratPanel m={m} setM={setM} baru={baru} terpakai={nomorTerpakai} />
          </div>
          <div className="hint" style={{ marginTop: 6 }}>Nomor surat ini dipakai untuk semua surat program ini — ambil saat verifikasi pertama kali.</div>
          <PengingatPesan m={m} set={set} verifAwal={verifAwal} />
        </div>

        {!baru && <RiwayatAktivitas m={m} />}

        <Field label="Program">
          <select value={m.program} onChange={(e) => gantiProgram(e.target.value)}>
            {PROGRAM_KEYS.map((pr) => <option key={pr} value={pr}>{programLabel(pr)}</option>)}
          </select>
        </Field>
        <Field label="Periode">
          <input value={m.periode} onChange={(e) => set('periode', e.target.value)} placeholder="mis. 2021 Ganjil" list="periode-list" />
          <datalist id="periode-list">
            {periodeList.map((pr) => <option key={pr} value={pr} />)}
          </datalist>
        </Field>

        <Field label="Nama" full><input value={m.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
        <Field label="NIM"><input value={m.nim} onChange={(e) => set('nim', e.target.value)} /></Field>
        <Field label="Angkatan">
          <input value={m.angkatan} onChange={(e) => set('angkatan', e.target.value)} placeholder="mis. 2024" list="angkatan-list" />
          <datalist id="angkatan-list">
            {daftarAngkatan.map((a) => <option key={a} value={a} />)}
          </datalist>
        </Field>
        <Field label="Judul" full><textarea rows={2} value={m.judul} onChange={(e) => set('judul', e.target.value)} /></Field>

        {punyaKlasifikasi(m.program) && (
          <Field label="Klasifikasi">
            <select value={m.klasifikasi} onChange={(e) => set('klasifikasi', e.target.value)}>
              {KLASIFIKASI.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
        )}
        <Field label="Bidang">
          <select value={m.bidang} onChange={(e) => set('bidang', e.target.value)}>
            {bidangUntukPilihan(m.bidang).map((b) => <option key={b.kode} value={b.kode}>{b.label}</option>)}
          </select>
        </Field>

        <Field label={pembimbing1Label}><select value={m.pembimbing1} onChange={(e) => set('pembimbing1', e.target.value)}>{dosenOpts}</select></Field>
        {roles.pembimbing >= 2 && (
          <Field label="Pembimbing 2"><select value={m.pembimbing2} onChange={(e) => set('pembimbing2', e.target.value)}>{dosenOpts}</select></Field>
        )}
        {roles.penguji >= 1 && (
          <Field label={penguji1Label}><select value={m.penguji1} onChange={(e) => set('penguji1', e.target.value)}>{dosenOpts}</select></Field>
        )}
        {roles.penguji >= 2 && (
          <Field label="Penguji 2"><select value={m.penguji2} onChange={(e) => set('penguji2', e.target.value)}>{dosenOpts}</select></Field>
        )}
        <div className="field-full beban-mini-grid">
          {bebanBlok('bimbingan')}
          {roles.penguji >= 1 && bebanBlok('penguji')}
        </div>

        <Field label="Tahap saat ini">
          <select value={m.tahap} onChange={(e) => set('tahap', e.target.value)}>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Tanggal mulai"><input type="date" value={m.tanggalMulai} onChange={(e) => set('tanggalMulai', e.target.value)} /></Field>
        <Field label="Batas akhir"><input type="date" value={m.batasAkhir} onChange={(e) => set('batasAkhir', e.target.value)} /></Field>
        <Field label="Tanggal lulus"><input type="date" value={m.tanggalLulus || ''} onChange={(e) => set('tanggalLulus', e.target.value)} /></Field>
        <Field label="Nilai angka">
          <input type="number" min="0" max="100" value={(m.nilaiAkhir || {}).angka || ''} onChange={(e) => setM((prev) => ({ ...prev, nilaiAkhir: { ...(prev.nilaiAkhir || {}), angka: e.target.value } }))} />
          <div className="hint" style={{ marginTop: 4 }}>Nilai tidak terlihat mahasiswa</div>
        </Field>
        <Field label="Nilai huruf">
          <select value={(m.nilaiAkhir || {}).huruf || ''} onChange={(e) => setM((prev) => ({ ...prev, nilaiAkhir: { ...(prev.nilaiAkhir || {}), huruf: e.target.value } }))}>
            <option value="">—</option>
            {['A', 'AB', 'B', 'BC', 'C', 'D', 'E'].map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <div className="hint" style={{ marginTop: 4 }}>Nilai tidak terlihat mahasiswa</div>
        </Field>

        {alurTahapBlok}

        {events.map((ev) => jadwalBlok(ev))}

        <Field label="Catatan / pesan untuk mahasiswa" full><textarea rows={2} value={m.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
        {notifikasiBlok}
        {peringatanBlok}
        <PenutupanPengajuan m={m} setM={setM} baru={baru} />
      </div>
    </Modal>
  );
}
