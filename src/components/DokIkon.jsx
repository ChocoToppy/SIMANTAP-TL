import React from 'react';

// Ikon kecil halaman dokumen (Portal mahasiswa). Inline SVG tanpa pustaka
// ikon, sama seperti TabIcon di ui.jsx. Tiap ikon menandai keadaan dokumen
// yang nyata: berkas PDF siap diunduh, terkunci (syarat belum terpenuhi),
// tautan luar, unggah, dan sudah terunggah.

const garis = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' };

export function IkonPdf({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M7 3h9l5 5v6M7 3v11" {...garis} />
      <path d="M16 3v5h5" {...garis} />
      <text x="14" y="25" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="inherit" fill="currentColor">PDF</text>
    </svg>
  );
}

export function IkonTerkunci({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M12 25H7V3h9l5 5v6" {...garis} />
      <path d="M16 3v5h5" {...garis} />
      <rect x="14" y="18" width="9" height="7" rx="1" {...garis} />
      <path d="M16 18v-2a2.5 2.5 0 0 1 5 0v2" {...garis} />
    </svg>
  );
}

export function IkonTautan({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M12 16l9-9M15 6h7v7" {...garis} />
      <path d="M20 17v6H6V9h6" {...garis} />
    </svg>
  );
}

export function IkonUnggah({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 20V6M10 12l6-6 6 6" {...garis} />
      <path d="M6 19v7h20v-7" {...garis} />
    </svg>
  );
}

export function IkonSelesai({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="11" {...garis} />
      <path d="M8 13.5l3.5 3.5L18 10" {...garis} />
    </svg>
  );
}

export function IkonKembali({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <path d="M18 11H5M10 5l-6 6 6 6" {...garis} />
    </svg>
  );
}

export function IkonLanjut({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M7 4l5 5-5 5" {...garis} />
    </svg>
  );
}

export function IkonSebelum({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M11 4L6 9l5 5" {...garis} />
    </svg>
  );
}

export function IkonMap({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h7l2 2h9v11H3z" {...garis} />
    </svg>
  );
}
