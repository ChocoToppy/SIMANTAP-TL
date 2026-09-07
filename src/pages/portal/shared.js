import { PROGRAM_KEYS } from '../../utils/helpers.js';
import { programKeysTersedia } from '../../utils/config.js';

// ===================== portal/shared.js =====================
// Konstanta kecil yang dipakai lintas file di folder portal/ — dipisah ke
// sini supaya tidak diduplikasi antar file.

// Program yang boleh dipilih mahasiswa saat mendaftar BARU pada build ini
// (lihat src/utils/config.js) — dihitung sekali saat modul dimuat, bukan
// per-render, karena tidak bergantung pada props/state apa pun.
export const PROGRAM_KEYS_PENDAFTARAN = programKeysTersedia(PROGRAM_KEYS);

// Panduan yang ditampilkan langsung di kartu pengajuan (tombol di sebelah
// badge verifikasi) — sengaja HANYA yang ditandai program itu spesifik, bukan
// yang "Umum", supaya kartu tidak penuh kalau daftar panduan Umum bertambah
// banyak. Panduan Umum tetap ada, tapi cuma di halaman /panduan (lihat
// PanduanPage.jsx) yang memang mengelompokkan semuanya termasuk Umum.
export function panduanUntukProgram(panduan, programKey) {
  return panduan.filter((p) => p.program === programKey);
}
