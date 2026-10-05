// Penanda global "ada draf editor yang belum disimpan" (Pengaturan → Form Pendaftaran /
// Konten). Dibaca sebelum meninggalkan halaman itu — pindah menu Pengaturan, tombol
// Kembali, Logout — supaya admin tidak kehilangan ubahan tanpa sadar.
let kotor = false;

export function setPerubahanBelumDisimpan(v) { kotor = !!v; }

// true = boleh lanjut (tidak ada draf, atau admin setuju membuangnya).
export function konfirmasiKeluar() {
  if (!kotor) return true;
  const ya = window.confirm('Ada perubahan yang belum disimpan. Jika Anda keluar sekarang, perubahan itu akan hilang.\n\nTetap keluar?');
  if (ya) kotor = false;
  return ya;
}
