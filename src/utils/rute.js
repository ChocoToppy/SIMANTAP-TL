import { useEffect, useState } from 'react';
import { konfirmasiKeluar } from './perubahanBelumDisimpan.js';

// ===================== Rute (tanpa library router) =====================
// Path = halaman, query = pilihan tampilan (periode, program, filter tabel). Firebase
// Hosting dan public/.htaccess (cPanel) mengarahkan semua path ke index.html, jadi
// refresh dan tautan langsung tetap jalan. pindah() menambah riwayat (tombol Kembali);
// ubahParam()/ganti() mengganti URL tanpa menambah riwayat.

const EVENT = 'simantap:rute';

function baca() {
  return { path: window.location.pathname, params: Object.fromEntries(new URLSearchParams(window.location.search)) };
}

function keUrl(path, params) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  return path + (qs ? '?' + qs : '');
}

function tulis(url, gantiSaja) {
  if (url === window.location.pathname + window.location.search) return;
  window.history[gantiSaja ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event(EVENT));
}

// false bila admin membatalkan karena draf Pengaturan belum disimpan.
export function pindah(path, params = {}) {
  if (path !== window.location.pathname && !konfirmasiKeluar()) return false;
  tulis(keUrl(path, params), false);
  return true;
}

export function ganti(path, params = {}) {
  tulis(keUrl(path, params), true);
}

// Patch digabung ke query sekarang; nilai '' atau null menghapus kuncinya.
export function ubahParam(patch, { riwayat = false } = {}) {
  const { path, params } = baca();
  tulis(keUrl(path, { ...params, ...patch }), !riwayat);
}

// Dipakai sekali saja (App): penjaga Kembali/Maju di bawah memanggil konfirmasiKeluar,
// jadi pemakai kedua akan memunculkan dialog dua kali.
export function useRute() {
  const [rute, setRute] = useState(baca);
  useEffect(() => {
    let terakhir = window.location.pathname + window.location.search;
    const segarkan = () => {
      terakhir = window.location.pathname + window.location.search;
      setRute(baca());
    };
    // Saat popstate datang URL sudah berganti: bila admin membatalkan, URL lama dipulihkan.
    const onPop = () => {
      if (window.location.pathname !== terakhir.split('?')[0] && !konfirmasiKeluar()) {
        window.history.pushState(null, '', terakhir);
        return;
      }
      segarkan();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener(EVENT, segarkan);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener(EVENT, segarkan);
    };
  }, []);
  return rute;
}
