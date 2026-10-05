import React, { useMemo, useState } from 'react';
import { NAMA_HARI } from '../logic/jadwalRuang.js';
import { susunRuang, tanggalBulan } from '../logic/jadwalRuangView.js';
import { hariDariTanggal } from '../logic/ruangBooking.js';

// Tampilan bulanan: baris = ruang, kolom = tanggal 1..akhir bulan. Sel berwarna = ada
// booking (angka bila lebih dari satu). Klik sel membuka tampilan harian tanggal itu.
export function JadwalRuangBulan({ data, semester, tanggal, onBukaHari }) {
  const [semuaRuang, setSemuaRuang] = useState(false);
  const hari = useMemo(() => tanggalBulan(tanggal), [tanggal]);
  const { perTanggal, ruang, kosong } = useMemo(() => susunRuang(data, semester, hari, semuaRuang), [data, semester, hari, semuaRuang]);
  const luar = (t) => t < semester.mulai || t > semester.selesai;

  return (
    <>
      {ruang.length === 0 && <div className="hint" style={{ marginBottom: 8 }}>Tidak ada pemakaian ruang pada bulan ini.</div>}
      {ruang.length > 0 && (
        <div className="jr-scroll">
          <table className="jr-tbl jr-bulan" style={{ minWidth: 100 + hari.length * 28 }}>
            <thead>
              <tr>
                <th className="jr-jam" style={{ textAlign: 'left' }}>Ruang</th>
                {hari.map((t) => {
                  const h = hariDariTanggal(t);
                  return <th key={t} className={(h >= 5 ? 'jr-libur ' : '') + (luar(t) ? 'jr-luar' : '')} title={NAMA_HARI[h]}>{Number(t.slice(8))}<br /><span className="jr-waktu">{NAMA_HARI[h][0]}</span></th>;
                })}
              </tr>
            </thead>
            <tbody>
              {ruang.map((r) => (
                <tr key={r.id}>
                  <td className="jr-jam jr-ruang-nama">{r.nama}</td>
                  {hari.map((t) => {
                    const slots = (perTanggal[t] || []).filter((s) => s.ruangId === r.id);
                    const jenis = slots.some((s) => s.jenis === 'seminar') ? 'seminar' : 'kuliah';
                    const ringkas = slots.map((s) => `${s.mulai}–${s.selesai} ${s.label}`).join('\n');
                    return (
                      <td key={t} className={'jr-bln-sel jr-klik' + (hariDariTanggal(t) >= 5 ? ' jr-libur' : '') + (luar(t) ? ' jr-luar' : '') + (slots.length ? ' jr-pakai jr-' + jenis : '')} onClick={() => onBukaHari(t)} title={ringkas || 'Buka tampilan harian'}>
                        {slots.length > 1 ? slots.length : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {kosong.length > 0 && (
        <div className="jr-ringkas">
          <div>
            <strong>{semuaRuang ? 'Kosong sebulan' : `${kosong.length} ruang kosong sebulan`}:</strong> {kosong.map((r) => r.nama).join(', ')}{' '}
            <button type="button" className="btn btn-sm" onClick={() => setSemuaRuang((v) => !v)}>{semuaRuang ? 'Sembunyikan ruang kosong' : 'Tampilkan sebagai baris'}</button>
          </div>
        </div>
      )}
    </>
  );
}
