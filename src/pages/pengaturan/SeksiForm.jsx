import React, { useEffect, useRef, useState } from 'react';
import { KUNCI_PROGRAM, NAMA_KUNCI, BUTIR_SYARAT, gayaKP, urutanBawaan, urutanForm, medanForm } from '../../utils/formPendaftaran.js';
import { InspektorField } from './InspektorField.jsx';
import { TeksLive } from './TeksLive.jsx';
import { BarSimpan } from './BarSimpan.jsx';
import { useDraftKonten } from './useDraftKonten.js';
import { setPilihan } from '../../utils/pilihan.js';
import { FormPendaftaran } from '../portal/FormPendaftaran.jsx';
import { OpsiTemaEditor } from './OpsiTemaEditor.jsx';

// ===================== SeksiForm.jsx =====================
// Editor "Form Pendaftaran" (gaya Google Forms) untuk form yang diisi mahasiswa
// di portal. Field-nya tetap di kode (lihat utils/formPendaftaran.js — terikat ke
// data yang dibaca generator surat/PDF), admin hanya bisa mengubah judul,
// deskripsi, placeholder, wajib/tidak, dan urutannya, terpisah per program.
// Yang ditampilkan adalah FormPendaftaran asli (mode pratinjau) supaya admin melihat
// persis apa yang dilihat mahasiswa; klik sebuah field lalu ubah di panel samping.
// Pilihan dropdown Tema/Bidang diedit di panel field-nya.

// Asal pilihan dropdown, ditampilkan sebagai catatan di kartu field terkait.
const SUMBER = {
  angkatan: { teks: 'Pilihan angkatan dikelola di', seksi: 'angkatan', nama: 'Pengaturan → Angkatan' },
  periode: { teks: 'Periode yang bisa dipilih dikelola di', seksi: 'periode', nama: 'Pengaturan → Periode' },
  dosenWali: { teks: 'Daftar dosen berasal dari', seksi: 'staf', nama: 'Pengaturan → Dosen & Admin' },
  namaPersetujuanDosen: { teks: 'Daftar dosen berasal dari', seksi: 'staf', nama: 'Pengaturan → Dosen & Admin' },
};
const TETAP = ['program', 'jenis', 'klasifikasi', 'semester'];

export function SeksiForm({ konten: kontenTersimpan = {}, onSimpan: simpanKeServer, bukaSeksi, dosen = [], angkatan = [], periodeBuka = [] }) {
  // Semua ubahan masuk ke draf (`konten` di bawah = draf) dan baru ditulis ke Firestore
  // lewat "Simpan perubahan"; pratinjau membaca draf, jadi langsung ikut berubah.
  const { draft: konten, setDraft: onSimpan, dirty, simpan, batal } = useDraftKonten(kontenTersimpan, simpanKeServer);
  // Daftar Tema/Bidang dibaca dari store global (utils/pilihan.js): pasang draf-nya
  // supaya dropdown di pratinjau ikut, lalu kembalikan ke versi tersimpan saat keluar.
  setPilihan(konten);
  const tersimpanRef = useRef(kontenTersimpan);
  tersimpanRef.current = kontenTersimpan;
  useEffect(() => () => setPilihan(tersimpanRef.current), []);
  const [versi, setVersi] = useState(0); // naik saat ada "kembalikan ke bawaan" agar kolom teks mengambil ulang nilainya
  const [kunci, setKunci] = useState('KP');
  const [terpilih, setTerpilih] = useState(null);
  const urutan = urutanForm(kunci, konten);
  const medan = (id) => medanForm(kunci, id, konten);

  const semua = konten.formPendaftaran || {};
  const cur = semua[kunci] || {};
  function tulis(patch) {
    const baru = { ...cur, ...patch };
    // Urutan yang sama dengan bawaan tidak perlu disimpan (mis. digeser lalu dikembalikan).
    if (baru.urutan && baru.urutan.join() === urutanBawaan(kunci).join()) delete baru.urutan;
    onSimpan({ ...konten, formPendaftaran: { ...semua, [kunci]: baru } });
  }

  // Simpan hanya beda dari bawaan — nilai yang kembali sama dengan bawaan dibuang,
  // jadi kartu tidak ditandai "Diubah" tanpa alasan.
  function ubahMedan(id, patch) {
    const f = medan(id);
    const ov = { ...((cur.medan || {})[id] || {}) };
    for (const [k, v] of Object.entries(patch)) {
      const bawaan = { label: f.labelBawaan, hint: f.hintBawaan, placeholder: f.placeholderBawaan, wajib: false }[k];
      if (typeof v === 'string' ? v.trim() === (bawaan || '').trim() || (k === 'label' && !v.trim()) : v === bawaan) delete ov[k];
      else ov[k] = v;
    }
    const medanBaru = { ...(cur.medan || {}) };
    if (Object.keys(ov).length) medanBaru[id] = ov; else delete medanBaru[id];
    tulis({ medan: medanBaru });
  }
  function resetMedan(id) {
    const medanBaru = { ...(cur.medan || {}) };
    delete medanBaru[id];
    tulis({ medan: medanBaru });
    setVersi((v) => v + 1);
  }
  function geser(id, arah) {
    const i = urutan.indexOf(id);
    const j = i + arah;
    if (j < 0 || j >= urutan.length || medan(urutan[j]).kunciPosisi) return;
    const next = urutan.slice();
    [next[i], next[j]] = [next[j], next[i]];
    tulis({ urutan: next });
  }
  function resetProgram() {
    if (!window.confirm(`Kembalikan seluruh form ${NAMA_KUNCI[kunci]} ke tampilan bawaan? Semua judul, deskripsi, wajib, dan urutan yang Anda ubah untuk program ini dihapus.`)) return;
    const next = { ...semua };
    delete next[kunci];
    onSimpan({ ...konten, formPendaftaran: next });
    setVersi((v) => v + 1);
  }
  const angkatanAktif = angkatan.filter((a) => a.isActive !== false).map((a) => a.label).sort();
  const adaPerubahan = !!(cur.urutan || Object.keys(cur.medan || {}).length);

  function isiKartu(id) {
    if (id === 'bidang') return <OpsiTemaEditor jenis={gayaKP(kunci) ? 'kpTema' : 'bidang'} konten={konten} onSimpan={onSimpan} />;
    if (id === 'syarat') {
      return (
        <div className="ff-opsi">
          <div className="ff-opsi-title">Butir syarat</div>
          {BUTIR_SYARAT.map((b) => {
            const bf = medan(b);
            return (
              <div key={b} className="ff-sub">
                <TeksLive key={b + versi} nilai={bf.label} aria-label={bf.nama} onUbah={(v) => ubahMedan(b, { label: v })} />
                {bf.diubah && <button type="button" className="link-btn" onClick={() => resetMedan(b)}>Bawaan</button>}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  }

  function catatanKartu(id) {
    if (SUMBER[id]) {
      const s = SUMBER[id];
      return <>{s.teks} <button type="button" className="link-btn" onClick={() => bukaSeksi(s.seksi)}>{s.nama}</button>.</>;
    }
    if (TETAP.includes(id) || id === 'statusKP') return 'Pilihan di dropdown ini ditetapkan sistem (terikat ke alur program), hanya teksnya yang bisa diubah.';
    return null;
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Ini tampilan form pendaftaran persis seperti yang dilihat mahasiswa. Klik sebuah field untuk
        mengubah judul, deskripsi, wajib-tidaknya, atau urutannya di panel samping. Field-nya sendiri
        tidak bisa ditambah atau dihapus karena terikat ke surat/PDF yang dihasilkan sistem. Perubahan
        langsung berlaku tanpa deploy ulang.
      </p>

      <div className="program-tabs">
        {KUNCI_PROGRAM.map((k) => (
          <button key={k} type="button" className={'program-tab' + (kunci === k ? ' active' : '')} onClick={() => { setKunci(k); setTerpilih(null); }}>
            {NAMA_KUNCI[k]}
          </button>
        ))}
      </div>

      <div className="ff-layout">
        <div className="ff-canvas">
          <FormPendaftaran
            key={kunci}
            nim="0000000000000" nama="Nama Mahasiswa"
            allDosen={dosen} periodeBuka={periodeBuka.length ? periodeBuka : ['Gasal 2026/2027']}
            angkatanAktif={angkatanAktif} konten={konten}
            pratinjau={{ program: kunci === 'MKT' ? 'MG' : kunci, jenisMagang: kunci === 'MKT' ? 'MKT' : kunci === 'MG' ? 'Magang' : undefined, terpilih, onPilih: setTerpilih }}
          />
        </div>
        <InspektorField
          key={terpilih + ':' + kunci}
          f={terpilih && urutan.includes(terpilih) ? medan(terpilih) : null}
          onUbah={(patch) => ubahMedan(terpilih, patch)} onReset={() => resetMedan(terpilih)}
          bisaNaik={urutan.indexOf(terpilih) > 0 && !medan(urutan[urutan.indexOf(terpilih) - 1]).kunciPosisi}
          bisaTurun={urutan.indexOf(terpilih) < urutan.length - 1}
          onGeser={(a) => geser(terpilih, a)}
          catatan={terpilih ? catatanKartu(terpilih) : null}
        >
          {terpilih ? isiKartu(terpilih) : null}
        </InspektorField>
      </div>

      {adaPerubahan && (
        <button type="button" className="link-btn danger" style={{ marginTop: 12 }} onClick={resetProgram}>
          Kembalikan form {NAMA_KUNCI[kunci]} ke bawaan
        </button>
      )}

      <BarSimpan dirty={dirty} onSimpan={simpan} onBatal={batal} />
    </div>
  );
}
