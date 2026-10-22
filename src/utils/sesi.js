import { useEffect, useState } from 'react';
import { getIdTokenResult } from 'firebase/auth';
import { auth } from './firebase.js';
import { logout } from './auth.js';

// ===================== Batas sesi login =====================
// Firebase Auth menyimpan login di localStorage (satu login untuk semua tab) tanpa batas
// waktu. Sesi diakhiri di sini bila:
//   - semua tab SIMANTAP sudah ditutup (dicek saat tab baru dibuka, siapkanSesi);
//   - tidak ada aktivitas di tab mana pun selama BATAS_DIAM peran itu;
//   - sudah BATAS_SESI sejak login, aktif atau tidak. Batas ini juga ditolak di
//     firestore.rules & storage.rules (isSignedIn), jadi tidak bisa dilewati dari klien.

export const BATAS_DIAM = { admin: 30 * 60e3, lecturer: 60 * 60e3, student: 120 * 60e3 };
export const BATAS_SESI = 12 * 60 * 60e3; // samakan dengan 43200 detik di kedua file rules
export const PERINGATAN = 60e3;

const KUNCI_AKTIVITAS = 'simantap-aktivitas-terakhir'; // localStorage, dibagi semua tab
const KUNCI_TAB = 'simantap-tab-terbuka'; // sessionStorage: ada = tab ini (atau reload-nya) pernah login
export const KUNCI_ALASAN = 'simantap-alasan-keluar'; // localStorage, dibaca halaman Login
const KANAL = 'simantap-sesi';

const simpan = (penyimpanan, kunci, nilai) => { try { penyimpanan.setItem(kunci, nilai); } catch { /* diblokir */ } };
const baca = (penyimpanan, kunci) => { try { return penyimpanan.getItem(kunci); } catch { return null; } };

export function catatAktivitas() { simpan(localStorage, KUNCI_AKTIVITAS, String(Date.now())); }
const aktivitasTerakhir = () => Number(baca(localStorage, KUNCI_AKTIVITAS)) || 0;

export async function keluarOtomatis(alasan) {
  simpan(localStorage, KUNCI_ALASAN, alasan);
  await logout();
}

const batasDiam = (role) => BATAS_DIAM[role] || BATAS_DIAM.admin;

// Tanya tab lain "masih ada?" lewat BroadcastChannel. Tab latar belakang tetap menjawab
// walau timernya diperlambat browser. Tanpa BroadcastChannel dianggap masih ada.
function adaTabLain(tunggu = 400) {
  if (typeof BroadcastChannel === 'undefined') return Promise.resolve(true);
  return new Promise((selesai) => {
    const kanal = new BroadcastChannel(KANAL);
    let ada = false;
    kanal.onmessage = (e) => { if (e.data === 'ada') ada = true; };
    kanal.postMessage('siapa');
    setTimeout(() => { kanal.close(); selesai(ada); }, tunggu);
  });
}

// Dipanggil sekali dari main.jsx sebelum App dirender. Reload atau tab yang dipulihkan
// browser membawa sessionStorage-nya, jadi tidak dihitung sebagai "semua tab ditutup".
export async function siapkanSesi() {
  await auth.authStateReady();
  const tabIniLama = baca(sessionStorage, KUNCI_TAB) === '1';
  simpan(sessionStorage, KUNCI_TAB, '1');
  const user = auth.currentUser;
  if (!user) return;
  if (!tabIniLama && !(await adaTabLain())) { await logout(); return; }
  try {
    const token = await getIdTokenResult(user);
    if (Date.now() - new Date(token.authTime).getTime() >= BATAS_SESI) { await keluarOtomatis('batas'); return; }
    // Komputer tidur / browser dibiarkan terbuka semalam: batas diam sudah lewat sejak lama.
    if (Date.now() - aktivitasTerakhir() >= batasDiam(token.claims.role)) await keluarOtomatis('diam');
  } catch (e) {
    console.error('Gagal memeriksa sesi:', e);
  }
}

// Setelah siapkanSesi selesai: jawab pertanyaan tab yang baru dibuka.
export function jawabTabLain() {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const kanal = new BroadcastChannel(KANAL);
  kanal.onmessage = (e) => { if (e.data === 'siapa') kanal.postMessage('ada'); };
  return () => kanal.close();
}

const PERISTIWA = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove', 'scroll'];

// Selama login: catat aktivitas (paling sering tiap 5 detik), periksa batas tiap detik
// (untuk hitung mundur peringatan). Aktivitas apa pun juga menutup peringatan "diam".
// Mengembalikan { jenis: 'diam' | 'batas', sisa } saat <= PERINGATAN, atau null.
export function useBatasSesi(authUser, role) {
  const [peringatan, setPeringatan] = useState(null);

  useEffect(() => {
    if (!authUser) { setPeringatan(null); return undefined; }
    let authTime = null;
    let batal = false;
    getIdTokenResult(authUser).then((t) => { if (!batal) authTime = new Date(t.authTime).getTime(); }).catch(() => {});
    catatAktivitas(); // login baru: hitungan diam mulai dari sekarang, bukan dari sesi kemarin

    let terakhirDicatat = Date.now();
    const onAktif = () => {
      if (Date.now() - terakhirDicatat < 5000) return;
      terakhirDicatat = Date.now();
      catatAktivitas();
    };
    const periksa = () => {
      const now = Date.now();
      const sisaDiam = batasDiam(role) - (now - aktivitasTerakhir());
      const sisaSesi = authTime ? BATAS_SESI - (now - authTime) : Infinity;
      if (sisaSesi <= 0) { keluarOtomatis('batas'); return; }
      if (sisaDiam <= 0) { keluarOtomatis('diam'); return; }
      if (sisaSesi <= PERINGATAN) setPeringatan({ jenis: 'batas', sisa: sisaSesi });
      else if (sisaDiam <= PERINGATAN) setPeringatan({ jenis: 'diam', sisa: sisaDiam });
      else setPeringatan(null);
    };
    PERISTIWA.forEach((p) => window.addEventListener(p, onAktif, { passive: true }));
    // Aktivitas di tab lain langsung menutup peringatan di tab ini.
    const onStorage = (e) => { if (e.key === KUNCI_AKTIVITAS) periksa(); };
    window.addEventListener('storage', onStorage);
    const timer = setInterval(periksa, 1000);
    return () => {
      batal = true;
      PERISTIWA.forEach((p) => window.removeEventListener(p, onAktif));
      window.removeEventListener('storage', onStorage);
      clearInterval(timer);
    };
  }, [authUser, role]);

  return peringatan;
}

// Dibaca halaman Login; dihapus lagi saat login berikutnya.
export function alasanKeluar() { return baca(localStorage, KUNCI_ALASAN); }
export function hapusAlasanKeluar() { try { localStorage.removeItem(KUNCI_ALASAN); } catch { /* diblokir */ } }
