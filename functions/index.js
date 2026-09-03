// ===================== functions/index.js =====================
// Backend Cloud Functions untuk autentikasi & otorisasi berbasis peran.
// Semua penetapan/perubahan role dan reset password HARUS lewat sini
// (Admin SDK) — klien tidak pernah boleh menulis custom claim sendiri.

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function randomPassword(len = 10) {
  let out = '';
  for (let i = 0; i < len; i++) out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  return out;
}

function requireAdmin(context) {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Hanya admin yang boleh melakukan aksi ini.');
  }
}

// Super admin: admin dengan custom claim tambahan `super: true` — satu-satunya
// yang boleh menambah/menghapus akun admin lain, supaya admin biasa tidak
// bisa saling menghapus atau membuat admin baru tanpa sepengetahuan pemilik.
function requireSuperAdmin(context) {
  requireAdmin(context);
  if (!context.auth.token.super) {
    throw new functions.https.HttpsError('permission-denied', 'Hanya super admin yang boleh melakukan aksi ini.');
  }
}

async function writeAuditLog(entry) {
  await db.collection('auditLog').add({ at: admin.firestore.FieldValue.serverTimestamp(), ...entry });
}

// ----- 1. Default role untuk setiap akun Auth baru -----
// Jaring pengaman: mahasiswa mendaftar sendiri lewat Firebase Auth (email +
// password), jadi begitu akunnya dibuat, langsung diberi klaim role='student'.
// completeStudentRegistration (di bawah) akan menegaskan ulang klaim ini dan
// menulis profil Firestore-nya.
//
// PENTING: trigger ini juga menyala untuk akun yang dibuat admin lewat
// adminCreateUser (trigger Auth onCreate menyala untuk SEMUA pembuatan akun,
// apa pun caranya). adminCreateUser menyetel klaim role='admin'/'lecturer'
// sendiri di dalam pemanggilan yang sama, tapi trigger latar belakang ini
// berjalan terpisah dan bisa menyala BELAKANGAN (ada jeda cold start/event
// propagation) — kalau tetap menimpa tanpa syarat, klaim admin/dosen yang
// baru saja diset bisa balik jadi 'student' beberapa saat kemudian. Karena
// itu di sini cek dulu: kalau akun sudah punya klaim role (berarti dibuat
// lewat adminCreateUser), jangan sentuh.
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const current = await auth.getUser(user.uid);
  if (current.customClaims && current.customClaims.role) return;
  await auth.setCustomUserClaims(user.uid, { role: 'student' });
});

// ----- 2. Pendaftaran mandiri mahasiswa: buat profil akun/loginIndex -----
exports.completeStudentRegistration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Anda harus login untuk menyelesaikan pendaftaran.');
  }
  const nim = String(data.nim || '').trim();
  const nama = String(data.nama || '').trim();
  const email = context.auth.token.email || '';
  if (!nim || !nama) {
    throw new functions.https.HttpsError('invalid-argument', 'NIM dan nama wajib diisi.');
  }

  const akunRef = db.collection('akun').doc(nim);
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(akunRef);
    if (existing.exists) {
      throw new functions.https.HttpsError('already-exists', 'NIM sudah terdaftar.');
    }
    tx.set(akunRef, {
      nim, nama, email,
      uid: context.auth.uid,
      isActive: true,
      mustChangePassword: false,
    });
    tx.set(db.collection('loginIndex').doc(nim), { email });
  });

  // nim disematkan di custom claim (bukan hanya role) supaya aturan Firestore
  // bisa membandingkan resource.data.owner == request.auth.token.nim secara
  // langsung tanpa get() ke dokumen lain — itu yang membuat query "list" milik
  // mahasiswa (mis. daftar mahasiswa/akun miliknya) bisa lolos validasi aturan.
  await auth.setCustomUserClaims(context.auth.uid, { role: 'student', nim });
  return { ok: true };
});

// ----- 3. Admin membuat akun dosen/admin baru -----
// Membuat admin baru dibatasi super admin saja; membuat dosen tetap boleh
// admin biasa.
exports.adminCreateUser = functions.https.onCall(async (data, context) => {
  const role = data.role === 'admin' ? 'admin' : 'lecturer';
  if (role === 'admin') requireSuperAdmin(context); else requireAdmin(context);
  const nama = String(data.nama || '').trim();
  const email = String(data.email || '').trim();
  if (!nama || !email) {
    throw new functions.https.HttpsError('invalid-argument', 'Nama dan email wajib diisi.');
  }

  let kode = '';
  if (role === 'lecturer') {
    kode = String(data.kode || '').trim().toUpperCase();
    if (!kode) throw new functions.https.HttpsError('invalid-argument', 'Kode dosen wajib diisi.');
    const existingDosen = await db.collection('dosen').doc(kode).get();
    if (existingDosen.exists && existingDosen.data().uid) {
      throw new functions.https.HttpsError('already-exists', 'Kode dosen ini sudah punya akun login.');
    }
  }

  const tempPassword = randomPassword();
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password: tempPassword, displayName: nama });
  } catch (e) {
    if (e.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Email ini sudah dipakai akun lain (mahasiswa/dosen/admin). Gunakan email lain.');
    }
    throw new functions.https.HttpsError('internal', 'Gagal membuat akun: ' + e.message);
  }
  await auth.setCustomUserClaims(userRecord.uid, role === 'admin' ? { role: 'admin' } : { role: 'lecturer', kode });

  const loginId = role === 'lecturer' ? (String(data.nip || '').trim().replace(/\s/g, '') || kode) : email;

  if (role === 'lecturer') {
    await db.collection('dosen').doc(kode).set({
      kode, nama, email, uid: userRecord.uid,
      nip: String(data.nip || '').trim(),
      kompetensi: String(data.kompetensi || '').trim(),
      isActive: true, mustChangePassword: true,
    }, { merge: true });
  } else {
    await db.collection('admin').doc(userRecord.uid).set({
      nama, email, isActive: true, mustChangePassword: true,
    });
  }
  await db.collection('loginIndex').doc(loginId).set({ email });

  await writeAuditLog({
    action: 'adminCreateUser', byUid: context.auth.uid, byEmail: context.auth.token.email || '',
    targetUid: userRecord.uid, targetIdentifier: loginId, targetRole: role,
  });

  return { ok: true, tempPassword, loginId };
});

// ----- 4. Admin mereset password akun manapun -----
exports.adminResetPassword = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const targetUid = String(data.uid || '').trim();
  if (!targetUid) throw new functions.https.HttpsError('invalid-argument', 'uid target wajib diisi.');

  const tempPassword = randomPassword();
  await auth.updateUser(targetUid, { password: tempPassword });

  // Cari & tandai mustChangePassword pada profil Firestore yang cocok.
  const collections = ['akun', 'dosen', 'admin'];
  let targetRole = 'unknown';
  let targetIdentifier = targetUid;
  for (const col of collections) {
    const snap = await db.collection(col).where('uid', '==', targetUid).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ mustChangePassword: true });
      targetRole = col === 'akun' ? 'student' : col === 'dosen' ? 'lecturer' : 'admin';
      targetIdentifier = snap.docs[0].id;
      break;
    } else if (col === 'admin') {
      const adminDoc = await db.collection('admin').doc(targetUid).get();
      if (adminDoc.exists) {
        await adminDoc.ref.update({ mustChangePassword: true });
        targetRole = 'admin';
        targetIdentifier = targetUid;
      }
    }
  }

  await writeAuditLog({
    action: 'adminResetPassword', byUid: context.auth.uid, byEmail: context.auth.token.email || '',
    targetUid, targetIdentifier, targetRole,
  });

  return { ok: true, tempPassword };
});

// ----- 5. Super admin menghapus akun admin lain -----
exports.adminDeleteAdmin = functions.https.onCall(async (data, context) => {
  requireSuperAdmin(context);

  const targetUid = String(data.uid || '').trim();
  if (!targetUid) throw new functions.https.HttpsError('invalid-argument', 'uid target wajib diisi.');
  if (targetUid === context.auth.uid) {
    throw new functions.https.HttpsError('failed-precondition', 'Tidak bisa menghapus akun sendiri.');
  }

  const adminRef = db.collection('admin').doc(targetUid);
  const adminSnap = await adminRef.get();
  if (!adminSnap.exists) throw new functions.https.HttpsError('not-found', 'Akun admin ini tidak ditemukan.');
  const email = adminSnap.data().email || '';

  const batch = db.batch();
  batch.delete(adminRef);
  if (email) batch.delete(db.collection('loginIndex').doc(email));
  await batch.commit();

  await auth.deleteUser(targetUid).catch((e) => {
    if (e.code !== 'auth/user-not-found') throw e;
  });

  await writeAuditLog({
    action: 'adminDeleteAdmin', byUid: context.auth.uid, byEmail: context.auth.token.email || '',
    targetUid, targetIdentifier: email, targetRole: 'admin',
  });

  return { ok: true };
});

// ----- 6. Klaim super admin pertama kali (bootstrap) -----
// Tidak ada cara lain untuk menjadikan seseorang super admin pertama kali
// (ayam-telur: butuh super admin untuk membuat super admin) — jadi admin
// mana pun boleh mengklaim status ini SELAMA belum ada satupun super admin
// terdaftar. Begitu ada satu, jalur ini otomatis terkunci untuk semua admin
// lain; super admin berikutnya hanya bisa ditetapkan lewat aksi manual di
// Firestore/Auth oleh yang sudah jadi super admin (belum ada UI untuk itu
// karena biasanya cukup satu).
exports.claimSuperAdmin = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const existing = await db.collection('admin').where('superAdmin', '==', true).limit(1).get();
  if (!existing.empty) {
    throw new functions.https.HttpsError('already-exists', 'Sudah ada super admin terdaftar.');
  }

  await auth.setCustomUserClaims(context.auth.uid, { role: 'admin', super: true });
  await db.collection('admin').doc(context.auth.uid).set({ superAdmin: true }, { merge: true });

  await writeAuditLog({
    action: 'claimSuperAdmin', byUid: context.auth.uid, byEmail: context.auth.token.email || '',
    targetUid: context.auth.uid, targetIdentifier: context.auth.token.email || '', targetRole: 'admin',
  });

  return { ok: true };
});

// ----- 7. Admin memperbarui profil sendiri (nama semua admin; email khusus
// super admin) -----
exports.adminUpdateSelf = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const uid = context.auth.uid;
  const adminRef = db.collection('admin').doc(uid);
  const adminSnap = await adminRef.get();
  if (!adminSnap.exists) throw new functions.https.HttpsError('not-found', 'Profil admin tidak ditemukan.');
  const adminData = adminSnap.data();

  const nama = String(data.nama || '').trim();
  if (!nama) throw new functions.https.HttpsError('invalid-argument', 'Nama wajib diisi.');

  const currentEmail = adminData.email || '';
  const newEmail = data.email !== undefined ? String(data.email).trim() : currentEmail;
  const emailBerubah = newEmail !== currentEmail;

  if (emailBerubah) {
    if (!context.auth.token.super) {
      throw new functions.https.HttpsError('permission-denied', 'Hanya super admin yang boleh mengubah email.');
    }
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new functions.https.HttpsError('invalid-argument', 'Format email tidak valid.');
    }
    try {
      await auth.updateUser(uid, { email: newEmail });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'Email ini sudah dipakai akun lain.');
      }
      throw new functions.https.HttpsError('internal', 'Gagal memperbarui email: ' + e.message);
    }
  }

  const batch = db.batch();
  batch.update(adminRef, { nama, email: newEmail });
  if (emailBerubah) {
    if (currentEmail) batch.delete(db.collection('loginIndex').doc(currentEmail));
    batch.set(db.collection('loginIndex').doc(newEmail), { email: newEmail });
  }
  await batch.commit();

  await writeAuditLog({
    action: 'adminUpdateSelf', byUid: uid, byEmail: newEmail,
    targetUid: uid, targetIdentifier: newEmail, targetRole: 'admin',
  });

  return { ok: true, emailBerubah };
});

// ----- 8. Admin menghapus akun mahasiswa (login + profil + data KP terkait) -----
// Menghapus: akun Auth, akun/{nim}, loginIndex/{nim}, dan semua dokumen
// 'mahasiswa' (data pengajuan KP) milik nim ini. Berkas di Storage TIDAK
// dihapus di sini (Admin SDK Storage tidak dipakai di fungsi ini) — klien
// membersihkannya sendiri lewat deleteUploadedFolder untuk tiap id yang
// dikembalikan, sama seperti alur hapusMahasiswa yang sudah ada.
exports.adminDeleteStudent = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const nim = String(data.nim || '').trim();
  if (!nim) throw new functions.https.HttpsError('invalid-argument', 'NIM wajib diisi.');

  const akunRef = db.collection('akun').doc(nim);
  const akunSnap = await akunRef.get();
  if (!akunSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Akun dengan NIM ini tidak ditemukan.');
  }
  const uid = akunSnap.data().uid;

  const mahasiswaSnap = await db.collection('mahasiswa').where('owner', '==', nim).get();
  const deletedMahasiswaIds = mahasiswaSnap.docs.map((d) => d.id);

  const batch = db.batch();
  batch.delete(akunRef);
  batch.delete(db.collection('loginIndex').doc(nim));
  mahasiswaSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  if (uid) {
    await auth.deleteUser(uid).catch((e) => {
      if (e.code !== 'auth/user-not-found') throw e;
    });
  }

  await writeAuditLog({
    action: 'adminDeleteStudent', byUid: context.auth.uid, byEmail: context.auth.token.email || '',
    targetUid: uid || null, targetIdentifier: nim, targetRole: 'student',
  });

  return { ok: true, deletedMahasiswaIds };
});

// ----- 9. Mahasiswa memperbarui profil sendiri (nama, NIM, email aktif) -----
// Email di sini hanya dipakai admin sebagai kontak untuk reset password
// manual (lihat adminResetPassword) — tidak ada email verifikasi/reset
// otomatis yang dikirim dari sini. NIM adalah id dokumen akun & dipakai di
// custom claim serta field owner/nim pada dokumen 'mahasiswa' milik akun ini,
// jadi mengubahnya berarti memindahkan (rename) dokumen akun dan menulis
// ulang owner/nim di semua dokumen 'mahasiswa' terkait, bukan sekadar update
// field biasa.
exports.studentUpdateProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'student') {
    throw new functions.https.HttpsError('permission-denied', 'Hanya mahasiswa yang boleh melakukan aksi ini.');
  }
  const uid = context.auth.uid;
  const currentNim = context.auth.token.nim;
  if (!currentNim) throw new functions.https.HttpsError('failed-precondition', 'Akun ini belum terhubung ke NIM.');

  const nama = String(data.nama || '').trim();
  const newNim = String(data.nim || '').trim();
  const newEmail = String(data.email || '').trim();
  if (!nama || !newNim || !newEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'Nama, NIM, dan email wajib diisi.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new functions.https.HttpsError('invalid-argument', 'Format email tidak valid.');
  }

  const akunRef = db.collection('akun').doc(currentNim);
  const akunSnap = await akunRef.get();
  if (!akunSnap.exists) throw new functions.https.HttpsError('not-found', 'Profil akun tidak ditemukan.');
  const akunData = akunSnap.data();
  const nimBerubah = newNim !== currentNim;
  const emailBerubah = newEmail !== (akunData.email || '');

  if (nimBerubah) {
    const existing = await db.collection('akun').doc(newNim).get();
    if (existing.exists) throw new functions.https.HttpsError('already-exists', 'NIM tujuan sudah dipakai akun lain.');
  }

  if (emailBerubah) {
    try {
      await auth.updateUser(uid, { email: newEmail });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'Email ini sudah dipakai akun lain.');
      }
      throw new functions.https.HttpsError('internal', 'Gagal memperbarui email: ' + e.message);
    }
  }

  const mahasiswaSnap = nimBerubah
    ? await db.collection('mahasiswa').where('owner', '==', currentNim).get()
    : null;

  const batch = db.batch();
  if (nimBerubah) {
    batch.set(db.collection('akun').doc(newNim), { ...akunData, nim: newNim, nama, email: newEmail });
    batch.delete(akunRef);
    batch.delete(db.collection('loginIndex').doc(currentNim));
    batch.set(db.collection('loginIndex').doc(newNim), { email: newEmail });
    mahasiswaSnap.docs.forEach((d) => batch.update(d.ref, { owner: newNim, nim: newNim }));
  } else {
    batch.update(akunRef, { nama, email: newEmail });
    if (emailBerubah) batch.set(db.collection('loginIndex').doc(currentNim), { email: newEmail }, { merge: true });
  }
  await batch.commit();

  if (nimBerubah) {
    await auth.setCustomUserClaims(uid, { role: 'student', nim: newNim });
  }

  await writeAuditLog({
    action: 'studentUpdateProfile', byUid: uid, byEmail: newEmail,
    targetUid: uid, targetIdentifier: newNim, targetRole: 'student',
  });

  return { ok: true, nim: newNim, nimBerubah };
});
