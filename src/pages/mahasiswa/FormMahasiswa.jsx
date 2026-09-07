import React, { useState, useMemo } from 'react';
import { PROGRAMS, programOf, stagesFor, eventsFor, rolesFor, syaratLabel, SEMUA, buatId, todayISO, RUANG, jamTampil, cariBentrok, waMahasiswa, tahapBerikut, tahapSebelumnya, eventAktif, HARI, berkasSyarat, catatAktivitas, formatTanggal, normalizeUrl, dokumenFieldFor } from '../../utils/helpers.js';
import { Field } from '../../components/ui.jsx';
import { generateDocument, getTemplateConfig } from '../../utils/documentGenerator.js';
import { readFileForUpload } from '../../utils/fileUpload.js';
import { FormMahasiswaKP } from './FormMahasiswaKP.jsx';
import { FormMahasiswaGeneric } from './FormMahasiswaGeneric.jsx';

// ===================== mahasiswa/FormMahasiswa.jsx =====================
// Modal tambah/edit mahasiswa (semua program) — file ini memegang SELURUH
// state & handler; tata letaknya sendiri (yang beda jauh untuk KP vs program
// lain) dirender oleh FormMahasiswaKP.jsx / FormMahasiswaGeneric.jsx sebagai
// komponen presentasional yang menerima semuanya lewat props.
export function FormMahasiswa({ awal, allDosen, allMahasiswa = [], periode, periodeList, konten = {}, defaultProgram = 'TA', onCancel, onSave }) {
  const baru = !awal;
  const [err, setErr] = useState('');
  const [m, setM] = useState(() => {
    const base = awal || {
      id: buatId(),
      program: defaultProgram,
      nama: '', nim: '', judul: '',
      periode: periode && periode !== SEMUA ? periode : (periodeList[periodeList.length - 1] || ''),
      angkatan: '', klasifikasi: 'Penelitian', bidang: 'U',
      pembimbing1: '', pembimbing2: '', penguji1: '', penguji2: '',
      tahap: 'Pendaftaran',
      tanggalMulai: todayISO(), batasAkhir: '',
      dibatalkan: false, catatan: '',
      jadwal: {}, verifikasi: 'terverifikasi', pendaftaran: {},
    };
    return { ...base, program: PROGRAMS[base.program] ? base.program : 'TA', jadwal: base.jadwal || {} };
  });

  const set = (k, v) => setM((prev) => ({ ...prev, [k]: v }));
  const setPP = (k, v) => setM((prev) => ({ ...prev, perpanjangan: { ...(prev.perpanjangan || {}), [k]: v } }));
  const setTahap = (v) => setM((prev) => {
    if (programOf(prev) === 'KP' && v === 'Seminar KP' && !(prev.dokumenKP || {}).persetujuanSmkp) {
      if (!window.confirm('Mahasiswa belum mengunggah Persetujuan SMKP yang ditandatangani. Tetap pindahkan ke Seminar KP?')) return prev;
    }
    return { ...prev, tahap: v };
  });
  // Tab tahap yang sedang dilihat admin di modal KP — navigasi tampilan saja,
  // TIDAK mengubah m.tahap (yang sebenarnya) sampai admin memakai tombol "Alur tahap".
  const [tahapTab, setTahapTab] = useState(() => {
    const initStages = stagesFor((awal && awal.program) || defaultProgram);
    return (awal && initStages.includes(awal.tahap)) ? awal.tahap : initStages[0];
  });
  const dosenByKode = useMemo(() => Object.fromEntries((allDosen || []).map((d) => [d.kode, d])), [allDosen]);
  const bentrokLive = useMemo(() => cariBentrok(allMahasiswa, m), [allMahasiswa, m]);
  const [nomorDisalin, setNomorDisalin] = useState(false);
  const setJadwal = (ev, key, val) =>
    setM((prev) => ({
      ...prev,
      jadwal: { ...(prev.jadwal || {}), [ev]: { ...((prev.jadwal || {})[ev] || {}), [key]: val } },
    }));

  // Admin mengunggah berkas KP yang ditandatangani (mis. BA Seminar KP) atas nama
  // mahasiswa — disimpan ke state lokal, ikut tersimpan saat admin klik "Simpan".
  async function uploadAdminDokumenKP(key, file) {
    const hasil = await readFileForUpload(file, `${m.id}/${key}`);
    const field = dokumenFieldFor(programOf(m)) || 'dokumenKP';
    setM((prev) => ({ ...prev, [field]: { ...(prev[field] || {}), [key]: hasil } }));
  }

  // Sama seperti unggah di atas: hanya mengubah state lokal (form ini belum
  // tersimpan sampai admin klik "Simpan"). Berkas lama baru benar-benar
  // dihapus dari Storage saat submit() memanggil onSave — lihat
  // orphanedUploadPaths/simpanMahasiswa di App.jsx.
  function hapusAdminDokumenKP(key) {
    const field = dokumenFieldFor(programOf(m)) || 'dokumenKP';
    setM((prev) => {
      const dokumen = { ...(prev[field] || {}) };
      delete dokumen[key];
      return { ...prev, [field]: dokumen };
    });
  }

  // Admin memberikan surat perpanjangan ke mahasiswa sebagai berkas terunggah
  // (bukan tautan Drive) — langsung muncul di Portal mahasiswa untuk diunduh.
  const [ppBusy, setPpBusy] = useState(false);
  const [ppErr, setPpErr] = useState('');
  const [dlBusyKP, setDlBusyKP] = useState(false);
  async function unduhPerpanjanganKP() {
    const config = getTemplateConfig('Perpanjangan KP', m, dosenByKode, {});
    if (!config) return;
    setDlBusyKP(true);
    try {
      await generateDocument(config.template, config.filename, config.data);
    } finally {
      setDlBusyKP(false);
    }
  }
  async function berikanSuratPerpanjangan(file) {
    setPpErr('');
    setPpBusy(true);
    try {
      const hasil = await readFileForUpload(file, `${m.id}/perpanjangan-admin`);
      setPP('suratAdmin', hasil);
    } catch (ex) {
      setPpErr(ex.message || 'Gagal mengunggah berkas.');
    } finally {
      setPpBusy(false);
    }
  }

  function gantiProgram(p) {
    setM((prev) => {
      const stages = stagesFor(p);
      const tahap = stages.includes(prev.tahap) ? prev.tahap : stages[0];
      const r = rolesFor(p);
      const next = { ...prev, program: p, tahap };
      if (r.pembimbing < 2) next.pembimbing2 = '';
      if (r.pembimbing < 1) next.pembimbing1 = '';
      if (r.penguji < 1) next.penguji1 = '';
      if (r.penguji < 2) next.penguji2 = '';
      return next;
    });
  }

  function submit() {
    if (!m.nama.trim()) { setErr('Nama wajib diisi.'); return; }
    let calon = { ...m, angkatan: Number(m.angkatan) || m.angkatan };
    const masalah = [];
    // Validasi tanggal jadwal: dalam rentang & berurutan sesuai tahapan.
    const evs = eventsFor(programOf(calon));
    let prevEv = null;
    evs.forEach((ev) => {
      const t = ((calon.jadwal || {})[ev] || {}).tanggal;
      if (!t) return;
      // Seminar KP tidak terikat rentang tanggalMulai/batasAkhir KP — durasi KP
      // mengikuti kerja lapangan mahasiswa, bukan jadwal seminarnya.
      if (ev !== 'Seminar KP') {
        if (calon.tanggalMulai && t < calon.tanggalMulai) masalah.push(`Tanggal ${ev} mendahului tanggal mulai (${formatTanggal(calon.tanggalMulai)}).`);
        if (calon.batasAkhir && t > calon.batasAkhir) masalah.push(`Tanggal ${ev} melewati batas akhir (${formatTanggal(calon.batasAkhir)}).`);
      }
      if (prevEv && t < ((calon.jadwal || {})[prevEv] || {}).tanggal) masalah.push(`Tanggal ${ev} mendahului ${prevEv} — urutan harus ${evs.join(' → ')}.`);
      prevEv = ev;
    });
    const cb = cariBentrok(allMahasiswa, calon);
    // Bentrok jadwal HANYA peringatan, tidak mengunci (boleh jadwal bersamaan).
    if (masalah.length) { setErr('Tidak bisa menyimpan:\n• ' + masalah.join('\n• ')); return; }
    if (cb.bentrok.length && !window.confirm('Ada bentrok jadwal:\n• ' + cb.bentrok.join('\n• ') + '\n\nTetap simpan?')) return;
    setErr('');
    onSave(baru ? catatAktivitas(calon, 'dibuat') : calon);
  }

  const dosenOpts = (
    <>
      <option value="">—</option>
      {allDosen.map((d) => <option key={d.kode} value={d.kode}>{d.kode} — {d.nama}</option>)}
    </>
  );

  const stages = stagesFor(m.program);
  const events = eventsFor(m.program);
  const roles = rolesFor(m.program);
  const pembimbing1Label = roles.pembimbing === 1 ? (roles.pembimbingLabel || 'Pembimbing') : 'Pembimbing 1';
  const penguji1Label = roles.penguji === 1 ? 'Penguji' : 'Penguji 1';
  const p = m.pendaftaran || {};

  // ----- Blok kontak mahasiswa (dipakai di kedua tata letak) -----
  const nomorWA = waMahasiswa(m);
  const notifikasiBlok = (
    <div className="sched field-full">
      <div className="sched-title">Kontak mahasiswa</div>
      {nomorWA ? (
        <div className="phone-display">
          <span className="phone-display-number">{nomorWA}</span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.clipboard.writeText(nomorWA).catch(() => {});
              setNomorDisalin(true);
              setTimeout(() => setNomorDisalin(false), 1500);
            }}
          >
            {nomorDisalin ? 'Tersalin!' : 'Salin nomor'}
          </button>
        </div>
      ) : (
        <span className="hint">Nomor WA mahasiswa belum ada.</span>
      )}
    </div>
  );

  const peringatanBlok = (
    <>
      {bentrokLive.bentrok.length > 0 && (
        <div className="callout callout-amber field-full" style={{ whiteSpace: 'pre-wrap' }}>
          ⚠ Peringatan bentrok jadwal (boleh tetap disimpan):{'\n• ' + bentrokLive.bentrok.join('\n• ')}
        </div>
      )}
      {bentrokLive.kelompok.length > 0 && (
        <div className="callout field-full" style={{ whiteSpace: 'pre-wrap' }}>
          👥 Sidang kelompok terdeteksi:{'\n• ' + bentrokLive.kelompok.join('\n• ')}
        </div>
      )}
      {err && <div className="login-err field-full" style={{ whiteSpace: 'pre-wrap' }}>{err}</div>}
    </>
  );

  const alurTahapBlok = (() => {
    const next = tahapBerikut(programOf(m), m.tahap);
    const prevStage = tahapSebelumnya(programOf(m), m.tahap);
    const evA = eventAktif(m);
    const jA = evA ? ((m.jadwal || {})[evA] || {}) : {};
    const luluskan = () => setM((prev) => {
      const nx = tahapBerikut(programOf(prev), prev.tahap);
      if (programOf(prev) === 'KP' && nx === 'Seminar KP' && !(prev.dokumenKP || {}).persetujuanSmkp) {
        if (!window.confirm('Mahasiswa belum mengunggah Persetujuan SMKP yang ditandatangani. Tetap lanjutkan ke Seminar KP?')) return prev;
      }
      const upd = { ...prev, tahap: nx };
      if (evA) upd.jadwal = { ...(prev.jadwal || {}), [evA]: { ...((prev.jadwal || {})[evA] || {}), hasil: 'lulus' } };
      if (nx === 'Lulus') upd.tanggalLulus = prev.tanggalLulus || todayISO();
      return upd;
    });
    const tidakLulus = () => setM((prev) => ({ ...prev, jadwal: { ...(prev.jadwal || {}), [evA]: { ...((prev.jadwal || {})[evA] || {}), hasil: 'tidak', dikonfirmasi: false } } }));
    // Admin punya wewenang penuh: mundurkan ke tahap sebelumnya kapan pun,
    // termasuk membatalkan status Lulus. Tidak ada field yang dibersihkan
    // otomatis — semua (termasuk tanggal lulus) tetap bisa diedit manual.
    const mundurkan = () => setM((prev) => {
      const pv = tahapSebelumnya(programOf(prev), prev.tahap);
      return pv ? { ...prev, tahap: pv } : prev;
    });
    return (
      <div className="sched field-full">
        <div className="sched-title">Alur tahap</div>
        <div className="cell-sub">Tahap saat ini: <strong>{m.tahap}</strong>{next ? ` → berikutnya: ${next}` : ' (tahap akhir)'}</div>
        {evA && (
          <div className="verif-info" style={{ marginTop: 8 }}>
            <div>Jadwal {evA}: {jA.tanggal ? formatTanggal(jA.tanggal) : '—'} {jamTampil(jA)} {jA.ruang || ''}</div>
            {jA.berkasLink ? <div>Berkas: <a href={normalizeUrl(jA.berkasLink)} target="_blank" rel="noreferrer">buka link</a></div> : <div className="muted">Berkas belum dilampirkan mahasiswa.</div>}
            <div>Status: {jA.dikonfirmasi ? 'jadwal final' : (jA.tanggal ? 'perkiraan / menunggu verifikasi' : 'belum ada jadwal')}{jA.hasil ? ` · hasil terakhir: ${jA.hasil}` : ''}</div>
          </div>
        )}
        <div className="notif-actions" style={{ marginTop: 8 }}>
          {prevStage && (
            <button type="button" className="btn" onClick={mundurkan}>
              ← Mundurkan ke {prevStage}</button>
          )}
          {next && (
            <button type="button" className="btn btn-primary" onClick={luluskan}>
              Lanjut ke Tahap Berikutnya{next ? ` (${next})` : ''}</button>
          )}
          {evA && <button type="button" className="btn" onClick={tidakLulus}>Tandai tidak lulus (ulang)</button>}
          {!next && !prevStage && <span className="hint">Satu-satunya tahap pada program ini.</span>}
        </div>
        <div className="hint">Tahap saat ini juga bisa diganti langsung lewat dropdown "Tahap saat ini" di atas. Perubahan tersimpan saat klik "Simpan".</div>
      </div>
    );
  })();

  const jadwalBlok = (ev) => {
    const j = (m.jadwal || {})[ev] || {};
    return (
      <div className="sched" key={ev}>
        <div className="sched-title">Jadwal {ev}</div>
        <div className="sched-grid">
          <Field label="Nomor Surat"><input value={m.nomorSurat || j.nomorST || ''} disabled title="Nomor surat sekarang satu untuk seluruh program — isi di panel Verifikasi pendaftaran" /></Field>
          <Field label="Tanggal"><input type="date" value={j.tanggal || ''} onChange={(e) => setJadwal(ev, 'tanggal', e.target.value)} /></Field>
          {(m.program === 'KP' || ev.includes('KP')) && (
            <Field label="Hari">
              <select value={j.hari || ''} onChange={(e) => setJadwal(ev, 'hari', e.target.value)}>
                <option value="">—</option>
                {HARI.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
          )}
          <Field label="Jam mulai"><input type="time" value={j.jamMulai || ''} onChange={(e) => setJadwal(ev, 'jamMulai', e.target.value)} /></Field>
          <Field label="Jam selesai"><input type="time" value={j.jamSelesai || ''} onChange={(e) => setJadwal(ev, 'jamSelesai', e.target.value)} /></Field>
          <Field label="Ruang">
            <select value={j.ruang || ''} onChange={(e) => setJadwal(ev, 'ruang', e.target.value)}>
              <option value="">— pilih ruang —</option>
              {RUANG.map((r) => <option key={r} value={r}>{r}</option>)}
              {j.ruang && !RUANG.includes(j.ruang) && <option value={j.ruang}>{j.ruang}</option>}
            </select>
          </Field>
        </div>
        <div className="sched-checks">
          <label className="check"><input type="checkbox" checked={!!j.printBA} onChange={(e) => setJadwal(ev, 'printBA', e.target.checked)} /><span>Print Berita Acara</span></label>
          <label className="check"><input type="checkbox" checked={!!j.syarat} onChange={(e) => setJadwal(ev, 'syarat', e.target.checked)} /><span>{syaratLabel(ev)}</span></label>
          <label className="check"><input type="checkbox" checked={!!j.dikonfirmasi} onChange={(e) => setJadwal(ev, 'dikonfirmasi', e.target.checked)} /><span>Jadwal final (dikonfirmasi)</span></label>
        </div>
        <div className="sched-grid" style={{ marginTop: 8 }}>
          <Field label="Link berkas persyaratan" full>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ flex: 1 }} value={j.berkasLink || ''} onChange={(e) => setJadwal(ev, 'berkasLink', e.target.value)} placeholder="https://drive.google.com/..." />
              {j.berkasLink && <a className="btn" href={normalizeUrl(j.berkasLink)} target="_blank" rel="noreferrer">Buka</a>}
            </div>
          </Field>
          {ev.includes('Sidang') && (
            <>
              <Field label="Link Turnitin" full>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ flex: 1 }} value={j.turnitinLink || ''} onChange={(e) => setJadwal(ev, 'turnitinLink', e.target.value)} placeholder="https://drive.google.com/..." />
                  {j.turnitinLink && <a className="btn" href={normalizeUrl(j.turnitinLink)} target="_blank" rel="noreferrer">Buka</a>}
                </div>
              </Field>
              <Field label="Link folder sidang" full>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ flex: 1 }} value={j.folderLink || ''} onChange={(e) => setJadwal(ev, 'folderLink', e.target.value)} placeholder="https://drive.google.com/..." />
                  {j.folderLink && <a className="btn" href={normalizeUrl(j.folderLink)} target="_blank" rel="noreferrer">Buka</a>}
                </div>
              </Field>
            </>
          )}
        </div>
        <div className="hint">
          Dokumen yang diharapkan:
          <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {berkasSyarat(ev, konten).map((item, i) => <li key={i}>{item}</li>)}
          </ol>
        </div>
      </div>
    );
  };

  if (m.program === 'KP' || m.program === 'MG') {
    return (
      <FormMahasiswaKP
        m={m} setM={setM} set={set} gantiProgram={gantiProgram} setTahap={setTahap} periodeList={periodeList}
        roles={roles} pembimbing1Label={pembimbing1Label} penguji1Label={penguji1Label} dosenOpts={dosenOpts} stages={stages}
        alurTahapBlok={alurTahapBlok} notifikasiBlok={notifikasiBlok} peringatanBlok={peringatanBlok}
        tahapTab={tahapTab} setTahapTab={setTahapTab} p={p} events={events} jadwalBlok={jadwalBlok}
        dosenByKode={dosenByKode} konten={konten} uploadAdminDokumenKP={uploadAdminDokumenKP} hapusAdminDokumenKP={hapusAdminDokumenKP}
        setPP={setPP} unduhPerpanjanganKP={unduhPerpanjanganKP} dlBusyKP={dlBusyKP}
        ppBusy={ppBusy} ppErr={ppErr} berikanSuratPerpanjangan={berikanSuratPerpanjangan}
        baru={baru} onCancel={onCancel} submit={submit}
      />
    );
  }

  return (
    <FormMahasiswaGeneric
      m={m} setM={setM} set={set} gantiProgram={gantiProgram} periodeList={periodeList}
      roles={roles} pembimbing1Label={pembimbing1Label} penguji1Label={penguji1Label} dosenOpts={dosenOpts} stages={stages} events={events} jadwalBlok={jadwalBlok}
      alurTahapBlok={alurTahapBlok} notifikasiBlok={notifikasiBlok} peringatanBlok={peringatanBlok} p={p}
      dosenByKode={dosenByKode} ppBusy={ppBusy} ppErr={ppErr} berikanSuratPerpanjangan={berikanSuratPerpanjangan}
      baru={baru} onCancel={onCancel} submit={submit}
    />
  );
}
