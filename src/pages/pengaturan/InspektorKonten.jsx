import React, { useState } from 'react';
import { TeksLive } from './TeksLive.jsx';

// ===================== InspektorKonten.jsx =====================
// Panel ubah di sebelah pratinjau Pengaturan → Konten. Ubahan masuk ke draf
// (SeksiKonten) dan baru disimpan lewat tombol "Simpan perubahan".

// Satu dokumen (kartu di panel "Dokumen KP/Magang/MKT" mahasiswa).
// d = definisi bawaan dari kode, o = override di draf saat ini.
// Beri `key` = kunci dokumen supaya kolom teks ikut ganti saat pilihan berpindah.
export function InspektorDokumen({ d, o = {}, onUbah, onReset }) {
  const [versi, setVersi] = useState(0);
  const diubah = Object.keys(o).length > 0;
  return (
    <div className="ff-inspector">
      <div className="ff-inspector-title">
        Ubah dokumen
        {diubah && <span className="chip chip-on" style={{ marginLeft: 8 }}>Diubah</span>}
      </div>
      <div className="ff-inspector-name">{d.stage}</div>
      <label className="field">
        <span className="field-label">Nama dokumen</span>
        <TeksLive key={'l' + versi} nilai={o.label || d.label} onUbah={(v) => onUbah({ label: v })} />
      </label>
      <label className="field">
        <span className="field-label">Keterangan syarat</span>
        <TeksLive key={'s' + versi} area nilai={o.syarat || d.syarat} onUbah={(v) => onUbah({ syarat: v })} />
      </label>
      <p className="hint" style={{ margin: 0 }}>
        Keterangan ini tampil di bawah dokumen selama belum tersedia bagi mahasiswa. Setelah tersedia,
        yang tampil tombol unduh. Nama file PDF yang dihasilkan tidak berubah.
      </p>
      {d.linkConfigurable && (
        <>
          <label className="field">
            <span className="field-label">URL tautan</span>
            <TeksLive key={'u' + versi} nilai={o.linkEksternal || d.linkEksternal || ''} onUbah={(v) => onUbah({ linkEksternal: v })} placeholder="https://..." />
          </label>
          <label className="field">
            <span className="field-label">Teks tautan/tombol</span>
            <TeksLive key={'t' + versi} nilai={o.linkLabel || d.linkLabel || ''} onUbah={(v) => onUbah({ linkLabel: v })} placeholder={d.linkLabel} />
          </label>
        </>
      )}
      {diubah && <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { onReset(); setVersi((v) => v + 1); }}>Kembalikan dokumen ini ke bawaan</button>}
    </div>
  );
}

// Daftar "Dokumen yang perlu disiapkan" satu kegiatan (satu berkas per baris).
// Beri `key` = nama kegiatan.
export function InspektorBerkas({ ev, daftar, diubah, onSimpan, onReset }) {
  const [versi, setVersi] = useState(0);
  const [err, setErr] = useState('');
  return (
    <div className="ff-inspector">
      <div className="ff-inspector-title">
        Ubah daftar
        {diubah && <span className="chip chip-on" style={{ marginLeft: 8 }}>Diubah</span>}
      </div>
      <div className="ff-inspector-name">{ev}</div>
      <label className="field">
        <span className="field-label">Satu berkas per baris</span>
        <TeksLive
          key={versi} area rows={6} nilai={daftar.join('\n')}
          onUbah={(v) => {
            const list = v.split('\n').map((s) => s.trim()).filter(Boolean);
            if (list.length === 0) { setErr('Isi minimal satu baris.'); return; }
            setErr('');
            onSimpan(list);
          }}
        />
      </label>
      {err && <div className="login-err">{err}</div>}
      <p className="hint" style={{ margin: 0 }}>Tampil sebagai daftar bernomor di form pengajuan jadwal mahasiswa untuk kegiatan ini.</p>
      {diubah && <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { setErr(''); onReset(); setVersi((v) => v + 1); }}>Kembalikan daftar ini ke bawaan</button>}
    </div>
  );
}
