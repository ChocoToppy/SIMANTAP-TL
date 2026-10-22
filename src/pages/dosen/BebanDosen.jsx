import React, { useState } from 'react';
import { PROGRAM_BEBAN } from '../../utils/helpers.js';
import { Empty } from '../../components/ui.jsx';

// ===================== dosen/BebanDosen.jsx =====================
// Beban dosen dipisah per peran: Pembimbing, Ketua Penguji (penguji1), dan
// Anggota Penguji (penguji2) — dua peran berbeda, tidak digabung. Capstone &
// Tesis S2 memakai field yang sama, jadi ikut dihitung di kedua peran penguji.
// Masing-masing dirinci per program
// (hitungBebanPeran di helpers.js). Dua tampilan:
//  - Grafik: batang bertumpuk mendatar per dosen (segmen = program), urut
//    beban terbanyak; arahkan/fokus baris untuk rincian angka.
//  - Tabel: angka per program + aksi Edit/Hapus dosen.
// Pilihan peran & tampilan diingat per perangkat (localStorage).

const PERAN = [
  { key: 'pembimbing', label: 'Pembimbing' },
  { key: 'penguji1', label: 'Ketua Penguji' },
  { key: 'penguji2', label: 'Anggota Penguji' },
];
const NAMA_PROGRAM = { TA: 'TA', CAP: 'Capstone', S2: 'Tesis S2', KP: 'KP', MG: 'Magang' };
const KUNCI_SIMPAN = 'simantap-beban-dosen';

function bacaPilihan() {
  try { return JSON.parse(localStorage.getItem(KUNCI_SIMPAN) || '{}') || {}; } catch { return {}; }
}
function simpanPilihan(v) {
  try { localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(v)); } catch { /* mode privat / diblokir */ }
}

export function BebanDosen({ rows, sortBy, onEdit, onHapus }) {
  const [pilihan, setPilihan] = useState(() => ({ peran: 'pembimbing', tampilan: 'grafik', ...bacaPilihan() }));
  const ubah = (k, v) => setPilihan((p) => { const n = { ...p, [k]: v }; simpanPilihan(n); return n; });
  const peran = PERAN.some((x) => x.key === pilihan.peran) ? pilihan.peran : 'pembimbing';
  const program = PROGRAM_BEBAN[peran];

  const urut = [...rows].sort((a, b) => (sortBy === 'nama'
    ? a.nama.localeCompare(b.nama)
    : (b.peran[peran].total - a.peran[peran].total || a.kode.localeCompare(b.kode))));

  return (
    <div className="card">
      <div className="beban-kontrol">
        <div className="seg-wrap seg-sm" role="group" aria-label="Peran">
          {PERAN.map((x) => (
            <button key={x.key} type="button" className={'seg-btn' + (peran === x.key ? ' active' : '')} aria-pressed={peran === x.key} onClick={() => ubah('peran', x.key)}>{x.label}</button>
          ))}
        </div>
        <div className="seg-wrap seg-sm" role="group" aria-label="Tampilan">
          {[['grafik', 'Grafik'], ['tabel', 'Tabel']].map(([k, l]) => (
            <button key={k} type="button" className={'seg-btn' + (pilihan.tampilan === k ? ' active' : '')} aria-pressed={pilihan.tampilan === k} onClick={() => ubah('tampilan', k)}>{l}</button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? <Empty>Belum ada dosen. Klik "+ Tambah dosen" untuk menambah.</Empty>
        : pilihan.tampilan === 'tabel'
          ? <TabelBeban rows={urut} peran={peran} program={program} onEdit={onEdit} onHapus={onHapus} />
          : <GrafikBeban rows={urut} peran={peran} program={program} />}
    </div>
  );
}

function GrafikBeban({ rows, peran, program }) {
  const [tip, setTip] = useState(null); // { kode, top }
  const ada = rows.filter((d) => d.peran[peran].total > 0);
  const kosong = rows.length - ada.length;
  const maks = ada.reduce((mx, d) => Math.max(mx, d.peran[peran].total), 0) || 1;
  const aktif = tip && ada.find((d) => d.kode === tip.kode);
  const tampilkan = (d) => (e) => setTip({ kode: d.kode, top: e.currentTarget.offsetTop + e.currentTarget.offsetHeight });

  if (ada.length === 0) return <Empty>Belum ada dosen dengan beban pada peran ini.</Empty>;
  return (
    <>
      <ul className="beban-legend" aria-label="Program">
        {program.map((p) => <li key={p}><span className="beban-sw" style={{ background: `var(--prog-${p})` }} />{NAMA_PROGRAM[p]}</li>)}
      </ul>
      <div className="beban-grafik" onMouseLeave={() => setTip(null)}>
        {ada.map((d) => {
          const b = d.peran[peran];
          const ringkas = program.filter((p) => b[p]).map((p) => `${NAMA_PROGRAM[p]} ${b[p]}`).join(', ');
          return (
            <div key={d.kode} className="beban-baris" tabIndex={0}
              aria-label={`${d.kode} ${d.nama}: ${b.total} (${ringkas})`}
              onMouseEnter={tampilkan(d)} onFocus={tampilkan(d)} onBlur={() => setTip(null)}>
              <span className="beban-nama" title={d.nama}><strong>{d.kode}</strong> {d.nama}</span>
              <span className="beban-batang">
                <span className="beban-stack" style={{ width: `${(b.total / maks) * 100}%` }}>
                  {program.filter((p) => b[p]).map((p) => (
                    <span key={p} className="beban-seg" style={{ flex: b[p], background: `var(--prog-${p})` }} />
                  ))}
                </span>
                <span className="beban-total">{b.total}</span>
              </span>
            </div>
          );
        })}
        {aktif && (
          <div className="beban-tip" style={{ top: tip.top, left: 0 }} role="presentation">
            <div className="beban-tip-judul">{aktif.kode} · {aktif.nama}</div>
            {program.filter((p) => aktif.peran[peran][p]).map((p) => (
              <div key={p} className="beban-tip-baris">
                <span className="beban-sw" style={{ background: `var(--prog-${p})` }} /><span>{NAMA_PROGRAM[p]}</span><span>{aktif.peran[peran][p]}</span>
              </div>
            ))}
            <div className="beban-tip-baris"><span /><strong>Total</strong><span>{aktif.peran[peran].total}</span></div>
          </div>
        )}
      </div>
      {kosong > 0 && <p className="hint" style={{ marginTop: 10 }}>{kosong} dosen tanpa beban pada peran ini tidak ditampilkan (lihat tampilan Tabel).</p>}
    </>
  );
}

function TabelBeban({ rows, peran, program, onEdit, onHapus }) {
  return (
    <div className="table-wrap">
      <table className="tbl tbl-wide">
        <thead>
          <tr>
            <th>Dosen</th>
            <th>Kompetensi</th>
            <th>Status</th>
            {program.map((p) => <th key={p} className="num">{NAMA_PROGRAM[p]}</th>)}
            <th className="num">Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.kode}>
              <td>
                <div className="cell-name">{d.kode}</div>
                <div className="cell-sub">{d.nama}</div>
              </td>
              <td className="cell-sub">{d.kompetensi || '—'}</td>
              <td>{d.status || '—'}</td>
              {program.map((p) => <td key={p} className="num">{d.peran[peran][p]}</td>)}
              <td className="num"><strong>{d.peran[peran].total}</strong></td>
              <td className="cell-actions">
                <button className="link-btn" onClick={() => onEdit(d)}>Edit</button>
                <button className="link-btn danger" onClick={() => onHapus(d)}>Hapus</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
