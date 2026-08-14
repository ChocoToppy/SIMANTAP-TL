// ===================== fileUpload.js =====================
// Baca berkas yang diunggah mahasiswa (dokumen bertanda tangan/nilai) menjadi
// data URL base64 lalu disimpan sebagai field biasa pada record mahasiswa —
// mengikuti alur onSave -> updateData -> Firestore yang sudah dipakai field lain.
//
// CATATAN: ini pengganti sementara Firebase Storage. Migrasi ke Storage sudah
// disiapkan (lihat firebase.js `storage`, storage.rules, firebase.json) tapi
// ditunda karena project Firebase belum di-upgrade ke paket Blaze — Storage
// belum bisa di-provision. Begitu paket sudah di-upgrade dan Storage aktif,
// ganti isi readFileForUpload ini untuk mengunggah ke Storage lewat
// uploadBytes/getDownloadURL dan mengembalikan { fileName, fileType, size,
// url, uploadedAt } — pemanggil (Portal.jsx, Mahasiswa.jsx, kpDocuments.jsx)
// sudah menangani field `url` selain `dataUrl` jadi tidak perlu berubah lagi.
//
// Karena seluruh data tersimpan dalam SATU dokumen Firestore (batas 1 MiB),
// ukuran berkas dibatasi jauh lebih kecil agar aman untuk semua mahasiswa.
import { todayISO } from './helpers.js';

const MAX_BYTES = 400_000; // 400 KB — batas keras per berkas
const WARN_BYTES = 150_000; // 150 KB — batas anjuran

export function readFileForUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('Tidak ada berkas dipilih.')); return; }
    if (file.size > MAX_BYTES) {
      reject(new Error(`Berkas terlalu besar (${Math.round(file.size / 1024)} KB). Maksimal ${Math.round(MAX_BYTES / 1024)} KB — kompres atau scan ulang dengan resolusi lebih rendah.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl: e.target.result,
        uploadedAt: todayISO(),
        warnBesar: file.size > WARN_BYTES,
      });
    };
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
}
