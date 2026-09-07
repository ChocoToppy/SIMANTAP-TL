import React from 'react';
import { eventsFor, programOf, getJadwal, jamTampil, formatTanggal, tanggalDibuat, aktivitasTerakhir, AKTIVITAS_LABEL, formatWaktu } from '../../utils/helpers.js';

// Riwayat lengkap aktivitas mahasiswa (terbaru di atas), ditampilkan di modal edit admin.
export function RiwayatAktivitas({ m }) {
  const log = m.aktivitas || [];
  return (
    <div className="sched field-full">
      <div className="sched-title">Riwayat aktivitas</div>
      {log.length === 0 ? (
        <div className="hint">Belum ada riwayat aktivitas tercatat (data lama, sebelum fitur ini ada).</div>
      ) : (
        <ul className="periode-list riwayat-list">
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
export function AktivitasMini({ m }) {
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
export function JadwalMini({ m }) {
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
