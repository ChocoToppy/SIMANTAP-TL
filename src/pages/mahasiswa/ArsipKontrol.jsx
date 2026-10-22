import React from 'react';

// Keterangan & paginasi tabel arsip "Semua periode" (data dari useArsipMahasiswa.js).
export function KeteranganArsip({ arsip }) {
  return (
    <>
      <p className="hint arsip-hint">
        Semua periode dimuat per halaman. Cari memakai awalan nama atau NIM, dan urutan hanya
        No., Mahasiswa, Tahap & jadwal, dan Deadline.
      </p>
      {arsip.deadlineDiabaikan && (
        <p className="hint arsip-hint">
          Filter deadline tidak bisa digabung dengan pencarian di Semua periode, jadi yang dipakai hanya status Aktif.
        </p>
      )}
      {arsip.galat && <div className="banner-galat" role="alert"><span>{arsip.galat}</span></div>}
    </>
  );
}

export function PaginasiArsip({ arsip, jumlah, pageSize, setPageSize }) {
  const totalHalaman = arsip.total != null ? Math.max(1, Math.ceil(arsip.total / pageSize)) : null;
  return (
    <div className="pagination">
      <span className="hint" role="status">
        {arsip.memuat ? 'Memuat…'
          : `Menampilkan ${jumlah ? arsip.mulai + 1 : 0}–${arsip.mulai + jumlah}${arsip.total != null ? ` dari ${arsip.total}` : ''} data`}
      </span>
      <div className="pagination-controls">
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} title="Baris per halaman">
          {[5, 10, 25, 50, 100, 500].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="btn btn-sm" disabled={!arsip.bisaMundur || arsip.memuat} onClick={arsip.keAwal} aria-label="Halaman pertama">«</button>
        <button className="btn btn-sm" disabled={!arsip.bisaMundur || arsip.memuat} onClick={arsip.mundur} aria-label="Halaman sebelumnya">‹</button>
        <span className="hint">{arsip.halaman}{totalHalaman ? ` / ${totalHalaman}` : ''}</span>
        <button className="btn btn-sm" disabled={!arsip.bisaMaju || arsip.memuat} onClick={arsip.maju} aria-label="Halaman berikutnya">›</button>
      </div>
    </div>
  );
}
