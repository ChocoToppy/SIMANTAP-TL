import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebase.js';
import { Empty, KotakCari } from '../../components/ui.jsx';
import { PROGRAM_KEYS, programLabel, formatWaktu } from '../../utils/helpers.js';

// ----- Registri nomor surat -----
// Catatan nomor yang pernah dipakai (koleksi nomorSurat/), baru → lama. Hanya
// dibaca di sini: pencatatan dan pengakhiran dilakukan dari form edit mahasiswa
// (NomorSuratPanel + submit FormMahasiswa), supaya nomor selalu terikat ke mahasiswa.
// Yang dimuat hanya tahun yang dipilih (bawaan: tahun ini); "Semua tahun" memuat semuanya.
export function SeksiNomorSurat() {
  const tahunIni = new Date().getFullYear();
  const [daftar, setDaftar] = useState(null);
  const [gagal, setGagal] = useState(false);
  const [q, setQ] = useState('');
  const [fTahun, setFTahun] = useState(String(tahunIni));
  const [fProgram, setFProgram] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [tahunPertama, setTahunPertama] = useState(tahunIni);

  useEffect(() => {
    setDaftar(null);
    setGagal(false);
    const kol = collection(db, 'nomorSurat');
    const unsub = onSnapshot(fTahun ? query(kol, where('tahun', '==', Number(fTahun))) : kol, (snap) => {
      setDaftar(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    }, (e) => { console.error('Gagal memuat registri nomor surat:', e); setGagal(true); setDaftar([]); });
    return () => unsub();
  }, [fTahun]);

  // Pilihan tahun: dari nomor tertua di registri sampai tahun ini (satu dokumen dibaca).
  useEffect(() => {
    getDocs(query(collection(db, 'nomorSurat'), orderBy('tahun'), limit(1)))
      .then((snap) => { const t = snap.empty ? null : Number(snap.docs[0].data().tahun); if (t) setTahunPertama(t); })
      .catch((e) => console.error('Gagal membaca tahun registri nomor surat:', e));
  }, []);

  const tahunList = useMemo(() => {
    const set = new Set((daftar || []).map((r) => r.tahun));
    for (let t = Math.min(tahunPertama, tahunIni); t <= tahunIni; t += 1) set.add(t);
    return Array.from(set).sort((a, b) => b - a);
  }, [daftar, tahunPertama, tahunIni]);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (daftar || [])
      .filter((r) => (!fProgram || r.program === fProgram)
        && (!fStatus || r.status === fStatus)
        && (!term || `${r.nomor} ${r.nama} ${r.nim}`.toLowerCase().includes(term)))
      .sort((a, b) => (b.tahun - a.tahun) || ((b.bulan || 0) - (a.bulan || 0)) || (b.urut - a.urut));
  }, [daftar, q, fProgram, fStatus]);

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Nomor surat yang pernah dipakai. Nomor urut mulai lagi dari 001 tiap bulan, satu urutan untuk semua program. Nomor di form
        edit mahasiswa, diketik sendiri atau diisi lewat "Ambil nomor", tercatat di sini saat
        data disimpan. Nomor yang sudah kedaluwarsa tetap tercatat dan tidak bisa dipakai lagi.
        Yang tampil hanya tahun yang dipilih; pilih tahun lain untuk melihat nomor tahun itu.
      </p>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <KotakCari q={q} setQ={setQ} placeholder="Cari nomor, nama, atau NIM…" style={{ maxWidth: 280 }} />
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
        <Empty>{gagal ? 'Registri nomor surat gagal dimuat. Muat ulang halaman untuk mencoba lagi.'
          : daftar.length > 0 ? 'Tidak ada nomor yang cocok.'
          : fTahun ? `Belum ada nomor yang diterbitkan pada tahun ${fTahun}.` : 'Belum ada nomor yang diterbitkan.'}</Empty>
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
                  <td><strong>{r.nomor}</strong>{r.sumber === 'manual' && <div className="cell-sub">Diketik manual</div>}</td>
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
