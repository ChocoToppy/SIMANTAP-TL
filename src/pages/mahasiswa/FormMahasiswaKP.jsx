import React, { useState } from 'react';
import { PROGRAM_KEYS, programLabel, programDisplayLabel, BIDANG, ringkasPendaftaran, normalizeUrl, formatTanggal, judulLabelFor } from '../../utils/helpers.js';
import { Field, Modal, MessageIcon } from '../../components/ui.jsx';
import { KpDocumentPanel } from '../../components/kpDocuments.jsx';
import { RiwayatAktivitas } from './AktivitasCells.jsx';

// Tata letak tab-per-tahap di dalam modal FormMahasiswa (lihat
// FormMahasiswa.jsx) — dipakai untuk KP & Magang (alur keduanya sama:
// Pendaftaran → Bimbingan → [seminar/expo] → Lulus), sengaja terpisah dari
// FormMahasiswaGeneric karena tampilannya jauh berbeda (tab per tahap + panel
// Dokumen di samping). Semua state/handler dikelola di FormMahasiswa.jsx,
// komponen ini murni presentasional (props saja).
export function FormMahasiswaKP({
  m, setM, set, gantiProgram, setTahap, periodeList, daftarAngkatan = [],
  roles, pembimbing1Label, penguji1Label, dosenOpts, stages,
  alurTahapBlok, notifikasiBlok, peringatanBlok,
  tahapTab, setTahapTab, p, events, jadwalBlok,
  dosenByKode, konten, uploadAdminDokumenKP, hapusAdminDokumenKP,
  setPP, unduhPerpanjanganKP, dlBusyKP,
  baru, onCancel, submit,
}) {
  // "Halaman" di dalam modal — 'utama' (tab tahap, dokumen, dst) atau 'data'
  // (form identitas/penugasan Program..Batas akhir, dibuka lewat tombol "Edit
  // data pendaftaran"). Mahasiswa baru selalu tampil satu halaman penuh (semua
  // field wajib langsung terlihat, belum ada apa-apa untuk disembunyikan).
  const [page, setPage] = useState('utama');
  // Catatan/pesan untuk mahasiswa disembunyikan default — cuma dibuka lewat
  // tombol ikon pesan di ringkasan identitas.
  const [catatanOpen, setCatatanOpen] = useState(false);
  // Di halaman "data", X / klik-luar / tombol kiri footer HARUS cuma kembali ke
  // halaman utama (bukan batalkan seluruh edit) — keduanya menulis ke `m` yang
  // sama, jadi tidak ada apa pun yang perlu "dibatalkan" saat pindah halaman.
  const kembaliAtauBatal = page === 'data' ? () => setPage('utama') : onCancel;
  const judul = baru ? 'Tambah mahasiswa' : (page === 'data' ? (
    <span className="modal-breadcrumb">
      <button type="button" className="modal-breadcrumb-link" onClick={() => setPage('utama')}>Edit mahasiswa</button>
      <span className="modal-breadcrumb-sep">›</span>
      <span className="modal-breadcrumb-current">Edit data pendaftaran</span>
    </span>
  ) : 'Edit mahasiswa');
  return (
    <Modal
      title={judul}
      onClose={kembaliAtauBatal}
      wide
      footer={
        <>
          <button className="btn" onClick={kembaliAtauBatal}>{page === 'data' ? 'Kembali' : 'Batal'}</button>
          <button className="btn btn-primary" onClick={submit}>Simpan</button>
        </>
      }
    >
      {!baru && page === 'utama' && (
        <div className="mhs-edit-top">
          <RiwayatAktivitas m={m} />
          {alurTahapBlok}
        </div>
      )}

      {(baru || page === 'data') && (
      <>
        <div className="form-grid" style={{ marginTop: baru ? 0 : 16 }}>
          <Field label="Program">
            <select value={m.program} onChange={(e) => gantiProgram(e.target.value)}>
              {PROGRAM_KEYS.map((pr) => <option key={pr} value={pr}>{programLabel(pr)}</option>)}
            </select>
          </Field>
          {m.program === 'MG' && (
            <Field label="Jenis">
              <select value={m.jenisMagang || 'Magang'} onChange={(e) => set('jenisMagang', e.target.value)}>
                <option value="Magang">Magang</option>
                <option value="MKT">Mata Kuliah Terapan</option>
              </select>
            </Field>
          )}
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
          <Field label={judulLabelFor(m)} full><textarea rows={2} value={m.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
          <Field label="Bidang">
            <select value={m.bidang} onChange={(e) => set('bidang', e.target.value)}>
              {BIDANG.map((b) => <option key={b.kode} value={b.kode}>{b.label}</option>)}
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
          <Field label="Dosen Wali"><select value={m.dosenWali || ''} onChange={(e) => set('dosenWali', e.target.value)}>{dosenOpts}</select></Field>

          <Field label="Tahap saat ini">
            <select value={m.tahap} onChange={(e) => setTahap(e.target.value)}>
              {stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Tanggal mulai"><input type="date" value={m.tanggalMulai} onChange={(e) => set('tanggalMulai', e.target.value)} /></Field>
          <Field label="Batas akhir"><input type="date" value={m.batasAkhir} onChange={(e) => set('batasAkhir', e.target.value)} /></Field>
        </div>
      </>
      )}

      {page === 'utama' && (
      <>
      <div className="form-grid" style={{ marginTop: 20 }}>
        {baru && alurTahapBlok}
      </div>

      <div className="mhs-edit-identity">
        {!baru && (
          <div className="mhs-edit-identity-info">
            <div>
              <span className="field-label">Nama</span>
              <div className="cell-name">{m.nama}</div>
            </div>
            <div>
              <span className="field-label">NIM</span>
              <div>{m.nim}</div>
            </div>
            <div className="mhs-edit-identity-judul">
              <span className="field-label">{judulLabelFor(m)}</span>
              <div>{m.judul || <span className="muted">—</span>}</div>
            </div>
          </div>
        )}
        <button
          type="button"
          className="icon-btn"
          onClick={() => setCatatanOpen((v) => !v)}
          aria-label="Catatan/pesan untuk mahasiswa"
          title="Catatan/pesan untuk mahasiswa"
        ><MessageIcon /></button>
      </div>

      {catatanOpen && (
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Field label="Catatan / pesan untuk mahasiswa" full><textarea rows={2} value={m.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
        </div>
      )}

      <div className="form-grid" style={{ marginTop: 12 }}>
        <label className="check field-full">
          <input type="checkbox" checked={!!m.dibatalkan} onChange={(e) => set('dibatalkan', e.target.checked)} />
          <span>Dibatalkan (tidak dihitung sebagai aktif &amp; beban dosen)</span>
        </label>
      </div>

      <div className="modal-kp-layout" style={{ marginTop: 20 }}>
        <div className="modal-kp-main">
          <div className="tabs" style={{ marginBottom: 0 }}>
            {stages.map((s) => (
              <button key={s} type="button" className={'tab' + (tahapTab === s ? ' active' : '')} onClick={() => setTahapTab(s)}>{s}</button>
            ))}
          </div>

          {tahapTab === 'Pendaftaran' && (
            <div className="sched">
              <div className="sched-title">Verifikasi pendaftaran</div>
              {(ringkasPendaftaran(p).length > 0 || p.berkasLink) ? (
                <div className="verif-info">
                  {ringkasPendaftaran(p).map((r) => (
                    <div key={r.label}>{r.label}: <strong>{r.nilai}</strong></div>
                  ))}
                  {p.berkasLink
                    ? <div>Berkas: <a href={normalizeUrl(p.berkasLink)} target="_blank" rel="noreferrer">buka link</a></div>
                    : <div className="muted">Berkas belum dilampirkan.</div>}
                </div>
              ) : <div className="hint">Data dibuat manual oleh admin (tanpa pengajuan mahasiswa).</div>}
              <div className="sched-grid" style={{ marginTop: 10 }}>
                <Field label="Status verifikasi">
                  <select value={m.verifikasi || 'terverifikasi'} onChange={(e) => set('verifikasi', e.target.value)}>
                    <option value="baru">Menunggu verifikasi</option>
                    <option value="terverifikasi">Terverifikasi</option>
                    <option value="perbaikan">Perlu perbaikan</option>
                  </select>
                </Field>
                {!baru && (
                  <div className="field">
                    <span className="field-label" style={{ visibility: 'hidden' }}>_</span>
                    <button type="button" className="btn" onClick={() => setPage('data')}>Edit data pendaftaran</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tahapTab === 'Bimbingan' && (
            <div className="sched">
              <div className="sched-title">Bimbingan</div>
              <div className="sched-grid">
                <Field label={pembimbing1Label}><select value={m.pembimbing1} onChange={(e) => set('pembimbing1', e.target.value)}>{dosenOpts}</select></Field>
                {roles.pembimbing >= 2 && (
                  <Field label="Pembimbing 2"><select value={m.pembimbing2} onChange={(e) => set('pembimbing2', e.target.value)}>{dosenOpts}</select></Field>
                )}
                <Field label="Nomor Surat">
                  <input value={m.nomorSurat || ''} onChange={(e) => set('nomorSurat', e.target.value)} placeholder="mis. 123/UN7.../2026" />
                </Field>
              </div>
              <div className="hint" style={{ marginTop: 6 }}>Nomor surat ini dipakai untuk semua surat program ini (termasuk ST Pembimbing {programDisplayLabel(m)}) — isi setelah dosen pembimbing ditetapkan.</div>
            </div>
          )}

          {events.includes(tahapTab) && events.map(jadwalBlok)}

          {tahapTab === 'Lulus' && (
            <div className="sched">
              <div className="sched-title">Kelulusan</div>
              <div className="sched-grid">
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
              </div>
              {m.tahap === 'Lulus'
                ? <div className="callout callout-green" style={{ marginTop: 10 }}>Mahasiswa telah dinyatakan lulus {programDisplayLabel(m)}.</div>
                : <div className="hint" style={{ marginTop: 10 }}>Mahasiswa belum mencapai tahap Lulus.</div>}
            </div>
          )}
        </div>

        <div className="modal-kp-side">
          <KpDocumentPanel m={m} program={m.program} dosenByKode={dosenByKode} konten={konten} canUpload role="admin" onUpload={uploadAdminDokumenKP} onDeleteUpload={hapusAdminDokumenKP} collapsible={false} title={`Dokumen ${programDisplayLabel(m)}`} activeStage={tahapTab} />
          <div className="sched">
            <div className="sched-title">Perpanjangan {programDisplayLabel(m)}</div>
            {(m.perpanjangan && m.perpanjangan.diminta)
              ? <div className="verif-info"><div>Alasan mahasiswa: <strong>{m.perpanjangan.alasan || '—'}</strong>{m.perpanjangan.tanggalDiminta ? ` · ${formatTanggal(m.perpanjangan.tanggalDiminta)}` : ''}</div></div>
              : <div className="hint">Belum ada pengajuan perpanjangan dari mahasiswa.</div>}
            {(m.perpanjangan || {}).suratAdminTersedia
              ? <div className="callout callout-green">Surat perpanjangan sudah terlihat di Portal mahasiswa.</div>
              : <div className="hint">Surat perpanjangan belum ditampilkan ke mahasiswa.</div>}
            {((m.perpanjangan || {}).suratFinal || (m.perpanjangan || {}).suratFinalLink)
              ? <div className="callout callout-green">Surat final (ditandatangani) dari mahasiswa: <a href={m.perpanjangan.suratFinal ? (m.perpanjangan.suratFinal.url || m.perpanjangan.suratFinal.dataUrl) : normalizeUrl(m.perpanjangan.suratFinalLink)} target="_blank" rel="noreferrer">{m.perpanjangan.suratFinal ? m.perpanjangan.suratFinal.fileName : 'buka'}</a></div>
              : <div className="hint">Surat final dari mahasiswa belum diunggah.</div>}
            <div className="notif-actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn" onClick={unduhPerpanjanganKP} disabled={dlBusyKP}>{dlBusyKP ? 'Menyiapkan PDF…' : `Cetak surat perpanjangan ${programDisplayLabel(m)} (PDF)`}</button>
              {!(m.perpanjangan || {}).suratAdminTersedia && (
                <button type="button" className="btn btn-primary" onClick={() => setPP('suratAdminTersedia', true)}>Kirim ke mahasiswa</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 20 }}>
        {notifikasiBlok}
        {peringatanBlok}
      </div>
      </>
      )}
    </Modal>
  );
}
