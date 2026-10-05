import React, { useMemo, useState } from 'react';
import { Modal, Field, Badge } from '../host.js';
import { NAMA_HARI } from '../logic/jadwalRuang.js';
import { FLAG, tebakLabelSemester } from '../logic/jadwalKuliahRekap.js';
import { rancangImpor } from '../logic/ruangBooking.js';

const URUT_FLAG = ['bentrok', 'waktu-salah', 'ok', 'gabungan', 'tanpa-ruang', 'ruang-luar', 'belum'];

// Pop-up setelah memilih berkas rekap jadwal kuliah: tiap baris sudah diberi flag otomatis;
// admin cukup mengisi periode semester (mulai–selesai), lalu semester + jadwal mingguan dibuat
// sebagai draft. Kuliah mingguan otomatis berlaku sepanjang rentang itu.
export function ImporRekapModal({ hasil, ruang, semesterAda, sibuk, galat, onImpor, onBatal }) {
  const bisaTambah = !!semesterAda && semesterAda.status !== 'terbit';
  const [mode, setMode] = useState(bisaTambah ? 'ada' : 'baru');
  const [f, setF] = useState(() => ({ label: tebakLabelSemester(hasil.sumber), mulai: '', selesai: '' }));
  const [err, setErr] = useState('');
  const [semua, setSemua] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const hitung = useMemo(() => hasil.rows.reduce((a, r) => ({ ...a, [r.flag]: (a[r.flag] || 0) + 1 }), {}), [hasil]);
  const periode = mode === 'ada' ? semesterAda : f;
  const ruangBaru = useMemo(() => rancangImpor(hasil, ruang, { id: '_', mulai: periode.mulai || '2000-01-01', selesai: periode.selesai || '2000-01-01' }).ruangBaru, [hasil, ruang, periode.mulai, periode.selesai]);
  const baris = useMemo(() => {
    const urut = hasil.rows.slice().sort((a, b) => URUT_FLAG.indexOf(a.flag) - URUT_FLAG.indexOf(b.flag));
    return semua ? urut : urut.filter((r) => r.flag !== 'ok');
  }, [hasil, semua]);

  function lanjut() {
    if (mode === 'baru') {
      if (!f.label.trim()) { setErr('Label semester wajib diisi.'); return; }
      if (!f.mulai || !f.selesai || f.selesai < f.mulai) { setErr('Tanggal mulai dan selesai perkuliahan belum valid.'); return; }
    }
    setErr('');
    onImpor(mode === 'baru' ? { baru: { label: f.label.trim(), mulai: f.mulai, selesai: f.selesai } } : { baru: null });
  }

  const jumlahMasuk = (hitung.ok || 0) + (hitung.bentrok || 0);
  const footer = (
    <>
      <button className="btn" onClick={onBatal} disabled={sibuk}>Batal</button>
      <button className="btn btn-primary" onClick={lanjut} disabled={sibuk || !jumlahMasuk}>{sibuk ? 'Mengimpor…' : mode === 'baru' ? 'Buat semester & impor ke draft' : 'Impor ke draft'}</button>
    </>
  );

  return (
    <Modal title="Impor jadwal kuliah" onClose={sibuk ? undefined : onBatal} footer={footer} wide>
      <p style={{ marginTop: 0 }}><strong>{hasil.sumber}</strong>: {hasil.rows.length} baris terbaca, <strong>{jumlahMasuk}</strong> akan diimpor ke {hasil.ruang.length} ruang.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {URUT_FLAG.filter((k) => hitung[k]).map((k) => <Badge key={k} tone={FLAG[k].tone}>{FLAG[k].teks}: {hitung[k]}</Badge>)}
      </div>

      <div className="callout" style={{ marginBottom: 12 }}>
        <strong>Periode perkuliahan</strong> — kuliah mingguan otomatis berlaku tiap pekan dari tanggal mulai sampai selesai.
        {bisaTambah && (
          <div style={{ display: 'flex', gap: 16, margin: '8px 0', flexWrap: 'wrap' }}>
            <label className="check"><input type="radio" checked={mode === 'baru'} onChange={() => setMode('baru')} /><span>Semester baru</span></label>
            <label className="check"><input type="radio" checked={mode === 'ada'} onChange={() => setMode('ada')} /><span>Ganti hasil impor di {semesterAda.label}</span></label>
          </div>
        )}
        {mode === 'baru' ? (
          <div className="form-grid" style={{ marginTop: 8 }}>
            <Field label="Label semester" full><input value={f.label} onChange={(e) => set('label', e.target.value)} placeholder="Gasal 2026/2027" /></Field>
            <Field label="Perkuliahan mulai"><input type="date" value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
            <Field label="Perkuliahan selesai"><input type="date" value={f.selesai} onChange={(e) => set('selesai', e.target.value)} /></Field>
          </div>
        ) : (
          <div style={{ marginTop: 6 }}>Periode mengikuti semester terpilih: {semesterAda.mulai} – {semesterAda.selesai}. Booking manual tidak tersentuh.</div>
        )}
        <div className="hint" style={{ marginBottom: 0 }}>Libur, UTS, dan UAS bisa ditambahkan sesudahnya lewat “Ubah semester” (blackout).</div>
      </div>

      {ruangBaru.length > 0 && <div className="hint">Ruang baru yang akan dibuat: {ruangBaru.map((r) => r.nama).join(', ')}.</div>}
      {hitung.bentrok > 0 && <div className="callout callout-amber" style={{ marginBottom: 8 }}>⚠ {hitung.bentrok} baris bentrok (ruang & jam beririsan dengan kelas lain di berkas). Tetap diimpor — periksa dengan pemberi jadwal.</div>}

      <label className="check" style={{ marginBottom: 6 }}><input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} /><span>Tampilkan juga baris yang berstatus “Masuk” ({hitung.ok || 0})</span></label>
      <div className="jr-scroll" style={{ maxHeight: 260 }}>
        <table className="tbl">
          <thead><tr><th>Status</th><th>Hari / jam</th><th>Mata kuliah</th><th>Ruang</th></tr></thead>
          <tbody>
            {baris.length === 0 && <tr><td colSpan={4} className="cell-sub">Semua baris berstatus “Masuk”.</td></tr>}
            {baris.map((r, i) => (
              <tr key={i}>
                <td><Badge tone={FLAG[r.flag].tone}>{FLAG[r.flag].teks}</Badge></td>
                <td className="cell-sub">{r.hari !== undefined && r.hari >= 0 ? `${NAMA_HARI[r.hari]} ${r.mulai}–${r.selesai}` : r.waktuTeks || '—'}</td>
                <td>{r.label}</td>
                <td className="cell-sub">{r.ruangMentah || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(err || galat) && <div className="login-err" style={{ marginTop: 12 }}>{err || galat}</div>}
    </Modal>
  );
}
