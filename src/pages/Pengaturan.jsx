import React, { useState } from 'react';
import { Field, Empty, Modal } from '../components/ui.jsx';
import { buatId, KP_DOKUMEN, BERKAS_SYARAT, PROGRAM_KEYS, programLabel } from '../utils/helpers.js';

// ===================== Pengaturan.jsx =====================
// Halaman admin "Pengaturan" — dulunya tiga modal terpisah (Kelola periode /
// pengumuman / panduan) yang dipicu dari tombol-tombol di topbar. Sekarang
// halaman sendiri (alamat /pengaturan, lihat App.jsx) dengan sidebar navigasi
// sendiri (gaya halaman Settings), sengaja dibuat terlihat beda dari tab-tab
// admin lain supaya jelas ini "ruang" terpisah — dan supaya menambah bagian
// baru di masa depan (mis. editor konten teks) tinggal jadi satu item sidebar
// lagi tanpa menambah apa pun di topbar.

const SUB_TABS = [
  { key: 'periode', label: 'Periode', icon: '🗓️' },
  { key: 'pengumuman', label: 'Pengumuman', icon: '📢' },
  { key: 'panduan', label: 'Kelola Panduan', icon: '📘' },
  { key: 'konten', label: 'Konten', icon: '📝' },
  { key: 'akun', label: 'Akun Mahasiswa', icon: '🔑' },
  { key: 'staf', label: 'Dosen & Admin', icon: '👤' },
];

export function Pengaturan({
  periodeBuka, periodeAktif, onBukaPeriode, onTutupPeriode, onSetPeriodeAktif,
  pengumuman, onSimpanPengumuman,
  panduan, onSimpanPanduan,
  konten = {}, onSimpanKonten,
  akun = [], dosen = [], admin = [],
  onResetPassword, onCreateUser, onToggleAkunAktif, onToggleDosenAktif, onEditDosen,
}) {
  const [subTab, setSubTab] = useState(SUB_TABS[0].key);
  const aktif = SUB_TABS.find((t) => t.key === subTab) || SUB_TABS[0];

  return (
    <div className="pengaturan-layout">
      <div className="pengaturan-side">
        <h2 className="page-title" style={{ marginBottom: 20 }}>Pengaturan</h2>
        <nav className="pengaturan-nav">
          {SUB_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={'pengaturan-nav-item' + (subTab === t.key ? ' active' : '')}
              onClick={() => setSubTab(t.key)}
            >
              <span className="pengaturan-nav-icon" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="pengaturan-main">
        <div className="pengaturan-section-title">{aktif.label}</div>

        {subTab === 'periode' && (
          <SeksiPeriode
            dibuka={periodeBuka}
            periodeAktif={periodeAktif}
            onBuka={onBukaPeriode}
            onTutup={onTutupPeriode}
            onSetAktif={onSetPeriodeAktif}
          />
        )}
        {subTab === 'pengumuman' && (
          <SeksiPengumuman daftar={pengumuman} onSimpan={onSimpanPengumuman} />
        )}
        {subTab === 'panduan' && (
          <SeksiPanduan daftar={panduan} onSimpan={onSimpanPanduan} />
        )}
        {subTab === 'konten' && (
          <SeksiKonten konten={konten} onSimpan={onSimpanKonten} />
        )}
        {subTab === 'akun' && (
          <SeksiAkun daftar={akun} onReset={onResetPassword} onToggleAktif={onToggleAkunAktif} />
        )}
        {subTab === 'staf' && (
          <SeksiStaf dosen={dosen} admin={admin} onReset={onResetPassword} onCreate={onCreateUser} onToggleDosenAktif={onToggleDosenAktif} onEditDosen={onEditDosen} />
        )}
      </div>
    </div>
  );
}

function SeksiPeriode({ dibuka, periodeAktif, onBuka, onTutup, onSetAktif }) {
  const [nilai, setNilai] = useState('');
  const [aktif, setAktif] = useState(periodeAktif || '');
  function tambah() {
    const v = nilai.trim();
    if (!v) return;
    onBuka(v);
    setNilai('');
  }
  function simpanAktif() { onSetAktif(aktif.trim()); }
  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Periode yang dibuka di sini akan muncul sebagai pilihan saat mahasiswa mendaftar.
      </p>
      <div className="form-grid">
        <Field label="Periode aktif saat ini (ditampilkan di halaman login)" full>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={aktif} onChange={(e) => setAktif(e.target.value)} placeholder="mis. Genap 2026"
              onKeyDown={(e) => { if (e.key === 'Enter') simpanAktif(); }} />
            <button className="btn" onClick={simpanAktif}>Simpan</button>
          </div>
        </Field>
        <Field label="Buka periode baru" full>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="mis. 2025 Ganjil"
              onKeyDown={(e) => { if (e.key === 'Enter') tambah(); }} />
            <button className="btn btn-primary" onClick={tambah}>Buka</button>
          </div>
        </Field>
      </div>
      <div className="sched" style={{ marginTop: 12 }}>
        <div className="sched-title">Periode yang sedang dibuka</div>
        {dibuka.length === 0 ? (
          <Empty>Belum ada periode yang dibuka.</Empty>
        ) : (
          <ul className="periode-list">
            {dibuka.map((p) => (
              <li key={p} className="periode-item">
                <span>{p}</span>
                <button className="link-btn danger" onClick={() => onTutup(p)}>Tutup</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SeksiPengumuman({ daftar, onSimpan }) {
  const [tanggal, setTanggal] = useState('');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [editId, setEditId] = useState(null);

  function kosongkan() { setTanggal(''); setJudul(''); setIsi(''); setEditId(null); }

  function simpan() {
    if (!tanggal.trim() || !judul.trim()) return;
    if (editId) {
      onSimpan(daftar.map((p) => (p.id === editId ? { ...p, tanggal: tanggal.trim(), judul: judul.trim(), isi: isi.trim() } : p)));
    } else {
      onSimpan([{ id: buatId(), tanggal: tanggal.trim(), judul: judul.trim(), isi: isi.trim() }, ...daftar]);
    }
    kosongkan();
  }

  function edit(p) { setEditId(p.id); setTanggal(p.tanggal); setJudul(p.judul); setIsi(p.isi); }
  function hapus(id) { if (window.confirm('Hapus pengumuman ini?')) onSimpan(daftar.filter((p) => p.id !== id)); if (editId === id) kosongkan(); }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Pengumuman ini tampil di halaman login, terbaru di atas.
      </p>
      <div className="form-grid">
        <Field label="Tanggal" full><input value={tanggal} onChange={(e) => setTanggal(e.target.value)} placeholder="mis. 17 Juli 2026" /></Field>
        <Field label="Judul" full><input value={judul} onChange={(e) => setJudul(e.target.value)} /></Field>
        <Field label="Isi" full><textarea rows={3} value={isi} onChange={(e) => setIsi(e.target.value)} /></Field>
      </div>
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        {editId && <button className="btn" onClick={kosongkan}>Batal edit</button>}
        <button className="btn btn-primary" onClick={simpan}>{editId ? 'Simpan perubahan' : 'Tambah pengumuman'}</button>
      </div>
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
                  <button className="link-btn" onClick={() => edit(p)}>Edit</button>
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

function SeksiPanduan({ daftar, onSimpan }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [program, setProgram] = useState('');
  const [editId, setEditId] = useState(null);

  function kosongkan() { setLabel(''); setUrl(''); setProgram(''); setEditId(null); }

  function simpan() {
    if (!label.trim() || !url.trim()) return;
    if (editId) {
      onSimpan(daftar.map((p) => (p.id === editId ? { ...p, label: label.trim(), url: url.trim(), program } : p)));
    } else {
      onSimpan([...daftar, { id: buatId(), label: label.trim(), url: url.trim(), program }]);
    }
    kosongkan();
  }

  function edit(p) { setEditId(p.id); setLabel(p.label); setUrl(p.url); setProgram(p.program || ''); }
  function hapus(id) { if (window.confirm('Hapus tautan panduan ini?')) onSimpan(daftar.filter((p) => p.id !== id)); if (editId === id) kosongkan(); }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Daftar unduhan (Panduan KP, Panduan TA, dst.) yang tampil di halaman Panduan Portal mahasiswa, dikelompokkan per program. Tautkan ke Google Drive atau sumber lain.
      </p>
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
      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0 }}>
        {editId && <button className="btn" onClick={kosongkan}>Batal edit</button>}
        <button className="btn btn-primary" onClick={simpan}>{editId ? 'Simpan perubahan' : 'Tambah panduan'}</button>
      </div>
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
                  <button className="link-btn" onClick={() => edit(p)}>Edit</button>
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

// ----- Editor konten: label/syarat dokumen KP + daftar berkas per kegiatan -----
// Hanya teks informasional yang bisa diubah di sini — alur/tahapan/kelayakan
// tetap ditentukan di kode (KP_DOKUMEN/BERKAS_SYARAT di helpers.js), yang juga
// jadi nilai bawaan (default) tiap field selama admin belum meng-override-nya.
function SeksiKonten({ konten = {}, onSimpan }) {
  const overrideDokumen = konten.dokumen || {};
  const overrideBerkas = konten.berkasSyarat || {};

  function simpanDokumen(key, patch) {
    onSimpan({ ...konten, dokumen: { ...overrideDokumen, [key]: patch } });
  }
  function resetDokumen(key) {
    const next = { ...overrideDokumen };
    delete next[key];
    onSimpan({ ...konten, dokumen: next });
  }
  function simpanBerkas(ev, list) {
    onSimpan({ ...konten, berkasSyarat: { ...overrideBerkas, [ev]: list } });
  }
  function resetBerkas(ev) {
    const next = { ...overrideBerkas };
    delete next[ev];
    onSimpan({ ...konten, berkasSyarat: next });
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Ubah teks yang tampil untuk mahasiswa — label & syarat tiap dokumen KP, dan daftar
        berkas yang perlu disiapkan per kegiatan. Ini hanya teks; alur/tahapan/kelayakan
        dokumen tetap ditentukan di kode, tidak berubah dari sini.
      </p>

      <div className="sched-title" style={{ marginTop: 20 }}>Dokumen KP</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {KP_DOKUMEN.map((d) => (
          <KontenDokumenCard
            key={d.key}
            d={d}
            override={overrideDokumen[d.key]}
            onSimpan={(patch) => simpanDokumen(d.key, patch)}
            onReset={() => resetDokumen(d.key)}
          />
        ))}
      </div>

      <div className="sched-title" style={{ marginTop: 24 }}>Dokumen yang perlu disiapkan (per kegiatan)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.keys(BERKAS_SYARAT).map((ev) => (
          <KontenBerkasCard
            key={ev}
            ev={ev}
            defaultList={BERKAS_SYARAT[ev]}
            override={overrideBerkas[ev]}
            onSimpan={(list) => simpanBerkas(ev, list)}
            onReset={() => resetBerkas(ev)}
          />
        ))}
      </div>
    </div>
  );
}

function KontenDokumenCard({ d, override, onSimpan, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState(override?.label || d.label);
  const [syarat, setSyarat] = useState(override?.syarat || d.syarat);
  const overridden = !!override;

  function simpan() {
    onSimpan({ label: label.trim() || d.label, syarat: syarat.trim() || d.syarat });
  }
  function reset() {
    setLabel(d.label);
    setSyarat(d.syarat);
    onReset();
  }

  return (
    <div className="kp-dok-item" style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" className="link-btn" style={{ padding: '2px 0', fontSize: '0.85rem' }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▾' : '▸'} {override?.label || d.label}
        </button>
        {overridden && <span className="chip chip-on">Di-override</span>}
      </div>
      {expanded && (
        <div className="form-grid" style={{ marginTop: 10 }}>
          <Field label="Label" full><input value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field label="Syarat / hint" full><textarea rows={2} value={syarat} onChange={(e) => setSyarat(e.target.value)} /></Field>
          <div className="field-full" style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={simpan}>Simpan</button>
            {overridden && <button className="btn ghost" onClick={reset}>Reset ke default</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function KontenBerkasCard({ ev, defaultList, override, onSimpan, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const [teks, setTeks] = useState((override || defaultList).join('\n'));
  const [err, setErr] = useState('');
  const overridden = !!override;

  function simpan() {
    const list = teks.split('\n').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) { setErr('Isi minimal satu baris.'); return; }
    setErr('');
    onSimpan(list);
  }
  function reset() {
    setTeks(defaultList.join('\n'));
    setErr('');
    onReset();
  }

  return (
    <div className="kp-dok-item" style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" className="link-btn" style={{ padding: '2px 0', fontSize: '0.85rem' }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▾' : '▸'} {ev}
        </button>
        {overridden && <span className="chip chip-on">Di-override</span>}
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          <Field label="Satu berkas per baris" full>
            <textarea rows={4} value={teks} onChange={(e) => setTeks(e.target.value)} />
          </Field>
          {err && <div className="login-err" style={{ marginTop: 4 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={simpan}>Simpan</button>
            {overridden && <button className="btn ghost" onClick={reset}>Reset ke default</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Daftar akun mahasiswa + reset password -----
// Password disimpan & diverifikasi oleh Firebase Authentication — TIDAK
// PERNAH bisa dilihat siapa pun, termasuk admin (lihat functions/index.js:
// adminResetPassword). Satu-satunya aksi yang tersedia di sini adalah reset
// ke password sementara baru; mahasiswa wajib menggantinya saat login
// berikutnya (mustChangePassword).
function SeksiAkun({ daftar, onReset, onToggleAktif }) {
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

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Untuk troubleshooting saat mahasiswa lupa password — reset ke password sementara
        baru, lalu kabarkan sendiri ke mahasiswa (telepon/WA); mereka wajib menggantinya
        saat login berikutnya. Password tidak pernah bisa dilihat di sini — hanya "Reset".
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
                        <button className="link-btn danger" onClick={() => onToggleAktif(a.nim, a.isActive === false)}>
                          {a.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                        </button>
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

// ----- Kelola akun dosen & admin (roster kecil, dibuat manual oleh admin) -----
function SeksiStaf({ dosen, admin, onReset, onCreate, onToggleDosenAktif, onEditDosen }) {
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

      <div className="modal-foot" style={{ paddingLeft: 0, paddingRight: 0, justifyContent: 'flex-start', gap: 8 }}>
        <button className="btn btn-primary" onClick={() => mulaiTambah('lecturer')}>+ Tambah dosen</button>
        <button className="btn" onClick={() => mulaiTambah('admin')}>+ Tambah admin</button>
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
                  <td>{a.nama}</td>
                  <td className="cell-sub">{a.email}</td>
                  <td className="cell-actions">
                    {pesan && pesan.key === key ? <span className="hint">{pesan.teks}</span> : (
                      <button className="link-btn" onClick={() => reset(a.uid, key)}>Reset Password</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
