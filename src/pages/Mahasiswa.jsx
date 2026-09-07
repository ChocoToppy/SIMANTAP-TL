import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, punyaKlasifikasi, BIDANG, formatTanggal, kondisi, SEMUA, statusVerif, cariBentrok, eventAktif, bidangLabel, tanggalDibuat, hitungNomorUrut } from '../utils/helpers.js';
import { Badge, StageBar, ExportMenu, ColResizeHandle, Empty } from '../components/ui.jsx';
import { useColumnWidths } from '../utils/useColumnWidths.js';
import { AktivitasMini, JadwalMini } from './mahasiswa/AktivitasCells.jsx';
import { FormMahasiswa } from './mahasiswa/FormMahasiswa.jsx';
import { eksporMahasiswa } from './mahasiswa/exportMahasiswa.js';

// ===================== Mahasiswa.jsx =====================
// Mahasiswa.jsx — daftar + cari + filter + tambah/edit (multi-program)
//
// Modal tambah/edit (FormMahasiswa, dan tata letak KP/generik di dalamnya)
// hidup di folder ./mahasiswa/ — file ini murni halaman daftar/tabel.

const STATUS_FILTER = [
  { key: 'all', label: 'Semua status' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'mendekati', label: 'Mendekati deadline' },
  { key: 'lewat', label: 'Lewat batas' },
  { key: 'lulus', label: 'Lulus' },
  { key: 'batal', label: 'Dibatalkan' },
];

// Kolom "peran dosen" beda tiap program (lihat PROGRAMS di helpers.js) — KP/Magang
// cuma satu pembimbing rangkap penguji, TA/Tesis S2 punya 2 pembimbing + 2 penguji, dst.
function kolomDosenProgram(programKey) {
  const p = PROGRAMS[programKey] || PROGRAMS.TA;
  const cols = [{ key: 'pembimbing1', label: p.pembimbingLabel || 'Pembimbing 1' }];
  if (p.pembimbing >= 2) cols.push({ key: 'pembimbing2', label: 'Pembimbing 2' });
  if (p.penguji >= 1) cols.push({ key: 'penguji1', label: p.penguji >= 2 ? 'Penguji 1' : 'Penguji' });
  if (p.penguji >= 2) cols.push({ key: 'penguji2', label: 'Penguji 2' });
  return cols;
}

export function Mahasiswa({ mahasiswa, allMahasiswa, allDosen, periode, periodeList, konten = {}, onSave, onDelete }) {
  const [q, setQ] = useState('');
  // Satu tabel = satu program (kolomnya beda-beda tiap program, jadi tidak
  // dicampur lagi) — defaultnya KP karena itu yang aktif jalan sekarang.
  const [programTab, setProgramTab] = useState('KP');
  const [fAngkatan, setFAngkatan] = useState('');
  const [fBidang, setFBidang] = useState('');
  const [fStatus, setFStatus] = useState('all');
  const [fVerif, setFVerif] = useState('');
  const [fDosen, setFDosen] = useState('');
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  // Filter tambahan (di luar pencarian & status) diciutkan di layar sempit —
  // supaya toolbar tidak jadi tumpukan dropdown yang berdesakan/terpotong.
  // Di layar lebar, CSS selalu menampilkannya (lihat .toolbar-extra), jadi
  // state ini cuma berpengaruh di mobile.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState('nama'); // nama | tahap | deadline | dibuat
  const [sortDir, setSortDir] = useState('asc');
  function ubahSort(key) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  }
  const panah = (key) => (sortBy === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  // Nomor identitas tetap (berdasarkan urutan pendaftaran pertama), dihitung dari
  // SELURUH data — tidak berubah walau tabel disortir/difilter.
  const nomorUrut = useMemo(() => hitungNomorUrut(allMahasiswa || mahasiswa), [allMahasiswa, mahasiswa]);
  const dosenByKode = useMemo(() => Object.fromEntries((allDosen || []).map((d) => [d.kode, d])), [allDosen]);
  const [groupMode, setGroupMode] = useState(periode === SEMUA ? 'periode' : 'none');
  useEffect(() => {
    setGroupMode(periode === SEMUA ? 'periode' : 'none');
  }, [periode]);

  const dosenCols = useMemo(() => kolomDosenProgram(programTab), [programTab]);
  const COLS = useMemo(() => [
    { key: 'no', width: 56 },
    { key: 'mahasiswa', width: 220 },
    { key: 'judul', width: 260 },
    { key: 'tahap', width: 210 },
    ...dosenCols.map((c) => ({ key: c.key, width: 100 })),
    { key: 'deadline', width: 130 },
    { key: 'aktivitas', width: 170 },
    { key: 'nomorSurat', width: 130 },
    { key: 'aksi', width: 100, flex: true, minWidth: 100 },
  ], [dosenCols]);
  const tableWrapRef = useRef(null);
  const [colWidths, startResize, tableWidth] = useColumnWidths('simantap-col-mahasiswa', COLS, tableWrapRef);

  // Cuma dipakai untuk lencana "Filter (n)" di tombol toggle mobile — angka
  // filter tambahan (di luar pencarian) yang lagi aktif.
  const filterAktifCount = [fStatus !== 'all', !!fAngkatan, !!fBidang, !!fVerif, !!fDosen].filter(Boolean).length;

  const angkatanList = useMemo(
    () => Array.from(new Set(mahasiswa.filter((m) => programOf(m) === programTab).map((m) => m.angkatan))).sort((a, b) => b - a),
    [mahasiswa, programTab]
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return mahasiswa
      .map((m) => ({ m, k: kondisi(m) }))
      .filter(({ m, k }) => {
        if (programOf(m) !== programTab) return false;
        if (term && !(`${m.nama} ${m.nim} ${m.judul}`.toLowerCase().includes(term))) return false;
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
        if (sortBy === 'no') {
          const noOf = (m) => (groupMode === 'angkatan' ? (nomorUrut[m.id] || {}).angkatan : (nomorUrut[m.id] || {}).periode) ?? 0;
          return (noOf(a.m) - noOf(b.m)) * arah;
        }
        const val = (m) => sortBy === 'judul' ? (m.judul || '')
          : sortBy === 'tahap' ? m.tahap
          : sortBy === 'pembimbing1' ? (m.pembimbing1 || '')
          : sortBy === 'pembimbing2' ? (m.pembimbing2 || '')
          : sortBy === 'penguji1' ? (m.penguji1 || '')
          : sortBy === 'penguji2' ? (m.penguji2 || '')
          : sortBy === 'deadline' ? (m.batasAkhir || '')
          : sortBy === 'dibuat' ? tanggalDibuat(m)
          : m.nama;
        return String(val(a.m)).localeCompare(String(val(b.m)), 'id') * arah;
      });
  }, [mahasiswa, programTab, q, fAngkatan, fBidang, fStatus, fVerif, fDosen, sortBy, sortDir, nomorUrut, groupMode]);

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

  // Paginasi — pencarian/filter (di atas) selalu jalan di atas SELURUH `mahasiswa`,
  // bukan cuma halaman yang lagi tampil; paginasi cuma memotong hasil akhir buat
  // ditampilkan. Default 100 baris/halaman, bisa diperkecil.
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [q, programTab, fAngkatan, fBidang, fStatus, fVerif, fDosen, pageSize, groupMode, periode]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => rows.slice((safePage - 1) * pageSize, safePage * pageSize), [rows, safePage, pageSize]);

  // Kelompokkan baris halaman ini (yang sudah difilter & disortir) berdasarkan
  // periode/angkatan, menjaga urutan relatif yang sudah ada — mirip tampilan
  // "group" spreadsheet.
  const grupRows = useMemo(() => {
    if (groupMode === 'none') return null;
    const keyOf = (m) => (groupMode === 'angkatan' ? (m.angkatan || '—') : (m.periode || '—'));
    const map = new Map();
    pageRows.forEach((r) => {
      const k = keyOf(r.m);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [pageRows, groupMode]);

  function noUntuk(m) {
    if (groupMode === 'angkatan') return (nomorUrut[m.id] || {}).angkatan ?? '—';
    return (nomorUrut[m.id] || {}).periode ?? '—';
  }

  function tambah() { setEditing(null); setOpen(true); }
  function edit(m) { setEditing(m); setOpen(true); }
  function simpan(m) { onSave(m); setOpen(false); }
  function hapus(m) { if (window.confirm(`Hapus data ${m.nama}?`)) onDelete(m.id); }

  // Nama lengkap dosen dipakai khusus saat ekspor (kolom tabel tetap pakai kode
  // singkat spy hemat lebar) — lihat dosenByKode di bawah.
  const namaLengkapDosen = (kode) => (kode && dosenByKode[kode]) ? dosenByKode[kode].nama : (kode || '');

  async function ekspor(format) {
    await eksporMahasiswa(format, rows.map((x) => x.m), { nomorUrut, namaLengkapDosen });
  }

  return (
    <div>
      <nav className="program-tabs">
        {PROGRAM_KEYS.map((p) => (
          <button key={p} className={'program-tab' + (programTab === p ? ' active' : '')} onClick={() => setProgramTab(p)}>{programLabel(p)}</button>
        ))}
      </nav>
      <div className="toolbar">
        <input className="search" placeholder="Cari nama, NIM, atau judul…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="toolbar-filter">
          <button
            type="button"
            className={'btn toolbar-toggle' + (filtersOpen ? ' active' : '')}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filter{filterAktifCount > 0 ? ` (${filterAktifCount})` : ''} {filtersOpen ? '▴' : '▾'}
          </button>
          {filtersOpen && (
            <>
              <div className="toolbar-filter-backdrop" onClick={() => setFiltersOpen(false)} />
              <div className="toolbar-extra">
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
              </div>
            </>
          )}
        </div>
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
      <div className="table-wrap card mhs-table-wrap" ref={tableWrapRef}>
        <table className="tbl tbl-resizable" style={{ width: tableWidth }}>
          <colgroup>
            {COLS.map((c, i) => (
              <col key={c.key} style={i === COLS.length - 1 ? undefined : { width: colWidths[i] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="th-sort" onClick={() => ubahSort('no')}>No.{panah('no')}<ColResizeHandle onMouseDown={(e) => startResize(0, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('nama')}>Mahasiswa{panah('nama')}<ColResizeHandle onMouseDown={(e) => startResize(1, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('judul')}>Judul{panah('judul')}<ColResizeHandle onMouseDown={(e) => startResize(2, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('tahap')}>Tahap &amp; jadwal{panah('tahap')}<ColResizeHandle onMouseDown={(e) => startResize(3, e)} /></th>
              {dosenCols.map((c, i) => (
                <th key={c.key} className="th-sort" onClick={() => ubahSort(c.key)}>{c.label}{panah(c.key)}<ColResizeHandle onMouseDown={(e) => startResize(4 + i, e)} /></th>
              ))}
              <th className="th-sort" onClick={() => ubahSort('deadline')}>Deadline{panah('deadline')}<ColResizeHandle onMouseDown={(e) => startResize(4 + dosenCols.length, e)} /></th>
              <th className="th-sort" onClick={() => ubahSort('dibuat')}>Aktivitas{panah('dibuat')}<ColResizeHandle onMouseDown={(e) => startResize(5 + dosenCols.length, e)} /></th>
              <th>No. Surat<ColResizeHandle onMouseDown={(e) => startResize(6 + dosenCols.length, e)} /></th>
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
                  {dosenCols.map((c) => <td key={c.key}>{m[c.key] || '-'}</td>)}
                  <td>
                    <Badge tone={k.tone}>{k.label}</Badge>
                    <div className="cell-sub">{formatTanggal(m.batasAkhir)}</div>
                  </td>
                  <td><AktivitasMini m={m} /></td>
                  <td className="cell-sub">{m.nomorSurat || '—'}</td>
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
              return pageRows.map(baris);
            })()}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>Tidak ada data yang cocok.</Empty>}
      </div>

      {/* Tampilan daftar (bukan tabel) untuk layar sempit — data & urutan sama
          persis dengan tabel di atas (pageRows/grupRows), cuma ditata ulang
          jadi baris bertumpuk supaya tidak perlu geser ke samping di HP. */}
      <div className="mhs-mobile-rows">
        {rows.length === 0 ? (
          <Empty>Tidak ada data yang cocok.</Empty>
        ) : (() => {
          const barisMobile = ({ m, k }) => (
            <div className="mhs-row" key={m.id} onClick={() => edit(m)}>
              <div className="mhs-row-top">
                <div className="mhs-row-name">{m.nama}</div>
                <Badge tone={k.tone}>{k.label}</Badge>
              </div>
              <div className="mhs-row-sub">{m.nim} · {programLabel(programOf(m))} · {m.pembimbing1 || m.dosenWali || '—'}</div>
              <StageBar program={programOf(m)} tahap={m.tahap} />
              <div className="mhs-row-foot">
                <span>{statusVerif(m).label}</span>
                <span>Batas: {formatTanggal(m.batasAkhir)}</span>
              </div>
              <div className="mhs-row-actions">
                <button type="button" className="link-btn danger mhs-row-del" onClick={(e) => { e.stopPropagation(); hapus(m); }}>Hapus</button>
              </div>
            </div>
          );
          if (grupRows) {
            return grupRows.map((g) => (
              <div key={g.label}>
                <div className="mhs-mobile-group">{groupMode === 'angkatan' ? `Angkatan ${g.label}` : g.label}</div>
                {g.items.map(barisMobile)}
              </div>
            ));
          }
          return pageRows.map(barisMobile);
        })()}
      </div>

      {rows.length > 0 && (
        <div className="pagination">
          <span className="hint">
            Menampilkan {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} dari {rows.length} data
          </span>
          <div className="pagination-controls">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} title="Baris per halaman">
              {[5, 10, 25, 50, 100, 500].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="btn btn-sm" disabled={safePage <= 1} onClick={() => setPage(1)}>«</button>
            <button className="btn btn-sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Sebelumnya</button>
            <span className="hint">{safePage} / {totalPages}</span>
            <button className="btn btn-sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Berikutnya ›</button>
            <button className="btn btn-sm" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </div>
      )}

      {open && (
        <FormMahasiswa
          awal={editing}
          allDosen={allDosen}
          allMahasiswa={allMahasiswa || mahasiswa}
          periode={periode}
          periodeList={periodeList}
          konten={konten}
          defaultProgram={programTab}
          onCancel={() => setOpen(false)}
          onSave={simpan}
        />
      )}
    </div>
  );
}
