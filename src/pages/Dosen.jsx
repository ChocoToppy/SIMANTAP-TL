import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, hitungBebanPeran, PROGRAM_BEBAN, SEMUA, filterByPeriode, daftarPeriode, buatId, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';
import { csvEscape, triggerDownload, downloadCSV, downloadDoc, cetakSuratPDF, loadXLSX, downloadXLSX } from '../utils/exportUtils.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu } from '../components/ui.jsx';
import { BebanDosen } from './dosen/BebanDosen.jsx';
import { tambahPeranLulus } from '../utils/ringkasLulus.js';

// ===================== Dosen.js =====================
// Dosen.js — daftar dosen + beban otomatis dirinci per program

// ringkasLulus: hanya di "Semua periode", saat pengajuan Lulus tidak dimuat (lihat ringkasLulus.js).
export function Dosen({ dosen, mahasiswa, periodeLabel, onSave, onDelete, ringkasLulus = null }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [semua, setSemua] = useState(true);   // true: termasuk lulus
  const [sortBy, setSortBy] = useState('total'); // 'total' | 'nama'

  // Urutan ditentukan BebanDosen per peran yang sedang dilihat.
  const rows = useMemo(
    () => dosen.map((d) => ({ ...d, peran: tambahPeranLulus(hitungBebanPeran(mahasiswa, d.kode, { semua }), semua ? ringkasLulus : null, d.kode) })),
    [dosen, mahasiswa, semua, ringkasLulus]
  );

  function tambah() { setEditing(null); setOpen(true); }
  // `d` di sini adalah baris tabel (raw dosen + beban terhitung dari
  // hitungBebanPeran) — pakai data mentah dari prop `dosen`, bukan `d`
  // langsung, supaya field beban (`peran`) yang cuma untuk tampilan tidak
  // ikut ke form lalu tersimpan sebagai field asing di Firestore.
  function edit(d) { setEditing(dosen.find((x) => x.kode === d.kode) || null); setOpen(true); }
  function simpan(d) { onSave(d); setOpen(false); }
  function hapus(d) {
    if (window.confirm(`Hapus dosen ${d.kode}? Pastikan tidak sedang membimbing/menguji.`)) onDelete(d.kode);
  }

  // Ekspor memuat ketiga peran sekaligus, dirinci per program.
  const NAMA_PERAN = { pembimbing: 'Pembimbing', penguji1: 'Ketua Penguji', penguji2: 'Anggota Penguji' };
  const NAMA_PROG = { TA: 'TA', CAP: 'Capstone', S2: 'Tesis S2', KP: 'KP', MG: 'Magang' };
  const kolomPeran = Object.entries(PROGRAM_BEBAN).flatMap(([peran, progs]) => [...progs, 'total'].map((p) => [peran, p]));
  const eksporHeaders = ['Kode', 'Nama', 'NIP', 'Kompetensi', 'Status',
    ...kolomPeran.map(([peran, p]) => `${NAMA_PERAN[peran]} ${p === 'total' ? 'total' : NAMA_PROG[p]}`), 'Total beban'];
  const eksporData = () => [...rows].sort((a, b) => a.kode.localeCompare(b.kode)).map((d) => [
    d.kode, d.nama, d.nip, d.kompetensi, d.status,
    ...kolomPeran.map(([peran, p]) => d.peran[peran][p]),
    Object.keys(PROGRAM_BEBAN).reduce((t, peran) => t + d.peran[peran].total, 0),
  ]);
  async function ekspor(format) {
    const data = eksporData();
    if (format === 'csv') { downloadCSV('rekap-dosen.csv', eksporHeaders, data); return; }
    try {
      await downloadXLSX('rekap-dosen.xlsx', [{ name: 'Rekap Dosen', headers: eksporHeaders, rows: data }]);
    } catch (e) {
      window.alert('Gagal membuat Excel (CDN mungkin diblokir). Mengunduh CSV sebagai gantinya.');
      downloadCSV('rekap-dosen.csv', eksporHeaders, data);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <span className="hint">Beban {semua ? 'semua status (termasuk lulus)' : 'mahasiswa aktif'}{periodeLabel ? ` — periode ${periodeLabel}` : ''}.</span>
        <label className="check" style={{ margin: 0 }}>
          <input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} /><span>Termasuk lulus</span>
        </label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="total">Urut: beban terbanyak</option>
          <option value="nama">Urut: nama (A–Z)</option>
        </select>
        <ExportMenu label="Ekspor" onXLSX={() => ekspor('xlsx')} onCSV={() => ekspor('csv')} />
        <button className="btn btn-primary" onClick={tambah}>+ Tambah dosen</button>
      </div>

      <BebanDosen rows={rows} sortBy={sortBy} onEdit={edit} onHapus={hapus} />

      {open && (
        <FormDosen awal={editing} existing={dosen} onCancel={() => setOpen(false)} onSave={simpan} />
      )}
    </div>
  );
}

function FormDosen({ awal, existing, onCancel, onSave }) {
  const baru = !awal;
  const [d, setD] = useState(awal || { kode: '', nama: '', nip: '', kompetensi: '', status: '', wa: '', email: '' });
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  function submit() {
    const kode = (d.kode || '').trim().toUpperCase();
    if (!kode) { window.alert('Kode dosen wajib diisi.'); return; }
    if (baru && existing.some((x) => x.kode === kode)) { window.alert('Kode dosen sudah ada.'); return; }
    onSave({ ...d, kode });
  }

  return (
    <Modal
      title={baru ? 'Tambah dosen' : `Edit dosen ${awal.kode}`}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>Batal</button>
          <button className="btn btn-primary" onClick={submit}>Simpan</button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Kode (mis. ASN)">
          <input value={d.kode} onChange={(e) => set('kode', e.target.value)} disabled={!baru} maxLength={6} placeholder="ABC" />
        </Field>
        <Field label="Status / jabatan"><input value={d.status} onChange={(e) => set('status', e.target.value)} placeholder="mis. L - S2" /></Field>
        <Field label="Nama lengkap" full><input value={d.nama} onChange={(e) => set('nama', e.target.value)} /></Field>
        <Field label="NIP" full><input value={d.nip} onChange={(e) => set('nip', e.target.value)} /></Field>
        <Field label="Kompetensi" full><input value={d.kompetensi} onChange={(e) => set('kompetensi', e.target.value)} placeholder="mis. Sampah dan Udara" /></Field>
        <Field label="Nomor WA (opsional)"><input value={d.wa || ''} onChange={(e) => set('wa', e.target.value)} placeholder="08xxxxxxxxxx" /></Field>
        <Field label="Email (opsional)"><input value={d.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="nama@undip.ac.id" /></Field>
      </div>
    </Modal>
  );
}

