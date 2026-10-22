import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App';
import VerifikasiSurat from './src/pages/VerifikasiSurat.jsx';
import { getTextSize, applyTextSize } from './src/utils/textSize.js';
import { getTheme, applyTheme } from './src/utils/theme.js';
import { siapkanSesi, jawabTabLain } from './src/utils/sesi.js';

applyTextSize(getTextSize());
applyTheme(getTheme());

// /verifikasi/{token}: halaman publik dari QR di surat, di luar App (tanpa login & data aplikasi).
const tokenVerifikasi = (window.location.pathname.match(/^\/verifikasi\/([^/]+)\/?$/) || [])[1];

const root = createRoot(document.getElementById('root'));
if (tokenVerifikasi) root.render(<VerifikasiSurat token={tokenVerifikasi} />);
// Sesi diperiksa (semua tab ditutup? batas waktu?) sebelum App sempat memakai login lama.
else siapkanSesi().finally(() => { jawabTabLain(); root.render(<App />); });
