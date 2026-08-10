// ===================== theme.js =====================
// Preferensi tema terang/gelap, tersimpan di localStorage dan diterapkan
// lewat atribut data-theme di <html> (lihat styles.css html[data-theme="dark"]).
// Bila pengguna belum pernah memilih, ikuti preferensi sistem (prefers-color-scheme).
const KEY = 'simantap-theme';

export function getTheme() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch (e) { /* abaikan */ }
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch (e) { /* abaikan */ }
  return 'light';
}

export function applyTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
}

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch (e) { /* abaikan */ }
  applyTheme(theme);
}
