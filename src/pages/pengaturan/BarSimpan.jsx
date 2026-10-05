import React, { useEffect, useRef, useState } from 'react';
import { Toast } from '../../components/Toast.jsx';

// Bilah konfirmasi di dasar editor visual: ubahan baru berlaku untuk mahasiswa
// setelah "Simpan perubahan" ditekan. `onSimpan` harus mengembalikan promise yang
// berisi true bila tersimpan di server (lihat simpanConfig di App.jsx); centang
// hanya muncul setelah server mengonfirmasi.
export function BarSimpan({ dirty, onSimpan, onBatal }) {
  const [sibuk, setSibuk] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [gagal, setGagal] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (dirty) setGagal(false); }, [dirty]);

  async function simpan() {
    setSibuk(true);
    setGagal(false);
    let ok = false;
    try { ok = (await onSimpan()) === true; } catch (e) { console.error('Simpan gagal:', e); }
    setSibuk(false);
    if (!ok) { setGagal(true); return; }
    setSukses(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSukses(false), 2600);
  }

  return (
    <>
      <div className={'ff-savebar' + (dirty ? ' ff-savebar-dirty' : '')} role="status">
        <span>
          {gagal ? 'Gagal menyimpan ke server. Perubahan Anda masih ada di sini — coba simpan lagi.'
            : dirty ? 'Ada perubahan yang belum disimpan. Mahasiswa belum melihatnya.' : 'Tidak ada perubahan.'}
        </span>
        <div className="ff-savebar-aksi">
          <button type="button" className="btn ghost" onClick={onBatal} disabled={!dirty || sibuk}>Batalkan</button>
          <button type="button" className="btn btn-primary" onClick={simpan} disabled={!dirty || sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan perubahan'}</button>
        </div>
      </div>
      {sukses && <Toast pesan="Perubahan tersimpan" />}
    </>
  );
}
