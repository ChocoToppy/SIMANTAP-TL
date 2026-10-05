// ===================== host.js =====================
// SATU-SATUNYA tempat modul Ruang menyentuh kode di luar foldernya. Saat modul dipindah
// ke aplikasi/paket sendiri, cukup tulis ulang berkas ini (dengan implementasi sendiri
// atau paket bersama); seluruh isi modules/ruang/** tidak perlu diubah.
// Lihat README.md untuk daftar kontrak.

// --- UI bersama (komponen presentasi) ---
export { Modal, Field, Badge, Empty } from '../../components/ui.jsx';

// --- Utilitas tanggal/jam & program (domain aplikasi induk) ---
export {
  formatTanggal, todayISO, buatId, BULAN, menitJam, beririsan,
  PROGRAMS, PROGRAM_KEYS, programOf, programLabel, programDisplayLabel, eventsFor,
  durasiEvent, jamTambah, kumpulkanEvent,
} from '../../utils/helpers.js';

// --- Infrastruktur ---
export { loadXLSX } from '../../utils/exportUtils.js'; // pemuat pustaka Excel
export { db } from '../../utils/firebase.js'; // instance Firestore
export { FITUR_EKSPERIMENTAL } from '../../utils/config.js'; // flag fitur
