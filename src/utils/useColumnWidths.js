import { useState, useEffect } from 'react';

const MIN_COL_WIDTH = 60;
const DEFAULT_FLEX_MIN = 80;

// Lebar kolom tabel yang bisa digeser mouse (drag-to-resize, seperti Excel).
// Dibatasi supaya jumlah lebar kolom tidak pernah melebihi lebar wadah
// (containerRef, biasanya .table-wrap) — satu kolom terakhir (flex: true)
// menyerap sisa ruang, jadi batas maksimum tiap kolom lain dihitung ulang
// tiap drag berdasarkan sisa ruang yang masih ada.
// columns: [{ key, width, flex?, minWidth? }] — tepat satu kolom boleh flex:true.
// Lebar tersimpan di localStorage per storageKey supaya preferensi bertahan
// antar sesi/reload.
export function useColumnWidths(storageKey, columns, containerRef) {
  const [widths, setWidths] = useState(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch (e) { /* abaikan */ }
    return columns.map((c) => saved[c.key] || c.width);
  });

  useEffect(() => {
    try {
      const obj = {};
      columns.forEach((c, i) => { obj[c.key] = widths[i]; });
      localStorage.setItem(storageKey, JSON.stringify(obj));
    } catch (e) { /* abaikan */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widths]);

  const flexIdx = columns.findIndex((c) => c.flex);
  const flexMin = (flexIdx >= 0 && columns[flexIdx].minWidth) || DEFAULT_FLEX_MIN;

  function maxFor(index, currentWidths) {
    const container = containerRef && containerRef.current;
    if (!container) return Infinity;
    const containerWidth = container.clientWidth;
    const otherFixedSum = currentWidths.reduce(
      (sum, w, i) => (i === index || i === flexIdx ? sum : sum + w), 0
    );
    return Math.max(MIN_COL_WIDTH, containerWidth - otherFixedSum - flexMin);
  }

  function startResize(index, e) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widths[index];

    function onMove(ev) {
      setWidths((cur) => {
        const proposed = startWidth + (ev.clientX - startX);
        const clamped = Math.min(Math.max(MIN_COL_WIDTH, proposed), maxFor(index, cur));
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

  return [widths, startResize];
}
