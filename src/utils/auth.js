// ===================== auth.js =====================
// auth.js — pembungkus Firebase Authentication + Cloud Functions. Login
// tetap memakai NIM/NIP/email seperti tampilan lama; di baliknya semua akun
// adalah akun Firebase Auth asli (lihat firestore.rules & functions/index.js).

import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail, updatePassword, getIdTokenResult,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, functions } from './firebase.js';

// Mencari email yang terhubung ke sebuah NIM/NIP/email lewat koleksi publik
// loginIndex (read-only, get-per-id — lihat firestore.rules) sebelum login,
// karena Firebase Auth butuh email, bukan NIM/NIP.
async function resolveEmail(identifier) {
  const snap = await getDoc(doc(db, 'loginIndex', identifier.trim()));
  if (!snap.exists()) return null;
  return snap.data().email || null;
}

// tipe: 'mahasiswa' (NIM) | 'dosen' (NIP) | 'admin' (email langsung)
export async function loginWithIdentifier(tipe, identifier, password) {
  const email = tipe === 'admin' ? identifier.trim() : await resolveEmail(identifier);
  if (!email) throw new Error('NOT_FOUND');
  await signInWithEmailAndPassword(auth, email, password);
}

export async function registerStudent({ nim, nama, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  try {
    const complete = httpsCallable(functions, 'completeStudentRegistration');
    await complete({ nim: nim.trim(), nama: nama.trim() });
  } catch (e) {
    // Registrasi Firestore gagal (mis. NIM sudah dipakai) — hapus akun Auth
    // yang baru dibuat supaya tidak ada akun "yatim" tanpa profil.
    await cred.user.delete().catch(() => {});
    throw e;
  }
}

export function logout() {
  return signOut(auth);
}

export function sendReset(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

// Dipanggil dari layar "wajib ganti password" setelah login dengan password
// sementara (baru dibuat admin, atau hasil reset admin).
export async function changeOwnPassword(newPassword, profileRef) {
  await updatePassword(auth.currentUser, newPassword);
  await updateDoc(profileRef, { mustChangePassword: false });
}

// Ambil { role, kode? } dari custom claims token — dipanggil setelah login
// dan pada setiap perubahan status auth, dengan paksa refresh token supaya
// perubahan role oleh admin langsung terbaca.
export async function readClaims(user) {
  const result = await getIdTokenResult(user, true);
  return {
    role: result.claims.role || null,
    kode: result.claims.kode || null,
    nim: result.claims.nim || null,
    super: !!result.claims.super,
  };
}

// ----- Aksi admin (Pengaturan → Akun): semuanya lewat Cloud Functions, tidak
// pernah menulis custom claim / password langsung dari klien. -----

// payload dosen: { role: 'lecturer', nama, email, kode, nip, kompetensi }
// payload admin: { role: 'admin', nama, email }
export async function adminCreateUser(payload) {
  const call = httpsCallable(functions, 'adminCreateUser');
  const res = await call(payload);
  return res.data; // { ok, tempPassword, loginId }
}

export async function adminResetPassword(uid) {
  const call = httpsCallable(functions, 'adminResetPassword');
  const res = await call({ uid });
  return res.data; // { ok, tempPassword }
}

export async function adminDeleteStudent(nim) {
  const call = httpsCallable(functions, 'adminDeleteStudent');
  const res = await call({ nim });
  return res.data; // { ok, deletedMahasiswaIds }
}

export async function adminDeleteAdmin(uid) {
  const call = httpsCallable(functions, 'adminDeleteAdmin');
  const res = await call({ uid });
  return res.data; // { ok }
}

export async function claimSuperAdmin() {
  const call = httpsCallable(functions, 'claimSuperAdmin');
  const res = await call();
  return res.data; // { ok }
}

// payload: { nama, email? } — email hanya dipakai (dan hanya boleh berbeda
// dari email saat ini) untuk super admin; admin biasa cukup kirim { nama }.
export async function adminUpdateSelf(payload) {
  const call = httpsCallable(functions, 'adminUpdateSelf');
  const res = await call(payload);
  return res.data; // { ok, emailBerubah }
}

// ----- Mahasiswa mengubah profil sendiri (nama, NIM, email aktif) -----
export async function studentUpdateProfile({ nama, nim, email }) {
  const call = httpsCallable(functions, 'studentUpdateProfile');
  const res = await call({ nama, nim, email });
  return res.data; // { ok, nim, nimBerubah }
}
