import React, { useState } from 'react';
import { Empty } from '../../components/ui.jsx';

// ----- Daftar akun mahasiswa + reset password -----
// Password disimpan & diverifikasi oleh Firebase Authentication — TIDAK
// PERNAH bisa dilihat siapa pun, termasuk admin (lihat functions/index.js:
// adminResetPassword). Satu-satunya aksi yang tersedia di sini adalah reset
// ke password sementara baru; mahasiswa wajib menggantinya saat login
// berikutnya (mustChangePassword).
export function SeksiAkun({ daftar, onReset, onToggleAktif, onDelete }) {
  const [q, setQ] = useState('');
  const [pesan, setPesan] = useState(null); // { nim, teks }
  const [busy, setBusy] = useState(null);

  const rows = daftar.filter((a) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return `${a.nama} ${a.nim}`.toLowerCase().includes(term);
  });

  function salin(nim, teks) {
    navigator.clipboard.writeText(teks).catch(() => {});
    setPesan({ nim, teks: 'Tersalin!' });
    setTimeout(() => setPesan(null), 1500);
  }

  async function reset(a) {
    if (!a.uid) { setPesan({ nim: a.nim, teks: 'Akun ini belum bermigrasi ke Firebase Auth.' }); return; }
    if (!window.confirm(`Reset password ${a.nama} (${a.nim})? Password lama tidak akan berlaku lagi.`)) return;
    setBusy(a.nim);
    try {
      const { tempPassword } = await onReset(a.uid);
      setPesan({ nim: a.nim, teks: `Password sementara: ${tempPassword}` });
    } catch (e) {
      setPesan({ nim: a.nim, teks: 'Gagal reset: ' + (e.message || e) });
    } finally {
      setBusy(null);
    }
  }

  async function hapus(a) {
    if (!onDelete) return;
    if (!window.confirm(`Hapus akun ${a.nama} (${a.nim}) secara permanen? Akun login dan seluruh data KP terkait akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(a.nim);
    setPesan({ nim: a.nim, teks: 'Menghapus…' });
    try {
      await onDelete(a.nim);
      setPesan(null);
    } catch (e) {
      setPesan({ nim: a.nim, teks: 'Gagal hapus: ' + (e.message || e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Untuk troubleshooting saat mahasiswa lupa password — reset ke password sementara
        baru, lalu kabarkan sendiri ke mahasiswa (telepon/WA); mereka wajib menggantinya
        saat login berikutnya. Password tidak pernah bisa dilihat di sini — hanya "Reset".
        "Hapus" menghapus akun secara permanen (login + data KP terkait) — gunakan untuk
        membersihkan akun dummy/uji coba, bukan untuk akun mahasiswa aktif.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari nama atau NIM…"
        style={{ marginBottom: 12, maxWidth: 320 }}
      />
      {rows.length === 0 ? (
        <Empty>Tidak ada akun yang cocok.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NIM</th>
                <th>Email</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.nim}>
                  <td>{a.nama}</td>
                  <td className="cell-sub">{a.nim}</td>
                  <td className="cell-sub">{a.email || '-'}</td>
                  <td>
                    <span className={'chip ' + (a.isActive === false ? 'chip-off' : 'chip-on')}>
                      {a.isActive === false ? 'Nonaktif' : 'Aktif'}
                    </span>
                  </td>
                  <td className="cell-actions">
                    {pesan && pesan.nim === a.nim ? (
                      <span className="hint">
                        {pesan.teks} {pesan.teks.startsWith('Password') && (
                          <button className="link-btn" onClick={() => salin(a.nim, pesan.teks.split(': ')[1])}>Salin</button>
                        )}
                      </span>
                    ) : (
                      <>
                        <button className="link-btn" disabled={busy === a.nim} onClick={() => reset(a)}>Reset Password</button>
                        <button className="link-btn danger" disabled={busy === a.nim} onClick={() => onToggleAktif(a.nim, a.isActive === false)}>
                          {a.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                        </button>
                        {onDelete && (
                          <button className="link-btn danger" disabled={busy === a.nim} onClick={() => hapus(a)}>Hapus</button>
                        )}
                      </>
                    )}
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
