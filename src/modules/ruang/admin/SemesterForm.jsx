import React, { useState } from 'react';
import { Field } from '../host.js';

// Form buat/ubah semester jadwal ruang: label, rentang tanggal, dan rentang
// blackout (UTS/UAS/libur) — pada rentang ini kuliah mingguan tidak berlaku.
export function SemesterForm({ awal, onSimpan, onBatal }) {
  const [s, setS] = useState(() => awal || { label: '', mulai: '', selesai: '', blackout: [] });
  const [err, setErr] = useState('');
  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setB = (i, k, v) => setS((p) => ({ ...p, blackout: p.blackout.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }));

  function simpan() {
    if (!s.label.trim()) { setErr('Label semester wajib diisi.'); return; }
    if (!s.mulai || !s.selesai || s.selesai < s.mulai) { setErr('Tanggal mulai/selesai belum valid.'); return; }
    const blackout = (s.blackout || []).filter((b) => b.mulai && b.selesai);
    if (blackout.some((b) => b.selesai < b.mulai)) { setErr('Ada rentang blackout yang tanggal selesainya lebih awal dari mulainya.'); return; }
    setErr('');
    onSimpan({ ...s, label: s.label.trim(), blackout });
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div className="form-grid">
        <Field label="Label semester" full><input value={s.label} onChange={(e) => set('label', e.target.value)} placeholder="Gasal 2026/2027" /></Field>
        <Field label="Mulai"><input type="date" value={s.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
        <Field label="Selesai"><input type="date" value={s.selesai} onChange={(e) => set('selesai', e.target.value)} /></Field>
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>Blackout (UTS/UAS/libur)</strong>
        {(s.blackout || []).map((b, i) => (
          <div key={i} className="toolbar" style={{ marginTop: 8, marginBottom: 0 }}>
            <input type="date" value={b.mulai || ''} onChange={(e) => setB(i, 'mulai', e.target.value)} style={{ width: 'auto' }} />
            <span>–</span>
            <input type="date" value={b.selesai || ''} onChange={(e) => setB(i, 'selesai', e.target.value)} style={{ width: 'auto' }} />
            <input value={b.ket || ''} onChange={(e) => setB(i, 'ket', e.target.value)} placeholder="Keterangan (mis. UTS)" style={{ flex: 1, minWidth: 140 }} />
            <button type="button" className="btn btn-sm" onClick={() => setS((p) => ({ ...p, blackout: p.blackout.filter((_, j) => j !== i) }))}>Hapus</button>
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-sm" onClick={() => setS((p) => ({ ...p, blackout: [...(p.blackout || []), { mulai: '', selesai: '', ket: '' }] }))}>+ Tambah rentang</button>
        </div>
      </div>
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <button className="btn" onClick={onBatal}>Batal</button>
        <button className="btn btn-primary" onClick={simpan}>Simpan semester</button>
      </div>
    </div>
  );
}
