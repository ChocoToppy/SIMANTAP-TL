import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL } from '../data/seed.js';
import { csvEscape, triggerDownload, downloadCSV, downloadDoc, cetakSuratPDF, loadXLSX } from '../utils/exportUtils.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu } from '../components/ui.jsx';

// ===================== Dashboard.js =====================
// Dashboard.js — ringkasan untuk koordinator (lintas program, bisa difilter)

export function Dashboard({ mahasiswa, dosen }) {
  const [prog, setProg] = useState('ALL'); // ALL | TA | KP | CAP
  const [bebanMode, setBebanMode] = useState('semua'); // 'semua' (incl lulus) | 'aktif'

  // Mahasiswa sesuai filter program (untuk metrik, beban, perhatian, sebaran).
  const scoped = prog === 'ALL' ? mahasiswa : mahasiswa.filter((m) => programOf(m) === prog);

  const aktif = scoped.filter(isAktif);
  const lulus = scoped.filter((m) => m.tahap === 'Lulus' && !m.dibatalkan);

  const withK = aktif.map((m) => ({ m, k: kondisi(m) }));
  const lewat = withK.filter((x) => x.k.key === 'lewat');
  const mendekati = withK.filter((x) => x.k.key === 'mendekati');

  // Beban dosen (otomatis) — per periode aktif (lihat selektor periode di atas).
  const beban = dosen
    .map((d) => ({ ...d, ...hitungBeban(scoped, d.kode, { semua: bebanMode === 'semua' }) }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxBeban = beban.length ? beban[0].total : 1;

  const perhatian = [...lewat, ...mendekati].sort((a, b) => a.k.daysLeft - b.k.daysLeft);

  // Sebaran tahap dikelompokkan per program.
  const programsUntukSebaran = prog === 'ALL' ? PROGRAM_KEYS : [prog];
  const grupSebaran = programsUntukSebaran
    .map((p) => {
      const stages = stagesFor(p).filter((s) => s !== 'Lulus');
      const items = stages.map((s) => ({
        tahap: s,
        jumlah: aktif.filter((m) => programOf(m) === p && m.tahap === s).length,
      }));
      return { program: p, items, ada: items.some((it) => it.jumlah > 0) };
    })
    .filter((g) => g.ada);

  const bebanTone = (t) => (t >= 8 ? 'red' : t >= 6 ? 'amber' : 'blue');

  const FILTERS = [
    { key: 'ALL', label: 'Semua' },
    { key: 'TA', label: 'Tugas Akhir' },
    { key: 'CAP', label: 'Capstone' },
    { key: 'KP', label: 'Kerja Praktik' },
    { key: 'MG', label: 'Magang' },
    { key: 'S2', label: 'Tesis S2' },
  ];

  const jadwalEvents = kumpulkanEvent(scoped);

  return (
    <div className="dashboard">
      <div className="seg">
        {FILTERS.map((f) => (
          <button key={f.key} className={'seg-btn' + (prog === f.key ? ' active' : '')} onClick={() => setProg(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="metrics">
        <Metric label="Aktif" value={aktif.length} />
        <Metric label="Lulus" value={lulus.length} tone="green" />
        <Metric label="Mendekati deadline" value={mendekati.length} tone="amber" />
        <Metric label="Lewat batas" value={lewat.length} tone="red" />
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h3 className="card-title">Beban dosen (per periode)</h3>
            <div className="seg seg-sm">
              <button className={'seg-btn' + (bebanMode === 'semua' ? ' active' : '')} onClick={() => setBebanMode('semua')}>Semua</button>
              <button className={'seg-btn' + (bebanMode === 'aktif' ? ' active' : '')} onClick={() => setBebanMode('aktif')}>Aktif</button>
            </div>
          </div>
          {beban.length === 0 ? (
            <Empty>Belum ada dosen yang dibebani pada filter ini.</Empty>
          ) : (
            <div className="bars">
              {beban.map((d) => (
                <div className="bar-row" key={d.kode} title={`${d.bimbingan} bimbingan + ${d.penguji} penguji`}>
                  <span className="bar-key">{d.kode}</span>
                  <div className="bar-track">
                    <div className={`bar-fill fill-${bebanTone(d.total)}`} style={{ width: `${Math.max(8, (d.total / maxBeban) * 100)}%` }} />
                  </div>
                  <span className="bar-val">{d.total}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h3 className="card-title">Perlu perhatian</h3>
          {perhatian.length === 0 ? (
            <Empty>Tidak ada yang lewat batas atau mendekati deadline.</Empty>
          ) : (
            <ul className="attn">
              {perhatian.map(({ m, k }) => (
                <li key={m.id}>
                  <div className="attn-info">
                    <span className="attn-name">{m.nama}</span>
                    <span className="attn-sub">{programLabel(programOf(m))} · {m.tahap}</span>
                  </div>
                  <Badge tone={k.tone}>{k.label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h3 className="card-title">Sebaran tahap</h3>
        {grupSebaran.length === 0 ? (
          <Empty>Belum ada mahasiswa aktif pada filter ini.</Empty>
        ) : (
          grupSebaran.map((g) => (
            <div className="sebaran-group" key={g.program}>
              <div className="sebaran-group-title">{programLabel(g.program)}</div>
              <div className="sebaran">
                {g.items.map((s) => (
                  <div className="sebaran-item" key={s.tahap}>
                    <span className="sebaran-label">{s.tahap}</span>
                    <span className="sebaran-count">{s.jumlah}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3 className="card-title">Timeline jadwal &amp; penggunaan ruang</h3>
        {jadwalEvents.length === 0 ? (
          <Empty>Belum ada jadwal seminar/sidang/expo pada filter ini.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jam</th>
                  <th>Ruang</th>
                  <th>Kegiatan</th>
                  <th>Mahasiswa</th>
                  <th>Dosen</th>
                </tr>
              </thead>
              <tbody>
                {jadwalEvents.map((e) => (
                  <tr key={e.key}>
                    <td className="cell-sub">{formatTanggal(e.tanggal)}</td>
                    <td className="cell-sub">{e.jam || '—'}</td>
                    <td>{e.ruang ? <Badge tone="blue">{e.ruang}</Badge> : <span className="muted">—</span>}</td>
                    <td className="cell-sub">{programLabel(programOf(e.m))} · {e.ev}</td>
                    <td>
                      <div className="cell-name">{e.m.nama}</div>
                      <div className="cell-sub">{e.m.nim}</div>
                    </td>
                    <td className="cell-sub">{e.dosen.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={'metric-value' + (tone ? ' val-' + tone : '')}>{value}</span>
    </div>
  );
}

