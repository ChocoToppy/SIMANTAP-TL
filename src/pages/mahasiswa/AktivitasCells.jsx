import React from 'react';
import { eventsFor, programOf, getJadwal, jamTampil, formatTanggal, tanggalDibuat, AKTIVITAS_LABEL, AKTIVITAS_LABEL_SINGKAT, AKTIVITAS_WARNA, formatWaktu, formatHariBulan } from '../../utils/helpers.js';

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

// Tampilan ringkas riwayat aktivitas di tabel: kartu berwarna versi sederhana
// dari kartu di modal edit (RiwayatAktivitas) — label satu kata di kiri
// (tengah vertikal), tanggal dd-Mmm kecil di kanan-atas — untuk 2 entri
// paling baru (terbaru di atas). Nama lengkap, tahun, jam & catatan ada di modal.
export function AktivitasMini({ m }) {
  const log = m.aktivitas || [];
  const tampil = log.length ? log.slice(-2).reverse() : [{ tipe: 'daftar', at: tanggalDibuat(m) }];
  const sisa = Math.max(0, log.length - tampil.length);
  return (
    <div className="aktivitas-mini">
      {tampil.map((a, i) => (
        <div key={i} className={`riwayat-card riwayat-card-${AKTIVITAS_WARNA[a.tipe] || 'gray'} aktivitas-card`}>
          <span className="riwayat-card-title">{AKTIVITAS_LABEL_SINGKAT[a.tipe] || a.tipe}</span>
          {a.at && <span className="aktivitas-card-date">{formatHariBulan(a.at)}</span>}
        </div>
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
