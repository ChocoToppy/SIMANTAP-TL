import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dashboard } from './pages/Dashboard.jsx';
import { Mahasiswa } from './pages/Mahasiswa.jsx';
import { Dosen } from './pages/Dosen.jsx';
import { Pengaturan } from './pages/Pengaturan.jsx';
import { Login } from './pages/Login.jsx';
import { Portal } from './pages/Portal.jsx';
import { DosenPortal } from './pages/DosenPortal.jsx';
import { PanduanPage } from './pages/PanduanPage.jsx';
import { PenggunaanRuangPortal } from './modules/ruang';
import { arsipkanJadwal, idPengajuan, PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal, orphanedUploadPaths, urutPeriode } from './utils/helpers.js';
import { deleteUploadedFile, deleteUploadedFolder } from './utils/fileUpload.js';
import { PERIODE_BUKA_AWAL, PENGUMUMAN_AWAL, PERIODE_AKTIF_AWAL, PANDUAN_AWAL } from './data/seed.js';
import { Badge, StageBar, ExportMenu, TextSizeToggle, ThemeToggle, RolePill, TabIcon, LogoutIcon, Dropdown, Muat, PasswordField, HamburgerIcon } from './components/ui.jsx';
import { db, auth } from './utils/firebase.js';
import { setPilihan } from './utils/pilihan.js';
import { konfirmasiKeluar } from './utils/perubahanBelumDisimpan.js';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { readClaims, logout, changeOwnPassword, adminCreateUser, adminResetPassword, adminDeleteStudent, adminDeleteAdmin, claimSuperAdmin, adminUpdateSelf, studentUpdateProfile } from './utils/auth.js';
import { bolehMasukDomainIni, KUNCI_DITOLAK } from './utils/domainAccess.js';
import logoTl from './assets/logo-tl.png';
import gearIcon from './assets/gear.png';
import { FITUR_RUANG } from './utils/config.js';
import { akhiriNomorTerhapus } from './utils/nomorSuratDb.js';
import { useJadwalRuang, useSinkronProgram } from './modules/ruang';
import { useMahasiswaAdmin, catatPeriode, isiDaftarPeriode } from './utils/useMahasiswaAdmin.js';
import { useRute, pindah, ganti, ubahParam } from './utils/rute.js';
import { useBatasSesi, hapusAlasanKeluar } from './utils/sesi.js';
import { PeringatanSesi } from './components/PeringatanSesi.jsx';

// Program yang terbuka saat tabel Mahasiswa dibuka tanpa ?program= (atau dengan kode tak dikenal).
const PROGRAM_AWAL_MAHASISWA = 'KP';

const TAB_PATH = {
  dashboard: '/dashboard', mahasiswa: '/mahasiswa', dosen: '/dosen',
  ...(FITUR_RUANG ? { ruang: '/ruang' } : {}),
};

// Dirender saat akun non-super-admin login di domain terbatas: tandai penolakan
// (dibaca layar Login untuk menampilkan pesan) lalu langsung keluar.
function DomainDitolak({ onLogout }) {
  useEffect(() => {
    sessionStorage.setItem(KUNCI_DITOLAK, '1');
    onLogout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="login-wrap"><p className="login-foot">Mengalihkan…</p></div>;
}

// ===================== App.js =====================
// App.js — akar: sesi login (Firebase Auth + custom claims), render Login / Portal / Admin

// Dulu seluruh data (mahasiswa, dosen, dst.) di-cache di localStorage dengan kunci
// ini dan tetap tertinggal di browser setelah logout. Tidak dipakai lagi — semua
// data dimuat langsung dari Firestore; sisa cache lama di browser dibersihkan.
try { localStorage.removeItem('sistem-ta-v2'); } catch (e) { /* abaikan */ }

// Setiap mahasiswa/dosen/akun kini disimpan sebagai dokumen Firestore sendiri
// (bukan satu dokumen raksasa untuk seluruh aplikasi seperti sebelumnya), supaya
// satu berkas besar atau satu record tidak bisa menimpa/menggagalkan data orang
// lain. Batas 1 MiB tetap berlaku, tapi sekarang per-dokumen (per mahasiswa/
// dosen/akun), bukan per seluruh sekolah.
const DOC_SAFE_LIMIT = 900_000; // sisakan margin di bawah batas 1 MiB per dokumen Firestore

// Mengembalikan promise<boolean>: true hanya bila server menerima tulisan. Pemanggil
// yang perlu tindak lanjut (mis. menghapus berkas lama) menunggu nilai ini.
function writeDoc(collectionName, id, value, label) {
  const perkiraanUkuran = new Blob([JSON.stringify(value)]).size;
  if (perkiraanUkuran > DOC_SAFE_LIMIT) {
    alert(`Gagal menyimpan: data ${label} sudah ${Math.round(perkiraanUkuran / 1024)} KB, mendekati/melebihi batas 1 MiB per dokumen Firestore. Coba unggah berkas dengan ukuran lebih kecil, atau hubungi admin.`);
    return Promise.resolve(false);
  }
  return setDoc(doc(db, collectionName, id), value).then(() => true, (e) => {
    console.error('FB err:', e);
    alert('Gagal menyimpan perubahan ke server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
    return false;
  });
}

// ID penanda slotPengajuan untuk dokumen yang memegang pasangan (owner, program)
// dengan ID selain idPengajuan (data lama, buatan admin, atau setelah ganti NIM),
// atau null bila tidak perlu penanda. Pengajuan yang ditutup tidak memegang
// slot (mahasiswa boleh mendaftar ulang). Lihat firestore.rules.
function slotPengajuanUntuk(m) {
  if (!m || !m.owner || m.dibatalkan) return null;
  const slotId = idPengajuan(m.owner, programOf(m));
  return slotId === m.id ? null : slotId;
}

function hapusDoc(collectionName, id) {
  deleteDoc(doc(db, collectionName, id)).catch((e) => {
    console.error('FB err:', e);
    alert('Gagal menghapus data di server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
  });
}

// Project Firebase yang masih kosong (belum ada config/global): buat dokumen
// config/global dengan isi kosong. Dosen & mahasiswa tidak diisi data contoh.
async function seedFirestore() {
  await setDoc(doc(db, 'config', 'global'), {
    periodeBuka: PERIODE_BUKA_AWAL, pengumuman: PENGUMUMAN_AWAL,
    periodeAktif: PERIODE_AKTIF_AWAL, panduan: PANDUAN_AWAL,
  });
}

// ----- Layar wajib ganti password (akun baru dibuat admin / hasil reset) -----
function GantiPasswordWajib({ onSelesai, onLogout }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function simpan() {
    setErr('');
    if (p1.length < 6) { setErr('Password minimal 6 karakter.'); return; }
    if (p1 !== p2) { setErr('Konfirmasi password tidak cocok.'); return; }
    setLoading(true);
    try {
      await onSelesai(p1);
    } catch (e) {
      setErr(e.message || 'Gagal menyimpan password baru. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-container">
        <div className="login-card">
          <div className="login-brand">
            <img className="brand-mark" src={logoTl} alt="TL Undip" />
            <div>
              <div className="login-title">Ganti Password</div>
              <div className="login-sub">Akun Anda memakai password sementara — buat password baru untuk melanjutkan.</div>
            </div>
          </div>
          <div className="login-form">
            <label className="field"><span className="field-label">Password baru</span>
              <PasswordField value={p1} onChange={(e) => setP1(e.target.value)} /></label>
            <label className="field"><span className="field-label">Konfirmasi password baru</span>
              <PasswordField value={p2} onChange={(e) => setP2(e.target.value)} /></label>
            {err && <div className="login-err">{err}</div>}
            <button className="btn btn-primary block" onClick={simpan} disabled={loading}>{loading ? 'Menyimpan…' : 'Simpan & lanjutkan'}</button>
            <button className="btn btn-logout block" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mhsNonAdmin, setMhsNonAdmin] = useState([]); // mahasiswa & dosen; admin: useMahasiswaAdmin
  const [dosenList, setDosenList] = useState([]);
  const [akunList, setAkunList] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [angkatanList, setAngkatanList] = useState([]);
  const [config, setConfig] = useState({
    periodeBuka: PERIODE_BUKA_AWAL, pengumuman: PENGUMUMAN_AWAL, periodeAktif: PERIODE_AKTIF_AWAL, panduan: PANDUAN_AWAL,
  });
  const [configSiap, setConfigSiap] = useState(false); // config/global sudah terbaca dari server

  // ----- Sesi: Firebase Auth + custom claims (role/kode), bukan localStorage -----
  const [authUser, setAuthUser] = useState(undefined); // undefined = belum diketahui (loading)
  const [claims, setClaims] = useState(null); // { role, kode }
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user || null);
      if (user) hapusAlasanKeluar();
      if (!user) { setClaims(null); return; }
      try {
        setClaims(await readClaims(user));
      } catch (e) {
        console.error('Gagal membaca klaim:', e);
        setClaims(null);
      }
    });
    return () => unsub();
  }, []);
  // Keluar otomatis karena diam / batas 12 jam (utils/sesi.js); peringatannya ikut di setiap layar login.
  const peringatanSesi = useBatasSesi(authUser || null, claims?.role);
  const dgnSesi = (layar) => <>{layar}<PeringatanSesi peringatan={peringatanSesi} role={claims?.role} /></>;

  // Dipanggil setelah aksi yang mengubah custom claim milik akun sendiri
  // (mis. NIM berubah lewat studentUpdateProfile) supaya UI langsung memakai
  // NIM baru tanpa perlu logout/login ulang.
  async function refreshClaims() {
    if (!auth.currentUser) return;
    try {
      setClaims(await readClaims(auth.currentUser));
    } catch (e) {
      console.error('Gagal me-refresh klaim:', e);
    }
  }

  const isAdmin = claims?.role === 'admin';
  const periodeDikenal = useMemo(
    () => [...(config.daftarPeriode || []), ...(config.periodeBuka || [])],
    [config.daftarPeriode, config.periodeBuka]
  );
  const mhsAdmin = useMahasiswaAdmin(isAdmin, periodeDikenal);
  const mahasiswaList = isAdmin ? mhsAdmin.list : mhsNonAdmin;
  const setMahasiswaList = isAdmin ? mhsAdmin.setList : setMhsNonAdmin;
  const daftarPeriodeDiisi = useRef(false);
  useEffect(() => {
    if (!isAdmin || !configSiap || Array.isArray(config.daftarPeriode) || daftarPeriodeDiisi.current) return;
    daftarPeriodeDiisi.current = true;
    isiDaftarPeriode(config.periodeBuka || []).catch((e) => console.error('Gagal mengisi daftar periode:', e));
  }, [isAdmin, configSiap, config.daftarPeriode, config.periodeBuka]);

  // Sidebar admin di layar sempit: laci yang bisa dibuka/ditutup (hamburger).
  const [menuOpen, setMenuOpen] = useState(false);
  // Sidebar desktop: disematkan = selalu melebar, tidak lagi bergantung hover.
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem('sidebarPinned') === '1'; } catch { return false; }
  });
  function togglePin() {
    const next = !pinned;
    setPinned(next);
    try { localStorage.setItem('sidebarPinned', next ? '1' : '0'); } catch { /* storage diblokir */ }
  }
  // Halaman dan pilihan tampilan ada di URL (lihat utils/rute.js). Admin: tab = path,
  // periode & program = query. Pindah tab mengingat query terakhir tab tujuan.
  const rute = useRute();
  const route = rute.path;
  const navigate = (path) => pindah(path);
  const tabAdmin = Object.keys(TAB_PATH).find((k) => TAB_PATH[k] === route);
  const tab = tabAdmin || 'dashboard';
  const paramTab = useRef({});
  const tabTerakhir = useRef('dashboard');
  if (tabAdmin) { paramTab.current[tabAdmin] = rute.params; tabTerakhir.current = tabAdmin; }
  function setTab(k) {
    pindah(TAB_PATH[k], { ...(paramTab.current[k] || {}), periode: rute.params.periode });
  }
  function kembaliKeAdmin() {
    const k = tabTerakhir.current;
    pindah(TAB_PATH[k], paramTab.current[k] || {});
  }
  useEffect(() => {
    if (isAdmin && !tabAdmin && !route.startsWith('/pengaturan')) ganti(TAB_PATH.dashboard, rute.params);
  }, [isAdmin, tabAdmin, route, rute.params]);

  // Program di sidebar mobile juga, jadi dipegang di sini, bukan di halamannya. Selalu
  // ditulis di URL (seperti periode): mengganti PROGRAM_AWAL_MAHASISWA kelak tidak mengubah
  // isi tautan lama. Dashboard memakai "semua"; kode tak dikenal jatuh ke bawaan tab itu.
  const pakaiProgram = tab === 'dashboard' || tab === 'mahasiswa';
  const progBawaan = tab === 'dashboard' ? 'semua' : PROGRAM_AWAL_MAHASISWA;
  const progParam = String(rute.params.program || '');
  const progKode = PROGRAM_KEYS.find((k) => k.toLowerCase() === progParam.toLowerCase())
    || (tab === 'dashboard' && progParam.toLowerCase() === 'semua' ? 'semua' : '');
  const prog = progKode || progBawaan;
  const dashProg = prog === 'semua' ? 'ALL' : prog;
  const mhsProg = prog;
  useEffect(() => {
    if (isAdmin && tabAdmin && pakaiProgram && progParam !== prog) ubahParam({ program: prog });
  }, [isAdmin, tabAdmin, pakaiProgram, progParam, prog]);
  const setDashProg = (p) => ubahParam({ program: p === 'ALL' ? 'semua' : p }, { riwayat: true });
  // Kode bidang KP dan TA/Capstone berbeda, jadi filter bidang dikosongkan saat ganti program.
  const setMhsProg = (p) => ubahParam({ program: p, bidang: '', tahap: '', hal: '' }, { riwayat: true });
  function keluar() {
    if (!konfirmasiKeluar()) return;
    logout();
    navigate('/');
  }

  // Digabung untuk dipakai komponen di bawah (Login/Portal/Mahasiswa/Dosen dst.)
  // supaya tidak perlu mengubah semua pemakaian data.mahasiswa/data.dosen/dst.
  const data = useMemo(() => ({
    mahasiswa: mahasiswaList, dosen: dosenList, akun: akunList, angkatan: angkatanList, ...config,
  }), [mahasiswaList, dosenList, akunList, angkatanList, config]);


  // Setiap mahasiswa (satu program yang diikuti = satu dokumen), dosen, dan akun
  // disimpan sebagai dokumen Firestore sendiri-sendiri dalam koleksi masing-
  // masing, bukan satu dokumen raksasa untuk seluruh sekolah. Data konfigurasi
  // kecil (periode dibuka, pengumuman, panduan) tetap satu dokumen ringkas di
  // config/global karena ukurannya jauh di bawah batas & jarang berubah drastis.
  //
  // PENTING: query Firestore "list" (collection()/onSnapshot atas koleksi)
  // harus terbukti valid untuk SEMUA kemungkinan dokumen di koleksi itu —
  // Firestore tidak memfilter dokumen satu per satu berdasarkan rules. Karena
  // itu mahasiswa/dosen hanya boleh me-listen koleksi 'mahasiswa'/'akun' TANPA
  // where() bila mereka admin (aturan admin berlaku rata utk semua dokumen);
  // selain admin, query harus disertai where() yang cocok dengan
  // firestore.rules (lihat catatan di sana), atau dokumen tunggal (bukan list).
  useEffect(() => {
    if (claims?.role === 'admin') { setMhsNonAdmin([]); return undefined; }
    if (claims?.role === 'student' && claims.nim) {
      const q = query(collection(db, 'mahasiswa'), where('owner', '==', claims.nim));
      const unsub = onSnapshot(q, (snap) => {
        setMhsNonAdmin(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
      }, () => setMhsNonAdmin([]));
      return () => unsub();
    }
    if (claims?.role === 'lecturer' && claims.kode) {
      // Tidak ada satu query tunggal untuk "salah satu dari 4 field ini" —
      // dengarkan masing-masing field lalu gabungkan hasilnya (di-dedup per id).
      const byId = new Map();
      const fields = ['pembimbing1', 'pembimbing2', 'penguji1', 'penguji2'];
      const perField = new Map(fields.map((f) => [f, []]));
      function republish() {
        const merged = new Map();
        perField.forEach((docs) => docs.forEach((d) => merged.set(d.id, d)));
        setMhsNonAdmin(Array.from(merged.values()));
      }
      const unsubs = fields.map((f) => onSnapshot(
        query(collection(db, 'mahasiswa'), where(f, '==', claims.kode)),
        (snap) => { perField.set(f, snap.docs.map((d) => ({ ...d.data(), id: d.id }))); republish(); },
        () => { perField.set(f, []); republish(); },
      ));
      return () => unsubs.forEach((u) => u());
    }
    setMhsNonAdmin([]);
  }, [claims]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'dosen'), (snap) => {
      setDosenList(snap.docs.map((d) => ({ ...d.data(), kode: d.id })));
    }, () => setDosenList([]));
    return () => unsub();
  }, [authUser]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'angkatan'), (snap) => {
      setAngkatanList(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
    }, () => setAngkatanList([]));
    return () => unsub();
  }, [authUser]);
  useEffect(() => {
    if (claims?.role === 'admin') {
      const unsub = onSnapshot(collection(db, 'akun'), (snap) => {
        setAkunList(snap.docs.map((d) => ({ ...d.data(), nim: d.id })));
      }, () => setAkunList([]));
      return () => unsub();
    }
    if (claims?.role === 'student' && claims.nim) {
      // Dokumen tunggal (bukan "list") — sepenuhnya boleh mengandalkan rules
      // dinamis (lihat firestore.rules: akun/{nim}).
      const unsub = onSnapshot(doc(db, 'akun', claims.nim), (snap) => {
        setAkunList(snap.exists() ? [{ ...snap.data(), nim: snap.id }] : []);
      }, () => setAkunList([]));
      return () => unsub();
    }
    setAkunList([]);
  }, [claims]);
  useEffect(() => {
    if (claims?.role !== 'admin') { setAdminList([]); return; }
    const unsub = onSnapshot(collection(db, 'admin'), (snap) => {
      setAdminList(snap.docs.map((d) => ({ ...d.data(), uid: d.id })));
    }, () => setAdminList([]));
    return () => unsub();
  }, [claims]);
  useEffect(() => {
    const configRef = doc(db, 'config', 'global');
    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) { setConfig((prev) => ({ ...prev, ...snap.data() })); setConfigSiap(true); }
      else if (claims?.role === 'admin') seedFirestore().catch((e) => console.error('FB seed err:', e));
    });
    return () => unsub();
  }, [claims]);

  // Jadwal ruang (eksperimental): ruang master, semester, booking. Lihat useJadwalRuang.js.
  const { data: jadwalRuang, aksi: aksiJadwalRuang } = useJadwalRuang(authUser, claims);
  const sinkronTidakMasuk = useSinkronProgram({ aktif: claims?.role === 'admin', mahasiswa: mahasiswaList, data: jadwalRuang, aksi: aksiJadwalRuang });

  const periodeBuka = useMemo(() => urutPeriode(data.periodeBuka || []), [data.periodeBuka]);
  // Admin: daftarPeriode (config) ikut dihitung karena data periode lama belum tentu dimuat.
  const periodeList = useMemo(() => {
    const set = new Set([...daftarPeriode(data.mahasiswa), ...periodeBuka, ...(isAdmin ? data.daftarPeriode || [] : [])]);
    return urutPeriode(Array.from(set));
  }, [data.mahasiswa, periodeBuka, isAdmin, data.daftarPeriode]);
  // Angkatan aktif = pilihan yang muncul di form pendaftaran mahasiswa (strict
  // select); daftarAngkatan (semua, termasuk yang diarsipkan) dipakai sebagai
  // saran datalist di form edit admin — lihat SeksiAngkatan.jsx untuk arsip.
  const angkatanAktif = useMemo(
    () => (data.angkatan || []).filter((a) => a.isActive !== false).map((a) => a.label).sort(),
    [data.angkatan]
  );
  const daftarAngkatan = useMemo(() => (data.angkatan || []).map((a) => a.label).sort(), [data.angkatan]);
  // Daftar Tema KP/Bidang TA hasil edit admin — harus terpasang sebelum anak-anak dirender (lihat pilihan.js).
  setPilihan(data.konten);
  // Periode dari ?periode= ("semua" = Semua periode). Tanpa param atau tidak dikenal:
  // periode terbaru, lalu ditulis ke URL supaya tautan tetap menunjuk periode yang sama.
  const periodeParam = rute.params.periode || '';
  const periodeTerbaru = periodeList[periodeList.length - 1] || '';
  const periode = periodeParam === 'semua' ? SEMUA
    : periodeList.includes(periodeParam) ? periodeParam : (periodeTerbaru || SEMUA);
  useEffect(() => {
    if (!isAdmin || !tabAdmin || !periodeTerbaru || periodeParam === 'semua' || periodeList.includes(periodeParam)) return;
    // Periode dari tautan yang belum dikenal: tunggu data selesai dimuat sebelum menggantinya.
    if (periodeParam && mhsAdmin.memuat) return;
    ubahParam({ periode: periodeTerbaru });
  }, [isAdmin, tabAdmin, periodeParam, periodeTerbaru, periodeList, mhsAdmin.memuat]);
  useEffect(() => {
    if (!isAdmin) return;
    // "Semua periode" tidak memuat semuanya: tabelnya arsip per halaman (useArsipMahasiswa).
    if (periode !== SEMUA) mhsAdmin.muatPeriode(periode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, periodeParam, periode]);

  const mhsPeriode = useMemo(() => filterByPeriode(data.mahasiswa, periode), [data.mahasiswa, periode]);
  // "Semua periode": Dashboard/Dosen menghitung yang dimuat tanpa Lulus, ditambah statistik/lulus
  // (lihat utils/ringkasLulus.js). Bila semua sudah dimuat (Kelompokkan per Angkatan), pakai datanya.
  const pakaiRingkas = isAdmin && periode === SEMUA && !mhsAdmin.semuaDimuat;
  const [ringkasLulus, setRingkasLulus] = useState(null);
  useEffect(() => {
    if (!pakaiRingkas) { setRingkasLulus(null); return undefined; }
    return onSnapshot(doc(db, 'statistik', 'lulus'), (s) => setRingkasLulus(s.exists() ? s.data() : {}), (e) => {
      console.error('Gagal membaca statistik/lulus:', e);
      setRingkasLulus({});
    });
  }, [pakaiRingkas]);
  const mhsRingkas = useMemo(
    () => (pakaiRingkas ? mhsPeriode.filter((m) => m.tahap !== 'Lulus') : mhsPeriode),
    [pakaiRingkas, mhsPeriode]
  );
  const ringkasProp = pakaiRingkas ? (ringkasLulus || {}) : null;
  // Ganti periode = tampilan tabel kembali ke bawaan periode itu (pengelompokan, halaman 1).
  function pilihPeriode(p) {
    ubahParam({ periode: p === SEMUA ? 'semua' : p, grup: '', hal: '' }, { riwayat: true });
  }

  // lamaCadangan: versi tersimpan dari tabel arsip, untuk record yang periodenya belum dimuat.
  function simpanMahasiswa(rec, lamaCadangan = null) {
    // Berkas KP/perpanjangan yang ada di record lama tapi tidak lagi ada di
    // record baru (diganti atau dihapus) sudah tidak dirujuk siapa pun —
    // hapus dari Storage sekarang juga supaya tidak menumpuk jadi sampah.
    const lama = mahasiswaList.find((x) => x.id === rec.id) || lamaCadangan;
    let m = arsipkanJadwal(lama, rec); // jadwal yang diganti masuk riwayat
    // Pengajuan yang pernah terverifikasi tidak bisa dihapus mahasiswa lagi,
    // meski kemudian kembali ke 'baru' lewat edit (firestore.rules mewajibkan ini).
    if (m.verifikasi === 'terverifikasi' || (lama && (lama.verifikasi === 'terverifikasi' || lama.pernahTerverifikasi))) {
      m = { ...m, pernahTerverifikasi: true };
    }
    // Berkas lama dihapus SETELAH server menerima record baru. Dulu dihapus lebih dulu,
    // sehingga simpan yang ditolak aturan (mis. hapus surat balasan yang sudah final)
    // tetap menghapus berkasnya dan record tersimpan menunjuk ke berkas yang hilang.
    const yatim = lama ? orphanedUploadPaths(lama, m) : [];
    setMahasiswaList((prev) => {
      const ada = prev.some((x) => x.id === m.id);
      return ada ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m];
    });
    writeDoc('mahasiswa', m.id, m, 'mahasiswa').then((ok) => {
      if (ok) yatim.forEach((p) => deleteUploadedFile(p));
    });
    if (claims?.role === 'admin') {
      if (m.periode && Array.isArray(config.daftarPeriode) && !config.daftarPeriode.includes(m.periode)) {
        catatPeriode(m.periode).catch((e) => console.error('Gagal mencatat periode:', e));
      }
      const slotLama = slotPengajuanUntuk(lama);
      const slotBaru = slotPengajuanUntuk(m);
      if (slotLama && slotLama !== slotBaru) hapusDoc('slotPengajuan', slotLama);
      if (slotBaru && (!lama || slotBaru !== slotLama)) {
        writeDoc('slotPengajuan', slotBaru, { mahasiswaId: m.id, owner: m.owner, program: programOf(m) }, 'slotPengajuan');
      }
    }
  }
  async function hapusMahasiswa(id, cadangan = null) {
    const m = mahasiswaList.find((x) => x.id === id) || cadangan;
    setMahasiswaList((prev) => prev.filter((x) => x.id !== id));
    // Semua berkas mahasiswa ini disimpan di bawah uploads/{id}/... — hapus
    // seluruh folder sekaligus supaya tidak ada sisa berkas yatim di Storage.
    // Folder dihapus SEBELUM dokumennya: aturan Storage untuk mahasiswa
    // membaca dokumen mahasiswa/{id} untuk mengecek kepemilikan.
    await deleteUploadedFolder(`uploads/${id}`);
    try {
      await deleteDoc(doc(db, 'mahasiswa', id));
    } catch (e) {
      console.error('FB err:', e);
      alert('Gagal menghapus data di server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
      if (m) setMahasiswaList((prev) => (prev.some((x) => x.id === id) ? prev : [...prev, m]));
      return;
    }
    // Penanda slotPengajuan dihapus SESUDAH dokumennya (aturannya hanya mengizinkan
    // mahasiswa menghapus penanda yang dokumennya sudah tidak ada), supaya program
    // itu bisa diajukan lagi. Bila penanda menunjuk pengajuan lain untuk program yang
    // sama yang masih ada (duplikat lama), penghapusan ditolak — memang seharusnya.
    const slot = slotPengajuanUntuk(m);
    if (slot) deleteDoc(doc(db, 'slotPengajuan', slot)).catch(() => {});
    akhiriNomorTerhapus(m).catch((e) => console.error('Registri nomor surat:', e));
    hapusBookingMilik([id]);
  }
  function hapusBookingMilik(ids) {
    if (claims?.role !== 'admin' || !aksiJadwalRuang) return;
    aksiJadwalRuang.hapusBookingMahasiswa(ids).catch((e) => console.error('Booking ruang:', e));
  }
  // Hapus akun mahasiswa sepenuhnya: akun Auth, akun/{nim}, loginIndex/{nim},
  // dan semua data KP terkait — dipakai untuk membersihkan akun dummy/uji
  // coba dari daftar akun di halaman Pengaturan.
  async function hapusAkun(nim) {
    // Dibaca dulu: pengajuan lama (Lulus, periode yang belum dimuat) tidak ada di mahasiswaList.
    const milik = await getDocs(query(collection(db, 'mahasiswa'), where('owner', '==', nim)));
    const rekam = new Map(milik.docs.map((d) => [d.id, { ...d.data(), id: d.id }]));
    const { deletedMahasiswaIds } = await adminDeleteStudent(nim);
    setMahasiswaList((prev) => prev.filter((x) => !deletedMahasiswaIds.includes(x.id)));
    deletedMahasiswaIds.forEach((id) => {
      deleteUploadedFolder(`uploads/${id}`);
      akhiriNomorTerhapus(rekam.get(id) || mahasiswaList.find((x) => x.id === id)).catch((e) => console.error('Registri nomor surat:', e));
    });
    hapusBookingMilik(deletedMahasiswaIds);
  }
  function simpanDosen(ds) {
    setDosenList((prev) => {
      const ada = prev.some((x) => x.kode === ds.kode);
      return ada ? prev.map((x) => (x.kode === ds.kode ? ds : x)) : [...prev, ds];
    });
    writeDoc('dosen', ds.kode, ds, 'dosen');
  }
  function hapusDosen(kode) {
    setDosenList((prev) => prev.filter((x) => x.kode !== kode));
    hapusDoc('dosen', kode);
  }
  // Mengembalikan promise<boolean>: true hanya setelah server Firestore mengonfirmasi
  // tulisan (dipakai editor Pengaturan untuk memunculkan centang "tersimpan").
  // Pemanggil lain boleh mengabaikan nilainya.
  function simpanConfig(next) {
    setConfig(next);
    const perkiraanUkuran = new Blob([JSON.stringify(next)]).size;
    if (perkiraanUkuran > DOC_SAFE_LIMIT) {
      alert(`Gagal menyimpan: data konfigurasi sudah ${Math.round(perkiraanUkuran / 1024)} KB, mendekati/melebihi batas 1 MiB per dokumen Firestore. Perubahan ini TIDAK disimpan.`);
      return Promise.resolve(false);
    }
    return setDoc(doc(db, 'config', 'global'), next).then(() => true).catch((e) => {
      console.error('FB err:', e);
      alert('Gagal menyimpan perubahan ke server: ' + (e.message || e) + '\n\nPerubahan Anda BELUM tersimpan secara permanen. Coba lagi, atau hubungi admin.');
      return false;
    });
  }
  function bukaPeriode(p) {
    const v = (p || '').trim();
    if (!v) return;
    const list = config.periodeBuka || [];
    if (list.includes(v)) return;
    const next = { ...config, periodeBuka: [...list, v] };
    // Belum ada daftarPeriode: biarkan kosong supaya isiDaftarPeriode tetap berjalan.
    const tercatat = config.daftarPeriode;
    if (Array.isArray(tercatat) && !tercatat.includes(v)) next.daftarPeriode = [...tercatat, v];
    simpanConfig(next);
  }
  function tutupPeriode(p) {
    simpanConfig({ ...config, periodeBuka: (config.periodeBuka || []).filter((x) => x !== p) });
  }
  function simpanPengumuman(list) {
    simpanConfig({ ...config, pengumuman: list });
  }
  function setPeriodeAktif(v) {
    simpanConfig({ ...config, periodeAktif: v });
  }
  function simpanPanduan(list) {
    simpanConfig({ ...config, panduan: list });
  }
  function simpanKonten(next) {
    return simpanConfig({ ...config, konten: next });
  }
  function tambahAngkatan(label) {
    const v = (label || '').trim();
    if (!v) return;
    if ((data.angkatan || []).some((a) => a.id === v)) return;
    writeDoc('angkatan', v, { label: v, isActive: true }, 'angkatan');
  }

  // ----- Belum diketahui status login (Firebase Auth belum selesai cek) -----
  if (authUser === undefined) {
    return <Muat>Memuat…</Muat>;
  }

  // ----- Belum login -----
  if (!authUser || !claims) {
    return <Login pengumuman={data.pengumuman || PENGUMUMAN_AWAL} periodeAktif={data.periodeAktif || ''} />;
  }

  // ----- Domain terbatas: hanya super admin & akun uji yang boleh lanjut -----
  if (!bolehMasukDomainIni(claims)) return <DomainDitolak onLogout={keluar} />;

  // ----- Profil sesuai peran (dari custom claim), untuk cek mustChangePassword & data tampilan -----
  const profilAkun = claims.role === 'student' ? (data.akun || []).find((a) => a.uid === authUser.uid) : null;
  const profilDosen = claims.role === 'lecturer' ? (data.dosen || []).find((d) => d.kode === claims.kode) : null;
  const profilAdmin = claims.role === 'admin' ? adminList.find((a) => a.uid === authUser.uid) : null;
  const profil = profilAkun || profilDosen || profilAdmin;
  const profilRefPath = profilAkun ? ['akun', profilAkun.nim] : profilDosen ? ['dosen', profilDosen.kode] : profilAdmin ? ['admin', profilAdmin.uid] : null;

  if (profil && profilRefPath && profil.mustChangePassword) {
    return dgnSesi(
      <GantiPasswordWajib
        onLogout={keluar}
        onSelesai={(passwordBaru) => changeOwnPassword(passwordBaru, doc(db, ...profilRefPath))}
      />
    );
  }

  // ----- Login sebagai dosen -----
  if (claims.role === 'lecturer') {
    const ds = profilDosen;
    if (!ds) return <Muat onLogout={keluar}>Memuat profil dosen…</Muat>;
    return dgnSesi(
      <DosenPortal
        dosen={ds}
        allDosen={data.dosen}
        mahasiswa={data.mahasiswa}
        periodeList={periodeList}
        onLogout={keluar}
      />
    );
  }

  // ----- Login sebagai mahasiswa -----
  if (claims.role === 'student') {
    const akunProfil = profilAkun;
    if (!akunProfil) return <Muat onLogout={keluar}>Memuat profil mahasiswa…</Muat>;
    const nim = akunProfil.nim;
    const namaMhs = akunProfil.nama || nim;
    // Alamat sendiri (/panduan), sama pola dengan /pengaturan di bawah —
    // supaya bisa dibuka langsung/dibagikan, bukan cuma dropdown di header.
    if (route === '/panduan') {
      return dgnSesi(
        <PanduanPage
          nama={namaMhs}
          nim={nim}
          panduan={data.panduan || []}
          onBack={() => navigate('/')}
          onLogout={keluar}
        />
      );
    }
    return dgnSesi(
      <Portal
        nim={nim}
        nama={namaMhs}
        email={akunProfil.email || ''}
        mahasiswa={data.mahasiswa}
        allDosen={data.dosen}
        periodeBuka={periodeBuka}
        angkatanAktif={angkatanAktif}
        panduan={data.panduan || []}
        konten={data.konten || {}}
        jadwalRuang={jadwalRuang}
        onSave={simpanMahasiswa}
        onDelete={hapusMahasiswa}
        onSimpanAkun={async (profil) => {
          const { nimBerubah } = await studentUpdateProfile(profil);
          if (nimBerubah) await refreshClaims();
        }}
        onLogout={keluar}
        onOpenPanduan={() => navigate('/panduan')}
        initialTab={route === '/akun' ? 'akun' : 'pengajuan'}
      />
    );
  }

  // ----- Login sebagai admin -----
  if (claims.role !== 'admin' || !profilAdmin) {
    const labelPeran = claims.role === 'admin' ? 'admin' : claims.role === 'student' ? 'mahasiswa' : claims.role === 'lecturer' ? 'dosen' : 'akun';
    return <Muat onLogout={keluar}>{`Memuat profil ${labelPeran}…`}</Muat>;
  }

  // ----- Halaman Pengaturan (admin) — alamat terpisah (/pengaturan), bukan tab -----
  if (route === '/pengaturan' || route.startsWith('/pengaturan/')) {
    return dgnSesi(
      <div className="app">
        <header className="topbar">
          <div className="topbar-left">
            <button className="btn btn-logout btn-sm" onClick={keluar}>Logout</button>
            <RolePill peran={claims.super ? "superadmin" : "admin"} nama={profilAdmin.nama} judul={claims.super ? "Super Admin" : "Admin"} />
          </div>
          <div className="brand">
            <img className="brand-mark" src={logoTl} alt="TL Undip" />
            <span className="brand-name">SIMANTAP</span>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <TextSizeToggle />
            <button className="btn ghost" onClick={kembaliKeAdmin}>← Kembali</button>
          </div>
        </header>
        <div className="masthead-rule" />
        <main className="content">
          <Pengaturan
            seksi={route.split('/')[2] || ''}
            onPindahSeksi={(slug) => pindah('/pengaturan/' + slug)}
            periodeBuka={periodeBuka}
            periodeAktif={data.periodeAktif || ''}
            onBukaPeriode={bukaPeriode}
            onTutupPeriode={tutupPeriode}
            onSetPeriodeAktif={setPeriodeAktif}
            pengumuman={data.pengumuman || PENGUMUMAN_AWAL}
            onSimpanPengumuman={simpanPengumuman}
            panduan={data.panduan || []}
            onSimpanPanduan={simpanPanduan}
            konten={data.konten || {}}
            onSimpanKonten={simpanKonten}
            jadwalRuang={jadwalRuang}
            aksiJadwalRuang={aksiJadwalRuang}
            akun={data.akun || []}
            dosen={data.dosen || []}
            mahasiswa={data.mahasiswa || []}
            admin={adminList}
            angkatan={data.angkatan || []}
            onTambahAngkatan={tambahAngkatan}
            onToggleAngkatanAktif={(id, isActive) => writeDoc('angkatan', id, { ...(data.angkatan || []).find((a) => a.id === id), isActive }, 'angkatan')}
            onResetPassword={adminResetPassword}
            onCreateUser={adminCreateUser}
            onEditDosen={simpanDosen}
            isSuperAdmin={!!claims.super}
            currentAdminUid={authUser.uid}
            onDeleteAdmin={async (uid) => { await adminDeleteAdmin(uid); }}
            onClaimSuperAdmin={async () => { await claimSuperAdmin(); await refreshClaims(); }}
            onUpdateSelfAdmin={adminUpdateSelf}
            onToggleAkunAktif={(nim, isActive) => writeDoc('akun', nim, { ...(data.akun || []).find((a) => a.nim === nim), isActive }, 'akun')}
            onDeleteAkun={hapusAkun}
            onToggleDosenAktif={(kode, isActive) => writeDoc('dosen', kode, { ...(data.dosen || []).find((d) => d.kode === kode), isActive }, 'dosen')}
          />
        </main>
        <footer className="foot">SIMANTAP © 2026 Universitas Diponegoro</footer>
      </div>
    );
  }

  const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'mahasiswa', label: 'Mahasiswa' },
    { key: 'dosen', label: 'Dosen' },
    ...(FITUR_RUANG ? [{ key: 'ruang', label: 'Penggunaan Ruang' }] : []),
  ];

  return dgnSesi(
    <div className="app-root">
      <div className="mobile-bar">
        <div className="mobile-bar-left">
          <button type="button" className="icon-btn-outline hamburger" onClick={() => setMenuOpen(true)} title="Menu" aria-label="Buka menu" aria-expanded={menuOpen}>
            <HamburgerIcon />
          </button>
          <ThemeToggle />
        </div>
        <div className="mobile-bar-brand">
          <span className="brand-name">SIMANTAP</span>
          <img className="brand-mark" src={logoTl} alt="TL Undip" />
        </div>
      </div>
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <nav className={'sidebar' + (menuOpen ? ' sidebar-open' : '') + (pinned ? ' sidebar-pinned' : '')}>
        <div className="sidebar-brand">
          <img className="brand-mark" src={logoTl} alt="TL Undip" />
          <span className="brand-name">SIMANTAP</span>
          <button type="button" className="sidebar-pin" onClick={togglePin} aria-pressed={pinned} title={pinned ? 'Lepas sematan' : 'Sematkan sidebar'} aria-label={pinned ? 'Lepas sematan sidebar' : 'Sematkan sidebar'}>
            <svg viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 17v5" />
              <path d="M9 3h6l-1 6 3.5 3.5V15h-11v-2.5L10 9z" />
            </svg>
          </button>
        </div>
        <div className="sidebar-role">
          <RolePill peran={claims.super ? "superadmin" : "admin"} nama={profilAdmin.nama} judul={claims.super ? "Super Admin" : "Admin"} />
        </div>
        <div className="sidebar-periode">
          <Dropdown
            className="periode-pick"
            value={periode}
            onChange={pilihPeriode}
            ariaLabel="Periode"
            options={[...periodeList.map((pp) => ({ value: pp, label: pp })), { value: SEMUA, label: 'Semua periode' }]}
          />
        </div>
        {TABS.map((t) => (
          <button key={t.key} className={'sidebar-item sidebar-nav' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)} title={t.label}>
            <TabIcon tabKey={t.key} />
            <span>{t.label}</span>
          </button>
        ))}
        {/* Mobile saja: filter program (Dashboard & Mahasiswa). Menu utama pindah ke bar bawah. */}
        {(tab === 'dashboard' || tab === 'mahasiswa') && (
          <div className="sidebar-programs">
            <div className="sidebar-section">Program</div>
            {[...(tab === 'dashboard' ? ['ALL'] : []), ...PROGRAM_KEYS].map((p) => {
              const aktifP = (tab === 'dashboard' ? dashProg : mhsProg) === p;
              return (
                <button
                  key={p}
                  type="button"
                  className={'sidebar-item' + (aktifP ? ' active' : '')}
                  onClick={() => { (tab === 'dashboard' ? setDashProg : setMhsProg)(p); setMenuOpen(false); }}
                >
                  <span>{p === 'ALL' ? 'Semua' : programLabel(p)}</span>
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className="sidebar-item sidebar-settings" onClick={() => { setMenuOpen(false); navigate('/pengaturan'); }} title="Pengaturan" aria-label="Pengaturan">
          <img src={gearIcon} alt="" width={20} height={20} className="gear-icon" />
          <span>Pengaturan</span>
        </button>
        <button type="button" className="sidebar-item sidebar-logout" onClick={keluar} title="Logout" aria-label="Logout">
          <LogoutIcon className="tab-icon" />
          <span>Logout</span>
        </button>
      </nav>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left topbar-role">
            <RolePill peran={claims.super ? "superadmin" : "admin"} nama={profilAdmin.nama} judul={claims.super ? "Super Admin" : "Admin"} />
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <TextSizeToggle />
            <Dropdown
              className="periode-pick"
              value={periode}
              onChange={pilihPeriode}
              ariaLabel="Periode"
              options={[...periodeList.map((pp) => ({ value: pp, label: pp })), { value: SEMUA, label: 'Semua periode' }]}
            />
            <button className="icon-btn topbar-gear" onClick={() => navigate('/pengaturan')} title="Pengaturan" aria-label="Pengaturan">
              <img src={gearIcon} alt="" width={20} height={20} className="gear-icon" />
            </button>
          </div>
        </header>
        <div className="masthead-rule" />

        <main className="content">
          {mhsAdmin.memuat && <p className="hint muat-mhs" role="status">Memuat data mahasiswa…</p>}
          {mhsAdmin.gagal && (
            <div className="banner-galat" role="alert">
              <span>Sebagian data mahasiswa gagal dimuat, jadi angka dan daftar di bawah mungkin belum lengkap.</span>
              <button type="button" className="btn btn-sm" onClick={mhsAdmin.cobaLagi}>Coba lagi</button>
            </div>
          )}
          {tab === 'dashboard' && <Dashboard mahasiswa={mhsRingkas} ringkasLulus={ringkasProp} dosen={data.dosen} prog={dashProg} setProg={setDashProg} />}
          {tab === 'mahasiswa' && (
            <Mahasiswa params={rute.params} programTab={mhsProg} setProgramTab={setMhsProg} jadwalRuang={jadwalRuang} mahasiswa={mhsPeriode} allMahasiswa={data.mahasiswa} allDosen={data.dosen} periode={periode} periodeList={periodeList} daftarAngkatan={daftarAngkatan} konten={data.konten || {}} onSave={simpanMahasiswa} onDelete={hapusMahasiswa} onMuatSemua={mhsAdmin.muatSemua} onMuatPeriode={mhsAdmin.muatPeriode} />
          )}
          {FITUR_RUANG && tab === 'ruang' && <PenggunaanRuangPortal mahasiswa={mhsPeriode} semuaMahasiswa={data.mahasiswa || []} jadwalRuang={jadwalRuang} dosen={data.dosen || []} aksi={aksiJadwalRuang} catatanSinkron={sinkronTidakMasuk} />}
          {tab === 'dosen' && (
            <Dosen dosen={data.dosen} mahasiswa={mhsRingkas} ringkasLulus={ringkasProp} periodeLabel={periode === SEMUA ? 'semua periode' : periode} onSave={simpanDosen} onDelete={hapusDosen} />
          )}
        </main>

        <footer className="foot">SIMANTAP © 2026 Universitas Diponegoro</footer>
      </div>

      <nav className="bottom-bar" aria-label="Menu utama">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={'bottom-bar-item' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)} title={t.label} aria-label={t.label}>
            <TabIcon tabKey={t.key} />
          </button>
        ))}
      </nav>
    </div>
  );
}
