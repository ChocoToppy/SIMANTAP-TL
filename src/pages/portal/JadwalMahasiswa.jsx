import React, { useMemo } from 'react';
import { Badge, Empty } from '../../components/ui.jsx';
import { formatTanggal, programDisplayLabel, todayISO, kumpulkanEvent } from '../../utils/helpers.js';

// Tab "Jadwal" mahasiswa: seminar/sidang/expo seluruh mahasiswa yang belum lewat (hari ini ke
// depan), supaya daftar tidak menumpuk. Tanpa fitur peminjaman ruang.
export function JadwalMahasiswa({ semua = [] }) {
  const hariIni = todayISO();
  const daftar = useMemo(() => kumpulkanEvent(semua).filter((e) => e.tanggal >= hariIni), [semua, hariIni]);

  return (
    <div className="portal">
      <div className="toolbar"><h2 className="page-title">Jadwal</h2></div>
      {daftar.length === 0 ? <Empty>Belum ada jadwal mendatang.</Empty> : (
        <div className="table-wrap card">
          <table className="tbl tbl-wide">
            <thead><tr><th>Tanggal</th><th>Jam</th><th>Ruang</th><th>Kegiatan</th><th>Mahasiswa</th></tr></thead>
            <tbody>
              {daftar.map((e) => (
                <tr key={e.key}>
                  <td className="cell-sub">{formatTanggal(e.tanggal)}</td>
                  <td className="cell-sub">{e.jam || '—'}</td>
                  <td>{e.ruang ? <Badge tone="blue">{e.ruang}</Badge> : <span className="muted">—</span>}</td>
                  <td className="cell-sub">{programDisplayLabel(e.m)} · {e.ev}</td>
                  <td><div className="cell-name">{e.m.nama}</div><div className="cell-sub">{e.m.nim}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
