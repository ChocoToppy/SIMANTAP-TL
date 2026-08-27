import { useState, useEffect, useRef } from 'react';

const MIN_COL_WIDTH = 60;

const DEFAULT_FLEX_MIN = 80;

// Lebar kolom tabel yang bisa digeser mouse (drag-to-resize, seperti Excel).
// columns: [{ key, width, flex?, minWidth? }] — satu kolom terakhir (flex: true)
// menyerap sisa ruang kalau tabel lebih lebar dari total kolom lain (mis. layar besar).
// Tidak disimpan ke localStorage — sengaja dibuat "lupa" tiap reload, supaya
// tabel selalu mulai lagi dari ukuran default (selebar layar) dan pengguna
// yang melebarkannya lewat drag harus mengulang tiap sesi/reload.
//
// tableWidth (nilai ke-3 yang dikembalikan) = lebar eksplisit untuk `style={{ width }}`
// pada <table>. Selama belum pernah di-drag, ini `undefined` (tabel ikut CSS
// width:auto;min-width:100% biasa, mengisi persis selebar wadah/layar — ini
// ukuran default, tidak pernah melebihi layar). Begitu pengguna mulai menggeser
// kolom, tableWidth berubah jadi total kolom (termasuk lebar minimum kolom flex
// terakhir) dalam px — kalau itu melebihi wadah, tabel melebar melebihi layar
// dan .table-wrap (overflow-x:auto) yang scroll, bukan kolom terakhir yang "dipepetkan".
export function useColumnWidths(storageKey, columns, containerRef) {
  const [widths, setWidths] = useState(() => columns.map((c) => c.width));
  const [dragged, setDragged] = useState(false);

  // Set kolom bisa berubah bentuk di runtime (mis. tabel per-tab program dengan
  // jumlah kolom peran dosen yang beda) — begitu key kolom berubah, widths &
  // status "sudah di-drag" direset supaya tidak salah pasang ke kolom yang beda.
  const colSig = columns.map((c) => c.key).join('|');
  const prevSig = useRef(colSig);
  useEffect(() => {
    if (prevSig.current !== colSig) {
      prevSig.current = colSig;
      setWidths(columns.map((c) => c.width));
      setDragged(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colSig]);

  // Batas atas hanya angka besar sewajarnya supaya drag tidak "kabur" tak terbatas.
  const MAX_COL_WIDTH = 1200;

  const flexIdx = columns.findIndex((c) => c.flex);
  const flexMin = (flexIdx >= 0 && columns[flexIdx].minWidth) || DEFAULT_FLEX_MIN;
  const tableWidth = dragged
    ? widths.reduce((sum, w, i) => (i === flexIdx ? sum : sum + w), 0) + flexMin
    : undefined;

  function startResize(index, e) {
    e.preventDefault();
    e.stopPropagation();
    setDragged(true);
    const startX = e.clientX;
    const startWidth = widths[index];

    function onMove(ev) {
      setWidths((cur) => {
        const proposed = startWidth + (ev.clientX - startX);
        const clamped = Math.min(Math.max(MIN_COL_WIDTH, proposed), MAX_COL_WIDTH);
        const copy = cur.slice();
        copy[index] = clamped;
        return copy;
      });
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return [widths, startResize, tableWidth];
}
