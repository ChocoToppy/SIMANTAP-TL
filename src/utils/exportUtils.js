// ===================== exportUtils.js =====================
// exportUtils.js — ekspor CSV (tanpa dependency) & Excel (.xlsx via SheetJS dari CDN)


export function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// headers: string[]; rows: any[][]
export function downloadCSV(filename, headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((r) => lines.push(r.map(csvEscape).join(',')));
  // \uFEFF = BOM agar Excel membaca UTF-8 (huruf Indonesia) dengan benar.
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

// Unduh teks sebagai dokumen Word (.doc) — HTML sederhana yang dibuka Word.
export function downloadDoc(filename, isiTeks) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head>`
    + `<body><pre style="font-family:'Times New Roman',serif;font-size:12pt;white-space:pre-wrap;line-height:1.4">${esc(isiTeks)}</pre></body></html>`;
  const blob = new Blob(['\uFEFF', html], { type: 'application/msword' });
  triggerDownload(blob, filename);
}

// Cetak surat ke PDF lewat jendela cetak browser (pilih "Simpan sebagai PDF").
// Tanpa pustaka tambahan; fallback unduh .doc bila popup diblokir.
export function cetakSuratPDF(judul, teks) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(judul)}</title>`
    + `<style>@page{size:A4;margin:2.2cm}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#000;margin:0}`
    + `pre{white-space:pre-wrap;font-family:inherit;font-size:inherit;margin:0}</style></head>`
    + `<body><pre>${esc(teks)}</pre><script>window.onload=function(){setTimeout(function(){window.print();},150);};</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { downloadDoc(judul + '.doc', teks); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

export function downloadDocHtml(filename, htmlTeks) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head>`
    + `<body>${htmlTeks}</body></html>`;
  const blob = new Blob(['\uFEFF', html], { type: 'application/msword' });
  triggerDownload(blob, filename);
}

export function cetakSuratPDFHtml(judul, htmlTeks) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(judul)}</title>`
    + `<style>@page{size:A4;margin:1.5cm}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.3;color:#000;margin:0}`
    + `table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:4px 8px;vertical-align:top}</style></head>`
    + `<body>${htmlTeks}<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) { downloadDocHtml(judul + '.doc', htmlTeks); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
let xlsxPromise;
export function loadXLSX() {
  if (typeof window !== 'undefined' && window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error('Gagal memuat pustaka Excel'));
      document.head.appendChild(s);
    });
  }
  return xlsxPromise;
}

// sheets: [{ name, headers, rows }]
export async function downloadXLSX(filename, sheets) {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  sheets.forEach((sh) => {
    const ws = XLSX.utils.aoa_to_sheet([sh.headers, ...sh.rows]);
    XLSX.utils.book_append_sheet(wb, ws, (sh.name || 'Sheet').slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

