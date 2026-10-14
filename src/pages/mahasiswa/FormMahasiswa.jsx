import React, { useState, useMemo, useRef } from 'react';
import { perpanjanganDocType, PROGRAMS, programOf, stagesFor, eventsFor, rolesFor, syaratLabel, SEMUA, buatId, todayISO, RUANG, jamTampil, cariBentrok, waMahasiswa, tahapBerikut, tahapSebelumnya, eventAktif, berkasSyarat, catatAktivitas, formatTanggal, normalizeUrl, dokumenFieldFor, dosenAktifUntuk } from '../../utils/helpers.js';
import { opsiRuang, periksaUsulanRuang, teksBentrokRuang, milikProgram } from '../../modules/ruang';
import { FITUR_RUANG } from '../../utils/config.js';
import { catatNomorManual } from '../../utils/nomorSuratDb.js';
import { bacaNomor, waktuNomor, pemakaiNomorLain, urutTerpakaiDiRecord, NAMA_BULAN } from '../../utils/nomorSurat.js';
import { Field } from '../../components/ui.jsx';
import { generateDocument, getTemplateConfig } from '../../utils/documentGenerator.js';
import { readFileForUpload } from '../../utils/fileUpload.js';
import { LinkBerkasRow } from './LinkBerkasRow.jsx';
import { FormMahasiswaKP } from './FormMahasiswaKP.jsx';
import { FormMahasiswaGeneric } from './FormMahasiswaGeneric.jsx';
import { BebanDosenMini } from './BebanDosenMini.jsx';

// ===================== mahasiswa/FormMahasiswa.jsx =====================
// Modal tambah/edit mahasiswa (semua program) — file ini memegang SELURUH
// state & handler; tata letaknya sendiri (yang beda jauh untuk KP vs program
// lain) dirender oleh FormMahasiswaKP.jsx / FormMahasiswaGeneric.jsx sebagai
// komponen presentasional yang menerima semuanya lewat props.
export function FormMahasiswa({ awal, allDosen, allMahasiswa = [], periode, periodeList, daftarAngkatan = [], konten = {}, defaultProgram = 'TA', jadwalRuang = null, urutan = [], onPindah = null, sudahPindah = false, onCancel, onSave }) {
  const daftarRuang = opsiRuang(jadwalRuang, RUANG);
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

  // Pindah ke entri sebelumnya/berikutnya sesuai urutan tabel (filter/sort aktif).
  // Form di-remount per entri (key di Mahasiswa.jsx), jadi ubahan yang belum
  // disimpan akan hilang — minta konfirmasi dulu kalau ada.
  const mAwal = useRef(null);
  if (mAwal.current === null) mAwal.current = JSON.stringify(m);
  const posisi = onPindah ? urutan.indexOf(m.id) : -1;
  function pindah(arah) {
    const tujuan = urutan[posisi + arah];
    if (!tujuan) return;
    if (JSON.stringify(m) !== mAwal.current && !window.confirm('Ada perubahan yang belum disimpan. Pindah entri akan membuangnya.\n\nTetap pindah?')) return;
    onPindah(tujuan);
  }
  const navEntri = (!baru && posisi >= 0 && urutan.length > 1) ? (
    <div className="entry-nav">
      <button type="button" className="btn btn-sm" disabled={posisi <= 0} onClick={() => pindah(-1)} title="Entri sebelumnya" aria-label="Entri sebelumnya">‹</button>
      <span className="entry-nav-pos">{posisi + 1} / {urutan.length}</span>
      <button type="button" className="btn btn-sm" disabled={posisi >= urutan.length - 1} onClick={() => pindah(1)} title="Entri berikutnya" aria-label="Entri berikutnya">›</button>
    </div>
  ) : null;
  const modalOpsi = { stabil: !!navEntri, tanpaAnimasi: sudahPindah };

  const set = (k, v) => setM((prev) => ({ ...prev, [k]: v }));
  const setPP = (k, v) => setM((prev) => ({ ...prev, perpanjangan: { ...(prev.perpanjangan || {}), [k]: v } }));
  const setTahap = (v) => set('tahap', v);
  // Tab tahap yang sedang dilihat admin di modal KP — navigasi tampilan saja,
  // TIDAK mengubah m.tahap (yang sebenarnya) sampai admin memakai tombol "Alur tahap".
  const [tahapTab, setTahapTab] = useState(() => {
    const initStages = stagesFor((awal && awal.program) || defaultProgram);
    return (awal && initStages.includes(awal.tahap)) ? awal.tahap : initStages[0];
  });
  const dosenByKode = useMemo(() => Object.fromEntries((allDosen || []).map((d) => [d.kode, d])), [allDosen]);
  // Nomor urut tahun ini yang dipakai record lain tapi belum tercatat di registri,
  // supaya "Isi nomor berikutnya" tidak menyarankannya.
  const nomorTerpakai = useMemo(() => urutTerpakaiDiRecord(allMahasiswa, new Date().getFullYear(), m.id), [allMahasiswa, m.id]);
  const bentrokLive = useMemo(() => cariBentrok(allMahasiswa, m), [allMahasiswa, m]);
  // Bentrok dengan jadwal ruang (kuliah/kegiatan) — peringatan untuk admin, boleh tetap disimpan.
  const bentrokRuangLive = useMemo(() => {
    if (!FITUR_RUANG || !jadwalRuang) return [];
    return Object.entries(m.jadwal || {}).flatMap(([ev, j]) => {
      if (!j || !j.tanggal || !j.jamMulai || !j.jamSelesai || !j.ruang) return [];
      const { bentrok } = periksaUsulanRuang(jadwalRuang, { tanggal: j.tanggal, jamMulai: j.jamMulai, jamSelesai: j.jamSelesai, ruang: j.ruang }, { abaikan: milikProgram(m.id, ev) });
      return bentrok.length ? [`${ev}: ${j.ruang} terpakai — ${teksBentrokRuang(bentrok)}`] : [];
    });
  }, [jadwalRuang, m.jadwal]);
  const [nomorDisalin, setNomorDisalin] = useState(false);
  const setJadwal = (ev, key, val) =>
    setM((prev) => ({
      ...prev,
      jadwal: { ...(prev.jadwal || {}), [ev]: { ...((prev.jadwal || {})[ev] || {}), [key]: val } },
    }));

  // Admin mengunggah berkas yang ditandatangani (mis. BA Expo) atas nama
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
    const docType = perpanjanganDocType(m);
    const config = getTemplateConfig(docType, m, dosenByKode, {});
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
      if (p === 'MG' && !next.jenisMagang) next.jenisMagang = 'Magang';
      return next;
    });
  }

  async function submit() {
    if (!m.nama.trim()) { setErr('Nama wajib diisi.'); return; }
    let calon = { ...m, angkatan: Number(m.angkatan) || m.angkatan };
    const masalah = [];
    // Validasi tanggal jadwal: dalam rentang & berurutan sesuai tahapan.
    const evs = eventsFor(programOf(calon));
    let prevEv = null;
    evs.forEach((ev) => {
      const t = ((calon.jadwal || {})[ev] || {}).tanggal;
      if (!t) return;
      if (calon.tanggalMulai && t < calon.tanggalMulai) masalah.push(`Tanggal ${ev} mendahului tanggal mulai (${formatTanggal(calon.tanggalMulai)}).`);
      if (calon.batasAkhir && t > calon.batasAkhir) masalah.push(`Tanggal ${ev} melewati batas akhir (${formatTanggal(calon.batasAkhir)}).`);
      if (prevEv && t < ((calon.jadwal || {})[prevEv] || {}).tanggal) masalah.push(`Tanggal ${ev} mendahului ${prevEv} — urutan harus ${evs.join(' → ')}.`);
      prevEv = ev;
    });
    const cb = cariBentrok(allMahasiswa, calon);
    // Bentrok jadwal HANYA peringatan, tidak mengunci (boleh jadwal bersamaan).
    if (masalah.length) { setErr('Tidak bisa menyimpan:\n• ' + masalah.join('\n• ')); return; }
    const semuaBentrok = [...cb.bentrok, ...bentrokRuangLive.map((x) => 'Ruang: ' + x)];
    if (semuaBentrok.length && !window.confirm('Ada bentrok jadwal:\n• ' + semuaBentrok.join('\n• ') + '\n\nTetap simpan?')) return;
    // Nomor surat dicatat di registri dulu; kalau ditolak (format salah, bulan depan,
    // dipakai mahasiswa lain), record tidak disimpan dan pesannya tampil di form.
    // Nomor lama yang belum tercatat & tidak diubah dicatat dengan pemeriksaan longgar
    // (format lama masih memuat ".TL"); yang tidak terbaca dilewati, tidak memblokir simpan.
    const { nomorDisarankan, ...tanpaSaran } = calon;
    calon = tanpaSaran;
    const nomorSurat = (calon.nomorSurat || '').trim();
    const berubah = nomorSurat !== ((awal && awal.nomorSurat) || '').trim();
    if (berubah && nomorSurat) {
      const p = bacaNomor(nomorSurat);
      if (!p) { setErr('Tidak bisa menyimpan: format nomor surat tidak sesuai. Lihat panduan format di samping isian Nomor Surat.'); return; }
      const now = new Date();
      const bulanIni = `${NAMA_BULAN[now.getMonth()]} ${now.getFullYear()}`;
      const bulanNomor = `${NAMA_BULAN[p.bulan - 1]} ${p.tahun}`;
      const waktu = waktuNomor(p, now);
      if (waktu === 'depan') { setErr(`Tidak bisa menyimpan: nomor surat bertanggal ${bulanNomor}, melewati bulan ini (${bulanIni}).`); return; }
      const lain = pemakaiNomorLain(allMahasiswa, p, calon.id);
      if (lain) { setErr(`Tidak bisa menyimpan: nomor surat ini sudah dipakai ${lain.nama} (${lain.nim}).`); return; }
      if (waktu && !window.confirm(`Nomor surat ini bertanggal ${bulanNomor}, bukan bulan ini (${bulanIni}).`
        + (waktu === 'tahun-lalu' ? `\n\nNomor ini masuk urutan tahun ${p.tahun}.` : '') + '\n\nTetap simpan?')) return;
    }
    if (berubah || (nomorSurat && !calon.nomorSuratId && bacaNomor(nomorSurat, { longgar: true }))) {
      try {
        const sumber = nomorDisarankan && nomorDisarankan === nomorSurat ? 'saran' : 'manual';
        const nomorSuratId = await catatNomorManual({ ...calon, nomorSurat }, awal, { longgar: !berubah, sumber });
        calon = { ...calon, nomorSurat, nomorSuratId };
      } catch (e) {
        setErr('Tidak bisa menyimpan: ' + (e.message || 'gagal mencatat nomor surat.'));
        return;
      }
    }
    setErr('');
    onSave(baru ? catatAktivitas(calon, 'dibuat') : calon);
  }

  const dosenPilihan = dosenAktifUntuk(allDosen, m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2, m.dosenWali);
  const dosenOpts = (
    <>
      <option value="">—</option>
      {dosenPilihan.map((d) => <option key={d.kode} value={d.kode}>{d.kode} — {d.nama}</option>)}
    </>
  );
  // Grafik beban ringkas di samping dropdown pembimbing/penguji.
  const bebanBlok = (peran) => <BebanDosenMini m={m} allMahasiswa={allMahasiswa} dosen={dosenPilihan} peran={peran} />;

  const stages = stagesFor(m.program);
  const events = eventsFor(m.program);
  const roles = rolesFor(m.program);
  const pembimbing1Label = roles.pembimbing === 1 ? (roles.pembimbingLabel || 'Pembimbing') : 'Pembimbing 1';
  // TA: penguji 1 sejak Seminar Proposal, penguji 2 bergabung saat Sidang.
  const penguji1Label = roles.penguji === 1 ? 'Penguji' : 'Penguji 1';
  const penguji2Label = 'Penguji 2';
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
      {bentrokRuangLive.length > 0 && (
        <div className="callout callout-amber field-full" style={{ whiteSpace: 'pre-wrap' }}>
          🏫 Ruang bentrok dengan jadwal ruang (boleh tetap disimpan):{'\n• ' + bentrokRuangLive.join('\n• ')}
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
            <div style={{ margin: '8px 0' }}>
              <LinkBerkasRow label="Link berkas persyaratan" url={jA.berkasLink} onUbah={(v) => setJadwal(evA, 'berkasLink', v)} diperiksa={jA.berkasDiperiksa} onDiperiksa={(v) => setJadwal(evA, 'berkasDiperiksa', v)} />
            </div>
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
          <Field label="Jam mulai"><input type="time" value={j.jamMulai || ''} onChange={(e) => setJadwal(ev, 'jamMulai', e.target.value)} /></Field>
          <Field label="Jam selesai"><input type="time" value={j.jamSelesai || ''} onChange={(e) => setJadwal(ev, 'jamSelesai', e.target.value)} /></Field>
          <Field label="Ruang">
            <select value={j.ruang || ''} onChange={(e) => setJadwal(ev, 'ruang', e.target.value)}>
              <option value="">— pilih ruang —</option>
              {daftarRuang.map((r) => <option key={r} value={r}>{r}</option>)}
              {j.ruang && !daftarRuang.includes(j.ruang) && <option value={j.ruang}>{j.ruang}</option>}
            </select>
          </Field>
        </div>
        <div className="sched-checks">
          <label className="check"><input type="checkbox" checked={!!j.printBA} onChange={(e) => setJadwal(ev, 'printBA', e.target.checked)} /><span>Print Berita Acara</span></label>
          <label className="check"><input type="checkbox" checked={!!j.syarat} onChange={(e) => setJadwal(ev, 'syarat', e.target.checked)} /><span>{syaratLabel(ev)}</span></label>
          <label className="check"><input type="checkbox" checked={!!j.dikonfirmasi} onChange={(e) => setJadwal(ev, 'dikonfirmasi', e.target.checked)} /><span>Jadwal final (dikonfirmasi)</span></label>
        </div>
        <div className="sched-grid" style={{ marginTop: 8 }}>
          <LinkBerkasRow label="Link berkas persyaratan" url={j.berkasLink} onUbah={(v) => setJadwal(ev, 'berkasLink', v)} diperiksa={j.berkasDiperiksa} onDiperiksa={(v) => setJadwal(ev, 'berkasDiperiksa', v)} />
          {ev.includes('Sidang') && (
            <>
              <LinkBerkasRow label="Link Turnitin" url={j.turnitinLink} onUbah={(v) => setJadwal(ev, 'turnitinLink', v)} diperiksa={j.turnitinDiperiksa} onDiperiksa={(v) => setJadwal(ev, 'turnitinDiperiksa', v)} />
              <LinkBerkasRow label="Link folder sidang" url={j.folderLink} onUbah={(v) => setJadwal(ev, 'folderLink', v)} diperiksa={j.folderDiperiksa} onDiperiksa={(v) => setJadwal(ev, 'folderDiperiksa', v)} />
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

  if (['KP', 'MG', 'TA'].includes(m.program)) {
    return (
      <FormMahasiswaKP
        m={m} setM={setM} set={set} gantiProgram={gantiProgram} setTahap={setTahap} periodeList={periodeList} daftarAngkatan={daftarAngkatan}
        roles={roles} pembimbing1Label={pembimbing1Label} penguji1Label={penguji1Label} penguji2Label={penguji2Label} dosenOpts={dosenOpts} bebanBlok={bebanBlok} stages={stages}
        alurTahapBlok={alurTahapBlok} notifikasiBlok={notifikasiBlok} peringatanBlok={peringatanBlok}
        tahapTab={tahapTab} setTahapTab={setTahapTab} p={p} events={events} jadwalBlok={jadwalBlok}
        dosenByKode={dosenByKode} konten={konten} uploadAdminDokumenKP={uploadAdminDokumenKP} hapusAdminDokumenKP={hapusAdminDokumenKP}
        unduhPerpanjanganKP={unduhPerpanjanganKP} dlBusyKP={dlBusyKP}
        verifAwal={awal ? awal.verifikasi : null} nomorTerpakai={nomorTerpakai}
        baru={baru} onCancel={onCancel} submit={submit} navEntri={navEntri} modalOpsi={modalOpsi}
      />
    );
  }

  return (
    <FormMahasiswaGeneric
      m={m} setM={setM} set={set} gantiProgram={gantiProgram} periodeList={periodeList} daftarAngkatan={daftarAngkatan}
      roles={roles} pembimbing1Label={pembimbing1Label} penguji1Label={penguji1Label} dosenOpts={dosenOpts} bebanBlok={bebanBlok} stages={stages} events={events} jadwalBlok={jadwalBlok}
      alurTahapBlok={alurTahapBlok} notifikasiBlok={notifikasiBlok} peringatanBlok={peringatanBlok} p={p}
      dosenByKode={dosenByKode}
      verifAwal={awal ? awal.verifikasi : null} nomorTerpakai={nomorTerpakai}
      baru={baru} onCancel={onCancel} submit={submit} navEntri={navEntri} modalOpsi={modalOpsi}
    />
  );
}
