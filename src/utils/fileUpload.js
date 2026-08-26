// ===================== fileUpload.js =====================
// Unggah berkas yang diunggah mahasiswa/admin (dokumen bertanda tangan/nilai)
// ke Firebase Storage, lalu simpan hanya referensinya (url) sebagai field pada
// record mahasiswa di Firestore — bukan isi berkasnya. Ini menggantikan
// pendekatan base64 lama (lihat riwayat git) yang menyimpan berkas langsung
// sebagai field dataUrl di dalam dokumen Firestore.
import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { todayISO } from './helpers.js';

const MAX_BYTES = 25_000_000; // 25 MB — jauh lebih longgar dari batas lama karena berkas tidak lagi ikut menambah ukuran dokumen Firestore
const WARN_BYTES = 20_000_000; // 20 MB — batas anjuran

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

// Hapus satu berkas dari Storage lewat path yang tersimpan pada record (field
// `.path` hasil readFileForUpload di atas). Dipakai saat berkas diganti/dihapus
// supaya versi lama tidak menumpuk sebagai sampah di bucket.
export async function deleteUploadedFile(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    if (err?.code !== 'storage/object-not-found') {
      console.error('Gagal menghapus berkas dari Storage:', path, err);
    }
  }
}

// Hapus seluruh folder (dan subfoldernya) di Storage secara rekursif — dipakai
// saat satu record mahasiswa dihapus, supaya semua berkasnya (yang semua
// disimpan di bawah `uploads/{id}/...`) ikut terhapus sekaligus.
export async function deleteUploadedFolder(prefix) {
  if (!prefix) return;
  let res;
  try {
    res = await listAll(ref(storage, prefix));
  } catch (err) {
    console.error('Gagal membaca folder Storage untuk dihapus:', prefix, err);
    return;
  }
  await Promise.all([
    ...res.items.map((item) => deleteObject(item).catch(() => {})),
    ...res.prefixes.map((sub) => deleteUploadedFolder(sub.fullPath)),
  ]);
}
