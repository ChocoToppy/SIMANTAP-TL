import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, tahapSebelumnya, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal, catatAktivitas, tanggalDibuat, aktivitasTerakhir, AKTIVITAS_LABEL, formatWaktu, hitungNomorUrut, nowStamp } from '../utils/helpers.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL } from '../data/seed.js';
import { csvEscape, triggerDownload, downloadCSV, downloadDoc, cetakSuratPDF, cetakSuratPDFHtml, loadXLSX } from '../utils/exportUtils.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu, ColResizeHandle } from '../components/ui.jsx';
import { KpDocumentPanel } from '../components/kpDocuments.jsx';
import { generateDocument, getTemplateConfig } from '../utils/documentGenerator.js';
import { readFileForUpload } from '../utils/fileUpload.js';
import { useColumnWidths } from '../utils/useColumnWidths.js';

// ===================== Mahasiswa.js =====================
// Mahasiswa.js — daftar + cari + filter + tambah/edit (multi-program)

const STATUS_FILTER = [
  { key: 'all', label: 'Semua status' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'mendekati', label: 'Mendekati deadline' },
  { key: 'lewat', label: 'Lewat batas' },
  { key: 'lulus', label: 'Lulus' },
  { key: 'batal', label: 'Dibatalkan' },
];

export function Mahasiswa({ mahasiswa, allMahasiswa, allDosen, periode, periodeList, onSave, onDelete }) {
  const [q, setQ] = useState('');
  const [fProgram, setFProgram] = useState('');
  const [fAngkatan, setFAngkatan] = useState('');
  const [fBidang, setFBidang] = useState('');
  const [fStatus, setFStatus] = useState('all');
  const [fVerif, setFVerif] = useState('');
  const [fDosen, setFDosen] = useState('');
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [sortBy, setSortBy] = useState('nama'); // nama | tahap | deadline | dibuat
  const [sortDir, setSortDir] = useState('asc');
  function ubahSort(key) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  }
  const panah = (key) => (sortBy === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '');

  // Nomor identitas tetap (berdasarkan urutan pendaftaran pertama), dihitung dari
  // SELURUH data \u2014 tidak berubah walau tabel disortir/difilter.
  const nomorUrut = useMemo(() => hitungNomorUrut(allMahasiswa || mahasiswa), [allMahasiswa, mahasiswa]);
  const [groupMode, setGroupMode] = useState(periode === SEMUA ? 'periode' : 'none');
  useEffect(() => {
    setGroupMode(periode === SEMUA ? 'periode' : 'none');
  }, [periode]);

  const COLS = [
    { key: 'no', width: 56 },
    { key: 'mahasiswa', width: 220 },
    { key: 'judul', width: 260 },
    { key: 'tahap', width: 210 },
    { key: 'pembimbing', width: 110 },
    { key: 'penguji', width: 110 },
    { key: 'deadline', width: 130 },
    { key: 'aktivitas', width: 170 },
    { key: 'aksi', width: 100, flex: true, minWidth: 100 },
  ];
  const tableWrapRef = useRef(null);
  const [colWidths, startResize] = useColumnWidths('simantap-col-mahasiswa', COLS, tableWrapRef);

  const angkatanList = useMemo(
    () => Array.from(new Set(mahasiswa.map((m) => m.angkatan))).sort((a, b) => b - a),
    [mahasiswa]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return mahasiswa
      .map((m) => ({ m, k: kondisi(m) }))
      .filter(({ m, k }) => {
        if (term && !(`${m.nama} ${m.nim} ${m.judul}`.toLowerCase().includes(term))) return false;
        if (fProgram && programOf(m) !== fProgram) return false;
        if (fAngkatan && String(m.angkatan) !== fAngkatan) return false;
        if (fBidang && m.bidang !== fBidang) return false;
        if (fDosen && ![m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2].includes(fDosen)) return false;
        if (fVerif && statusVerif(m).key !== fVerif) return false;
        if (fStatus === 'aktif' && (k.key === 'lulus' || k.key === 'batal')) return false;
        if (fStatus !== 'all' && fStatus !== 'aktif' && k.key !== fStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const arah = sortDir === 'asc' ? 1 : -1;
        const val = (m) => sortBy === 'tahap' ? m.tahap
          : sortBy === 'deadline' ? (m.batasAkhir || '')
          : sortBy === 'dibuat' ? tanggalDibuat(m)
          : m.nama;
        return String(val(a.m)).localeCompare(String(val(b.m)), 'id') * arah;
      });
  }, [mahasiswa, q, fProgram, fAngkatan, fBidang, fStatus, fVerif, fDosen, sortBy, sortDir]);

  const notif = useMemo(() => {
    let baru = 0, perluJadwal = 0, perluHasil = 0, bentrok = 0, kelompok = 0;
    mahasiswa.forEach((m) => {
      if (statusVerif(m).key === 'baru') baru++;
      const evA = eventAktif(m);
      if (evA) {
        const j = (m.jadwal || {})[evA] || {};
        if (j.tanggal && !j.dikonfirmasi) perluJadwal++;
        if (j.dikonfirmasi && !j.hasil) perluHasil++;
      }
      const cb = cariBentrok(mahasiswa, m);
      if (cb.bentrok.length) bentrok++;
      if (cb.kelompok.length) kelompok++;
    });
    return { baru, perluJadwal, perluHasil, bentrok, kelompok };
  }, [mahasiswa]);

  // Kelompokkan baris (yang sudah difilter & disortir) berdasarkan periode/angkatan,
  // menjaga urutan relatif yang sudah ada — mirip tampilan "group" spreadsheet.
  const grupRows = useMemo(() => {
    if (groupMode === 'none') return null;
    const keyOf = (m) => (groupMode === 'angkatan' ? (m.angkatan || '—') : (m.periode || '—'));
    const map = new Map();
    rows.forEach((r) => {
      const k = keyOf(r.m);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [rows, groupMode]);

  function noUntuk(m) {
    if (groupMode === 'angkatan') return (nomorUrut[m.id] || {}).angkatan ?? '—';
    return (nomorUrut[m.id] || {}).periode ?? '—';
  }

  function tambah() { setEditing(null); setOpen(true); }
  function edit(m) { setEditing(m); setOpen(true); }
  function simpan(m) { onSave(m); setOpen(false); }
  function hapus(m) { if (window.confirm(`Hapus data ${m.nama}?`)) onDelete(m.id); }

  const coreHeaders = ['No. (Periode)', 'Program', 'Nama', 'NIM', 'Angkatan', 'Judul', 'Periode', 'Klasifikasi', 'Bidang', 'Dosen Wali', 'Pembimbing 1', 'Pembimbing 2', 'Penguji 1', 'Penguji 2', 'Tahap', 'Status', 'Tanggal Mulai', 'Batas Akhir', 'Nomor Surat', 'Nilai Angka', 'Nilai Huruf', 'Catatan'];
  const coreRow = (m) => {
    const k = kondisi(m);
    return [
      (nomorUrut[m.id] || {}).periode ?? '', programLabel(programOf(m)), m.nama, m.nim, m.angkatan, m.judul, m.periode,
      punyaKlasifikasi(programOf(m)) ? (m.klasifikasi || '') : '', bidangLabel(m.bidang), m.dosenWali || '',
      m.pembimbing1 || '', m.pembimbing2 || '', m.penguji1 || '', m.penguji2 || '',
      m.tahap, k.label, m.tanggalMulai || '', m.batasAkhir || '', m.nomorSurat || '',
      (m.nilaiAkhir || {}).angka || '', (m.nilaiAkhir || {}).huruf || '', m.catatan || '',
    ];
  };
  const ringkasJadwal = (m) =>
    eventsFor(programOf(m)).map((ev) => {
      const j = getJadwal(m, ev);
      if (!(j.tanggal || jamTampil(j) || j.ruang || j.printBA || j.syarat)) return null;
      const info = [j.tanggal ? formatTanggal(j.tanggal) : '', jamTampil(j), j.ruang].filter(Boolean).join(' ');
      return `${ev}: ${info} (BA: ${j.printBA ? 'Ya' : 'Tidak'}, ${j.syarat ? 'Syarat: Ya' : 'Syarat: Tidak'})`;
    }).filter(Boolean).join(' | ');

  function eksporCSV(list) {
    downloadCSV('mahasiswa.csv', [...coreHeaders, 'Jadwal'], list.map((m) => [...coreRow(m), ringkasJadwal(m)]));
  }
  async function ekspor(format) {
    const list = rows.map((x) => x.m);
    if (format === 'csv') { eksporCSV(list); return; }
    const jadwalHeaders = ['Nama', 'NIM', 'Program', 'Event', 'Tanggal', 'Jam', 'Ruang', 'Print BA', 'Syarat'];
    const jadwalRows = [];
    list.forEach((m) => eventsFor(programOf(m)).forEach((ev) => {
      const j = getJadwal(m, ev);
      if (j.tanggal || jamTampil(j) || j.ruang || j.printBA || j.syarat) {
        jadwalRows.push([m.nama, m.nim, programLabel(programOf(m)), ev, j.tanggal || '', jamTampil(j), j.ruang || '', j.printBA ? 'Ya' : 'Tidak', j.syarat ? 'Ya' : 'Tidak']);
      }
    }));
    try {
      await downloadXLSX('mahasiswa.xlsx', [
        { name: 'Mahasiswa', headers: coreHeaders, rows: list.map(coreRow) },
        { name: 'Jadwal', headers: jadwalHeaders, rows: jadwalRows },
      ]);
    } catch (e) {
      window.alert('Gagal membuat Excel (CDN mungkin diblokir). Mengunduh CSV sebagai gantinya.');
      eksporCSV(list);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <input className="search" placeholder="Cari nama, NIM, atau judul…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={fProgram} onChange={(e) => setFProgram(e.target.value)}>
          <option value="">Semua program</option>
          {PROGRAM_KEYS.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          {STATUS_FILTER.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={fAngkatan} onChange={(e) => setFAngkatan(e.target.value)}>
          <option value="">Semua angkatan</option>
          {angkatanList.map((a) => <option key={a} value={a}>Angkatan {a}</option>)}
        </select>
        <select value={fBidang} onChange={(e) => setFBidang(e.target.value)}>
          <option value="">Semua bidang</option>
          {BIDANG.map((b) => <option key={b.kode} value={b.kode}>{b.label}</option>)}
        </select>
        <select value={fVerif} onChange={(e) => setFVerif(e.target.value)}>
          <option value="">Semua verifikasi</option>
          <option value="baru">Menunggu verifikasi</option>
          <option value="terverifikasi">Terverifikasi</option>
          <option value="perbaikan">Perlu perbaikan</option>
        </select>
        <select value={fDosen} onChange={(e) => setFDosen(e.target.value)}>
          <option value="">Semua dosen</option>
          {allDosen.map((d) => <option key={d.kode} value={d.kode}>{d.kode}</option>)}
        </select>
        <select value={groupMode} onChange={(e) => setGroupMode(e.target.value)} title="Kelompokkan tabel">
          <option value="none">Tampilan: Normal</option>
          <option value="periode">Kelompokkan per Periode</option>
          <option value="angkatan">Kelompokkan per Angkatan</option>
        </select>
        <ExportMenu label="Ekspor" onXLSX={() => ekspor('xlsx')} onCSV={() => ekspor('csv')} />
        <button className="btn btn-primary" onClick={tambah}>+ Tambah</button>
      </div>

      {(notif.baru + notif.perluJadwal + notif.perluHasil + notif.bentrok + notif.kelompok) > 0 && (
        <div className="callout" style={{ marginBottom: 12 }}>
          🔔 {notif.baru > 0 && <span><strong>{notif.baru}</strong> pendaftaran baru perlu diperiksa &amp; pembimbing. </span>}
          {notif.perluJadwal > 0 && <span><strong>{notif.perluJadwal}</strong> usulan jadwal perlu diverifikasi. </span>}
          {notif.perluHasil > 0 && <span><strong>{notif.perluHasil}</strong> menunggu hasil (lulus/tidak lulus). </span>}
          {notif.bentrok > 0 && <span>⚠ <strong>{notif.bentrok}</strong> jadwal berpotensi bentrok (tidak mengunci). </span>}
          {notif.kelompok > 0 && <span>👥 <strong>{notif.kelompok}</strong> jadwal terindikasi sidang kelompok. </span>}
        </div>
      )}
      <div className="table-wrap card" ref={tableWrapRef}>
        <table className="tbl tbl-resizable">
          <colgroup>
            {COLS.map((c, i) => (
              <col key={c.key} style={i === COLS.length - 1 ? undefined : { width: colWidths[i] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th>No.<ColResizeHandle onMouseDown={(e) => startResize(0, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('nama')}>Mahasiswa{panah('nama')}<ColResizeHandle onMouseDown={(e) => startResize(1, e)} /></th>
              <th>Judul<ColResizeHandle onMouseDown={(e) => startResize(2, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('tahap')}>Tahap &amp; jadwal{panah('tahap')}<ColResizeHandle onMouseDown={(e) => startResize(3, e)} /></th>
              <th>Pembimbing<ColResizeHandle onMouseDown={(e) => startResize(4, e)} /></th>
              <th>Penguji<ColResizeHandle onMouseDown={(e) => startResize(5, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('deadline')}>Deadline{panah('deadline')}<ColResizeHandle onMouseDown={(e) => startResize(6, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('dibuat')}>Aktivitas{panah('dibuat')}<ColResizeHandle onMouseDown={(e) => startResize(7, e)} /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const baris = ({ m, k }) => (
                <tr key={m.id}>
                  <td className="cell-sub">{noUntuk(m)}</td>
                  <td>
                    <div className="cell-name">{m.nama}</div>
                    <div className="cell-sub">
                      {m.nim} · {bidangLabel(m.bidang)} · {programLabel(programOf(m))}
                      {m.klasifikasi && punyaKlasifikasi(programOf(m)) ? ` · ${m.klasifikasi}` : ''}
                    </div>
                    <div style={{ marginTop: 4 }}><Badge tone={statusVerif(m).tone}>{statusVerif(m).label}</Badge></div>
                  </td>
                  <td className="cell-judul">{m.judul || <span className="muted">—</span>}</td>
                  <td style={{ minWidth: 180 }}>
                    <StageBar program={programOf(m)} tahap={m.tahap} />
                    <JadwalMini m={m} />
                  </td>
                  <td>{m.pembimbing1 || '-'}{m.pembimbing2 ? ` / ${m.pembimbing2}` : ''}</td>
                  <td>{m.penguji1 || '-'}{m.penguji2 ? ` / ${m.penguji2}` : ''}</td>
                  <td>
                    <Badge tone={k.tone}>{k.label}</Badge>
                    <div className="cell-sub">{formatTanggal(m.batasAkhir)}</div>
                  </td>
                  <td><AktivitasMini m={m} /></td>
                  <td className="cell-actions">
                    <button className="link-btn" onClick={() => edit(m)}>Edit</button>
                    <button className="link-btn danger" onClick={() => hapus(m)}>Hapus</button>
                  </td>
                </tr>
              );
              if (grupRows) {
                return grupRows.map((g) => (
                  <React.Fragment key={g.label}>
                    <tr className="tbl-group-row">
                      <td colSpan={COLS.length}>{groupMode === 'angkatan' ? `Angkatan ${g.label}` : g.label}</td>
                    </tr>
                    {g.items.map(baris)}
                  </React.Fragment>
                ));
              }
              return rows.map(baris);
            })()}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>Tidak ada data yang cocok.</Empty>}
      </div>

      {open && (
        <FormMahasiswa
          awal={editing}
          allDosen={allDosen}
          allMahasiswa={allMahasiswa || mahasiswa}
          periode={periode}
          periodeList={periodeList}
          onCancel={() => setOpen(false)}
          onSave={simpan}
        />
      )}
    </div>
  );
}

// Riwayat lengkap aktivitas mahasiswa (terbaru di atas), ditampilkan di modal edit admin.
function RiwayatAktivitas({ m }) {
  const log = m.aktivitas || [];
  return (
    <div className="sched field-full">
      <div className="sched-title">Riwayat aktivitas</div>
      {log.length === 0 ? (
        <div className="hint">Belum ada riwayat aktivitas tercatat (data lama, sebelum fitur ini ada).</div>
      ) : (
        <ul className="periode-list">
          {log.slice().reverse().map((a, i) => (
            <li key={i} className="periode-item">
              <span>{AKTIVITAS_LABEL[a.tipe] || a.tipe}{a.catatan ? ` — ${a.catatan}` : ''}</span>
              <span className="hint">{formatWaktu(a.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tampilan ringkas riwayat aktivitas di tabel: tanggal daftar + update terakhir (bila ada).
function AktivitasMini({ m }) {
  const daftar = tanggalDibuat(m);
  const terakhir = aktivitasTerakhir(m);
  const adaUpdate = terakhir && (m.aktivitas || []).length > 1;
  return (
    <div>
      <div className="cell-sub">Daftar: {daftar ? formatWaktu(daftar) : '—'}</div>
      {adaUpdate && (
        <div className="cell-sub">Update: {formatWaktu(terakhir.at)} · {AKTIVITAS_LABEL[terakhir.tipe] || terakhir.tipe}</div>
      )}
    </div>
  );
}

// Tampilan ringkas jadwal di tabel, hanya bila tahap saat ini adalah event terjadwal.
function JadwalMini({ m }) {
  const ev = m.tahap;
  if (!eventsFor(programOf(m)).includes(ev)) return null;
  const j = getJadwal(m, ev);
  const adaInfo = j.tanggal || j.ruang || jamTampil(j);
  return (
    <div className="jadwal-mini">
      {adaInfo && (
        <span className="cell-sub">
          {[j.tanggal ? formatTanggal(j.tanggal) : null, j.ruang, jamTampil(j)].filter(Boolean).join(' · ')}
        </span>
      )}
      <div className="chips">
        <span className={'chip' + (j.printBA ? ' chip-on' : '')}>BA</span>
        <span className={'chip' + (j.syarat ? ' chip-on' : '')}>Syarat</span>
      </div>
    </div>
  );
}

function FormMahasiswa({ awal, allDosen, allMahasiswa = [], periode, periodeList, onCancel, onSave }) {
  const baru = !awal;
  const [err, setErr] = useState('');
  const [m, setM] = useState(() => {
    const base = awal || {
      id: buatId(),
      program: 'TA',
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
    const initStages = stagesFor((awal && awal.program) || 'TA');
    return (awal && initStages.includes(awal.tahap)) ? awal.tahap : initStages[0];
  });
  const dosenByKode = useMemo(() => Object.fromEntries((allDosen || []).map((d) => [d.kode, d])), [allDosen]);
  const bentrokLive = useMemo(() => cariBentrok(allMahasiswa, m), [allMahasiswa, m]);
  const [pesanWA, setPesanWA] = useState(() => pesanNotifikasi(m));
  const setJadwal = (ev, key, val) =>
    setM((prev) => ({
      ...prev,
      jadwal: { ...(prev.jadwal || {}), [ev]: { ...((prev.jadwal || {})[ev] || {}), [key]: val } },
    }));

  // Admin mengunggah berkas KP yang ditandatangani (mis. BA Seminar KP) atas nama
  // mahasiswa — disimpan ke state lokal, ikut tersimpan saat admin klik "Simpan".
  async function uploadAdminDokumenKP(key, file) {
    const hasil = await readFileForUpload(file);
    setM((prev) => ({ ...prev, dokumenKP: { ...(prev.dokumenKP || {}), [key]: hasil } }));
  }

  // Admin memberikan surat perpanjangan ke mahasiswa sebagai berkas terunggah
  // (bukan tautan Drive) — langsung muncul di Portal mahasiswa untuk diunduh.
  const [ppBusy, setPpBusy] = useState(false);
  const [ppErr, setPpErr] = useState('');
  async function berikanSuratPerpanjangan(file) {
    setPpErr('');
    setPpBusy(true);
    try {
      const hasil = await readFileForUpload(file);
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

  // ----- Blok Notifikasi (dipakai di kedua tata letak) -----
  const notifikasiBlok = (
    <div className="sched field-full">
      <div className="sched-title">Notifikasi</div>
      <textarea className="notif-msg" rows={3} value={pesanWA} onChange={(e) => setPesanWA(e.target.value)} />
      <div className="notif-actions">
        <button type="button" className="btn ghost" onClick={() => setPesanWA(pesanNotifikasi(m))}>Perbarui dari data tahap</button>
        {waMahasiswa(m)
          ? <a className="btn" href={waLink(waMahasiswa(m), pesanWA)} target="_blank" rel="noreferrer">WA mahasiswa</a>
          : <span className="hint">Nomor WA mahasiswa belum ada.</span>}
        {dosenTerlibat(m).map((k) => allDosen.find((d) => d.kode === k)).filter(Boolean).map((d) => (
          <span key={d.kode} className="notif-dsn">
            {d.wa && <a className="btn" href={waLink(d.wa, pesanWA)} target="_blank" rel="noreferrer">WA {d.kode}</a>}
            {d.email && <a className="btn" href={mailtoLink(d.email, 'Notifikasi ' + programLabel(programOf(m)), pesanWA)} target="_blank" rel="noreferrer">Email {d.kode}</a>}
          </span>
        ))}
      </div>
      <div className="hint">Pesan bisa diedit langsung di sini sebelum dikirim. Push otomatis tetap memerlukan backend.</div>
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
            {jA.berkasLink ? <div>Berkas: <a href={jA.berkasLink} target="_blank" rel="noreferrer">buka link</a></div> : <div className="muted">Berkas belum dilampirkan mahasiswa.</div>}
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
              {j.berkasLink && <a className="btn" href={j.berkasLink} target="_blank" rel="noreferrer">Buka</a>}
            </div>
          </Field>
          {ev.includes('Sidang') && (
            <>
              <Field label="Link Turnitin" full>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ flex: 1 }} value={j.turnitinLink || ''} onChange={(e) => setJadwal(ev, 'turnitinLink', e.target.value)} placeholder="https://drive.google.com/..." />
                  {j.turnitinLink && <a className="btn" href={j.turnitinLink} target="_blank" rel="noreferrer">Buka</a>}
                </div>
              </Field>
              <Field label="Link folder sidang" full>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ flex: 1 }} value={j.folderLink || ''} onChange={(e) => setJadwal(ev, 'folderLink', e.target.value)} placeholder="https://drive.google.com/..." />
                  {j.folderLink && <a className="btn" href={j.folderLink} target="_blank" rel="noreferrer">Buka</a>}
                </div>
              </Field>
            </>
          )}
        </div>
        <div className="hint">Dokumen yang diharapkan: {berkasSyarat(ev)}</div>
      </div>
    );
  };

  if (m.program === 'KP') {
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
              {PROGRAM_KEYS.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
            </select>
          </Field>
          <Field label="Periode">
            <input value={m.periode} onChange={(e) => set('periode', e.target.value)} placeholder="mis. 2021 Ganjil" list="periode-list" />
            <datalist id="periode-list">
              {periodeList.map((p) => <option key={p} value={p} />)}
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
                      ? <div>Berkas: <a href={p.berkasLink} target="_blank" rel="noreferrer">buka link</a></div>
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
                  <Field label="Nomor Surat">
                    <input value={m.nomorSurat || ''} onChange={(e) => set('nomorSurat', e.target.value)} placeholder="mis. 123/UN7.../2026" />
                  </Field>
                </div>
                <div className="hint" style={{ marginTop: 6 }}>Nomor surat ini dipakai untuk semua surat program ini — isi saat verifikasi pertama kali.</div>
              </div>
            )}

            {tahapTab === 'Seminar KP' && events.map(jadwalBlok)}

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
                  ? <div className="callout callout-green" style={{ marginTop: 10 }}>Mahasiswa telah dinyatakan lulus KP.</div>
                  : <div className="hint" style={{ marginTop: 10 }}>Mahasiswa belum mencapai tahap Lulus.</div>}
              </div>
            )}
          </div>

          <div className="modal-kp-side">
            <div className="sched">
              <KpDocumentPanel m={m} dosenByKode={dosenByKode} canUpload role="admin" onUpload={uploadAdminDokumenKP} collapsible={false} title="Dokumen KP" />
            </div>
            <div className="sched">
              <div className="sched-title">Perpanjangan Kerja Praktik</div>
              {(m.perpanjangan && m.perpanjangan.diminta)
                ? <div className="verif-info"><div>Alasan mahasiswa: <strong>{m.perpanjangan.alasan || '—'}</strong>{m.perpanjangan.tanggalDiminta ? ` · ${formatTanggal(m.perpanjangan.tanggalDiminta)}` : ''}</div></div>
                : <div className="hint">Belum ada pengajuan perpanjangan dari mahasiswa.</div>}
              {(m.perpanjangan || {}).suratAdminTersedia
                ? <div className="callout callout-green">Surat perpanjangan sudah terlihat di Portal mahasiswa.</div>
                : <div className="hint">Surat perpanjangan belum ditampilkan ke mahasiswa.</div>}
              {(m.perpanjangan || {}).suratFinalLink
                ? <div className="callout callout-green">Surat final (ditandatangani) dari mahasiswa: <a href={m.perpanjangan.suratFinalLink} target="_blank" rel="noreferrer">buka</a></div>
                : <div className="hint">Surat final dari mahasiswa belum diunggah.</div>}
              <div className="notif-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn" onClick={() => {
                  const config = getTemplateConfig('Perpanjangan KP', m, dosenByKode, {});
                  if (config) generateDocument(config.template, config.filename, config.data);
                }}>Cetak surat perpanjangan KP (.docx)</button>
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
      </Modal>
    );
  }

  return (
    <Modal
      title={baru ? 'Tambah mahasiswa' : 'Edit mahasiswa'}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>Batal</button>
          <button className="btn btn-primary" onClick={submit}>Simpan</button>
        </>
      }
    >
      <div className="form-grid">
        <div className="sched field-full">
          <div className="sched-title">Verifikasi pendaftaran</div>
          {(ringkasPendaftaran(p).length > 0 || p.berkasLink) ? (
            <div className="verif-info">
              {ringkasPendaftaran(p).map((r) => (
                <div key={r.label}>{r.label}: <strong>{r.nilai}</strong></div>
              ))}
              {p.berkasLink
                ? <div>Berkas: <a href={p.berkasLink} target="_blank" rel="noreferrer">buka link</a></div>
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
            <Field label="Nomor Surat">
              <input value={m.nomorSurat || ''} onChange={(e) => set('nomorSurat', e.target.value)} placeholder="mis. 123/UN7.../2026" />
            </Field>
          </div>
          <div className="hint" style={{ marginTop: 6 }}>Nomor surat ini dipakai untuk semua surat program ini — isi saat verifikasi pertama kali.</div>
        </div>

        {!baru && <RiwayatAktivitas m={m} />}

        <Field label="Program">
          <select value={m.program} onChange={(e) => gantiProgram(e.target.value)}>
            {PROGRAM_KEYS.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
          </select>
        </Field>
        <Field label="Periode">
          <input value={m.periode} onChange={(e) => set('periode', e.target.value)} placeholder="mis. 2021 Ganjil" list="periode-list" />
          <datalist id="periode-list">
            {periodeList.map((p) => <option key={p} value={p} />)}
          </datalist>
        </Field>

        <Field label="Nama" full><input value={m.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
        <Field label="NIM"><input value={m.nim} onChange={(e) => set('nim', e.target.value)} /></Field>
        <Field label="Angkatan"><input value={m.angkatan} onChange={(e) => set('angkatan', e.target.value)} placeholder="mis. 18" /></Field>
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

        <Field label="Tahap saat ini">
          <select value={m.tahap} onChange={(e) => set('tahap', e.target.value)}>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Tanggal mulai"><input type="date" value={m.tanggalMulai} onChange={(e) => set('tanggalMulai', e.target.value)} /></Field>
        <Field label="Batas akhir"><input type="date" value={m.batasAkhir} onChange={(e) => set('batasAkhir', e.target.value)} /></Field>
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

        {alurTahapBlok}

        {events.map((ev) => jadwalBlok(ev))}

        <Field label="Catatan / pesan untuk mahasiswa" full><textarea rows={2} value={m.catatan} onChange={(e) => set('catatan', e.target.value)} /></Field>
        <label className="check field-full">
          <input type="checkbox" checked={!!m.dibatalkan} onChange={(e) => set('dibatalkan', e.target.checked)} />
          <span>Dibatalkan (tidak dihitung sebagai aktif &amp; beban dosen)</span>
        </label>

        {['TA', 'KP', 'MG'].includes(m.program) && (
          <div className="sched field-full">
            <div className="sched-title">Perpanjangan {programLabel(m.program)}</div>
            {(m.perpanjangan && m.perpanjangan.diminta)
              ? <div className="verif-info"><div>Alasan mahasiswa: <strong>{m.perpanjangan.alasan || '—'}</strong>{m.perpanjangan.tanggalDiminta ? ` · ${formatTanggal(m.perpanjangan.tanggalDiminta)}` : ''}</div></div>
              : <div className="hint">Belum ada pengajuan perpanjangan dari mahasiswa.</div>}
            {(m.perpanjangan || {}).suratAdmin
              ? <div className="callout callout-green">Surat diberikan ke mahasiswa: <a href={m.perpanjangan.suratAdmin.url || m.perpanjangan.suratAdmin.dataUrl} target="_blank" rel="noreferrer">{m.perpanjangan.suratAdmin.fileName}</a></div>
              : <div className="hint">Surat perpanjangan belum diberikan ke mahasiswa.</div>}
            <div style={{ marginTop: 6 }}>
              <label className="btn" style={{ display: 'inline-block', cursor: 'pointer' }}>
                {ppBusy ? 'Mengunggah…' : ((m.perpanjangan || {}).suratAdmin ? 'Ganti berkas & berikan ulang' : 'Berikan surat ke mahasiswa')}
                <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) berikanSuratPerpanjangan(f); }} disabled={ppBusy} style={{ display: 'none' }} />
              </label>
              {ppErr && <div className="login-err" style={{ marginTop: 4 }}>{ppErr}</div>}
            </div>
            {(m.perpanjangan || {}).suratFinalLink
              ? <div className="callout callout-green">Surat final (ditandatangani) dari mahasiswa: <a href={m.perpanjangan.suratFinalLink} target="_blank" rel="noreferrer">buka</a></div>
              : <div className="hint">Surat final dari mahasiswa belum diunggah.</div>}
            {m.program === 'TA' && (
              <div className="notif-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn" onClick={() => cetakSuratPDF(`Perpanjangan TA - ${m.nama}`, dokTA('perpanjangan', m, dosenByKode))}>Cetak surat perpanjangan (PDF)</button>
              </div>
            )}
          </div>
        )}

        {notifikasiBlok}
        {peringatanBlok}
      </div>
    </Modal>
  );
}

