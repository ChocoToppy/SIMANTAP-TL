import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase.js';
import { Empty } from '../../components/ui.jsx';
import { PROGRAM_KEYS, programLabel, formatWaktu } from '../../utils/helpers.js';

// ----- Registri nomor surat -----
// Catatan SEMUA nomor yang pernah diterbitkan sistem (koleksi nomorSurat/), baru →
// lama. Hanya dibaca di sini: penerbitan dan pengakhiran dilakukan dari form edit
// mahasiswa (NomorSuratPanel), supaya nomor selalu terikat ke mahasiswa & program.
export function SeksiNomorSurat() {
  const [daftar, setDaftar] = useState(null);
  const [q, setQ] = useState('');
  const [fTahun, setFTahun] = useState('');
  const [fProgram, setFProgram] = useState('');
  const [fStatus, setFStatus] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'nomorSurat'), (snap) => {
      setDaftar(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    }, () => setDaftar([]));
    return () => unsub();
  }, []);

  const tahunList = useMemo(() => Array.from(new Set((daftar || []).map((r) => r.tahun))).sort((a, b) => b - a), [daftar]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (daftar || [])
      .filter((r) => (!fTahun || String(r.tahun) === fTahun)
        && (!fProgram || r.program === fProgram)
        && (!fStatus || r.status === fStatus)
        && (!term || `${r.nomor} ${r.nama} ${r.nim}`.toLowerCase().includes(term)))
      .sort((a, b) => (b.tahun - a.tahun) || (b.urut - a.urut));
  }, [daftar, q, fTahun, fProgram, fStatus]);

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Semua nomor surat yang pernah diterbitkan sistem. Nomor diambil dari form edit mahasiswa
        (tombol "Ambil nomor"), urut per tahun untuk semua program. Nomor yang sudah kedaluwarsa
        tetap tercatat di sini dan tidak akan dipakai lagi.
      </p>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor, nama, atau NIM…" style={{ maxWidth: 280 }} />
        <select value={fTahun} onChange={(e) => setFTahun(e.target.value)} title="Tahun">
          <option value="">Semua tahun</option>
          {tahunList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fProgram} onChange={(e) => setFProgram(e.target.value)} title="Program">
          <option value="">Semua program</option>
          {PROGRAM_KEYS.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} title="Status">
          <option value="">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="kedaluwarsa">Kedaluwarsa</option>
        </select>
      </div>
      {daftar === null ? (
        <Empty>Memuat…</Empty>
      ) : rows.length === 0 ? (
        <Empty>{daftar.length === 0 ? 'Belum ada nomor yang diterbitkan.' : 'Tidak ada nomor yang cocok.'}</Empty>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Mahasiswa</th>
                <th>Program</th>
                <th>Status</th>
                <th>Diterbitkan</th>
                <th>Diakhiri</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.nomor}</strong></td>
                  <td>{r.nama}<div className="cell-sub">{r.nim}</div></td>
                  <td>{programLabel(r.program)}</td>
                  <td>
                    <span className={'chip ' + (r.status === 'aktif' ? 'chip-on' : 'chip-off')}>
                      {r.status === 'aktif' ? 'Aktif' : 'Kedaluwarsa'}
                    </span>
                  </td>
                  <td className="cell-sub">{formatWaktu(r.diterbitkan)}<div>{r.diterbitkanOleh}</div></td>
                  <td className="cell-sub">
                    {r.diakhiri ? <>{formatWaktu(r.diakhiri)}<div>{r.alasanAkhir}</div></> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
