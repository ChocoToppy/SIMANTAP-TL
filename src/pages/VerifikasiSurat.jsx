import React, { useEffect, useState } from 'react';
import logoTl from '../assets/logo-tl.png';
import { formatTanggal, formatWaktu } from '../utils/helpers.js';

// Halaman publik dari QR di surat bertanda tangan (/verifikasi/{token}), tanpa login.
// Dirender langsung dari main.jsx, di luar App, jadi tidak memuat sesi atau data
// aplikasi. Data dari Cloud Function verifikasiSuratPublik (functions/verifikasiSurat.js),
// dipanggil lewat URL fungsinya langsung: situs produksi ada di cPanel, bukan Firebase
// Hosting, jadi tidak ada rewrite /api di sana. VITE_VERIFIKASI_API: untuk mencoba fungsi
// versi lokal sebelum di-deploy.
const API = import.meta.env.VITE_VERIFIKASI_API || 'https://asia-southeast2-simantap-tl.cloudfunctions.net/verifikasiSuratPublik';

function teksPeriode(p) {
  return p && p.dari ? `${formatTanggal(p.dari)} s.d. ${formatTanggal(p.sampai)}` : '-';
}

function Isi({ token }) {
  const [hasil, setHasil] = useState({ status: 'muat' });
  const [percobaan, setPercobaan] = useState(0);

  useEffect(() => {
    let batal = false;
    setHasil({ status: 'muat' });
    fetch(`${API}?t=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (r.status === 404) return { status: 'tidak-ada' };
        if (!r.ok) throw new Error(String(r.status));
        return { status: 'ada', surat: await r.json() };
      })
      .catch(() => ({ status: 'gagal' }))
      .then((h) => { if (!batal) setHasil(h); });
    return () => { batal = true; };
  }, [token, percobaan]);

  if (hasil.status === 'muat') {
    return <p className="vs-pesan" role="status">Memeriksa surat…</p>;
  }
  if (hasil.status === 'gagal') {
    return (
      <div className="vs-pesan" role="alert">
        <p>Surat belum bisa diperiksa. Periksa koneksi internet Anda, lalu coba lagi.</p>
        <button type="button" className="btn" onClick={() => setPercobaan((n) => n + 1)}>Periksa lagi</button>
      </div>
    );
  }
  if (hasil.status === 'tidak-ada') {
    return (
      <section className="vs-putusan vs-tidak">
        <h1>QR tidak terdaftar</h1>
        <p>QR ini tidak tercatat di SIMANTAP-TL. Surat yang memuatnya bukan terbitan Program Studi S1 Teknik Lingkungan Undip.</p>
      </section>
    );
  }

  const s = hasil.surat;
  const periode = teksPeriode(s.periode);
  // Tiga putusan: berlaku (hijau), versi lama (kuning: asli, tetapi data di SIMANTAP
  // sudah berubah sejak dicetak), dan tidak berlaku (merah: nomornya diakhiri).
  const putusan = !s.berlaku ? 'tidak' : s.berubah ? 'lama' : 'sah';
  return (
    <>
      <section className={`vs-putusan vs-${putusan}`}>
        <h1>{{ sah: 'Surat terverifikasi', lama: 'Surat versi lama', tidak: 'Surat tidak berlaku' }[putusan]}</h1>
        {putusan === 'sah' && (
          <p>Surat ini diterbitkan Program Studi S1 Teknik Lingkungan Undip melalui SIMANTAP-TL, dan nomornya masih berlaku.</p>
        )}
        {putusan === 'lama' && (
          <p>
            Surat ini asli dan diterbitkan oleh Program Studi S1 Teknik Lingkungan Undip melalui SIMANTAP-TL. Namun,
            data diperbarui di SIMANTAP{s.diubah ? ` pada ${formatWaktu(s.diubah)}` : ''} setelah surat dicetak. Versi
            terbaru tersedia di SIMANTAP-TL. Mohon meminta salinan terbaru kepada mahasiswa yang bersangkutan.
          </p>
        )}
        {putusan === 'tidak' && (
          <p>Surat ini pernah diterbitkan lewat SIMANTAP-TL, tetapi nomornya sudah diakhiri. Surat ini sudah tidak berlaku.</p>
        )}
      </section>
      <dl className="vs-data">
        <dt>Nomor surat</dt><dd className="vs-nomor">{s.nomor}</dd>
        <dt>Keperluan</dt><dd>{s.keperluan}</dd>
        <dt>Nama</dt><dd>{s.nama}</dd>
        <dt>NIM</dt><dd>{s.nim}</dd>
        <dt>Program</dt><dd>{s.program}</dd>
        <dt>Judul</dt><dd>{s.judul || '-'}</dd>
        <dt>Periode</dt><dd>{periode}</dd>
      </dl>
      {putusan === 'sah' && (
        <p className="vs-sahkan">Dengan ini menjadikan dokumen tersebut sah dan dapat dipergunakan sebagaimana mestinya.</p>
      )}
      <p className="vs-cetak">Terakhir dicetak {formatWaktu(s.terakhirDicetak)}</p>
    </>
  );
}

export default function VerifikasiSurat({ token }) {
  useEffect(() => { document.title = 'Verifikasi surat · SIMANTAP-TL'; }, []);
  return (
    <div className="vs-wrap">
      <main className="vs-kartu">
        <header className="vs-merek">
          <img className="brand-mark" src={logoTl} alt="" />
          <div>
            <div className="brand-name">SIMANTAP</div>
            <div className="vs-unit">Program Studi S1 Teknik Lingkungan, Fakultas Teknik, Universitas Diponegoro</div>
          </div>
        </header>
        <Isi token={token} />
      </main>
    </div>
  );
}
