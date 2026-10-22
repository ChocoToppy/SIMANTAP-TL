import { ubahParam } from '../../utils/rute.js';
import { SEMUA } from '../../utils/helpers.js';

// Cari, filter, urutan, pengelompokan & halaman tabel Mahasiswa disimpan di query URL
// supaya bertahan saat refresh dan Kembali. Nilai bawaan tidak ditulis ke URL.
// Mengubah filter, pengelompokan atau baris per halaman = kembali ke halaman 1.
export function useFilterMahasiswa(params, periode) {
  const filter = (patch) => ubahParam({ hal: '', ...patch });
  // "Semua periode" = tabel arsip: bawaannya urut masuk (No.), terlama dulu, tanpa pengelompokan.
  const groupBawaan = 'none';
  const sortBawaan = periode === SEMUA ? 'no' : 'nama';
  const sortBy = params.urut || sortBawaan;
  const sortDir = params.arah === 'desc' ? 'desc' : 'asc';
  const page = Math.max(1, Number(params.hal) || 1);
  return {
    q: params.q || '', setQ: (v) => filter({ q: v }),
    fAngkatan: params.angkatan || '', setFAngkatan: (v) => filter({ angkatan: v }),
    fBidang: params.bidang || '', setFBidang: (v) => filter({ bidang: v }),
    fStatus: params.status || 'all', setFStatus: (v) => filter({ status: v === 'all' ? '' : v }),
    fVerif: params.verif || '', setFVerif: (v) => filter({ verif: v }),
    fDosen: params.dosen || '', setFDosen: (v) => filter({ dosen: v }),
    resetFilter: () => filter({ status: '', angkatan: '', bidang: '', verif: '', dosen: '' }),
    sortBy, sortDir,
    // Aktivitas: klik pertama langsung yang terbaru di atas.
    ubahSort: (key) => (sortBy === key
      ? ubahParam({ arah: sortDir === 'asc' ? 'desc' : '' })
      : ubahParam({ urut: key === sortBawaan ? '' : key, arah: key === 'aktivitas' ? 'desc' : '' })),
    groupMode: params.grup || groupBawaan,
    setGroupMode: (v) => filter({ grup: v === groupBawaan ? '' : v }),
    pageSize: Number(params.per) || 100,
    setPageSize: (v) => filter({ per: v === 100 ? '' : String(v) }),
    page,
    setPage: (v) => {
      const n = typeof v === 'function' ? v(page) : v;
      ubahParam({ hal: n > 1 ? String(n) : '' });
    },
  };
}
