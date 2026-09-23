import React from 'react';
import { eventsFor, programOf, getJadwal, jamTampil, formatTanggal, AKTIVITAS_LABEL, AKTIVITAS_LABEL_SINGKAT, AKTIVITAS_WARNA, formatWaktu } from '../../utils/helpers.js';
import { Badge } from '../../components/ui.jsx';

// Riwayat lengkap aktivitas mahasiswa (terbaru di atas), ditampilkan di modal edit admin.
// Tiap entri jadi kartu berwarna sesuai tipenya supaya gampang dipindai sekilas,
// dan entri paling baru ditandai "Terbaru" biar urutannya tidak ambigu.
export function RiwayatAktivitas({ m }) {
  const log = m.aktivitas || [];
  const terbalik = log.slice().reverse();
  return (
    <div className="sched field-full">
      <div className="sched-title">Riwayat aktivitas</div>
      {log.length === 0 ? (
        <div className="hint">Belum ada riwayat aktivitas tercatat (data lama, sebelum fitur ini ada).</div>
      ) : (
        <ul className="riwayat-list">
          {terbalik.map((a, i) => {
            const warna = AKTIVITAS_WARNA[a.tipe] || 'gray';
            return (
              <li key={i} className={`riwayat-card riwayat-card-${warna}`}>
                <div className="riwayat-card-head">
                  <span className="riwayat-card-title">
                    {AKTIVITAS_LABEL[a.tipe] || a.tipe}
                    {i === 0 && <span className="riwayat-terbaru-tag">Terbaru</span>}
                  </span>
                  <span className="riwayat-card-time">{formatWaktu(a.at)}</span>
                </div>
                {a.catatan && <div className="riwayat-card-detail">{a.catatan}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Tampilan ringkas riwayat aktivitas di tabel: cuma badge tipe aktivitas untuk
// 2 entri paling baru (terbaru di atas), tanpa tanggal — detail lengkap & berjam
// ada di modal edit (RiwayatAktivitas). Kolom ini punya minWidth = lebar label
// terpanjang (lihat COLS di Mahasiswa.jsx) supaya badge tidak pernah kepotong.
export function AktivitasMini({ m }) {
  const log = m.aktivitas || [];
  const tampil = log.length ? log.slice(-2).reverse() : [{ tipe: 'daftar' }];
  const sisa = Math.max(0, log.length - tampil.length);
  return (
    <div className="aktivitas-mini">
      {tampil.map((a, i) => (
        <Badge key={i} tone={AKTIVITAS_WARNA[a.tipe] || 'gray'}>{AKTIVITAS_LABEL_SINGKAT[a.tipe] || a.tipe}</Badge>
      ))}
      {sisa > 0 && <div className="aktivitas-mini-more">+{sisa} lainnya</div>}
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
