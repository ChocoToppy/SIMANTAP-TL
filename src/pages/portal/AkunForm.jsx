import React, { useState } from 'react';
import { Field } from '../../components/ui.jsx';

// Isi tab "Akun" di Portal (bottom nav) — profil login mahasiswa sendiri
// (nama, NIM, email aktif). Email di sini HANYA kontak untuk admin mengirimkan
// password sementara secara manual saat mahasiswa lupa password (lihat
// SeksiAkun di Pengaturan.jsx) — tidak ada email verifikasi/reset otomatis.
// NIM boleh diubah (mis. salah ketik saat daftar), tapi itu memindahkan
// seluruh identitas login & data KP mahasiswa ini, jadi diproses lewat Cloud
// Function (studentUpdateProfile), bukan tulis langsung ke Firestore.
export function AkunForm({ nama, nim, email, onSimpan, onLogout }) {
  const [form, setForm] = useState({ nama: nama || '', nim: nim || '', email: email || '' });
  const [err, setErr] = useState('');
  const [sukses, setSukses] = useState('');
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function simpan() {
    setErr(''); setSukses('');
    if (!form.nama.trim() || !form.nim.trim() || !form.email.trim()) {
      setErr('Nama, NIM, dan email wajib diisi.'); return;
    }
    setBusy(true);
    try {
      await onSimpan({ nama: form.nama.trim(), nim: form.nim.trim(), email: form.email.trim() });
      setSukses('Profil tersimpan.');
    } catch (e) {
      setErr(e.message || 'Gagal menyimpan perubahan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal">
      <div className="toolbar">
        <h2 className="page-title">Akun Saya</h2>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="hint" style={{ marginTop: 0 }}>
          Email di sini dipakai admin untuk mengirimkan password sementara
          secara manual bila Anda lupa password — pastikan aktif dan bisa
          Anda akses. Bila Anda lupa password DAN tidak tahu email aktif
          yang tersimpan di sini, hubungi admin untuk direset dari sana.
        </p>
        <div className="form-grid">
          <Field label="Nama" full><input value={form.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
          <Field label="NIM" full><input value={form.nim} onChange={(e) => set('nim', e.target.value)} /></Field>
          <Field label="Email aktif" full><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        </div>
        {err && <div className="login-err" style={{ marginTop: 8 }}>{err}</div>}
        {sukses && <div className="hint" style={{ marginTop: 8 }}>{sukses}</div>}
        <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <button className="btn btn-primary" onClick={simpan} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border)', margin: '20px 0 16px', maxWidth: 480 }} />
      <button type="button" className="btn btn-logout" onClick={onLogout} style={{ maxWidth: 480, width: '100%' }}>Logout</button>
    </div>
  );
}
