// ===================== functions/migrate.js =====================
// Skrip migrasi SEKALI JALAN: pindahkan akun lama (password polos di
// Firestore / password bersama dosen & admin) ke Firebase Auth.
//
// Jalankan SETELAH akun/dosen yang sudah punya field `email` diisi, dan
// SEBELUM firestore.rules baru (yang mensyaratkan uid/isActive) di-deploy.
//
// Pakai:
//   cd functions
//   npm install
//   GOOGLE_APPLICATION_CREDENTIALS=path/ke/serviceAccount.json node migrate.js
//
// Mahasiswa tanpa email asli akan diberi email placeholder + mustChangePassword:true
// (dicatat di ringkasan akhir supaya admin bisa follow-up mengumpulkan email asli).

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const PLACEHOLDER_DOMAIN = 'placeholder.simantap-tl.local';

function randomPassword(len = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function migrateStudents() {
  const snap = await db.collection('akun').get();
  const needsEmail = [];
  for (const doc of snap.docs) {
    const nim = doc.id;
    const a = doc.data();
    if (a.uid) {
      // Sudah dimigrasi sebelumnya — pastikan custom claim (termasuk nim,
      // yang baru ditambahkan belakangan) tetap sinkron. Aman dijalankan ulang.
      await auth.setCustomUserClaims(a.uid, { role: 'student', nim }).catch((e) => {
        console.error(`Gagal me-refresh klaim ${nim}:`, e.message);
      });
      continue;
    }
    const hasRealEmail = !!a.email;
    const email = a.email || `${nim}@${PLACEHOLDER_DOMAIN}`;
    const password = a.password || randomPassword();
    let userRecord;
    try {
      userRecord = await auth.createUser({ email, password, displayName: a.nama || nim });
    } catch (e) {
      console.error(`Gagal membuat akun Auth untuk NIM ${nim}:`, e.message);
      continue;
    }
    await auth.setCustomUserClaims(userRecord.uid, { role: 'student', nim });
    await doc.ref.set({
      nim, nama: a.nama || '', email,
      uid: userRecord.uid, isActive: true,
      mustChangePassword: !hasRealEmail,
    }, { merge: true });
    // Password lama dihapus dari Firestore setelah berhasil dipindah ke Auth.
    await doc.ref.update({ password: admin.firestore.FieldValue.delete() });
    await db.collection('loginIndex').doc(nim).set({ email });
    if (!hasRealEmail) needsEmail.push(nim);
    console.log(`Mahasiswa ${nim}: OK${hasRealEmail ? '' : ' (email placeholder, perlu email asli)'}`);
  }
  return needsEmail;
}

async function migrateDosen() {
  const snap = await db.collection('dosen').get();
  const summary = [];
  for (const doc of snap.docs) {
    const kode = doc.id;
    const d = doc.data();
    if (d.uid) continue;
    if (!d.email) {
      console.warn(`Dosen ${kode} tidak punya email — dilewati, isi email dulu lalu jalankan ulang.`);
      continue;
    }
    const tempPassword = randomPassword();
    let userRecord;
    try {
      userRecord = await auth.createUser({ email: d.email, password: tempPassword, displayName: d.nama || kode });
    } catch (e) {
      console.error(`Gagal membuat akun Auth untuk dosen ${kode}:`, e.message);
      continue;
    }
    await auth.setCustomUserClaims(userRecord.uid, { role: 'lecturer', kode });
    await doc.ref.set({ uid: userRecord.uid, isActive: true, mustChangePassword: true }, { merge: true });
    await db.collection('loginIndex').doc(String(d.nip || kode).trim().replace(/\s/g, '')).set({ email: d.email });
    summary.push({ kode, email: d.email, tempPassword });
    console.log(`Dosen ${kode}: OK (temp password ${tempPassword})`);
  }
  return summary;
}

async function migrateAdmin(adminEmail) {
  if (!adminEmail) {
    console.warn('Tidak ada ADMIN_EMAIL diberikan — lewati pembuatan akun admin.');
    return null;
  }
  const tempPassword = randomPassword();
  const userRecord = await auth.createUser({ email: adminEmail, password: tempPassword });
  await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
  await db.collection('admin').doc(userRecord.uid).set({
    nama: 'Admin', email: adminEmail, isActive: true, mustChangePassword: true,
  });
  await db.collection('loginIndex').doc(adminEmail).set({ email: adminEmail });
  console.log(`Admin ${adminEmail}: OK (temp password ${tempPassword})`);
  return { email: adminEmail, tempPassword };
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || '';
  const needsEmail = await migrateStudents();
  const dosenSummary = await migrateDosen();
  const adminSummary = await migrateAdmin(adminEmail);

  console.log('\n===== Ringkasan migrasi =====');
  console.log(`Mahasiswa perlu email asli (masih placeholder): ${needsEmail.length ? needsEmail.join(', ') : '-'}`);
  console.log('Dosen (kabarkan temp password ke masing-masing, minta ganti saat login pertama):');
  dosenSummary.forEach((d) => console.log(`  - ${d.kode} <${d.email}>: ${d.tempPassword}`));
  if (adminSummary) console.log(`Admin <${adminSummary.email}>: ${adminSummary.tempPassword}`);
  console.log('==============================\n');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
