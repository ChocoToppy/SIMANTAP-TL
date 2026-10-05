import React, { useMemo, useState } from 'react';
import { NAMA_HARI } from '../logic/jadwalRuang.js';
import { hariDariTanggal } from '../logic/ruangBooking.js';
import { geserMode, pekanDari, labelBulan } from '../logic/jadwalRuangView.js';
import { todayISO, formatTanggal } from '../host.js';
import { Empty } from '../host.js';
import { JadwalRuangHarian } from './JadwalRuangHarian.jsx';
import { JadwalRuangPekan } from './JadwalRuangPekan.jsx';
import { JadwalRuangBulan } from './JadwalRuangBulan.jsx';

const MODE = [['hari', 'Harian'], ['minggu', 'Mingguan'], ['bulan', 'Bulanan']];

function judulRentang(mode, tanggal) {
  if (mode === 'hari') return `${NAMA_HARI[hariDariTanggal(tanggal)]}, ${formatTanggal(tanggal)}`;
  if (mode === 'minggu') { const p = pekanDari(tanggal); return `${formatTanggal(p[0])} – ${formatTanggal(p[6])}`; }
  return labelBulan(tanggal);
}

// Grid ketersediaan ruang dengan tiga tampilan (harian / mingguan / bulanan). Sel
// berwarna = terpakai, kosong = tersedia. Yang tampil adalah booking yang benar-benar
// berlaku pada tanggal itu (rentang berlaku & blackout dihormati).
// onKosong({ruangId, tanggal, mulai?}) / onBlok(slot, tanggal): opsional — bila diberikan,
// sel kosong & blok bisa diklik (mode admin).
export function JadwalRuangGrid({ data, semester, onKosong, onBlok }) {
  const awal = useMemo(() => {
    const t = todayISO();
    if (!semester) return t;
    return t < semester.mulai ? semester.mulai : t > semester.selesai ? semester.selesai : t;
  }, [semester]);
  const [tanggal, setTanggal] = useState(awal);
  const [mode, setMode] = useState('hari');

  if (!semester) return <Empty>Belum ada jadwal ruang yang diterbitkan.</Empty>;
  if (!(data.ruang || []).length) return <Empty>Belum ada ruang terdaftar.</Empty>;

  const bukaHari = (t) => { setTanggal(t); setMode('hari'); };
  const satuan = { hari: 'Hari', minggu: 'Pekan', bulan: 'Bulan' }[mode];
  return (
    <div className="jr">
      <div className="jr-nav">
        <div className="jr-mode" role="tablist" aria-label="Tampilan jadwal">
          {MODE.map(([k, label]) => <button key={k} type="button" role="tab" aria-selected={mode === k} className={'btn btn-sm' + (mode === k ? ' btn-primary' : '')} onClick={() => setMode(k)}>{label}</button>)}
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setTanggal(geserMode(mode, tanggal, -1))} aria-label={`${satuan} sebelumnya`}>‹</button>
        <input type="date" value={tanggal} onChange={(e) => e.target.value && setTanggal(e.target.value)} />
        <button type="button" className="btn btn-sm" onClick={() => setTanggal(geserMode(mode, tanggal, 1))} aria-label={`${satuan} berikutnya`}>›</button>
        <button type="button" className="btn btn-sm" onClick={() => setTanggal(awal)}>Hari ini</button>
        <span className="jr-tgl">{judulRentang(mode, tanggal)}</span>
      </div>
      {mode === 'hari' && <JadwalRuangHarian data={data} semester={semester} tanggal={tanggal} onKosong={onKosong} onBlok={onBlok} />}
      {mode === 'minggu' && <JadwalRuangPekan data={data} semester={semester} tanggal={tanggal} onKosong={onKosong} onBlok={onBlok} onBukaHari={bukaHari} />}
      {mode === 'bulan' && <JadwalRuangBulan data={data} semester={semester} tanggal={tanggal} onBukaHari={bukaHari} />}
      <div className="jr-legenda">
        <span className="jr-chip"><i className="jr-sw jr-kuliah" /> Kuliah / kegiatan</span>
        <span className="jr-chip"><i className="jr-sw jr-seminar" /> Seminar / sidang</span>
      </div>
    </div>
  );
}
