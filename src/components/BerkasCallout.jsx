import React from 'react';

// Kotak "Dokumen yang perlu disiapkan" di form jadwal/sidang mahasiswa. Dipakai
// FormJadwalMhs (portal) dan pratinjau editor Pengaturan → Konten, supaya
// tampilan yang diedit admin sama persis dengan yang dilihat mahasiswa.
export function BerkasCallout({ items }) {
  return (
    <div className="callout" style={{ marginBottom: 12 }}>
      <strong>Dokumen yang perlu disiapkan:</strong>
      <ol style={{ margin: '6px 0 0', paddingLeft: 20 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ol>
    </div>
  );
}
