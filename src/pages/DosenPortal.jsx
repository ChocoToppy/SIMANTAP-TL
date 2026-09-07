import React, { useState, useMemo, useRef } from 'react';
import { SEMUA, filterByPeriode, hitungBebanRinci, aktivitasTerakhir, tanggalDibuat, kondisi, bidangLabel, programOf, programLabel, getJadwal, AKTIVITAS_LABEL, formatWaktu } from '../utils/helpers.js';
import { Badge, StageBar, Empty, ColResizeHandle, TextSizeToggle, ThemeToggle, RolePill } from '../components/ui.jsx';
import { generateDocument, getTemplateConfig } from '../utils/documentGenerator.js';
import { useColumnWidths } from '../utils/useColumnWidths.js';
import logoTl from '../assets/logo-tl.png';

// ===================== DosenPortal.jsx =====================
// Tampilan untuk dosen: lihat beban bimbingan/penguji sendiri.

function peranDosen(m, kode) {
  const r = [];
  if (m.pembimbing1 === kode || m.pembimbing2 === kode) r.push('Pembimbing');
  if (m.penguji1 === kode || m.penguji2 === kode) r.push('Penguji');
  return r.join(' & ');
}

export function DosenPortal({ dosen, allDosen, mahasiswa, periodeList = [], onGradeSave, onLogout }) {
  const [periode, setPeriode] = useState(SEMUA);
  const [semua, setSemua] = useState(true); // termasuk lulus
  const dosenByKode = useMemo(
    () => Object.fromEntries((allDosen && allDosen.length ? allDosen : [dosen]).map((d) => [d.kode, d])),
    [allDosen, dosen]
  );

  const scoped = useMemo(() => filterByPeriode(mahasiswa, periode), [mahasiswa, periode]);
  const beban = useMemo(() => hitungBebanRinci(scoped, dosen.kode, { semua }), [scoped, dosen.kode, semua]);

  const [sortBy, setSortBy] = useState('nama'); // nama | tahap | aktivitas
  const [sortDir, setSortDir] = useState('asc');
  function ubahSort(key) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir(key === 'aktivitas' ? 'desc' : 'asc'); }
  }
  const panah = (key) => (sortBy === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const COLS = [
    { key: 'mahasiswa', width: 220 },
    { key: 'program', width: 130 },
    { key: 'peran', width: 110 },
    { key: 'tahap', width: 180 },
    { key: 'status', width: 130 },
    { key: 'aktivitas', width: 170 },
    { key: 'suratNilai', width: 220, flex: true, minWidth: 180 },
  ];
  const tableWrapRef = useRef(null);
  const [colWidths, startResize, tableWidth] = useColumnWidths('simantap-col-dosen', COLS, tableWrapRef);

  const terkait = useMemo(
    () =>
      scoped
        .filter((m) => !m.dibatalkan && (semua || m.tahap !== 'Lulus'))
        .filter((m) => [m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2].includes(dosen.kode))
        .map((m) => ({ m, peran: peranDosen(m, dosen.kode) }))
        .sort((a, b) => {
          const arah = sortDir === 'asc' ? 1 : -1;
          const val = (x) => sortBy === 'tahap' ? x.m.tahap
            : sortBy === 'aktivitas' ? ((aktivitasTerakhir(x.m) || {}).at || tanggalDibuat(x.m))
            : x.m.nama;
          return String(val(a)).localeCompare(String(val(b)), 'id') * arah;
        }),
    [scoped, dosen.kode, semua, sortBy, sortDir]
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
        <button className="btn btn-logout btn-sm" onClick={onLogout}>Logout</button>
        <div className="brand">
          <img className="brand-mark" src={logoTl} alt="TL Undip" />
          <span className="brand-name">SIMANTAP</span>
        </div>
        <div className="topbar-right">
          <ThemeToggle />
          <TextSizeToggle />
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
          <RolePill peran="dosen" nama={dosen.nama} sub={dosen.kode} />
        </div>
      </header>
      <div className="masthead-rule" />

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
            <div className="table-wrap" ref={tableWrapRef}>
              <table className="tbl tbl-resizable" style={{ width: tableWidth }}>
                <colgroup>
                  {COLS.map((c, i) => (
                    <col key={c.key} style={i === COLS.length - 1 ? undefined : { width: colWidths[i] }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="th-sort" onClick={() => ubahSort('nama')}>Mahasiswa{panah('nama')}<ColResizeHandle onMouseDown={(e) => startResize(0, e)} /></th>
                    <th>Program<ColResizeHandle onMouseDown={(e) => startResize(1, e)} /></th>
                    <th>Peran<ColResizeHandle onMouseDown={(e) => startResize(2, e)} /></th>
                    <th className="th-sort" onClick={() => ubahSort('tahap')}>Tahap{panah('tahap')}<ColResizeHandle onMouseDown={(e) => startResize(3, e)} /></th>
                    <th>Status<ColResizeHandle onMouseDown={(e) => startResize(4, e)} /></th>
                    <th className="th-sort" onClick={() => ubahSort('aktivitas')}>Aktivitas{panah('aktivitas')}<ColResizeHandle onMouseDown={(e) => startResize(5, e)} /></th>
                    <th>Surat Tugas &amp; Nilai KP</th>
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
                        <td>
                          {(() => {
                            const terakhir = aktivitasTerakhir(m);
                            return terakhir
                              ? <span className="cell-sub">{formatWaktu(terakhir.at)} · {AKTIVITAS_LABEL[terakhir.tipe] || terakhir.tipe}</span>
                              : <span className="cell-sub">Daftar: {formatWaktu(tanggalDibuat(m))}</span>;
                          })()}
                        </td>
                        <td>
                          {programOf(m) === 'KP' ? (
                            <KpDosenActions m={m} dosenByKode={dosenByKode} onGradeSave={onGradeSave} />
                          ) : (
                            <span className="hint">—</span>
                          )}
                        </td>
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

// Tampilan terbatas dosen untuk KP: unduh Surat Tugas pembimbingan + isi nilai
// hasil Seminar KP. Dosen tidak bisa mengubah field lain milik mahasiswa.
function KpDosenActions({ m, dosenByKode, onGradeSave }) {
  const j = getJadwal(m, 'Seminar KP');
  const bisaNilai = !!(j.dikonfirmasi && j.tanggal);
  const [dlBusy, setDlBusy] = useState(false);

  async function unduhSuratTugas() {
    const config = getTemplateConfig('ST Pembimbing KP', m, dosenByKode, getJadwal(m, 'Seminar KP'));
    if (!config) return;
    setDlBusy(true);
    try {
      await generateDocument(config.template, config.filename, config.data);
    } finally {
      setDlBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <button type="button" className="btn" onClick={unduhSuratTugas} disabled={dlBusy}>{dlBusy ? 'Menyiapkan PDF…' : 'Unduh Surat Tugas (PDF)'}</button>
      <label className="field" style={{ margin: 0 }}>
        <span className="field-label">Nilai Seminar KP</span>
        <select
          value={j.hasil || ''}
          disabled={!bisaNilai}
          onChange={(e) => onGradeSave && onGradeSave(m.id, 'Seminar KP', e.target.value)}
        >
          <option value="">— belum dinilai —</option>
          <option value="lulus">Lulus</option>
          <option value="tidak">Tidak lulus</option>
        </select>
      </label>
      {!bisaNilai && <span className="hint">Menunggu jadwal Seminar KP dikonfirmasi admin.</span>}
    </div>
  );
}

function MetricDosen({ label, value, tone }) {
  return (
    <div className={'metric metric-' + (tone || 'blue')}>
      <span className="metric-label">{label}</span>
      <span className={'metric-value' + (tone ? ' val-' + tone : '')}>{value}</span>
    </div>
  );
}
