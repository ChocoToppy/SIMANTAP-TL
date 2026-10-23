import React, { useState } from 'react';
import { formatTanggal } from '../../utils/helpers.js';
import { hitungBatasProgram, tanggalSuratTugasBawaan } from '../../utils/perpanjangan.js';

// Langkah sebelum "Ambil nomor" untuk KP (dipakai NomorSuratPanel). Nomor surat KP =
// surat tugas, dan tanggalnya memulai jendela program 3 bulan (mulaiProgram). Admin
// boleh mengambil nomor jauh lebih awal, asal tanggal surat tugasnya cocok dengan
// periode dari surat balasan:
//  1. cocokkan tanggal mulai KP di perusahaan dengan surat balasan,
//  2. tetapkan tanggal surat tugas (bawaan 1 bulan sebelum KP mulai, supaya dosen
//     menerimanya sebelum mahasiswa berangkat; hari ini bila itu sudah lewat),
//  3. baru "Ambil nomor" (bulan/tahun nomor = bulan/tahun tanggal surat tugas).
// Setelah nomor tersimpan, tanggal terkunci; mengubahnya = mengambil nomor baru.
// ulang: surat balasan diganti setelah nomor terbit (suratBalasanBerganti), jadi tanggal
// surat tugas dihitung ulang dari surat balasan baru, dan baru bisa dicocokkan bila ada.
export function LangkahSuratTugas({ m, setM, cocok, setCocok, terkunci, ulang = false, onGanti }) {
  const st = m.mulaiProgram || '';
  // Surat balasan yang diunggah mahasiswa, untuk dicocokkan langsung di langkah 1.
  const sb = (m.dokumenKP || {}).suratBalasan;
  const sbHref = sb ? (sb.url || sb.dataUrl) : '';
  const [lihatSb, setLihatSb] = useState(false);

  // Pratinjau PDF di dalam modal; peramban HP sering tidak bisa menampilkan PDF di
  // iframe, jadi tautan "Buka di tab baru" tetap ada.
  const penampilSb = sbHref ? (
    <>
      <div className="st-sb">
        {sb.fileName && <span className="st-sb-nama" title={sb.fileName}>{sb.fileName}</span>}
        <div className="st-sb-aksi">
          <button type="button" className="btn" onClick={() => setLihatSb((v) => !v)} aria-expanded={lihatSb}>
            {lihatSb ? 'Sembunyikan' : 'Lihat surat balasan'}
          </button>
          <a className="btn" href={sbHref} target="_blank" rel="noreferrer">Buka di tab baru</a>
        </div>
      </div>
      {lihatSb && <iframe className="st-pdf" src={sbHref} title="Surat balasan perusahaan" />}
    </>
  ) : null;

  function ubahTanggal(v) {
    setM((prev) => ({
      ...prev,
      mulaiProgram: v,
      batasProgram: hitungBatasProgram(prev, v),
      // Nomor saran yang belum disimpan memuat bulan tanggal lama: ambil ulang.
      ...(prev.nomorDisarankan && prev.nomorDisarankan === prev.nomorSurat ? { nomorSurat: '', nomorDisarankan: '' } : {}),
    }));
  }

  if (terkunci) {
    return (
      <div className="st-langkah">
        <div>Tanggal surat tugas: <strong>{formatTanggal(st)}</strong> · Batas program: <strong>{formatTanggal(m.batasProgram || hitungBatasProgram(m))}</strong></div>
        <button type="button" className="link-btn" onClick={onGanti}>Ganti tanggal &amp; ambil nomor baru</button>
        {penampilSb}
      </div>
    );
  }

  return (
    <div className="st-langkah">
      <div className="st-langkah-baris">
        <span className="st-langkah-no">1</span>
        <div>
          Mulai KP di perusahaan (surat balasan): {m.tanggalMulai ? <strong>{formatTanggal(m.tanggalMulai)}</strong> : <em>belum ada, menunggu surat balasan</em>}
          {penampilSb}
          {m.tanggalMulai && !(ulang && !sb) && (
            <label className="check" style={{ marginTop: 4 }}>
              <input type="checkbox" checked={cocok} onChange={(e) => {
                setCocok(e.target.checked);
                if (e.target.checked && (!st || ulang)) ubahTanggal(tanggalSuratTugasBawaan(m));
              }} />
              <span>Sudah dicocokkan dengan surat balasan</span>
            </label>
          )}
        </div>
      </div>
      {cocok && (
        <div className="st-langkah-baris">
          <span className="st-langkah-no">2</span>
          <div>
            <label className="field-label st-label" htmlFor="tgl-surat-tugas">Tanggal surat tugas</label>
            <input id="tgl-surat-tugas" type="date" value={st} onChange={(e) => ubahTanggal(e.target.value)} />
            <div className="hint" style={{ marginTop: 4 }}>
              Bawaan 1 bulan sebelum KP mulai. Jendela program 3 bulan dihitung dari tanggal ini
              {st ? <>; batas program <strong>{formatTanggal(hitungBatasProgram(m, st))}</strong></> : ''}.
            </div>
          </div>
        </div>
      )}
      {cocok && st && <div className="st-langkah-baris"><span className="st-langkah-no">3</span><div>Ambil nomor (bertanggal {formatTanggal(st)}).</div></div>}
    </div>
  );
}
