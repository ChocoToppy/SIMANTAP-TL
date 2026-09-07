import React from 'react';
import { PROGRAM_KEYS, programLabel, BIDANG, ringkasPendaftaran, normalizeUrl, formatTanggal } from '../../utils/helpers.js';
import { Field, Modal, FileDropZone } from '../../components/ui.jsx';
import { KpDocumentPanel } from '../../components/kpDocuments.jsx';
import { RiwayatAktivitas } from './AktivitasCells.jsx';

// Tata letak tab-per-tahap di dalam modal FormMahasiswa (lihat
// FormMahasiswa.jsx) — dipakai untuk KP & Magang (alur keduanya sama:
// Pendaftaran → Bimbingan → [seminar/expo] → Lulus), sengaja terpisah dari
// FormMahasiswaGeneric karena tampilannya jauh berbeda (tab per tahap + panel
// Dokumen di samping). Semua state/handler dikelola di FormMahasiswa.jsx,
// komponen ini murni presentasional (props saja).
export function FormMahasiswaKP({
  m, setM, set, gantiProgram, setTahap, periodeList,
  roles, pembimbing1Label, penguji1Label, dosenOpts, stages,
  alurTahapBlok, notifikasiBlok, peringatanBlok,
  tahapTab, setTahapTab, p, events, jadwalBlok,
  dosenByKode, konten, uploadAdminDokumenKP, hapusAdminDokumenKP,
  setPP, unduhPerpanjanganKP, dlBusyKP,
  ppBusy, ppErr, berikanSuratPerpanjangan,
  baru, onCancel, submit,
}) {
  const isKP = m.program === 'KP';
  return (
    <Modal
      title={baru ? 'Tambah mahasiswa' : 'Edit mahasiswa'}
      onClose={onCancel}
      wide
      footer={
        <>
          <button className="btn" onClick={onCancel}>Batal</button>
          <button className="btn btn-primary" onClick={submit}>Simpan</button>
        </>
      }
    >
      <div className="form-grid">
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
        <Field label="Angkatan"><input value={m.angkatan} onChange={(e) => set('angkatan', e.target.value)} placeholder="mis. 18" /></Field>
        <Field label="Judul" full><textarea rows={2} value={m.judul} onChange={(e) => set('judul', e.target.value)} /></Field>
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

        {alurTahapBlok}

        <Field label="Catatan / pesan untuk mahasiswa" full><textarea rows={2} value={m.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
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
              <div className="hint" style={{ marginTop: 6 }}>Nomor surat ini dipakai untuk semua surat program ini{isKP ? ' (termasuk ST Pembimbing KP)' : ''} — isi setelah dosen pembimbing ditetapkan.</div>
            </div>
          )}

          {events.includes(tahapTab) && events.map(jadwalBlok)}

          {tahapTab === 'Lulus' && (
            <div className="sched">
              <div className="sched-title">Kelulusan</div>
              <div className="sched-grid">
                <Field label="Tanggal lulus"><input type="date" value={m.tanggalLulus || ''} onChange={(e) => set('tanggalLulus', e.target.value)} /></Field>
                <Field label="Nilai angka (admin, tidak terlihat mahasiswa)">
                  <input type="number" min="0" max="100" value={(m.nilaiAkhir || {}).angka || ''} onChange={(e) => setM((prev) => ({ ...prev, nilaiAkhir: { ...(prev.nilaiAkhir || {}), angka: e.target.value } }))} />
                </Field>
                <Field label="Nilai huruf (admin, tidak terlihat mahasiswa)">
                  <select value={(m.nilaiAkhir || {}).huruf || ''} onChange={(e) => setM((prev) => ({ ...prev, nilaiAkhir: { ...(prev.nilaiAkhir || {}), huruf: e.target.value } }))}>
                    <option value="">—</option>
                    {['A', 'AB', 'B', 'BC', 'C', 'D', 'E'].map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
              </div>
              {m.tahap === 'Lulus'
                ? <div className="callout callout-green" style={{ marginTop: 10 }}>Mahasiswa telah dinyatakan lulus {programLabel(m.program)}.</div>
                : <div className="hint" style={{ marginTop: 10 }}>Mahasiswa belum mencapai tahap Lulus.</div>}
            </div>
          )}
        </div>

        <div className="modal-kp-side">
          <KpDocumentPanel m={m} program={m.program} dosenByKode={dosenByKode} konten={konten} canUpload role="admin" onUpload={uploadAdminDokumenKP} onDeleteUpload={hapusAdminDokumenKP} collapsible={false} title={`Dokumen ${programLabel(m.program)}`} activeStage={tahapTab} />
          {isKP ? (
            <div className="sched">
              <div className="sched-title">Perpanjangan Kerja Praktik</div>
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
                <button type="button" className="btn" onClick={unduhPerpanjanganKP} disabled={dlBusyKP}>{dlBusyKP ? 'Menyiapkan PDF…' : 'Cetak surat perpanjangan KP (PDF)'}</button>
                {!(m.perpanjangan || {}).suratAdminTersedia && (
                  <button type="button" className="btn btn-primary" onClick={() => setPP('suratAdminTersedia', true)}>Kirim ke mahasiswa</button>
                )}
              </div>
            </div>
          ) : (
            <div className="sched">
              <div className="sched-title">Perpanjangan {programLabel(m.program)}</div>
              {(m.perpanjangan && m.perpanjangan.diminta)
                ? <div className="verif-info"><div>Alasan mahasiswa: <strong>{m.perpanjangan.alasan || '—'}</strong>{m.perpanjangan.tanggalDiminta ? ` · ${formatTanggal(m.perpanjangan.tanggalDiminta)}` : ''}</div></div>
                : <div className="hint">Belum ada pengajuan perpanjangan dari mahasiswa.</div>}
              {(m.perpanjangan || {}).suratAdmin
                ? <div className="callout callout-green">Surat diberikan ke mahasiswa: <a href={m.perpanjangan.suratAdmin.url || m.perpanjangan.suratAdmin.dataUrl} target="_blank" rel="noreferrer">{m.perpanjangan.suratAdmin.fileName}</a></div>
                : <div className="hint">Surat perpanjangan belum diberikan ke mahasiswa.</div>}
              <div style={{ marginTop: 6 }}>
                <FileDropZone accept=".pdf" busy={ppBusy} onFile={berikanSuratPerpanjangan} label={(m.perpanjangan || {}).suratAdmin ? 'Ganti berkas & berikan ulang' : 'Berikan surat ke mahasiswa'} />
                {ppErr && <div className="login-err" style={{ marginTop: 4 }}>{ppErr}</div>}
              </div>
              {((m.perpanjangan || {}).suratFinal || (m.perpanjangan || {}).suratFinalLink)
                ? <div className="callout callout-green">Surat final (ditandatangani) dari mahasiswa: <a href={m.perpanjangan.suratFinal ? (m.perpanjangan.suratFinal.url || m.perpanjangan.suratFinal.dataUrl) : normalizeUrl(m.perpanjangan.suratFinalLink)} target="_blank" rel="noreferrer">{m.perpanjangan.suratFinal ? m.perpanjangan.suratFinal.fileName : 'buka'}</a></div>
                : <div className="hint">Surat final dari mahasiswa belum diunggah.</div>}
            </div>
          )}
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 20 }}>
        {notifikasiBlok}
        {peringatanBlok}
      </div>
    </Modal>
  );
}
