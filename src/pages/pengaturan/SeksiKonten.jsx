import React, { useState } from 'react';
import { KP_DOKUMEN, MAGANG_DOKUMEN, MKT_DOKUMEN, BERKAS_SYARAT, berkasSyarat, programLabel } from '../../utils/helpers.js';
import { KpDocumentPanel } from '../../components/kpDocuments.jsx';
import { BerkasCallout } from '../../components/BerkasCallout.jsx';
import { InspektorDokumen, InspektorBerkas } from './InspektorKonten.jsx';
import { BarSimpan } from './BarSimpan.jsx';
import { useDraftKonten } from './useDraftKonten.js';

// ===================== SeksiKonten.jsx =====================
// Editor teks yang tampil untuk mahasiswa, ditampilkan sebagai komponen ASLI dari
// portal (panel dokumen & kotak "Dokumen yang perlu disiapkan") dalam mode
// pratinjau — klik salah satu lalu ubah di panel samping. Hanya teks yang bisa
// diubah; alur/tahapan/kelayakan dokumen tetap di kode (KP_DOKUMEN dkk. di
// helpers.js) dan jadi nilai bawaan selama admin belum meng-override.
// Disimpan di config/global → konten.dokumen[key] dan konten.berkasSyarat[kegiatan].

const LAYAR = [
  { key: 'KP', label: 'Dokumen KP', program: 'KP', daftar: KP_DOKUMEN },
  { key: 'MG', label: 'Dokumen Magang', program: 'MG', jenis: 'Magang', daftar: MAGANG_DOKUMEN },
  { key: 'MKT', label: 'Dokumen MKT', program: 'MG', jenis: 'MKT', daftar: MKT_DOKUMEN },
  { key: 'berkas', label: 'Persiapan kegiatan' },
];

export function SeksiKonten({ konten: kontenTersimpan = {}, onSimpan: simpanKeServer }) {
  // Semua ubahan masuk ke draf (`konten` di bawah = draf) dan baru ditulis ke Firestore
  // lewat "Simpan perubahan"; pratinjau membaca draf, jadi langsung ikut berubah.
  const { draft: konten, setDraft: onSimpan, dirty, simpan, batal } = useDraftKonten(kontenTersimpan, simpanKeServer);
  const [layarKey, setLayarKey] = useState('KP');
  const [terpilih, setTerpilih] = useState(null);
  const [ev, setEv] = useState(Object.keys(BERKAS_SYARAT)[0]);
  const layar = LAYAR.find((l) => l.key === layarKey);
  const overrideDokumen = konten.dokumen || {};
  const overrideBerkas = konten.berkasSyarat || {};

  // Simpan hanya beda dari bawaan — nilai yang kembali sama dibuang supaya tidak
  // ditandai "Diubah" tanpa alasan.
  function ubahDokumen(d, patch) {
    const ov = { ...(overrideDokumen[d.key] || {}) };
    for (const [k, v] of Object.entries(patch)) {
      const t = String(v).trim();
      if (!t || t === (d[k] || '')) delete ov[k]; else ov[k] = t;
    }
    const next = { ...overrideDokumen };
    if (Object.keys(ov).length) next[d.key] = ov; else delete next[d.key];
    onSimpan({ ...konten, dokumen: next });
  }
  function resetDokumen(key) {
    const next = { ...overrideDokumen };
    delete next[key];
    onSimpan({ ...konten, dokumen: next });
  }
  function simpanBerkas(list) {
    const sama = list.join('\n') === BERKAS_SYARAT[ev].join('\n');
    const next = { ...overrideBerkas };
    if (sama) delete next[ev]; else next[ev] = list;
    onSimpan({ ...konten, berkasSyarat: next });
  }
  function resetBerkas() {
    const next = { ...overrideBerkas };
    delete next[ev];
    onSimpan({ ...konten, berkasSyarat: next });
  }

  const dokTerpilih = layar.daftar && terpilih ? layar.daftar.find((d) => d.key === terpilih) : null;
  // Mahasiswa contoh: belum diverifikasi, tahap Pendaftaran — kondisi di mana
  // keterangan syarat tiap dokumen terlihat (setelah tersedia, tombol unduh yang tampil).
  const contoh = layar.program ? { program: layar.program, jenisMagang: layar.jenis, tahap: 'Pendaftaran', verifikasi: 'baru', pendaftaran: {}, jadwal: {} } : null;
  const namaProgram = layar.program ? (layar.key === 'MKT' ? 'MKT' : programLabel(layar.program)) : '';

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Tampilan di bawah adalah yang dilihat mahasiswa. Klik sebuah dokumen (atau kotak daftar
        persiapan) untuk mengubah teksnya di panel samping. Ini hanya teks; alur, tahapan, dan
        kelayakan dokumen tetap ditentukan di kode.
      </p>

      <div className="program-tabs">
        {LAYAR.map((l) => (
          <button key={l.key} type="button" className={'program-tab' + (layarKey === l.key ? ' active' : '')} onClick={() => { setLayarKey(l.key); setTerpilih(null); }}>
            {l.label}
          </button>
        ))}
      </div>

      {layar.key === 'berkas' ? (
        <>
          <div className="program-tabs">
            {Object.keys(BERKAS_SYARAT).map((k) => (
              <button key={k} type="button" className={'program-tab' + (ev === k ? ' active' : '')} onClick={() => setEv(k)}>{k}</button>
            ))}
          </div>
          <div className="ff-layout">
            <div className="ff-canvas">
              <div className="portal-form card">
                <h2 className="page-title">{ev === 'Sidang' ? 'Unggah draft & berkas sidang' : `Ajukan jadwal ${ev}`}</h2>
                <div className="ff-slot ff-slot-on">
                  <BerkasCallout items={berkasSyarat(ev, konten)} />
                  <div className="ff-slot-hit ff-slot-hit-diam" />
                </div>
                <p className="hint" style={{ margin: 0 }}>Kolom tanggal, jam, dan ruang di bawah kotak ini tidak ditampilkan di pratinjau.</p>
              </div>
            </div>
            <InspektorBerkas key={ev} ev={ev} daftar={berkasSyarat(ev, konten)} diubah={!!overrideBerkas[ev]} onSimpan={simpanBerkas} onReset={resetBerkas} />
          </div>
        </>
      ) : (
        <div className="ff-layout">
          <div className="ff-canvas">
            <div className="portal-form card">
              <KpDocumentPanel
                key={layar.key} m={contoh} program={layar.program} konten={konten} collapsible={false}
                title={`Dokumen ${namaProgram}`}
                pratinjau={{ terpilih, onPilih: setTerpilih }}
              />
              <p className="hint" style={{ margin: '12px 0 0' }}>
                Pratinjau untuk mahasiswa yang pendaftarannya belum diverifikasi, jadi keterangan syarat tiap dokumen terlihat.
              </p>
            </div>
          </div>
          {dokTerpilih ? (
            <InspektorDokumen
              key={dokTerpilih.key} d={dokTerpilih} o={overrideDokumen[dokTerpilih.key]}
              onUbah={(patch) => ubahDokumen(dokTerpilih, patch)} onReset={() => resetDokumen(dokTerpilih.key)}
            />
          ) : (
            <div className="ff-inspector">
              <div className="ff-inspector-title">Ubah dokumen</div>
              <p className="hint" style={{ margin: 0 }}>Klik sebuah dokumen pada tampilan di sebelah kiri untuk mengubah nama, keterangan syarat, atau tautannya.</p>
            </div>
          )}
        </div>
      )}

      <BarSimpan dirty={dirty} onSimpan={simpan} onBatal={batal} />
    </div>
  );
}
