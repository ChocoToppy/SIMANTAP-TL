import React, { useState } from 'react';
import { Field, PasswordField } from '../../components/ui.jsx';
import { changePasswordSelf } from '../../utils/auth.js';

// Pesan error untuk aksi ganti password sendiri — beda konteks dari login
// (lihat pesanErrorAuth di Login.jsx), jadi mapping kecilnya di sini saja.
function pesanErrorGantiPassword(e) {
  const code = e && e.code;
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Password saat ini salah.';
  if (code === 'auth/weak-password') return 'Password baru terlalu pendek (minimal 6 karakter).';
  if (code === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.';
  if (code === 'auth/network-request-failed') return 'Tidak ada koneksi internet. Periksa jaringan Anda, lalu coba lagi.';
  return (e && e.message) || 'Gagal mengganti password. Coba lagi.';
}

// Isi tab "Akun" di Portal (bottom nav) — profil login mahasiswa sendiri
// (nama, NIM, email aktif). Email di sini HANYA kontak untuk admin mengirimkan
// password sementara secara manual saat mahasiswa lupa password (lihat
// SeksiAkun di Pengaturan.jsx) — tidak ada email verifikasi/reset otomatis.
// NIM boleh diubah (mis. salah ketik saat daftar), tapi itu memindahkan
// seluruh identitas login & data KP mahasiswa ini, jadi diproses lewat Cloud
// Function (studentUpdateProfile), bukan tulis langsung ke Firestore.
//
// Ganti password: TIDAK ADA cara menampilkan password yang sedang dipakai —
// Firebase hanya menyimpan hash, bukan teks asli, jadi itu mustahil secara
// teknis (lihat changePasswordSelf di utils/auth.js). Yang ditawarkan di sini
// adalah gantinya yang aman: mahasiswa membuktikan tahu password lama dulu
// (reauthenticate) sebelum boleh mengganti ke yang baru.
export function AkunForm({ nama, nim, email, onSimpan, onLogout }) {
  const [form, setForm] = useState({ nama: nama || '', nim: nim || '', email: email || '' });
  const [err, setErr] = useState('');
  const [sukses, setSukses] = useState('');
  const [busy, setBusy] = useState(false);

  const [pw, setPw] = useState({ lama: '', baru: '', konfirmasi: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwSukses, setPwSukses] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setPwField(k, v) { setPw((f) => ({ ...f, [k]: v })); }

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

  async function gantiPassword() {
    setPwErr(''); setPwSukses('');
    if (!pw.lama || !pw.baru) { setPwErr('Password saat ini dan password baru wajib diisi.'); return; }
    if (pw.baru.length < 6) { setPwErr('Password baru minimal 6 karakter.'); return; }
    if (pw.baru !== pw.konfirmasi) { setPwErr('Konfirmasi password baru tidak cocok.'); return; }
    setPwBusy(true);
    try {
      await changePasswordSelf(pw.lama, pw.baru);
      setPw({ lama: '', baru: '', konfirmasi: '' });
      setPwSukses('Password berhasil diganti.');
    } catch (e) {
      setPwErr(pesanErrorGantiPassword(e));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="portal">
      <div className="toolbar">
        <h2 className="page-title">Akun Saya</h2>
      </div>
      <div className="akun-cards-row">
        <div className="card">
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

        <div className="card">
          <h3 className="card-title">Ganti Password</h3>
          <div className="form-grid">
            <Field label="Password saat ini" full>
              <PasswordField value={pw.lama} onChange={(e) => setPwField('lama', e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="Password baru" full>
              <PasswordField value={pw.baru} onChange={(e) => setPwField('baru', e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Konfirmasi password baru" full>
              <PasswordField value={pw.konfirmasi} onChange={(e) => setPwField('konfirmasi', e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          {pwErr && <div className="login-err" style={{ marginTop: 8 }}>{pwErr}</div>}
          {pwSukses && <div className="hint" style={{ marginTop: 8 }}>{pwSukses}</div>}
          <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button className="btn btn-primary" onClick={gantiPassword} disabled={pwBusy}>{pwBusy ? 'Menyimpan…' : 'Ganti password'}</button>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '20px 0 16px', maxWidth: 980 }} />
      <button type="button" className="btn btn-logout" onClick={onLogout} style={{ maxWidth: 980, width: '100%' }}>Logout</button>
    </div>
  );
}
