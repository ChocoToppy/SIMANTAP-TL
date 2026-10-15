import React, { useState } from 'react';
import { formatTanggal, todayISO } from '../../utils/helpers.js';

// Menutup pengajuan (field `dibatalkan`, label "Ditutup"): pengajuan berhenti
// aktif tapi seluruh datanya (berkas, nomor surat, riwayat) tetap tersimpan
// sebagai arsip, dan mahasiswa boleh mendaftar ulang program yang sama.
// Dua bagian:
//  - PenutupanPengajuan: bagian "Tutup pengajuan" di dasar modal (saat terbuka).
//    Alasan wajib diisi sebelum tombol Tutup aktif (submit FormMahasiswa juga
//    memvalidasinya).
//  - BannerDitutup: penanda di atas modal saat pengajuan ditutup, dengan tombol
//    "Buka kembali".
// Keduanya hanya mengubah state form; berlaku setelah Simpan.
// `adaPengganti` = mahasiswa sudah punya pengajuan terbuka lain untuk program
// ini, jadi yang ini tidak boleh dibuka kembali.

export function PenutupanPengajuan({ m, setM, baru }) {
  const [buka, setBuka] = useState(false);
  const [alasan, setAlasan] = useState('');
  if (baru || m.dibatalkan) return null;

  function tutup() {
    setM((prev) => ({ ...prev, dibatalkan: true, penutupan: { alasan: alasan.trim(), tanggal: todayISO() } }));
    setBuka(false);
    setAlasan('');
  }

  return (
    <section className="tutup-seksi field-full">
      <div className="tutup-seksi-isi">
        <div>
          <h4 className="tutup-judul">Tutup pengajuan</h4>
          <p className="tutup-teks">
            Pengajuan berhenti aktif dan tidak dihitung beban dosen. Data, berkas, dan nomor surat tetap tersimpan
            sebagai arsip, dan mahasiswa bisa mendaftar ulang program ini.
          </p>
        </div>
        {!buka && <button type="button" className="btn btn-danger-outline" onClick={() => setBuka(true)}>Tutup pengajuan</button>}
      </div>
      {buka && (
        <div className="tutup-form">
          <span className="field-label">Alasan penutupan<span className="req"> *</span></span>
          <textarea rows={2} autoFocus value={alasan} onChange={(e) => setAlasan(e.target.value)}
            placeholder="mis. Dilepas dosen pembimbing karena melebihi batas waktu; mendaftar ulang periode berikutnya" />
          <div className="hint">Alasan ini terlihat oleh mahasiswa di kartu pengajuannya.</div>
          <div className="tutup-aksi">
            <button type="button" className="btn btn-danger" disabled={!alasan.trim()} onClick={tutup}>Tutup</button>
            <button type="button" className="btn" onClick={() => { setBuka(false); setAlasan(''); }}>Batal</button>
          </div>
        </div>
      )}
    </section>
  );
}

export function BannerDitutup({ m, setM, adaPengganti }) {
  // Data lama yang ditutup sebelum alasan diwajibkan: alasan diisi langsung di
  // banner, karena Simpan ditolak tanpa alasan. Ditentukan sekali saat dibuka
  // supaya isian tidak hilang begitu huruf pertama diketik.
  const [isiAlasan] = useState(() => !((m.penutupan || {}).alasan || '').trim());
  if (!m.dibatalkan) return null;
  const p = m.penutupan || {};
  const bukaKembali = () => setM((prev) => ({ ...prev, dibatalkan: false, penutupan: null }));
  const ubahAlasan = (v) => setM((prev) => ({ ...prev, penutupan: { ...(prev.penutupan || {}), tanggal: (prev.penutupan || {}).tanggal || todayISO(), alasan: v } }));
  return (
    <div className="banner-ditutup">
      <div className="banner-ditutup-teks">
        <strong>Ditutup{p.tanggal ? ` ${formatTanggal(p.tanggal)}` : ''}</strong>
        {isiAlasan ? (
          <>
            <span className="field-label">Alasan penutupan<span className="req"> *</span></span>
            <textarea rows={2} value={p.alasan || ''} onChange={(e) => ubahAlasan(e.target.value)} />
          </>
        ) : <span>Alasan: {p.alasan}</span>}
        {adaPengganti && <span className="banner-ditutup-sub">Mahasiswa sudah punya pengajuan baru yang terbuka untuk program ini.</span>}
      </div>
      <button type="button" className="btn btn-sm" onClick={bukaKembali} disabled={adaPengganti}
        title={adaPengganti ? 'Tidak bisa dibuka kembali: sudah ada pengajuan baru yang terbuka' : undefined}>
        Buka kembali
      </button>
    </div>
  );
}
