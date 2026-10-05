import React, { useMemo, useState } from 'react';
import { NAMA_HARI } from '../logic/jadwalRuang.js';
import { susunRuang, pekanDari } from '../logic/jadwalRuangView.js';
import { formatTanggal } from '../host.js';
import { teksSlot } from '../logic/ruangBooking.js';

const tglPendek = (iso) => formatTanggal(iso).split(' ').slice(0, 2).join(' ');

// Tampilan mingguan: baris = ruang, kolom = Senin–Minggu. Tiap sel memuat daftar booking
// hari itu. Klik sel kosong menambah, klik item mengubah, klik judul hari membuka harian.
export function JadwalRuangPekan({ data, semester, tanggal, onKosong, onBlok, onBukaHari }) {
  const [semuaRuang, setSemuaRuang] = useState(false);
  const hari = useMemo(() => pekanDari(tanggal), [tanggal]);
  const { perTanggal, ruang, kosong } = useMemo(() => susunRuang(data, semester, hari, semuaRuang), [data, semester, hari, semuaRuang]);
  const luar = (t) => t < semester.mulai || t > semester.selesai;

  return (
    <>
      {ruang.length === 0 && <div className="hint" style={{ marginBottom: 8 }}>Tidak ada pemakaian ruang pada pekan ini.</div>}
      {ruang.length > 0 && (
        <div className="jr-scroll">
          <table className="jr-tbl jr-pekan" style={{ minWidth: 90 + 7 * 110 }}>
            <thead>
              <tr>
                <th className="jr-jam" style={{ textAlign: 'left' }}>Ruang</th>
                {hari.map((t, i) => (
                  <th key={t} className={luar(t) ? 'jr-luar' : ''}>
                    <button type="button" className="jr-hdr-btn" onClick={() => onBukaHari(t)} title="Buka tampilan harian">{NAMA_HARI[i]}<br />{tglPendek(t)}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ruang.map((r) => (
                <tr key={r.id}>
                  <td className="jr-jam jr-ruang-nama">{r.nama}</td>
                  {hari.map((t) => {
                    const slots = (perTanggal[t] || []).filter((s) => s.ruangId === r.id);
                    const bisaTambah = onKosong && !luar(t);
                    return (
                      <td key={t} className={'jr-sel' + (luar(t) ? ' jr-luar' : '') + (!slots.length && bisaTambah ? ' jr-klik' : '')} onClick={!slots.length && bisaTambah ? () => onKosong({ ruangId: r.id, tanggal: t }) : undefined} title={!slots.length && bisaTambah ? 'Tambah booking' : undefined}>
                        {slots.map((s) => (
                          <div key={s.id} className={'jr-item jr-pakai jr-' + s.jenis + (onBlok ? ' jr-klik' : '')} onClick={onBlok ? () => onBlok(s, t) : undefined} title={teksSlot(s)}>
                            <span className="jr-waktu">{s.mulai}–{s.selesai}</span>
                            <span className="jr-label jr-label-1">{s.label}</span>
                          </div>
                        ))}
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
            <strong>{semuaRuang ? 'Kosong sepekan' : `${kosong.length} ruang kosong sepekan`}:</strong> {kosong.map((r) => r.nama).join(', ')}{' '}
            <button type="button" className="btn btn-sm" onClick={() => setSemuaRuang((v) => !v)}>{semuaRuang ? 'Sembunyikan ruang kosong' : 'Tampilkan sebagai baris'}</button>
          </div>
        </div>
      )}
    </>
  );
}
