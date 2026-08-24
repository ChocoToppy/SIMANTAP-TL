// ===================== fileUpload.js =====================
// Unggah berkas yang diunggah mahasiswa/admin (dokumen bertanda tangan/nilai)
// ke Firebase Storage, lalu simpan hanya referensinya (url) sebagai field pada
// record mahasiswa di Firestore — bukan isi berkasnya. Ini menggantikan
// pendekatan base64 lama (lihat riwayat git) yang menyimpan berkas langsung
// sebagai field dataUrl di dalam dokumen Firestore.
import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { todayISO } from './helpers.js';

const MAX_BYTES = 8_000_000; // 8 MB — jauh lebih longgar dari batas lama karena berkas tidak lagi ikut menambah ukuran dokumen Firestore
const WARN_BYTES = 5_000_000; // 5 MB — batas anjuran

export async function readFileForUpload(file, pathHint = 'misc') {
  if (!file) throw new Error('Tidak ada berkas dipilih.');
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    throw new Error('Berkas harus berupa PDF. Simpan/scan dokumen sebagai .pdf sebelum mengunggah.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Berkas terlalu besar (${Math.round(file.size / 1024)} KB). Maksimal ${Math.round(MAX_BYTES / 1024 / 1024)} MB — kompres atau scan ulang dengan resolusi lebih rendah.`);
  }
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
  const path = `uploads/${pathHint}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return {
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    size: file.size,
    url,
    path,
    uploadedAt: todayISO(),
    warnBesar: file.size > WARN_BYTES,
  };
}
