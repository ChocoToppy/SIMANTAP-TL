import React, { useState, useMemo, useEffect } from 'react';
import { PROGRAMS, PROGRAM_KEYS, programOf, programLabel, stagesFor, eventsFor, punyaKlasifikasi, punyaSyarat, rolesFor, syaratLabel, getJadwal, STAGES, KLASIFIKASI, BIDANG, KP_TEMA, HARI, bidangLabel, todayISO, parseISO, daysBetween, BULAN, formatTanggal, kondisi, isAktif, indexTahap, hitungBeban, hitungBebanProgram, hitungBebanRinci, SEMUA, filterByPeriode, daftarPeriode, buatId, ADMIN_PASSWORD, DOSEN_PASSWORD, PERIODE_AKTIF, TOPIK, VERIFIKASI, statusVerif, tambahHari, LABEL_PENDAFTARAN, ringkasPendaftaran, RUANG, menitJam, rentangJadwal, jamTampil, beririsan, dosenTerlibat, kumpulkanEvent, cariBentrok, pesanNotifikasi, waLink, mailtoLink, waMahasiswa, TEMPLATE_SURAT, tokenSurat, renderSurat, PEJABAT, KOP_SURAT, evKeyDok, dokTA, DURASI_EVENT, JAM_KERJA, durasiEvent, jamTambah, dalamJamKerja, tahapBerikut, eventAktif, BERKAS_SYARAT, berkasSyarat, bolehAjukanJadwal } from '../utils/helpers.js';
import { DOSEN_AWAL, plusHari, RAW_MAHASISWA, MAHASISWA_AWAL, AKUN_AWAL, PERIODE_BUKA_AWAL } from '../data/seed.js';
import { csvEscape, triggerDownload, downloadCSV, downloadDoc, cetakSuratPDF, loadXLSX, downloadXLSX } from '../utils/exportUtils.js';
import { Badge, StageBar, Field, Modal, Empty, ExportMenu } from '../components/ui.jsx';

// ===================== Dosen.js =====================
// Dosen.js — daftar dosen + beban otomatis dirinci per program

export function Dosen({ dosen, mahasiswa, periodeLabel, onSave, onDelete }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [semua, setSemua] = useState(true);   // true: termasuk lulus
  const [sortBy, setSortBy] = useState('total'); // 'total' | 'nama'

  const rows = useMemo(
    () =>
      dosen
        .map((d) => ({ ...d, ...hitungBebanRinci(mahasiswa, d.kode, { semua }) }))
        .sort((a, b) =>
          sortBy === 'nama'
            ? a.nama.localeCompare(b.nama)
            : (b.total - a.total || a.kode.localeCompare(b.kode))
        ),
    [dosen, mahasiswa, semua, sortBy]
  );

  const maxTotal = rows.reduce((mx, r) => Math.max(mx, r.total), 0) || 1;
  const bebanTone = (t) => (t >= 8 ? 'red' : t >= 6 ? 'amber' : 'blue');

  function tambah() { setEditing(null); setOpen(true); }
  function edit(d) { setEditing(d); setOpen(true); }
  function simpan(d) { onSave(d); setOpen(false); }
  function hapus(d) {
    if (window.confirm(`Hapus dosen ${d.kode}? Pastikan tidak sedang membimbing/menguji.`)) onDelete(d.kode);
  }

  const eksporHeaders = ['Kode', 'Nama', 'NIP', 'Kompetensi', 'Status', 'Bimbingan TA', 'Penguji TA', 'Bimbingan Capstone', 'Penguji Capstone', 'Bimbingan KP', 'Bimbingan Magang', 'Bimbingan Tesis S2', 'Penguji Tesis S2', 'Total beban'];
  const eksporData = () => rows.map((d) => [d.kode, d.nama, d.nip, d.kompetensi, d.status, d.bimbinganTA, d.pengujiTA, d.bimbinganCAP, d.pengujiCAP, d.bimbinganKP, d.bimbinganMG, d.bimbinganS2, d.pengujiS2, d.total]);
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

      <div className="table-wrap card">
        <table className="tbl tbl-wide">
          <thead>
            <tr>
              <th>Dosen</th>
              <th>Kompetensi</th>
              <th>Status</th>
              <th className="num">Bimbingan TA</th>
              <th className="num">Penguji TA</th>
              <th className="num">Bimbingan Capstone</th>
              <th className="num">Penguji Capstone</th>
              <th className="num">Bimbingan KP</th>
              <th className="num">Bimbingan Magang</th>
              <th className="num">Bimbingan Tesis S2</th>
              <th className="num">Penguji Tesis S2</th>
              <th style={{ minWidth: 130 }}>Total beban</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.kode}>
                <td>
                  <div className="cell-name">{d.kode}</div>
                  <div className="cell-sub">{d.nama}</div>
                </td>
                <td className="cell-sub">{d.kompetensi || '—'}</td>
                <td>{d.status || '—'}</td>
                <td className="num">{d.bimbinganTA}</td>
                <td className="num">{d.pengujiTA}</td>
                <td className="num">{d.bimbinganCAP}</td>
                <td className="num">{d.pengujiCAP}</td>
                <td className="num">{d.bimbinganKP}</td>
                <td className="num">{d.bimbinganMG}</td>
                <td className="num">{d.bimbinganS2}</td>
                <td className="num">{d.pengujiS2}</td>
                <td>
                  <div className="bar-row tight">
                    <div className="bar-track">
                      <div className={`bar-fill fill-${bebanTone(d.total)}`} style={{ width: `${d.total ? Math.max(8, (d.total / maxTotal) * 100) : 0}%` }} />
                    </div>
                    <span className="bar-val">{d.total}</span>
                  </div>
                </td>
                <td className="cell-actions">
                  <button className="link-btn" onClick={() => edit(d)}>Edit</button>
                  <button className="link-btn danger" onClick={() => hapus(d)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>Belum ada dosen. Klik "+ Tambah dosen" untuk menambah.</Empty>}
      </div>

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

