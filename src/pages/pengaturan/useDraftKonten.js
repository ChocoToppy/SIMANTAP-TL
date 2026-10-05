import { useEffect, useRef, useState } from 'react';
import { setPerubahanBelumDisimpan } from '../../utils/perubahanBelumDisimpan.js';

// Draf `konten` untuk editor visual Pengaturan (Form Pendaftaran & Konten): semua
// ubahan masuk ke draf dulu — pratinjau membaca draf, jadi langsung berubah saat
// mengetik — dan baru ditulis ke Firestore saat admin menekan "Simpan perubahan".
// Perubahan dari luar (mis. admin lain) hanya diambil bila draf belum diubah.

// Buang objek kosong ({}), supaya "ubah lalu kembalikan" tidak dihitung sebagai
// perubahan dan tidak ada kunci kosong yang ikut tertulis ke Firestore.
function rapikan(v) {
  if (Array.isArray(v) || v === null || typeof v !== 'object') return v;
  const out = {};
  Object.entries(v).forEach(([k, x]) => {
    const r = rapikan(x);
    if (r && typeof r === 'object' && !Array.isArray(r) && Object.keys(r).length === 0) return;
    out[k] = r;
  });
  return out;
}
const beda = (a, b) => JSON.stringify(rapikan(a)) !== JSON.stringify(rapikan(b));

export function useDraftKonten(konten, onSimpan) {
  const [draft, setDraft] = useState(konten);
  const dasar = useRef(konten);
  const dirty = beda(draft, konten);

  useEffect(() => {
    if (!beda(draft, dasar.current)) setDraft(konten);
    dasar.current = konten;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [konten]);

  // Peringatan sebelum menutup/memuat ulang tab, dan penanda untuk navigasi dalam aplikasi.
  useEffect(() => {
    setPerubahanBelumDisimpan(dirty);
    if (!dirty) return undefined;
    const cegah = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', cegah);
    return () => window.removeEventListener('beforeunload', cegah);
  }, [dirty]);
  useEffect(() => () => setPerubahanBelumDisimpan(false), []);

  return {
    draft,
    setDraft,
    dirty,
    // Mengembalikan promise dari onSimpan (true = tersimpan di server).
    simpan: () => onSimpan(rapikan(draft)),
    batal: () => setDraft(konten),
  };
}
