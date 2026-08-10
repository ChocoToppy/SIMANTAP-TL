// ===================== textSize.js =====================
// Preferensi ukuran teks (aksesibilitas): kecil/normal/besar, tersimpan di
// localStorage dan diterapkan lewat class di <html> (lihat styles.css
// html.text-sm/.text-md/.text-lg — semua font-size di CSS pakai rem supaya
// ikut menskalakan otomatis).
const KEY = 'simantap-text-size';
export const TEXT_SIZES = ['sm', 'md', 'lg'];

export function getTextSize() {
  try {
    const v = localStorage.getItem(KEY);
    if (TEXT_SIZES.includes(v)) return v;
  } catch (e) { /* abaikan */ }
  return 'md';
}

export function applyTextSize(size) {
  const s = TEXT_SIZES.includes(size) ? size : 'md';
  TEXT_SIZES.forEach((t) => document.documentElement.classList.remove(`text-${t}`));
  document.documentElement.classList.add(`text-${s}`);
}

export function setTextSize(size) {
  try { localStorage.setItem(KEY, size); } catch (e) { /* abaikan */ }
  applyTextSize(size);
}
