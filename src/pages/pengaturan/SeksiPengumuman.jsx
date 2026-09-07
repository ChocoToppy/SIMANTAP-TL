import React, { useState } from 'react';
import { Field, Empty, Modal } from '../../components/ui.jsx';
import { buatId } from '../../utils/helpers.js';

export function SeksiPengumuman({ daftar, onSimpan }) {
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [editId, setEditId] = useState(null);

  function kosongkan() { setTanggal(''); setJudul(''); setIsi(''); setEditId(null); }

  function mulaiTambah() { kosongkan(); setOpen(true); }
  function mulaiEdit(p) { setEditId(p.id); setTanggal(p.tanggal); setJudul(p.judul); setIsi(p.isi); setOpen(true); }
  function tutup() { setOpen(false); kosongkan(); }

  function simpan() {
    if (!tanggal.trim() || !judul.trim()) return;
    if (editId) {
      onSimpan(daftar.map((p) => (p.id === editId ? { ...p, tanggal: tanggal.trim(), judul: judul.trim(), isi: isi.trim() } : p)));
    } else {
      onSimpan([{ id: buatId(), tanggal: tanggal.trim(), judul: judul.trim(), isi: isi.trim() }, ...daftar]);
    }
    tutup();
  }

  function hapus(id) { if (window.confirm('Hapus pengumuman ini?')) onSimpan(daftar.filter((p) => p.id !== id)); }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Pengumuman ini tampil di halaman login, terbaru di atas.
      </p>
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0, justifyContent: 'flex-start' }}>
        <button className="btn btn-primary" onClick={mulaiTambah}>+ Tambah pengumuman</button>
      </div>

      {open && (
        <Modal
          title={editId ? 'Edit pengumuman' : 'Tambah pengumuman'}
          onClose={tutup}
          footer={
            <>
              <button className="btn" onClick={tutup}>Batal</button>
              <button className="btn btn-primary" onClick={simpan}>{editId ? 'Simpan perubahan' : 'Tambah pengumuman'}</button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Tanggal" full><input value={tanggal} onChange={(e) => setTanggal(e.target.value)} placeholder="mis. 17 Juli 2026" /></Field>
            <Field label="Judul" full><input value={judul} onChange={(e) => setJudul(e.target.value)} /></Field>
            <Field label="Isi" full><textarea rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} /></Field>
          </div>
        </Modal>
      )}

      <div className="sched" style={{ marginTop: 12 }}>
        <div className="sched-title">Pengumuman saat ini</div>
        {daftar.length === 0 ? (
          <Empty>Belum ada pengumuman.</Empty>
        ) : (
          <ul className="periode-list riwayat-list">
            {daftar.map((p) => (
              <li key={p.id} className="periode-item">
                <span>{p.tanggal} — {p.judul}</span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button className="link-btn" onClick={() => mulaiEdit(p)}>Edit</button>
                  <button className="link-btn danger" onClick={() => hapus(p.id)}>Hapus</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
