import React, { useState } from 'react';
import { JENIS_RUANG, slugRuang } from '../logic/ruangBooking.js';

const KOSONG = { nama: '', gedung: '', kapasitas: '', jenis: 'kuliah' };

// Daftar ruang master: satu-satunya sumber nama ruang (dropdown jadwal, grid, impor).
// Ruang yang sudah dipakai booking tidak dihapus, cukup dinonaktifkan.
export function RuangDaftar({ data, aksi, onGalat }) {
  const [draft, setDraft] = useState({}); // id -> perubahan belum disimpan
  const [baru, setBaru] = useState(KOSONG);
  const daftar = (data.ruang || []).slice().sort((a, b) => (a.urut || 0) - (b.urut || 0));
  const dipakai = new Set((data.bookings || []).map((b) => b.ruangId));
  const nilai = (r, k) => (draft[r.id] && draft[r.id][k] !== undefined ? draft[r.id][k] : r[k]);
  const ubah = (r, k, v) => setDraft((d) => ({ ...d, [r.id]: { ...(d[r.id] || {}), [k]: v } }));

  async function simpan(r) {
    try {
      const gabung = { ...r, ...draft[r.id] };
      if (typeof gabung.alias === 'string') gabung.alias = gabung.alias.split(',').map((x) => x.trim()).filter(Boolean);
      await aksi.simpanRuang(gabung);
      setDraft((d) => { const sisa = { ...d }; delete sisa[r.id]; return sisa; });
    } catch (e) { onGalat(e); }
  }
  async function hapus(r) {
    if (!window.confirm(`Hapus ruang ${r.nama}?`)) return;
    try { await aksi.hapusRuang(r.id); } catch (e) { onGalat(e); }
  }
  const kosong = daftar.filter((r) => !dipakai.has(r.id));
  async function hapusKosong() {
    if (!window.confirm(`Hapus ${kosong.length} ruang yang tidak punya booking?

${kosong.map((r) => r.nama).join(', ')}`)) return;
    try { await aksi.hapusBanyakRuang(kosong.map((r) => r.id)); } catch (e) { onGalat(e); }
  }
  async function tambah() {
    const nama = baru.nama.trim();
    if (!nama) return;
    let id = slugRuang(nama);
    while (daftar.some((r) => r.id === id)) id += '-2';
    try {
      await aksi.simpanRuang({ id, nama, gedung: baru.gedung.trim(), kapasitas: baru.kapasitas, jenis: baru.jenis, aktif: true, urut: Math.max(0, ...daftar.map((r) => r.urut || 0)) + 1 });
      setBaru(KOSONG);
    } catch (e) { onGalat(e); }
  }

  return (
    <div>
      {kosong.length > 0 && <div className="toolbar"><button className="btn btn-sm" onClick={hapusKosong}>Hapus {kosong.length} ruang tanpa booking</button><span className="hint" style={{ margin: 0 }}>Ruang yang sudah punya booking tidak ikut terhapus.</span></div>}
      <p className="hint">Daftar ruang ini dipakai di seluruh aplikasi. Impor Excel mencocokkan ruang berdasarkan nama persis, dan menambah ruang baru bila belum ada.</p>
      <div className="table-wrap card">
        <table className="tbl">
          <thead><tr><th>Nama ruang</th><th>Nama lain</th><th>Gedung</th><th>Kapasitas</th><th>Jenis</th><th>Aktif</th><th /></tr></thead>
          <tbody>
            {daftar.map((r) => (
              <tr key={r.id}>
                <td><input value={nilai(r, 'nama')} onChange={(e) => ubah(r, 'nama', e.target.value)} /></td>
                <td><input value={typeof nilai(r, 'alias') === 'string' ? nilai(r, 'alias') : (r.alias || []).join(', ')} onChange={(e) => ubah(r, 'alias', e.target.value)} placeholder="mis. Ruang Seminar KP" title="Nama lain untuk ruang ini, pisahkan dengan koma. Dipakai mencocokkan jadwal lama." /></td>
                <td><input value={nilai(r, 'gedung') || ''} onChange={(e) => ubah(r, 'gedung', e.target.value)} style={{ width: 70 }} /></td>
                <td><input type="number" min="0" value={nilai(r, 'kapasitas') || ''} onChange={(e) => ubah(r, 'kapasitas', e.target.value)} style={{ width: 90 }} /></td>
                <td>
                  <select value={nilai(r, 'jenis') || 'kuliah'} onChange={(e) => ubah(r, 'jenis', e.target.value)}>
                    {JENIS_RUANG.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                </td>
                <td><input type="checkbox" checked={nilai(r, 'aktif') !== false} onChange={(e) => ubah(r, 'aktif', e.target.checked)} /></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {draft[r.id] && <button className="btn btn-sm btn-primary" onClick={() => simpan(r)}>Simpan</button>}{' '}
                  {!dipakai.has(r.id) && <button className="btn btn-sm" onClick={() => hapus(r)}>Hapus</button>}
                </td>
              </tr>
            ))}
            {daftar.length === 0 && <tr><td colSpan={7} className="muted">Belum ada ruang. Impor Excel akan membuatnya otomatis, atau tambah manual di bawah.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="toolbar" style={{ marginTop: 12 }}>
        <input placeholder="Nama ruang baru" value={baru.nama} onChange={(e) => setBaru({ ...baru, nama: e.target.value })} style={{ flex: 1, minWidth: 160 }} />
        <input placeholder="Gedung" value={baru.gedung} onChange={(e) => setBaru({ ...baru, gedung: e.target.value })} style={{ width: 80 }} />
        <button className="btn btn-primary" onClick={tambah}>+ Tambah ruang</button>
      </div>
    </div>
  );
}
