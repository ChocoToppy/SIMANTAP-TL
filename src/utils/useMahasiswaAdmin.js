import { useEffect, useMemo, useRef, useState } from 'react';
import { arrayUnion, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase.js';
import { urutPeriode } from './helpers.js';

// ===================== Data mahasiswa untuk admin =====================
// Admin tidak me-listen seluruh koleksi mahasiswa. Yang dimuat: semua pengajuan yang
// belum Lulus (periode mana pun) + seluruh isi PERIODE_PENUH periode terbaru. Periode
// lain dan "Semua periode" dimuat saat dipilih, lalu tetap dimuat sampai logout.
export const PERIODE_PENUH = 2;

const keList = (snap) => snap.docs.map((d) => ({ ...d.data(), id: d.id }));

function queryUntuk(kunci) {
  const kol = collection(db, 'mahasiswa');
  if (kunci === 'semua') return kol;
  // != juga membuang dokumen tanpa field tahap; semua jalur tulis selalu mengisinya.
  if (kunci === 'aktif') return query(kol, where('tahap', '!=', 'Lulus'));
  return query(kol, where('periode', '==', kunci.slice(2)));
}

// periodeDikenal: config.daftarPeriode + periodeBuka. Periode dari data yang sudah
// dimuat ikut dihitung, jadi jendela tetap benar sebelum daftarPeriode terisi.
export function useMahasiswaAdmin(aktif, periodeDikenal) {
  const [list, setList] = useState([]);
  const [diminta, setDiminta] = useState([]);
  const [semua, setSemua] = useState(false);
  const [menunggu, setMenunggu] = useState([]);
  const [gagal, setGagal] = useState([]);
  const [percobaan, setPercobaan] = useState(0);
  const sumber = useRef(new Map());
  const langganan = useRef(new Map());

  const daftar = useMemo(() => {
    const set = new Set(periodeDikenal);
    list.forEach((m) => { if (m.periode) set.add(m.periode); });
    return urutPeriode(Array.from(set));
  }, [periodeDikenal, list]);
  const jendela = useMemo(() => daftar.slice(-PERIODE_PENUH), [daftar]);
  const kunci = useMemo(() => {
    if (!aktif) return [];
    const periode = Array.from(new Set([...jendela, ...diminta])).map((p) => 'p:' + p);
    return ['aktif', ...periode, ...(semua ? ['semua'] : [])];
  }, [aktif, jendela, diminta, semua]);
  const kunciStr = JSON.stringify(kunci);

  useEffect(() => {
    const terbit = () => {
      const gabung = new Map();
      sumber.current.forEach((docs) => docs.forEach((d) => gabung.set(d.id, d)));
      setList(Array.from(gabung.values()));    };
    // Listener yang tidak lagi diinginkan hanya dilepas saat logout: periode yang
    // keluar dari jendela (ada periode baru) tetap dimuat sampai sesi berakhir.
    if (!aktif) {
      langganan.current.forEach((unsub) => unsub());
      langganan.current.clear();
      sumber.current.clear();
      setMenunggu([]);
      setGagal([]);
      setDiminta([]);
      setSemua(false);
      setList([]);
      return;
    }
    kunci.forEach((k) => {
      if (langganan.current.has(k)) return;
      setMenunggu((x) => [...x, k]);
      setGagal((x) => x.filter((y) => y !== k));
      const unsub = onSnapshot(queryUntuk(k), (snap) => {
        sumber.current.set(k, keList(snap));
        setMenunggu((x) => x.filter((y) => y !== k));
        terbit();
      }, (e) => {
        console.error('Gagal memuat data mahasiswa', k, e);
        // Listener Firestore mati setelah error: dilepas supaya "Coba lagi" bisa memasang ulang.
        langganan.current.delete(k);
        sumber.current.delete(k);
        setMenunggu((x) => x.filter((y) => y !== k));
        setGagal((x) => (x.includes(k) ? x : [...x, k]));
        terbit();
      });
      langganan.current.set(k, unsub);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, kunciStr, percobaan]);

  useEffect(() => () => {
    langganan.current.forEach((unsub) => unsub());
    langganan.current.clear();
  }, []);

  function muatPeriode(p) {
    if (!p || jendela.includes(p) || diminta.includes(p)) return;
    setDiminta((x) => [...x, p]);
  }

  return {
    list, setList,
    muatPeriode,
    muatSemua: () => setSemua(true),
    semuaDimuat: semua && !menunggu.includes('semua'),
    memuat: menunggu.length > 0,
    gagal: gagal.length > 0,
    cobaLagi: () => setPercobaan((n) => n + 1),
  };
}

// Daftar periode yang pernah dipakai, disimpan di config/global supaya pilihan periode
// lama tetap muncul walau datanya belum dimuat. arrayUnion: aman bila dua admin bersamaan.
export function catatPeriode(...periode) {
  const isi = periode.filter(Boolean);
  if (!isi.length) return Promise.resolve();
  return updateDoc(doc(db, 'config', 'global'), { daftarPeriode: arrayUnion(...isi) });
}

// Sekali saja, saat config/global belum punya daftarPeriode: baca seluruh koleksi satu
// kali untuk mengisi daftar dari data yang sudah ada.
export async function isiDaftarPeriode(periodeBuka = []) {
  const snap = await getDocs(collection(db, 'mahasiswa'));
  const set = new Set(periodeBuka);
  snap.forEach((d) => { const p = d.data().periode; if (p) set.add(p); });
  await updateDoc(doc(db, 'config', 'global'), { daftarPeriode: set.size ? arrayUnion(...set) : [] });
}
