// ===================== modules/ruang =====================
// Modul Peminjaman / Penggunaan Ruang. Aplikasi induk HANYA boleh mengimpor dari berkas
// ini (bukan dari subfolder) — itulah batas yang nanti dipotong saat modul dipindah.
import './ruang.css';

// Layar
export { PenggunaanRuangPortal } from './portal/PenggunaanRuangPortal.jsx';
export { SeksiJadwalRuang } from './admin/SeksiJadwalRuang.jsx';

// Data (Firestore) + sinkron otomatis jadwal program -> booking
export { useJadwalRuang, useSinkronProgram } from './data/useJadwalRuang.js';

// Logika murni yang dipakai form di luar modul (usulan jadwal mahasiswa/admin)
export { opsiRuang, periksaUsulanRuang, teksBentrokRuang } from './logic/ruangBooking.js';
export { milikProgram, EVENT_SINKRON } from './logic/sinkronRuang.js';
