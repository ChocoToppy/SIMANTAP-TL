import React, { useState } from 'react';
import { Field, Empty, Modal } from '../../components/ui.jsx';
import { buatId, PROGRAM_KEYS, programLabel } from '../../utils/helpers.js';

export function SeksiPanduan({ daftar, onSimpan }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [program, setProgram] = useState('');
  const [editId, setEditId] = useState(null);

  function kosongkan() { setLabel(''); setUrl(''); setProgram(''); setEditId(null); }

  function mulaiTambah() { kosongkan(); setOpen(true); }
  function mulaiEdit(p) { setEditId(p.id); setLabel(p.label); setUrl(p.url); setProgram(p.program || ''); setOpen(true); }
  function tutup() { setOpen(false); kosongkan(); }

  function simpan() {
    if (!label.trim() || !url.trim()) return;
    if (editId) {
      onSimpan(daftar.map((p) => (p.id === editId ? { ...p, label: label.trim(), url: url.trim(), program } : p)));
    } else {
      onSimpan([...daftar, { id: buatId(), label: label.trim(), url: url.trim(), program }]);
    }
    tutup();
  }

  function hapus(id) { if (window.confirm('Hapus tautan panduan ini?')) onSimpan(daftar.filter((p) => p.id !== id)); }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Daftar unduhan (Panduan KP, Panduan TA, dst.) yang tampil di halaman Panduan Portal mahasiswa, dikelompokkan per program. Tautkan ke Google Drive atau sumber lain.
      </p>
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0, justifyContent: 'flex-start' }}>
        <button className="btn btn-primary" onClick={mulaiTambah}>+ Tambah panduan</button>
      </div>

      {open && (
        <Modal
          title={editId ? 'Edit panduan' : 'Tambah panduan'}
          onClose={tutup}
          footer={
            <>
              <button className="btn" onClick={tutup}>Batal</button>
              <button className="btn btn-primary" onClick={simpan}>{editId ? 'Simpan perubahan' : 'Tambah panduan'}</button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Label" full><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Panduan KP" /></Field>
            <Field label="Program">
              <select value={program} onChange={(e) => setProgram(e.target.value)}>
                <option value="">Umum (semua program)</option>
                {PROGRAM_KEYS.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
              </select>
            </Field>
            <Field label="Tautan" full><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." /></Field>
          </div>
        </Modal>
      )}

      <div className="sched" style={{ marginTop: 12 }}>
        <div className="sched-title">Panduan saat ini</div>
        {daftar.length === 0 ? (
          <Empty>Belum ada panduan.</Empty>
        ) : (
          <ul className="periode-list">
            {daftar.map((p) => (
              <li key={p.id} className="periode-item">
                <span>{p.label} <span className="muted">— {p.program ? programLabel(p.program) : 'Umum'}</span></span>
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
