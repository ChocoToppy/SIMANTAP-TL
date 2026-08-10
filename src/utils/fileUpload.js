// ===================== fileUpload.js =====================
// Baca berkas yang diunggah mahasiswa (dokumen bertanda tangan/nilai) menjadi
// data URL base64 lalu disimpan sebagai field biasa pada record mahasiswa —
// mengikuti alur onSave -> updateData -> Firestore yang sudah dipakai field lain.
//
// CATATAN: ini pengganti sementara Firebase Storage (proyek Firebase sedang
// diganti). Karena seluruh data tersimpan dalam SATU dokumen Firestore
// (batas 1 MiB), ukuran berkas dibatasi agar aman. Saat Firebase Storage
// sudah siap, cukup ganti isi fungsi ini agar mengunggah ke Storage dan
// mengembalikan { fileName, fileType, size, url, uploadedAt } — pemanggil
// (Portal.jsx) tidak perlu berubah.

import { todayISO } from './helpers.js';

const MAX_BYTES = 2_000_000; // 2 MB — batas keras
const WARN_BYTES = 500_000; // 500 KB — batas anjuran

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
