import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, punyaKlasifikasi, formatTanggal, formatTanggalSingkat, kondisi, SEMUA, statusVerif, cariBentrok, eventAktif, bidangLabel, tanggalDibuat, aktivitasTerakhir, hitungNomorUrut, jenisMagangOf } from '../utils/helpers.js';
import { semuaTemaBidang } from '../utils/pilihan.js';
import { Badge, StageBar, ExportMenu, ColumnMenu, ColResizeHandle, Empty, TombolHapusCari } from '../components/ui.jsx';
import { useColumnWidths } from '../utils/useColumnWidths.js';
import { perluDitinjau, kunciUrutNomor } from '../utils/nomorSurat.js';
import { AktivitasMini, JadwalMini } from './mahasiswa/AktivitasCells.jsx';
import { FormMahasiswa } from './mahasiswa/FormMahasiswa.jsx';
import { eksporMahasiswa } from './mahasiswa/exportMahasiswa.js';
import { useFilterMahasiswa } from './mahasiswa/useFilterMahasiswa.js';
import { useArsipMahasiswa, URUT_ARSIP } from './mahasiswa/useArsipMahasiswa.js';
import { KeteranganArsip, PaginasiArsip } from './mahasiswa/ArsipKontrol.jsx';

// ===================== Mahasiswa.jsx =====================
// Mahasiswa.jsx — daftar + cari + filter + tambah/edit (multi-program)
//
// Modal tambah/edit (FormMahasiswa, dan tata letak KP/generik di dalamnya)
// hidup di folder ./mahasiswa/ — file ini murni halaman daftar/tabel.

const STATUS_FILTER = [
  { key: 'all', label: 'Semua status' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'mendekati', label: 'Mendekati deadline' },
  { key: 'lewat', label: 'Lewat batas' },
  { key: 'lulus', label: 'Lulus' },
  { key: 'batal', label: 'Ditutup' },
];

// Kolom "peran dosen" beda tiap program (lihat PROGRAMS di helpers.js) — KP/Magang
// cuma satu pembimbing, TA 1 pembimbing + 2 penguji, Tesis S2 2 pembimbing + 2 penguji, dst.
function kolomDosenProgram(programKey) {
  const p = PROGRAMS[programKey] || PROGRAMS.TA;
  const cols = [{ key: 'pembimbing1', label: p.pembimbingLabel || 'Pembimbing 1' }];
  if (p.pembimbing >= 2) cols.push({ key: 'pembimbing2', label: 'Pembimbing 2' });
  if (p.penguji >= 1) cols.push({ key: 'penguji1', label: p.penguji1Label || (p.penguji >= 2 ? 'Penguji 1' : 'Penguji') });
  if (p.penguji >= 2) cols.push({ key: 'penguji2', label: p.penguji2Label || 'Penguji 2' });
  return cols;
}

// Satu tabel = satu program (kolomnya beda-beda tiap program, jadi tidak
// dicampur lagi). programTab dipegang App (default KP) supaya sidebar mobile
// bisa ikut mengubahnya.
export function Mahasiswa({ params = {}, mahasiswa, allMahasiswa, allDosen, periode, periodeList, daftarAngkatan = [], konten = {}, onSave, onDelete, programTab, setProgramTab, jadwalRuang = null, onMuatSemua = null, onMuatPeriode = null }) {
  // Filter bidang dikosongkan saat ganti program oleh setProgramTab (App), karena kode
  // bidang KP/Magang dan TA/Capstone berbeda.
  const {
    q, setQ, fAngkatan, setFAngkatan, fBidang, setFBidang, fStatus, setFStatus, fVerif, setFVerif,
    fDosen, setFDosen, resetFilter, sortBy, sortDir, ubahSort, groupMode, setGroupMode,
    pageSize, setPageSize, page, setPage,
  } = useFilterMahasiswa(params, periode);
  // "Semua periode" = tabel arsip per halaman dari Firestore (useArsipMahasiswa), kecuali
  // Kelompokkan per Angkatan yang memang memuat semuanya.
  const arsipAktif = periode === SEMUA && groupMode !== 'angkatan';
  const [versiArsip, setVersiArsip] = useState(0);
  const filterArsip = useMemo(
    () => ({ program: programTab, q, fAngkatan, fBidang, fStatus, fVerif, fDosen, sortBy, sortDir, groupMode }),
    [programTab, q, fAngkatan, fBidang, fStatus, fVerif, fDosen, sortBy, sortDir, groupMode]
  );
  const arsip = useArsipMahasiswa({ aktif: arsipAktif, filter: filterArsip, pageSize, versi: versiArsip });

  // Kolom tabel yang disembunyikan (pilihan pengguna) — beda dari lebar kolom
  // (colWidths), ini SENGAJA diingat lintas sesi via localStorage, karena
  // menyembunyikan kolom biasanya preferensi tampilan jangka panjang, bukan
  // sekadar geser sementara.
  const [hiddenCols, setHiddenCols] = useState(() => {
    try {
      const simpanan = JSON.parse(localStorage.getItem('simantap-hidden-cols-mahasiswa') || '[]');
      return new Set(Array.isArray(simpanan) ? simpanan : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    localStorage.setItem('simantap-hidden-cols-mahasiswa', JSON.stringify([...hiddenCols]));
  }, [hiddenCols]);
  function toggleKolom(key) {
    setHiddenCols((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [sudahPindah, setSudahPindah] = useState(false); // true = modal edit dibuka lewat ‹ › (tanpa animasi buka)
  // Filter tambahan (di luar pencarian & status) ada di panel melayang di
  // balik tombol "Filter" di semua ukuran layar (lihat .toolbar-extra).
  // Panel ditutup lewat ✕ di atas, "Tutup" di bawah, atau klik di luar.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Kolom cari diciutkan jadi ikon di layar sempit; melebar saat ditekan.
  const [searchOpen, setSearchOpen] = useState(false);
  const urutBisa = (key) => !arsipAktif || (key in URUT_ARSIP && !arsip.urutDipaksa);
  const panah = (key) => (sortBy === key && urutBisa(key) ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');
  const thSort = (key) => (urutBisa(key)
    ? { className: 'th-sort', onClick: () => ubahSort(key) }
    : { title: arsipAktif && arsip.urutDipaksa ? 'Urutan mengikuti pencarian atau filter yang aktif' : 'Tidak bisa diurutkan di Semua periode' });

  // Nomor identitas tetap (berdasarkan urutan pendaftaran pertama), dihitung dari
  // SELURUH data — tidak berubah walau tabel disortir/difilter.
  const nomorUrut = useMemo(() => hitungNomorUrut(allMahasiswa || mahasiswa), [allMahasiswa, mahasiswa]);
  const dosenByKode = useMemo(() => Object.fromEntries((allDosen || []).map((d) => [d.kode, d])), [allDosen]);
  // Nomor per angkatan dihitung lintas periode, jadi butuh seluruh data (lihat useMahasiswaAdmin).
  // Lewat efek, supaya tautan yang sudah membawa ?grup=angkatan ikut memuat semuanya.
  useEffect(() => {
    if (groupMode === 'angkatan' && onMuatSemua) onMuatSemua();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupMode]);
  const teksKosong = arsipAktif && arsip.memuat ? 'Memuat…'
    : arsipAktif && q.trim() ? `Tidak ada yang nama atau NIM-nya diawali "${q.trim()}".`
    : q.trim() && periode !== SEMUA
      ? `Tidak ada data yang cocok di periode ${periode}. Untuk mencari di semua periode, pilih "Semua periode".`
      : 'Tidak ada data yang cocok.';

  const dosenCols = useMemo(() => kolomDosenProgram(programTab), [programTab]);
  const COLS = useMemo(() => [
    { key: 'no', width: 56 },
    { key: 'mahasiswa', width: 220 },
    { key: 'judul', width: 260 },
    { key: 'tahap', width: 210 },
    ...dosenCols.map((c) => ({ key: c.key, width: 100 })),
    { key: 'deadline', width: 130 },
    { key: 'aktivitas', width: 170, minWidth: 170 },
    { key: 'nomorSurat', width: 130 },
    { key: 'aksi', width: 100, flex: true, minWidth: 100 },
  ], [dosenCols]);
  // Kolom yang ditawarkan di menu "Kolom" — "No.", "Mahasiswa" & "Aksi" sengaja
  // tidak ditawarkan (identitas baris & tombol aksi wajib selalu ada).
  const kolomBisaSembunyi = useMemo(() => [
    { key: 'judul', label: 'Judul' },
    { key: 'tahap', label: 'Tahap & jadwal' },
    ...dosenCols.map((c) => ({ key: c.key, label: c.label })),
    { key: 'deadline', label: 'Deadline' },
    { key: 'aktivitas', label: 'Aktivitas' },
    { key: 'nomorSurat', label: 'No. Surat' },
  ], [dosenCols]);
  const jumlahKolomTersembunyi = COLS.filter((c) => hiddenCols.has(c.key)).length;
  const tableWrapRef = useRef(null);
  const [colWidths, startResize, tableWidth] = useColumnWidths('simantap-col-mahasiswa', COLS, tableWrapRef);

  // Cuma dipakai untuk lencana "Filter (n)" di tombol toggle mobile — angka
  // filter tambahan (di luar pencarian) yang lagi aktif.
  const filterAktifCount = [fStatus !== 'all', !!fAngkatan, !!fBidang, !!fVerif, !!fDosen].filter(Boolean).length;

  // Opsi filter Bidang ikut tab program aktif — KP/Magang pakai daftar tema KP_TEMA,
  // bukan BIDANG (topik TA/CAP), sesuai field `bidang` yang dipakai tiap gaya program
  // (lihat gantiProgram di FormPendaftaran.jsx).
  const bidangOpsiFilter = semuaTemaBidang(programTab);

  const angkatanList = useMemo(
    () => Array.from(new Set(mahasiswa.filter((m) => programOf(m) === programTab).map((m) => m.angkatan))).sort((a, b) => b - a),
    [mahasiswa, programTab]
  );

  const rows = useMemo(() => {
    if (arsipAktif) return [];
    const term = q.trim().toLowerCase();
    return mahasiswa
      .map((m) => ({ m, k: kondisi(m) }))
      .filter(({ m, k }) => {
        if (programOf(m) !== programTab) return false;
        if (term && !(`${m.nama} ${m.nim} ${m.judul}`.toLowerCase().includes(term))) return false;
        if (fAngkatan && String(m.angkatan) !== fAngkatan) return false;
        if (fBidang && m.bidang !== fBidang) return false;
        if (fDosen && ![m.pembimbing1, m.pembimbing2, m.penguji1, m.penguji2].includes(fDosen)) return false;
        if (fVerif && statusVerif(m).key !== fVerif) return false;
        if (fStatus === 'aktif' && (k.key === 'lulus' || k.key === 'batal')) return false;
        if (fStatus !== 'all' && fStatus !== 'aktif' && k.key !== fStatus) return false;
        return true;
      })
      .sort((a, b) => {
        const arah = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'no') {
          const noOf = (m) => (groupMode === 'angkatan' ? (nomorUrut[m.id] || {}).angkatan : (nomorUrut[m.id] || {}).periode) ?? 0;
          return (noOf(a.m) - noOf(b.m)) * arah;
        }
        if (sortBy === 'nomorSurat') {
          // Yang belum punya nomor selalu di bawah, ke arah mana pun disortir.
          const ka = a.m.nomorSurat ? kunciUrutNomor(a.m.nomorSurat) : '';
          const kb = b.m.nomorSurat ? kunciUrutNomor(b.m.nomorSurat) : '';
          if (!ka || !kb) return (ka ? 0 : 1) - (kb ? 0 : 1);
          return ka.localeCompare(kb, 'id') * arah;
        }
        const val = (m) => sortBy === 'judul' ? (m.judul || '')
          : sortBy === 'tahap' ? m.tahap
          : sortBy === 'pembimbing1' ? (m.pembimbing1 || '')
          : sortBy === 'pembimbing2' ? (m.pembimbing2 || '')
          : sortBy === 'penguji1' ? (m.penguji1 || '')
          : sortBy === 'penguji2' ? (m.penguji2 || '')
          : sortBy === 'deadline' ? (m.batasAkhir || '')
          // Aktivitas: waktu entri log terbaru (sama dengan yang tampil di sel);
          // data lama tanpa log memakai tanggal pendaftaran.
          : sortBy === 'aktivitas' ? ((aktivitasTerakhir(m) || {}).at || tanggalDibuat(m))
          : m.nama;
        return String(val(a.m)).localeCompare(String(val(b.m)), 'id') * arah;
      });
  }, [arsipAktif, mahasiswa, programTab, q, fAngkatan, fBidang, fStatus, fVerif, fDosen, sortBy, sortDir, nomorUrut, groupMode]);
  // Arsip: baris halaman ini dari Firestore. `tampil` = semua baris yang tersedia di layar.
  const rowsArsip = useMemo(() => arsip.rows.map((m) => ({ m, k: kondisi(m) })), [arsip.rows]);
  const tampil = arsipAktif ? rowsArsip : rows;
  const noArsip = useMemo(() => new Map(arsip.rows.map((m, i) => [m.id, arsip.mulai + i + 1])), [arsip.rows, arsip.mulai]);

  const notif = useMemo(() => {
    let baru = 0, kiriman = 0, perluJadwal = 0, perluHasil = 0, bentrok = 0, kelompok = 0;
    mahasiswa.forEach((m) => {
      // Menunggu verifikasi: pendaftaran yang belum pernah diverifikasi vs kiriman baru (unggah/jadwal/tautan) dari mahasiswa yang sudah berjalan.
      if (statusVerif(m).key === 'baru') { if (m.pernahTerverifikasi) kiriman++; else baru++; }
      const evA = eventAktif(m);
      if (evA) {
        const j = (m.jadwal || {})[evA] || {};
        if (j.tanggal && !j.dikonfirmasi) perluJadwal++;
        if (j.dikonfirmasi && !j.hasil) perluHasil++;
      }
      const cb = cariBentrok(mahasiswa, m);
      if (cb.bentrok.length) bentrok++;
      if (cb.kelompok.length) kelompok++;
    });
    return { baru, kiriman, perluJadwal, perluHasil, bentrok, kelompok };
  }, [mahasiswa]);

  // Paginasi — pencarian/filter (di atas) selalu jalan di atas SELURUH `mahasiswa`,
  // bukan cuma halaman yang lagi tampil; paginasi cuma memotong hasil akhir buat
  // ditampilkan. Default 100 baris/halaman, bisa diperkecil.
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => (arsipAktif ? rowsArsip : rows.slice((safePage - 1) * pageSize, safePage * pageSize)),
    [arsipAktif, rowsArsip, rows, safePage, pageSize]
  );

  // Kelompokkan baris halaman ini (yang sudah difilter & disortir) berdasarkan
  // periode/angkatan, menjaga urutan relatif yang sudah ada — mirip tampilan
  // "group" spreadsheet.
  const grupRows = useMemo(() => {
    if (groupMode === 'none') return null;
    const keyOf = (m) => (groupMode === 'angkatan' ? (m.angkatan || '—') : (m.periode || '—'));
    const map = new Map();
    pageRows.forEach((r) => {
      const k = keyOf(r.m);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [pageRows, groupMode]);

  function noUntuk(m) {
    if (arsipAktif) return noArsip.get(m.id) ?? '—';
    if (groupMode === 'angkatan') return (nomorUrut[m.id] || {}).angkatan ?? '—';
    return (nomorUrut[m.id] || {}).periode ?? '—';
  }

  // Urutan entri untuk tombol ‹ › di modal edit: persis urutan tabel — SEMUA baris
  // hasil filter/sort (lintas halaman), dengan pengelompokan periode/angkatan
  // ikut diterapkan seperti di grupRows.
  const urutanEdit = useMemo(() => {
    if (groupMode === 'none') return tampil.map((r) => r.m.id);
    const keyOf = (m) => (groupMode === 'angkatan' ? (m.angkatan || '—') : (m.periode || '—'));
    const map = new Map();
    tampil.forEach((r) => {
      const k = keyOf(r.m);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r.m.id);
    });
    return Array.from(map.values()).flat();
  }, [tampil, groupMode]);
  // Urutan ‹ › dibekukan saat modal dibuka: menyimpan bisa mengeluarkan entri dari
  // filter/sortir aktif (mis. filter "Menunggu verifikasi" lalu disimpan Terverifikasi),
  // yang sebelumnya menghilangkan tombol ‹ › karena entri itu tak lagi ada di urutan.
  const [urutanBeku, setUrutanBeku] = useState([]);
  function pindahEdit(id) {
    const m = (allMahasiswa || mahasiswa).find((x) => x.id === id) || arsip.rows.find((x) => x.id === id);
    if (m) { setSudahPindah(true); setEditing(m); }
  }

  function tambah() { setSudahPindah(false); setEditing(null); setOpen(true); }
  // Dari arsip: muat periode record itu, supaya cek lintas record di form (bentrok, beban, nomor) lengkap.
  function edit(m) {
    if (arsipAktif && onMuatPeriode && m.periode) onMuatPeriode(m.periode);
    setSudahPindah(false); setUrutanBeku(urutanEdit); setEditing(m); setOpen(true);
  }
  // Simpan menutup modal hanya untuk mahasiswa baru; record lama tetap terbuka
  // supaya admin bisa lanjut ke entri berikutnya dengan ‹ ›.
  function simpan(m) {
    onSave(m, arsip.rows.find((x) => x.id === m.id) || null);
    if (arsipAktif) setVersiArsip((v) => v + 1);
    if (!editing) setOpen(false);
  }
  // Versi terkini record yang sedang diedit (setelah disimpan, App mungkin
  // menambah field), supaya FormMahasiswa bisa menyelaraskan isinya.
  const editingTerkini = editing ? ((allMahasiswa || mahasiswa).find((x) => x.id === editing.id) || editing) : null;
  function hapus(m) {
    if (!window.confirm(`Hapus data ${m.nama}?`)) return;
    Promise.resolve(onDelete(m.id, m)).then(() => { if (arsipAktif) setVersiArsip((v) => v + 1); });
  }

  // Nama lengkap dosen dipakai khusus saat ekspor (kolom tabel tetap pakai kode
  // singkat spy hemat lebar) — lihat dosenByKode di bawah.
  const namaLengkapDosen = (kode) => (kode && dosenByKode[kode]) ? dosenByKode[kode].nama : (kode || '');

  async function ekspor(format) {
    if (!arsipAktif) { await eksporMahasiswa(format, rows.map((x) => x.m), { nomorUrut, namaLengkapDosen }); return; }
    // Arsip: semua baris yang cocok diambil sekarang; No. = posisi di hasil itu.
    const semua = await arsip.semua();
    await eksporMahasiswa(format, semua, { nomorUrut: Object.fromEntries(semua.map((m, i) => [m.id, { periode: i + 1 }])), namaLengkapDosen });
  }

  return (
    <div>
      <nav className="program-tabs">
        {PROGRAM_KEYS.map((p) => (
          <button key={p} className={'program-tab' + (programTab === p ? ' active' : '')} onClick={() => setProgramTab(p)}>{programLabel(p)}</button>
        ))}
      </nav>
      <div className="toolbar">
        <div className={'search-wrap' + (searchOpen || q ? ' open' : '')}>
          <button type="button" className="icon-btn-outline search-toggle" onClick={() => setSearchOpen(true)} title="Cari" aria-label="Cari">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <input
            className="search"
            placeholder={arsipAktif ? "Cari awalan nama atau NIM…" : "Cari nama, NIM, atau judul…"}
            value={q}
            autoFocus={searchOpen}
            onChange={(e) => setQ(e.target.value)}
            onBlur={() => { if (!q) setSearchOpen(false); }}
          />
          <TombolHapusCari q={q} onHapus={() => setQ('')} />
        </div>
        <div className="toolbar-filter">
          <button
            type="button"
            className={'btn toolbar-toggle' + (filtersOpen ? ' active' : '')}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filter{filterAktifCount > 0 ? ` (${filterAktifCount})` : ''} {filtersOpen ? '▴' : '▾'}
          </button>
          {filterAktifCount > 0 && (
            <button
              type="button"
              className="btn toolbar-clear"
              title="Bersihkan filter"
              aria-label="Bersihkan filter"
              onClick={resetFilter}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          )}
          {filtersOpen && (
            <>
              <div className="toolbar-filter-backdrop" onClick={() => setFiltersOpen(false)} />
              <div className="toolbar-extra" role="dialog" aria-label="Filter">
                <div className="toolbar-extra-head">
                  <span>Filter</span>
                  <button type="button" className="icon-btn form-head-tutup" onClick={() => setFiltersOpen(false)} aria-label="Tutup">✕</button>
                </div>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  {STATUS_FILTER.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <select value={fAngkatan} onChange={(e) => setFAngkatan(e.target.value)}>
                  <option value="">Semua angkatan</option>
                  {(arsipAktif ? [...daftarAngkatan].reverse() : angkatanList).map((a) => <option key={a} value={a}>Angkatan {a}</option>)}
                </select>
                <select value={fBidang} onChange={(e) => setFBidang(e.target.value)}>
                  <option value="">Semua bidang</option>
                  {bidangOpsiFilter.map((b) => <option key={b.kode} value={b.kode}>{b.label}</option>)}
                </select>
                <select value={fVerif} onChange={(e) => setFVerif(e.target.value)}>
                  <option value="">Semua verifikasi</option>
                  <option value="baru">Menunggu verifikasi</option>
                  <option value="terverifikasi">Terverifikasi</option>
                  <option value="perbaikan">Perlu perbaikan</option>
                </select>
                <select value={fDosen} onChange={(e) => setFDosen(e.target.value)}>
                  <option value="">Semua dosen</option>
                  {allDosen.map((d) => <option key={d.kode} value={d.kode}>{d.kode}</option>)}
                </select>
                <select value={groupMode} onChange={(e) => setGroupMode(e.target.value)} title="Kelompokkan tabel">
                  <option value="none">Tampilan: Normal</option>
                  <option value="periode">Kelompokkan per Periode</option>
                  <option value="angkatan">Kelompokkan per Angkatan</option>
                </select>
                <button type="button" className="btn btn-primary toolbar-extra-tutup" onClick={() => setFiltersOpen(false)}>Tutup</button>
              </div>
            </>
          )}
        </div>
        <ColumnMenu columns={kolomBisaSembunyi} hidden={hiddenCols} onToggle={toggleKolom} />
        <ExportMenu label="Ekspor" onXLSX={() => ekspor('xlsx')} onCSV={() => ekspor('csv')} />
        <button className="btn btn-primary tambah-btn" onClick={tambah} aria-label="Tambah">
          <span className="tambah-plus">+</span><span className="tambah-label"> Tambah</span>
        </button>
      </div>

      {(notif.baru + notif.kiriman + notif.perluJadwal + notif.perluHasil + notif.bentrok + notif.kelompok) > 0 && (
        <div className="callout" style={{ marginBottom: 12 }}>
          🔔 {notif.baru > 0 && <span><strong>{notif.baru}</strong> pendaftaran baru perlu diperiksa &amp; pembimbing. </span>}
          {notif.kiriman > 0 && <span><strong>{notif.kiriman}</strong> kiriman baru dari mahasiswa perlu diverifikasi. </span>}
          {notif.perluJadwal > 0 && <span><strong>{notif.perluJadwal}</strong> usulan jadwal perlu diverifikasi. </span>}
          {notif.perluHasil > 0 && <span><strong>{notif.perluHasil}</strong> menunggu hasil (lulus/tidak lulus). </span>}
          {notif.bentrok > 0 && <span>⚠ <strong>{notif.bentrok}</strong> jadwal berpotensi bentrok (tidak mengunci). </span>}
          {notif.kelompok > 0 && <span>👥 <strong>{notif.kelompok}</strong> jadwal terindikasi sidang kelompok. </span>}
        </div>
      )}
      {arsipAktif && <KeteranganArsip arsip={arsip} />}
      <div className="table-wrap card mhs-table-wrap" ref={tableWrapRef}>
        <table className="tbl tbl-resizable" style={{ width: tableWidth }}>
          <colgroup>
            {COLS.map((c, i) => (
              hiddenCols.has(c.key) ? null : <col key={c.key} style={i === COLS.length - 1 ? undefined : { width: colWidths[i] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th {...thSort('no')}>No.{panah('no')}<ColResizeHandle onMouseDown={(e) => startResize(0, e)} /></th>
              <th {...thSort('nama')}>Mahasiswa{panah('nama')}<ColResizeHandle onMouseDown={(e) => startResize(1, e)} /></th>
              {!hiddenCols.has('judul') && <th {...thSort('judul')}>Judul{panah('judul')}<ColResizeHandle onMouseDown={(e) => startResize(2, e)} /></th>}
              {!hiddenCols.has('tahap') && <th {...thSort('tahap')}>Tahap &amp; jadwal{panah('tahap')}<ColResizeHandle onMouseDown={(e) => startResize(3, e)} /></th>}
              {dosenCols.map((c, i) => (
                !hiddenCols.has(c.key) && <th key={c.key} {...thSort(c.key)}>{c.label}{panah(c.key)}<ColResizeHandle onMouseDown={(e) => startResize(4 + i, e)} /></th>
              ))}
              {!hiddenCols.has('deadline') && <th {...thSort('deadline')}>Deadline{panah('deadline')}<ColResizeHandle onMouseDown={(e) => startResize(4 + dosenCols.length, e)} /></th>}
              {!hiddenCols.has('aktivitas') && <th {...thSort('aktivitas')}>Aktivitas{panah('aktivitas')}<ColResizeHandle onMouseDown={(e) => startResize(5 + dosenCols.length, e)} /></th>}
              {!hiddenCols.has('nomorSurat') && <th {...thSort('nomorSurat')}>No. Surat{panah('nomorSurat')}<ColResizeHandle onMouseDown={(e) => startResize(6 + dosenCols.length, e)} /></th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const baris = ({ m, k }) => (
                <tr key={m.id}>
                  <td className="cell-sub">{noUntuk(m)}</td>
                  <td>
                    <div style={{ marginBottom: 4 }}><Badge tone={statusVerif(m).tone}>{statusVerif(m).label}</Badge></div>
                    <div className="cell-name">{m.nama}</div>
                    <div className="cell-sub">{m.nim}</div>
                    <div className="cell-sub">
                      {bidangLabel(m.bidang)}
                      {m.klasifikasi && punyaKlasifikasi(programOf(m)) ? ` · ${m.klasifikasi}` : ''}
                      {programOf(m) === 'MG' && jenisMagangOf(m) === 'MKT' && <span className="chip chip-mkt" style={{ marginLeft: 6 }}>MKT</span>}
                    </div>
                  </td>
                  {!hiddenCols.has('judul') && <td className="cell-judul">{m.judul || <span className="muted">—</span>}</td>}
                  {!hiddenCols.has('tahap') && (
                    <td style={{ minWidth: 180 }}>
                      <StageBar program={programOf(m)} tahap={m.tahap} />
                      <JadwalMini m={m} />
                    </td>
                  )}
                  {dosenCols.map((c) => !hiddenCols.has(c.key) && <td key={c.key}>{m[c.key] || '-'}</td>)}
                  {!hiddenCols.has('deadline') && (
                    <td className="cell-center">
                      <Badge tone={k.tone}>{k.label}</Badge>
                      <div className="cell-sub">{formatTanggalSingkat(m.batasAkhir)}</div>
                    </td>
                  )}
                  {!hiddenCols.has('aktivitas') && <td><AktivitasMini m={m} /></td>}
                  {!hiddenCols.has('nomorSurat') && <td className="cell-sub">{m.nomorSurat || '—'}{perluDitinjau(m) && <div><Badge tone="amber">Perlu ditinjau</Badge></div>}</td>}
                  <td className="cell-actions">
                    <button className="link-btn" onClick={() => edit(m)}>Edit</button>
                    <button className="link-btn danger" onClick={() => hapus(m)}>Hapus</button>
                  </td>
                </tr>
              );
              if (grupRows) {
                return grupRows.map((g) => (
                  <React.Fragment key={g.label}>
                    <tr className="tbl-group-row">
                      <td colSpan={COLS.length - jumlahKolomTersembunyi}>{groupMode === 'angkatan' ? `Angkatan ${g.label}` : g.label}</td>
                    </tr>
                    {g.items.map(baris)}
                  </React.Fragment>
                ));
              }
              return pageRows.map(baris);
            })()}
          </tbody>
        </table>
        {tampil.length === 0 && <Empty>{teksKosong}</Empty>}
      </div>

      {/* Tampilan daftar (bukan tabel) untuk layar sempit — data & urutan sama
          persis dengan tabel di atas (pageRows/grupRows), cuma ditata ulang
          jadi baris bertumpuk supaya tidak perlu geser ke samping di HP. */}
      <div className="mhs-mobile-rows">
        {tampil.length === 0 ? (
          <Empty>{teksKosong}</Empty>
        ) : (() => {
          const barisMobile = ({ m, k }) => (
            <div className="mhs-row" key={m.id} onClick={() => edit(m)}>
              <div className="mhs-row-top">
                <div className="mhs-row-name">{m.nama}</div>
                <Badge tone={k.tone}>{k.label}</Badge>
              </div>
              <div className="mhs-row-sub">
                {m.nim} · {programLabel(programOf(m))}
                {programOf(m) === 'MG' && jenisMagangOf(m) === 'MKT' && <span className="chip chip-mkt" style={{ marginLeft: 6 }}>MKT</span>}
                {' '}· {m.pembimbing1 || m.dosenWali || '—'}
              </div>
              <StageBar program={programOf(m)} tahap={m.tahap} />
              <div className="mhs-row-foot">
                <span>{statusVerif(m).label}</span>
                <span>Batas: {formatTanggal(m.batasAkhir)}</span>
              </div>
              <div className="mhs-row-actions">
                <button type="button" className="link-btn danger mhs-row-del" onClick={(e) => { e.stopPropagation(); hapus(m); }}>Hapus</button>
              </div>
            </div>
          );
          if (grupRows) {
            return grupRows.map((g) => (
              <div key={g.label}>
                <div className="mhs-mobile-group">{groupMode === 'angkatan' ? `Angkatan ${g.label}` : g.label}</div>
                {g.items.map(barisMobile)}
              </div>
            ));
          }
          return pageRows.map(barisMobile);
        })()}
      </div>

      {arsipAktif && <PaginasiArsip arsip={arsip} jumlah={rowsArsip.length} pageSize={pageSize} setPageSize={setPageSize} />}
      {!arsipAktif && rows.length > 0 && (
        <div className="pagination">
          <span className="hint">
            Menampilkan {rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, rows.length)} dari {rows.length} data
          </span>
          <div className="pagination-controls">
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} title="Baris per halaman">
              {[5, 10, 25, 50, 100, 500].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="btn btn-sm" disabled={safePage <= 1} onClick={() => setPage(1)}>«</button>
            <button className="btn btn-sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            <span className="hint">{safePage} / {totalPages}</span>
            <button className="btn btn-sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            <button className="btn btn-sm" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </div>
      )}

      {open && (
        <FormMahasiswa
          key={editing ? editing.id : 'baru'}
          awal={editingTerkini}
          urutan={urutanBeku}
          onPindah={pindahEdit}
          sudahPindah={sudahPindah}
          allDosen={allDosen}
          allMahasiswa={allMahasiswa || mahasiswa}
          periode={periode}
          periodeList={periodeList}
          daftarAngkatan={daftarAngkatan}
          konten={konten}
          defaultProgram={programTab}
          jadwalRuang={jadwalRuang}
          onCancel={() => setOpen(false)}
          onSave={simpan}
        />
      )}
    </div>
  );
}
