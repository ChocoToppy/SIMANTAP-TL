import React, { useState } from 'react';
import { Field, Empty } from '../../components/ui.jsx';

// ===================== SeksiAngkatan.jsx =====================
// Kelola daftar angkatan (tahun masuk) yang muncul sebagai pilihan di form
// pendaftaran mahasiswa. Sengaja diarsipkan (isActive: false), bukan dihapus,
// supaya data mahasiswa angkatan lama tetap konsisten — lihat firestore.rules
// (match /angkatan/{id}) dan App.jsx (tambahAngkatan).
export function SeksiAngkatan({ daftar = [], onTambah, onToggleAktif }) {
  const [nilai, setNilai] = useState('');
  const terurut = daftar.slice().sort((a, b) => (a.label < b.label ? 1 : -1));

  function tambah() {
    const v = nilai.trim();
    if (!v) return;
    onTambah(v);
    setNilai('');
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Angkatan yang aktif di sini muncul sebagai pilihan saat mahasiswa mendaftar. Nonaktifkan
        angkatan yang sudah tidak ada mahasiswa barunya — data mahasiswa angkatan itu tidak terpengaruh.
      </p>
      <div className="form-grid">
        <Field label="Tambah angkatan" full>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="mis. 2029"
              onKeyDown={(e) => { if (e.key === 'Enter') tambah(); }} />
            <button className="btn btn-primary" onClick={tambah}>Tambah</button>
          </div>
        </Field>
      </div>

      {terurut.length === 0 ? (
        <Empty>Belum ada angkatan.</Empty>
      ) : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="tbl">
            <thead><tr><th>Angkatan</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {terurut.map((a) => (
                <tr key={a.id}>
                  <td>{a.label}</td>
                  <td><span className={'chip ' + (a.isActive === false ? 'chip-off' : 'chip-on')}>{a.isActive === false ? 'Nonaktif' : 'Aktif'}</span></td>
                  <td className="cell-actions">
                    <button className="link-btn danger" onClick={() => onToggleAktif(a.id, a.isActive === false)}>
                      {a.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>
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
