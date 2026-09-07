import React from 'react';
import { kumpulkanEvent, formatTanggal, programLabel, programOf } from '../../utils/helpers.js';
import { Badge, Empty } from '../../components/ui.jsx';

// Jadwal seminar/sidang/expo & pemakaian ruang seluruh mahasiswa (bukan cuma
// punya sendiri) — supaya mahasiswa bisa cek potensi bentrok ruang/jam sendiri.
// Saat ini baru program KP yang jalan; program lain otomatis muncul begitu ada
// datanya (lihat kumpulkanEvent di helpers.js).
export function PenggunaanRuangPortal({ mahasiswa }) {
  const jadwalEvents = kumpulkanEvent(mahasiswa);
  return (
    <div className="portal">
      <div className="toolbar">
        <h2 className="page-title">Penggunaan Ruang</h2>
      </div>
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
    </div>
  );
}
