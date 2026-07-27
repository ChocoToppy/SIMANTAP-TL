import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL } from '../data/seed.js';
import { csvEscape, triggerDownload, downloadCSV, downloadDoc, cetakSuratPDF, cetakSuratPDFHtml, loadXLSX } from '../utils/exportUtils.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu } from '../components/ui.jsx';

// ===================== Portal.jsx =====================
// Portal.jsx — tampilan untuk mahasiswa (Rute A)

export function Portal({ nim, nama, mahasiswa, allDosen, periodeBuka = [], onSave, onLogout }) {
  const mine = mahasiswa.filter((m) => m.owner === nim);
  const [view, setView] = useState({ mode: 'list' });

  function simpan(rec) { onSave(rec); setView({ mode: 'list' }); }

  const editing = view.id ? mine.find((m) => m.id === view.id) : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">SM</span>
          <span className="brand-name">SIMANTAP</span>
        </div>
        <div className="topbar-right">
          <span className="hint">{nama} · {nim}</span>
          <button className="btn ghost" onClick={onLogout}>Keluar</button>
        </div>
      </header>

      <main className="content">
        {view.mode === 'list' && (
          <div className="portal">
            <div className="toolbar">
              <h2 className="page-title">Pengajuan saya</h2>
              <button className="btn btn-primary push" onClick={() => setView({ mode: 'daftar' })}>+ Ajukan pendaftaran</button>
            </div>
            {mine.length === 0 ? (
              <Empty>Belum ada pengajuan. Klik "Ajukan pendaftaran" untuk memulai.</Empty>
            ) : (
              <div className="cards">
                {mine.map((m) => (
                  <KartuPengajuan key={m.id} m={m} allDosen={allDosen}
                    onEdit={() => setView({ mode: 'edit', id: m.id })}
                    onJadwal={(ev) => setView({ mode: 'jadwal', id: m.id, ev })}
                    onPerpanjangan={(mode) => setView({ mode: 'pp-' + mode, id: m.id })} />
                ))}
              </div>
            )}
          </div>
        )}

        {(view.mode === 'daftar' || view.mode === 'edit') && (
          <FormPendaftaran
            awal={editing}
            nim={nim}
            nama={nama}
            allDosen={allDosen}
            periodeBuka={periodeBuka}
            onCancel={() => setView({ mode: 'list' })}
            onSave={simpan}
          />
        )}

        {view.mode === 'jadwal' && editing && (
          <FormJadwalMhs awal={editing} ev={view.ev || eventAktif(editing)} onCancel={() => setView({ mode: 'list' })} onSave={simpan} />
        )}

        {(view.mode === 'pp-minta' || view.mode === 'pp-final') && editing && (
          <FormPerpanjangan awal={editing} mode={view.mode === 'pp-final' ? 'final' : 'minta'} onCancel={() => setView({ mode: 'list' })} onSave={simpan} />
        )}
      </main>
    </div>
  );
}

function KartuPengajuan({ m, allDosen = [], onEdit, onJadwal, onPerpanjangan }) {
  const v = statusVerif(m);
  const k = kondisi(m);
  const terverifikasi = v.key === 'terverifikasi';
  const evA = eventAktif(m);                 // kegiatan yang dijadwalkan dari tahap ini
  const jEv = evA ? ((m.jadwal || {})[evA] || {}) : {};
  const dikonfirmasi = !!jEv.dikonfirmasi;
  const adaUsulan = !!(jEv.tanggal || jEv.berkasLink || jEv.jamMulai);
  const disetujui = dikonfirmasi && !!jEv.tanggal; // sah hanya jika jadwal benar-benar ada
  const sidang = !!(evA && evA.includes('Sidang'));
  const bolehAjukan = bolehAjukanJadwal(m);
  const namaDosen = (kode) => { const d = allDosen.find((x) => x.kode === kode); return d ? `${d.kode} — ${d.nama}` : kode; };
  const pemb = [m.pembimbing1, m.pembimbing2].filter(Boolean);
  const peng = [m.penguji1, m.penguji2].filter(Boolean);
  const jadwalTeks = [jEv.tanggal ? formatTanggal(jEv.tanggal) : null, jamTampil(jEv), jEv.ruang].filter(Boolean).join(' · ');
  const dosenByKode = Object.fromEntries(allDosen.map((d) => [d.kode, d]));
  const isTA = programOf(m) === 'TA';
  const suratList = [];
  if (pemb.length) suratList.push({ label: 'Surat Tugas Pembimbing', isHtml: false, teks: () => (isTA ? dokTA('pembimbing', m, dosenByKode) : renderSurat('Penentuan Pembimbing', tokenSurat(m, 'Penentuan Pembimbing', dosenByKode))) });
  eventsFor(programOf(m)).forEach((ev) => {
    const j = (m.jadwal || {})[ev] || {};
    if (j.dikonfirmasi && j.tanggal) suratList.push({ label: `Surat Tugas ${ev}`, isHtml: (isTA && ev === 'Sidang'), teks: () => (isTA ? dokTA(ev === 'Sidang' ? 'stHTML' : 'st', m, dosenByKode, ev) : renderSurat(ev, tokenSurat(m, ev, dosenByKode))) });
  });
  if (isTA && k.key === 'lulus') suratList.push({ label: 'Halaman Pengesahan', teks: () => dokTA('pengesahan', m, dosenByKode) });

  return (
    <div className="card kartu">
      <div className="kartu-head">
        <span className="kartu-prog">{programLabel(programOf(m))}</span>
        <Badge tone={v.tone}>{v.label}</Badge>
      </div>
      <div className="kartu-judul">{m.judul || <span className="muted">(judul belum diisi)</span>}</div>
      <div className="cell-sub">{m.nim} · {bidangLabel(m.bidang)}{m.klasifikasi ? ` · ${m.klasifikasi}` : ''}</div>
      <div style={{ margin: '10px 0' }}><StageBar program={programOf(m)} tahap={m.tahap} /></div>
      {!terverifikasi && k.key !== 'lulus' && (
        <div className="cell-sub">Batas: {formatTanggal(m.batasAkhir)} · <Badge tone={k.tone}>{k.label}</Badge></div>
      )}

      {/* Pesan admin — tampil di setiap tahap */}
      {m.catatan && (
        <div className={'callout' + (v.key === 'perbaikan' ? ' callout-red' : '')}>
          <strong>Pesan dari admin:</strong> {m.catatan}
        </div>
      )}
      {v.key === 'baru' && <div className="callout">Pendaftaran sedang menunggu diperiksa admin.</div>}

      {/* Dosen pembimbing / penguji setelah ditentukan */}
      {(pemb.length > 0 || peng.length > 0) && (
        <div className="verif-info" style={{ marginTop: 8 }}>
          {pemb.length > 0 && <div>Pembimbing: <strong>{pemb.map(namaDosen).join('; ')}</strong></div>}
          {peng.length > 0 && <div>Penguji: <strong>{peng.map(namaDosen).join('; ')}</strong></div>}
        </div>
      )}

      {/* Status kegiatan pada tahap saat ini */}
      {terverifikasi && evA && (
        <div style={{ marginTop: 8 }}>
          {sidang ? (
            jEv.tanggal ? (
              <div className={'callout ' + (disetujui ? 'callout-green' : 'callout-amber')}>
                <strong>Jadwal Sidang ({disetujui ? 'final' : 'perkiraan'}):</strong> {jadwalTeks}
              </div>
            ) : (
              <div className="callout">Menunggu admin menetapkan jadwal sidang.</div>
            )
          ) : disetujui ? (
            <div className="callout callout-green"><strong>Jadwal {evA} (disetujui admin):</strong> {jadwalTeks}</div>
          ) : adaUsulan ? (
            <div className="callout">Usulan jadwal {evA} terkirim — menunggu verifikasi admin.</div>
          ) : bolehAjukan ? (
            <div className="callout">Tahap saat ini: <strong>{evA}</strong>. Setelah sepakat dengan dosen, ajukan jadwalnya.</div>
          ) : (
            <div className="callout">Menunggu admin menetapkan dosen pembimbing.</div>
          )}
        </div>
      )}

      {/* Tanggal lulus */}
      {k.key === 'lulus' && (
        <div className="callout callout-green"><strong>Lulus.</strong>{m.tanggalLulus ? ` Tanggal lulus: ${formatTanggal(m.tanggalLulus)}` : ''}</div>
      )}

      {/* Surat tugas (PDF) yang sudah bisa diunduh */}
      {suratList.length > 0 && (
        <div className="notif-actions" style={{ marginTop: 8 }}>
          {suratList.map((s) => (
            <button key={s.label} type="button" className="btn"
              onClick={() => s.isHtml ? cetakSuratPDFHtml(`${s.label} - ${m.nama}`, s.teks()) : cetakSuratPDF(`${s.label} - ${m.nama}`, s.teks())}>
              {s.label} (PDF)
            </button>
          ))}
        </div>
      )}

      {/* Perpanjangan (KP / TA / Magang) */}
      {['TA', 'KP', 'MG'].includes(programOf(m)) && terverifikasi && k.key !== 'lulus' && (() => {
        const pp = m.perpanjangan || {};
        if (!pp.diminta && !pp.suratAdminLink) {
          return <div style={{ marginTop: 8 }}><button className="btn ghost" onClick={() => onPerpanjangan('minta')}>Ajukan perpanjangan</button></div>;
        }
        if (!pp.suratAdminLink) {
          return <div className="callout" style={{ marginTop: 8 }}>Perpanjangan diajukan{pp.tanggalDiminta ? ` (${formatTanggal(pp.tanggalDiminta)})` : ''} — menunggu surat dari admin.</div>;
        }
        if (!pp.suratFinalLink) {
          return (
            <div className="callout" style={{ marginTop: 8 }}>
              Surat perpanjangan dari admin: <a href={pp.suratAdminLink} target="_blank" rel="noreferrer">buka</a>.{' '}
              <button className="btn" onClick={() => onPerpanjangan('final')}>Unggah surat final (ditandatangani)</button>
            </div>
          );
        }
        return <div className="callout callout-green" style={{ marginTop: 8 }}>Perpanjangan selesai. Surat final: <a href={pp.suratFinalLink} target="_blank" rel="noreferrer">buka</a></div>;
      })()}

      <div className="kartu-aksi">
        {!terverifikasi && <button className="btn" onClick={onEdit}>Edit pendaftaran</button>}
        {terverifikasi && evA && bolehAjukan && sidang && (
          <button className="btn btn-primary" onClick={() => onJadwal(evA)}>
            {jEv.berkasLink ? 'Perbarui draft & berkas sidang' : 'Unggah draft & berkas sidang'}
          </button>
        )}
        {terverifikasi && evA && bolehAjukan && !sidang && !disetujui && (
          <button className="btn btn-primary" onClick={() => onJadwal(evA)}>
            {adaUsulan ? `Revisi usulan ${evA}` : `Ajukan jadwal ${evA}`}
          </button>
        )}
        {terverifikasi && evA && !sidang && disetujui && <span className="hint">Jadwal sudah disetujui admin. Menunggu pelaksanaan &amp; hasil.</span>}
        {terverifikasi && !evA && k.key !== 'lulus' && <span className="hint">Menunggu proses admin.</span>}
      </div>
    </div>
  );
}

function FormPendaftaran({ awal, nim, nama, allDosen, periodeBuka = [], onCancel, onSave }) {
  const baru = !awal;
  const [m, setM] = useState(() =>
    awal || {
      id: buatId(), program: 'TA', nama, nim, owner: nim,
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
    if (!m.judul.trim()) { setErr('Judul wajib diisi.'); return; }
    if (!m.periode) { setErr('Pilih periode pendaftaran terlebih dahulu.'); return; }
    setErr('');
    onSave({ ...m, angkatan: Number(m.angkatan) || m.angkatan, verifikasi: 'baru' });
  }

  return (
    <div className="portal-form card">
      <h2 className="page-title">{baru ? 'Ajukan pendaftaran' : 'Edit pendaftaran'}</h2>
      <div className="form-grid">
        <Field label="Program">
          <select value={m.program} onChange={(e) => gantiProgram(e.target.value)} disabled={!baru}>
            {PROGRAM_KEYS.map((k) => <option key={k} value={k}>{programLabel(k)}</option>)}
          </select>
        </Field>
        <Field label="Periode">
          <select value={m.periode} onChange={(e) => set('periode', e.target.value)} disabled={belumAdaPeriode}>
            <option value="">— pilih periode —</option>
            {periodeOpsi.map((pp) => <option key={pp} value={pp}>{pp}</option>)}
          </select>
        </Field>
        <Field label="Nama"><input value={m.nama || nama} disabled title="Nama terkunci sesuai akun" /></Field>
        <Field label="Angkatan"><input value={m.angkatan} onChange={(e) => set('angkatan', e.target.value)} placeholder="mis. 20" /></Field>
        <Field label={isKPStyle ? (isKP ? 'Judul Kerja Praktik (sementara)' : 'Judul Magang (sementara)') : 'Judul'} full>
          <textarea rows={2} value={m.judul} onChange={(e) => set('judul', e.target.value)} placeholder="Jangan pakai huruf kapital semua" />
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
            <Field label="Alamat lengkap & No WA" full><textarea rows={2} value={p.alamatWA || ''} onChange={(e) => setP('alamatWA', e.target.value)} /></Field>
            <Field label={`Link berkas (${isKP ? 'Surat Kelayakan, Transkrip, IRS, KTM, Profil Perusahaan, Proposal KP' : 'Surat penerimaan, Transkrip, IRS, KTM, Proposal Magang'}) — Google Drive, opsional`} full>
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

function FormJadwalMhs({ awal, ev, onCancel, onSave }) {
  const isSidang = ev.includes('Sidang');
  const isKP = programOf(awal) === 'KP' || ev.includes('KP');
  const durasi = durasiEvent(ev);
  const [j, setJ] = useState(() => ({ ...(awal.jadwal && awal.jadwal[ev] ? awal.jadwal[ev] : {}) }));
  const [err, setErr] = useState('');
  const set = (k, v) => setJ((p) => ({ ...p, [k]: v }));
  function setMulai(v) { setJ((p) => ({ ...p, jamMulai: v, jamSelesai: v ? jamTambah(v, durasi) : '' })); }

  function submit() {
    if (!isSidang) {
      if (j.tanggal) {
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
      onSave({ ...awal, jadwal: { ...(awal.jadwal || {}), [ev]: { ...lama, berkasLink: j.berkasLink || '', turnitinLink: j.turnitinLink || '', folderLink: j.folderLink || '' } } });
    } else {
      onSave({ ...awal, jadwal: { ...(awal.jadwal || {}), [ev]: { ...j, jamSelesai: j.jamMulai ? jamTambah(j.jamMulai, durasi) : j.jamSelesai, dikonfirmasi: false, hasil: '' } } });
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
      <div className="callout" style={{ marginBottom: 12 }}><strong>Dokumen yang perlu disiapkan:</strong> {berkasSyarat(ev)}</div>
      <div className="form-grid">
        {!isSidang && (
          <>
            <Field label="Rencana tanggal"><input type="date" value={j.tanggal || ''} min={awal.tanggalMulai || undefined} max={awal.batasAkhir || undefined} onChange={(e) => set('tanggal', e.target.value)} /></Field>
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

function FormPerpanjangan({ awal, mode, onCancel, onSave }) {
  const pp = awal.perpanjangan || {};
  const [alasan, setAlasan] = useState(pp.alasan || '');
  const [link, setLink] = useState(pp.suratFinalLink || '');
  const minta = mode === 'minta';
  function submit() {
    if (minta) {
      onSave({ ...awal, perpanjangan: { ...pp, diminta: true, alasan, tanggalDiminta: todayISO() } });
    } else {
      onSave({ ...awal, perpanjangan: { ...pp, suratFinalLink: link } });
    }
  }
  return (
    <div className="portal-form card">
      <h2 className="page-title">{minta ? `Ajukan perpanjangan ${programLabel(programOf(awal))}` : 'Unggah surat perpanjangan final'}</h2>
      <div className="form-grid">
        {minta ? (
          <Field label="Alasan perpanjangan" full><textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Jelaskan alasan & rencana penyelesaian" /></Field>
        ) : (
          <>
            {pp.suratAdminLink && <div className="callout field-full">Surat dari admin: <a href={pp.suratAdminLink} target="_blank" rel="noreferrer">buka</a>. Unduh, tanda tangani, lalu unggah tautannya di bawah.</div>}
            <Field label="Link surat perpanjangan yang sudah ditandatangani (Google Drive)" full><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/..." /></Field>
          </>
        )}
      </div>
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <button className="btn" onClick={onCancel}>Batal</button>
        <button className="btn btn-primary" onClick={submit}>{minta ? 'Ajukan' : 'Simpan'}</button>
      </div>
    </div>
  );
}
// DosenPortal.jsx — tampilan untuk dosen: lihat beban bimbingan/penguji sendiri

function peranDosen(m, kode) {
  const r = [];
  if (m.pembimbing1 === kode || m.pembimbing2 === kode) r.push('Pembimbing');
  if (m.penguji1 === kode || m.penguji2 === kode) r.push('Penguji');
  return r.join(' & ');
}

export function DosenPortal({ dosen, mahasiswa, periodeList = [], onLogout }) {
  const [periode, setPeriode] = useState(SEMUA);
  const [semua, setSemua] = useState(true); // termasuk lulus

  const scoped = useMemo(() => filterByPeriode(mahasiswa, periode), [mahasiswa, periode]);
  const beban = useMemo(() => hitungBebanRinci(scoped, dosen.kode, { semua }), [scoped, dosen.kode, semua]);

  const terkait = useMemo(
    () =>
      scoped
        .filter((m) => !m.dibatalkan && (semua || m.tahap !== 'Lulus'))
        .filter((m) => [m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2].includes(dosen.kode))
        .map((m) => ({ m, peran: peranDosen(m, dosen.kode) }))
        .sort((a, b) => a.m.nama.localeCompare(b.m.nama)),
    [scoped, dosen.kode, semua]
  );

  const metrik = [
    { label: 'Bimbingan TA', value: beban.bimbinganTA },
    { label: 'Penguji TA', value: beban.pengujiTA },
    { label: 'Bimbingan Capstone', value: beban.bimbinganCAP },
    { label: 'Penguji Capstone', value: beban.pengujiCAP },
    { label: 'Bimbingan KP', value: beban.bimbinganKP },
    { label: 'Bimbingan Magang', value: beban.bimbinganMG },
    { label: 'Bimbingan Tesis S2', value: beban.bimbinganS2 },
    { label: 'Penguji Tesis S2', value: beban.pengujiS2 },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">SM</span>
          <span className="brand-name">SIMANTAP</span>
        </div>
        <div className="topbar-right">
          <label className="periode-pick">
            <span>Periode</span>
            <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
              <option value={SEMUA}>Semua periode</option>
              {periodeList.map((pp) => <option key={pp} value={pp}>{pp}</option>)}
            </select>
          </label>
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} /><span>Termasuk lulus</span>
          </label>
          <span className="hint">{dosen.nama} · {dosen.kode}</span>
          <button className="btn ghost" onClick={onLogout}>Keluar</button>
        </div>
      </header>

      <main className="content">
        <div className="toolbar">
          <h2 className="page-title">Beban saya{periode === SEMUA ? '' : ` — ${periode}`}</h2>
        </div>

        <div className="metrics">
          {metrik.map((mm) => <MetricDosen key={mm.label} label={mm.label} value={mm.value} />)}
          <MetricDosen label="Total beban" value={beban.total} tone="green" />
        </div>

        <section className="card" style={{ marginTop: 16 }}>
          <h3 className="card-title">Mahasiswa yang saya bimbing / uji</h3>
          {terkait.length === 0 ? (
            <Empty>Belum ada mahasiswa pada filter ini.</Empty>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Mahasiswa</th>
                    <th>Program</th>
                    <th>Peran</th>
                    <th>Tahap</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terkait.map(({ m, peran }) => {
                    const k = kondisi(m);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="cell-name">{m.nama}</div>
                          <div className="cell-sub">{m.nim} · {bidangLabel(m.bidang)}</div>
                        </td>
                        <td className="cell-sub">{programLabel(programOf(m))}</td>
                        <td><Badge tone={peran.includes('Pembimbing') ? 'blue' : 'amber'}>{peran || '—'}</Badge></td>
                        <td style={{ minWidth: 160 }}><StageBar program={programOf(m)} tahap={m.tahap} /></td>
                        <td><Badge tone={k.tone}>{k.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="foot">SIMANTAP © 2026 Universitas Diponegoro</footer>
    </div>
  );
}

function MetricDosen({ label, value, tone }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={'metric-value' + (tone ? ' val-' + tone : '')}>{value}</span>
    </div>
  );
}

