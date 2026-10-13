import React, { useEffect, useMemo, useState } from 'react';
import '../ruang.css';
import { JadwalRuangGrid } from '../components/JadwalRuangGrid.jsx';
import { semesterAktif } from '../logic/ruangBooking.js';
import { todayISO } from '../host.js';

// Halaman sematan (iframe) hanya-baca: mengambil JSON publik dari endpoint (tanpa login)
// lalu menampilkan grid. Opsi lewat URL: ?view=hari|minggu|bulan  &ruang=E.301,D.202
// Endpoint: VITE_RUANG_API saat build, bawaan `/api/ruang` (rewrite Hosting).
const API = import.meta.env.VITE_RUANG_API || '/api/ruang';

export function RuangEmbed() {
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState('');
  const q = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    fetch(API).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then(setData).catch((e) => setGalat(e.message));
  }, []);

  // Beri tahu halaman induk tinggi konten supaya iframe bisa menyesuaikan diri.
  useEffect(() => {
    const kirim = () => window.parent !== window && window.parent.postMessage({ ruangEmbedTinggi: document.documentElement.scrollHeight }, '*');
    const ro = new ResizeObserver(kirim);
    ro.observe(document.body);
    kirim();
    return () => ro.disconnect();
  }, []);

  const tampil = useMemo(() => {
    if (!data) return null;
    const filter = (q.get('ruang') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    return filter.length ? { ...data, ruang: data.ruang.filter((r) => filter.includes(String(r.nama).toLowerCase())) } : data;
  }, [data, q]);

  if (galat) return <p className="hint">Jadwal ruang tidak dapat dimuat ({galat}).</p>;
  if (!tampil) return <p className="hint">Memuat jadwal ruang…</p>;
  const view = ['hari', 'minggu', 'bulan'].includes(q.get('view')) ? q.get('view') : 'hari';
  return <JadwalRuangGrid data={tampil} semester={semesterAktif(tampil.semesters, todayISO())} modeAwal={view} />;
}
