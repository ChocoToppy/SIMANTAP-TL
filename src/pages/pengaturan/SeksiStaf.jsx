import React, { useState } from 'react';
import { Field, Modal } from '../../components/ui.jsx';

// ----- Kelola akun dosen & admin (roster kecil, dibuat manual oleh admin) -----
export function SeksiStaf({ dosen, admin, onReset, onCreate, onToggleDosenAktif, onEditDosen, isSuperAdmin = false, currentAdminUid, onDeleteAdmin, onClaimSuperAdmin, onUpdateSelfAdmin }) {
  const [open, setOpen] = useState(false); // form hanya tampil (sbg modal) saat true
  const [tipe, setTipe] = useState('lecturer'); // 'lecturer' | 'admin'
  const [editKode, setEditKode] = useState(null); // null = mode "buat baru"; else kode dosen yang diedit
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [nip, setNip] = useState('');
  const [kompetensi, setKompetensi] = useState('');
  const [err, setErr] = useState('');
  const [hasil, setHasil] = useState(null); // { loginId, tempPassword } — tetap tampil setelah modal ditutup
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState(null); // { key, teks }

  function kosongkan() { setNama(''); setEmail(''); setKode(''); setNip(''); setKompetensi(''); setErr(''); setEditKode(null); setTipe('lecturer'); }

  function mulaiTambah(tipeBaru) {
    kosongkan();
    setHasil(null);
    setTipe(tipeBaru);
    setOpen(true);
  }

  function mulaiEdit(d) {
    setTipe('lecturer');
    setEditKode(d.kode);
    setNama(d.nama || ''); setEmail(d.email || ''); setKode(d.kode); setNip(d.nip || ''); setKompetensi(d.kompetensi || '');
    setErr(''); setHasil(null);
    setOpen(true);
  }

  function tutup() { setOpen(false); kosongkan(); }

  async function buat() {
    setErr('');
    if (!nama.trim() || !email.trim()) { setErr('Nama dan email wajib diisi.'); return; }
    if (tipe === 'lecturer' && !kode.trim()) { setErr('Kode dosen wajib diisi.'); return; }
    setBusy(true);
    try {
      if (editKode) {
        // Edit profil dosen yang sudah ada — tulis langsung ke Firestore
        // (bukan lewat Cloud Function, karena tidak ada akun Auth baru yang
        // dibuat). Field login (uid/isActive/mustChangePassword) tetap
        // dipertahankan oleh onEditDosen, hanya profil yang diperbarui di sini.
        const existing = dosen.find((d) => d.kode === editKode) || {};
        await onEditDosen({ ...existing, kode: editKode, nama: nama.trim(), email: email.trim(), nip: nip.trim(), kompetensi: kompetensi.trim() });
        setOpen(false); kosongkan(); setHasil(null);
      } else {
        const res = await onCreate({ role: tipe, nama, email, kode, nip, kompetensi });
        setOpen(false); kosongkan();
        setHasil({ loginId: res.loginId, tempPassword: res.tempPassword });
      }
    } catch (e) {
      setErr(e.message || 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  }

  async function reset(uid, key) {
    if (!window.confirm('Reset password akun ini? Password lama tidak akan berlaku lagi.')) return;
    setPesan({ key, teks: 'Memproses…' });
    try {
      const { tempPassword } = await onReset(uid);
      setPesan({ key, teks: `Password sementara: ${tempPassword}` });
    } catch (e) {
      setPesan({ key, teks: 'Gagal reset: ' + (e.message || e) });
    }
  }

  async function hapusAdmin(a, key) {
    if (!onDeleteAdmin) return;
    if (!window.confirm(`Hapus akun admin ${a.nama} (${a.email}) secara permanen?`)) return;
    setPesan({ key, teks: 'Menghapus…' });
    try {
      await onDeleteAdmin(a.uid);
      setPesan(null);
    } catch (e) {
      setPesan({ key, teks: 'Gagal hapus: ' + (e.message || e) });
    }
  }

  // ----- Edit profil sendiri (admin lain, bukan super, hanya boleh ubah nama) -----
  const [selfEdit, setSelfEdit] = useState(false);
  const [selfNama, setSelfNama] = useState('');
  const [selfEmail, setSelfEmail] = useState('');
  const [selfErr, setSelfErr] = useState('');
  const [selfBusy, setSelfBusy] = useState(false);

  function mulaiEditSelf(a) {
    setSelfNama(a.nama || ''); setSelfEmail(a.email || ''); setSelfErr(''); setSelfEdit(true);
  }
  function tutupSelfEdit() { setSelfEdit(false); setSelfErr(''); }

  async function simpanSelf() {
    if (!onUpdateSelfAdmin) return;
    setSelfErr('');
    if (!selfNama.trim()) { setSelfErr('Nama wajib diisi.'); return; }
    setSelfBusy(true);
    try {
      await onUpdateSelfAdmin(isSuperAdmin ? { nama: selfNama.trim(), email: selfEmail.trim() } : { nama: selfNama.trim() });
      setSelfEdit(false);
    } catch (e) {
      setSelfErr(e.message || 'Gagal menyimpan.');
    } finally {
      setSelfBusy(false);
    }
  }

  const adaSuperAdmin = admin.some((a) => a.superAdmin);
  const [klaimBusy, setKlaimBusy] = useState(false);
  const [klaimErr, setKlaimErr] = useState('');
  async function klaimSuper() {
    if (!onClaimSuperAdmin) return;
    if (!window.confirm('Jadikan akun ini super admin? Hanya satu akun yang bisa jadi super admin, dan tindakan ini tidak bisa dibatalkan sendiri.')) return;
    setKlaimBusy(true); setKlaimErr('');
    try {
      await onClaimSuperAdmin();
    } catch (e) {
      setKlaimErr(e.message || 'Gagal menjadikan super admin.');
    } finally {
      setKlaimBusy(false);
    }
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Roster dosen &amp; admin kecil dan tetap — dibuat manual di sini, bukan pendaftaran
        mandiri. Password awal dibuat otomatis (sementara) dan wajib diganti saat login pertama.
      </p>

      {hasil && (
        <div className="hint" style={{ marginTop: 8 }}>
          Akun dibuat: <strong>{hasil.loginId}</strong> — password sementara: <strong>{hasil.tempPassword}</strong>. Kabarkan ke yang bersangkutan; wajib diganti saat login pertama.
        </div>
      )}

      {!adaSuperAdmin && onClaimSuperAdmin && (
        <div className="hint" style={{ marginTop: 8 }}>
          Belum ada super admin. Hanya super admin yang boleh menambah/menghapus akun admin lain.{' '}
          <button className="link-btn" onClick={klaimSuper} disabled={klaimBusy}>
            {klaimBusy ? 'Memproses…' : 'Jadikan akun ini super admin'}
          </button>
          {klaimErr && <div className="login-err" style={{ marginTop: 4 }}>{klaimErr}</div>}
        </div>
      )}

      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0, justifyContent: 'flex-start', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => mulaiTambah('lecturer')}>+ Tambah dosen</button>
        {isSuperAdmin && <button className="btn" onClick={() => mulaiTambah('admin')}>+ Tambah admin</button>}
      </div>

      {open && (
        <Modal
          title={editKode ? `Edit dosen ${editKode}` : `Tambah ${tipe === 'lecturer' ? 'dosen' : 'admin'}`}
          onClose={tutup}
          footer={
            <>
              <button className="btn" onClick={tutup} disabled={busy}>Batal</button>
              <button className="btn btn-primary" onClick={buat} disabled={busy}>
                {busy ? 'Memproses…' : editKode ? 'Simpan perubahan' : `Tambah ${tipe === 'lecturer' ? 'dosen' : 'admin'}`}
              </button>
            </>
          }
        >
          {editKode && (
            <p className="hint" style={{ marginTop: 0 }}>Akun login (password, status aktif) tidak berubah dari sini.</p>
          )}
          <div className="form-grid">
            <Field label="Nama"><input value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
            <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            {tipe === 'lecturer' && (
              <>
                <Field label="Kode (unik, mis. ASN)"><input value={kode} disabled={!!editKode} onChange={(e) => setKode(e.target.value.toUpperCase())} /></Field>
                <Field label="NIP"><input value={nip} onChange={(e) => setNip(e.target.value)} /></Field>
                <Field label="Kompetensi" full><input value={kompetensi} onChange={(e) => setKompetensi(e.target.value)} /></Field>
              </>
            )}
          </div>
          {err && <div className="login-err" style={{ marginTop: 8 }}>{err}</div>}
        </Modal>
      )}

      <div className="sched-title" style={{ marginTop: 20 }}>Dosen</div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Kode</th><th>Nama</th><th>Email</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {dosen.map((d) => {
              const key = 'd-' + d.kode;
              return (
                <tr key={d.kode}>
                  <td>{d.kode}</td>
                  <td>{d.nama}</td>
                  <td className="cell-sub">{d.email || '-'}</td>
                  <td><span className={'chip ' + (d.isActive === false ? 'chip-off' : 'chip-on')}>{d.isActive === false ? 'Nonaktif' : 'Aktif'}</span></td>
                  <td className="cell-actions">
                    {pesan && pesan.key === key ? <span className="hint">{pesan.teks}</span> : (
                      <>
                        <button className="link-btn" onClick={() => mulaiEdit(d)}>Edit</button>
                        {d.uid && <button className="link-btn" onClick={() => reset(d.uid, key)}>Reset Password</button>}
                        <button className="link-btn danger" onClick={() => onToggleDosenAktif(d.kode, d.isActive === false)}>
                          {d.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sched-title" style={{ marginTop: 20 }}>Admin</div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Nama</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {admin.map((a) => {
              const key = 'a-' + a.uid;
              return (
                <tr key={a.uid}>
                  <td>{a.nama} {a.superAdmin && <span className="chip chip-on">Super Admin</span>}</td>
                  <td className="cell-sub">{a.email}</td>
                  <td className="cell-actions">
                    {pesan && pesan.key === key ? <span className="hint">{pesan.teks}</span> : (
                      <>
                        {a.uid === currentAdminUid && onUpdateSelfAdmin && (
                          <button className="link-btn" onClick={() => mulaiEditSelf(a)}>Edit</button>
                        )}
                        <button className="link-btn" onClick={() => reset(a.uid, key)}>Reset Password</button>
                        {isSuperAdmin && a.uid !== currentAdminUid && (
                          <button className="link-btn danger" onClick={() => hapusAdmin(a, key)}>Hapus</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selfEdit && (
        <Modal
          title="Edit profil saya"
          onClose={tutupSelfEdit}
          footer={
            <>
              <button className="btn" onClick={tutupSelfEdit} disabled={selfBusy}>Batal</button>
              <button className="btn btn-primary" onClick={simpanSelf} disabled={selfBusy}>{selfBusy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Nama" full><input value={selfNama} onChange={(e) => setSelfNama(e.target.value)} /></Field>
            <Field label="Email" full>
              <input type="email" value={selfEmail} onChange={(e) => setSelfEmail(e.target.value)} disabled={!isSuperAdmin} />
            </Field>
            {!isSuperAdmin && (
              <p className="hint field-full" style={{ marginTop: -4 }}>Hanya super admin yang boleh mengubah email.</p>
            )}
          </div>
          {selfErr && <div className="login-err" style={{ marginTop: 8 }}>{selfErr}</div>}
        </Modal>
      )}
    </div>
  );
}
