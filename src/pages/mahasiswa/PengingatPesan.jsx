import React from 'react';

// Muncul saat admin memverifikasi pengajuan yang masih membawa pesan untuk
// mahasiswa (biasanya sisa permintaan perbaikan) — supaya pesan lama tidak
// lupa dihapus. Tidak menghapus otomatis: pesan juga dipakai sebagai
// pengumuman satu arah yang memang perlu tetap tampil.
export function PengingatPesan({ m, set, verifAwal }) {
  const catatan = (m.catatan || '').trim();
  if (!catatan || m.verifikasi !== 'terverifikasi' || verifAwal === 'terverifikasi') return null;
  return (
    <div className="callout callout-amber field-full" style={{ marginTop: 10 }}>
      <div>Pesan ini masih tampil di portal mahasiswa: <strong>“{catatan}”</strong></div>
      <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm" onClick={() => set('catatan', '')}>Hapus pesan</button>
        <span className="hint">Biarkan jika memang masih perlu dibaca mahasiswa.</span>
      </div>
    </div>
  );
}
