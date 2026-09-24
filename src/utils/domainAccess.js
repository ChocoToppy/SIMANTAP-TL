// Pembatasan domain: alamat Firebase (web.app / firebaseapp.com) hanya untuk
// super admin + akun uji tertentu; semua pengguna lain harus lewat domain
// utama. INI PEMBATASAN DI SISI BROWSER (soft) — backend Firebase-nya sama, jadi
// bukan kunci keamanan, cuma menjaga pengguna biasa tidak masuk lewat alamat ini.

export const DOMAIN_TERBATAS = ['simantap-tl.web.app', 'simantap-tl.firebaseapp.com'];
export const URL_DOMAIN_UTAMA = 'https://simantaptlundip.com';

// Akun uji (dummy) yang tetap boleh login di domain terbatas: NIM mahasiswa uji
// & kode dosen uji. Belum ada dosen uji — isi `kode` kalau nanti dibuat.
export const AKUN_UJI_DIIZINKAN = {
  nim: ['2108011112123'],
  kode: [],
};

export const KUNCI_DITOLAK = 'simantap-domain-ditolak';

export function diDomainTerbatas() {
  return DOMAIN_TERBATAS.includes(window.location.hostname);
}

export function bolehMasukDomainIni(claims) {
  if (!diDomainTerbatas()) return true;
  if (claims.super) return true;
  if (claims.role === 'student') return AKUN_UJI_DIIZINKAN.nim.includes(claims.nim);
  if (claims.role === 'lecturer') return AKUN_UJI_DIIZINKAN.kode.includes(claims.kode);
  return false;
}
