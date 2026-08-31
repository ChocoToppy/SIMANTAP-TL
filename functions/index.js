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

async function writeAuditLog(entry) {
  await db.collection('auditLog').add({ at: admin.firestore.FieldValue.serverTimestamp(), ...entry });
}

// ----- 1. Default role untuk setiap akun Auth baru -----
// Jaring pengaman: mahasiswa mendaftar sendiri lewat Firebase Auth (email +
// password), jadi begitu akunnya dibuat, langsung diberi klaim role='student'.
// completeStudentRegistration (di bawah) akan menegaskan ulang klaim ini dan
// menulis profil Firestore-nya; adminCreateUser akan MENIMPA klaim ini untuk
// akun dosen/admin yang dibuat admin.
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
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
exports.adminCreateUser = functions.https.onCall(async (data, context) => {
  requireAdmin(context);

  const role = data.role === 'admin' ? 'admin' : 'lecturer';
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
  const userRecord = await auth.createUser({ email, password: tempPassword, displayName: nama });
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
