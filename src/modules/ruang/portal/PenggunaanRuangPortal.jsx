import React, { useState } from 'react';
import { kumpulkanEvent, formatTanggal, programDisplayLabel, todayISO } from '../host.js';
import { Badge, Empty } from '../host.js';
import { JadwalRuangEditor } from '../components/JadwalRuangEditor.jsx';

// Jadwal seminar/sidang/expo & pemakaian ruang seluruh mahasiswa (bukan cuma
// punya sendiri) — supaya mahasiswa bisa cek potensi bentrok ruang/jam sendiri.
// Saat ini baru program KP yang jalan; program lain otomatis muncul begitu ada
// datanya (lihat kumpulkanEvent di helpers.js).
// Dengan `aksi` (admin): semua semester termasuk draft bisa dipilih dan grid bisa
// diedit (tambah/ubah/batalkan booking). Layar ini khusus admin; mahasiswa memakai tab Jadwal
// (pages/portal/JadwalMahasiswa.jsx), tanpa grid ruang.
export function PenggunaanRuangPortal({ mahasiswa, jadwalRuang = null, dosen = [], semuaMahasiswa = [], aksi = null, catatanSinkron = [] }) {
  const hariIni = todayISO();
  const jadwalEvents = kumpulkanEvent(mahasiswa);
  const [semId, setSemId] = useState('');
  const semesters = ((jadwalRuang && jadwalRuang.semesters) || []).slice().sort((a, b) => String(b.mulai).localeCompare(String(a.mulai)));
  const semesterAdmin = semesters.find((s) => s.id === semId) || semesters.find((s) => s.mulai <= hariIni && hariIni <= s.selesai) || semesters[0] || null;
  return (
    <div className="portal">
      <div className="toolbar">
        <h2 className="page-title">Penggunaan Ruang</h2>
      </div>
      {aksi ? (
        <section style={{ marginBottom: 24 }}>
          <>
              <div className="toolbar" style={{ marginBottom: 8 }}>
                <select value={semesterAdmin ? semesterAdmin.id : ''} onChange={(e) => setSemId(e.target.value)} disabled={!semesters.length}>
                  {!semesters.length && <option value="">Belum ada semester — buat di Pengaturan → Jadwal Ruang</option>}
                  {semesters.map((s) => <option key={s.id} value={s.id}>{s.label}{s.status === 'terbit' ? ' (terbit)' : ' (draft)'}</option>)}
                </select>
              </div>
              {catatanSinkron.length > 0 && (
                <div className="callout callout-amber" style={{ marginBottom: 8 }}>
                  ⚠ {catatanSinkron.length} jadwal terkonfirmasi belum masuk grid:
                  <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                    {catatanSinkron.slice(0, 5).map((c, i) => <li key={i}>{c.ev} — {c.nama}: {c.alasan}</li>)}
                  </ul>
                </div>
              )}
              <JadwalRuangEditor key={semesterAdmin ? semesterAdmin.id : 'none'} data={jadwalRuang} dosen={dosen} mahasiswa={semuaMahasiswa} semester={semesterAdmin} aksi={aksi} />
          </>
        </section>
      ) : null}
      {jadwalEvents.length === 0 ? (
        <Empty>Belum ada jadwal seminar/sidang/expo.</Empty>
      ) : (
        <div className="table-wrap card">
          <table className="tbl tbl-wide">
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
                  <td className="cell-sub">{programDisplayLabel(e.m)} · {e.ev}</td>
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
    </div>
  );
}
