import React, { useState } from 'react';
import { Modal } from './ui.jsx';
import { catatAktivitas, BATAS_DIAM } from '../utils/sesi.js';
import { logout } from '../utils/auth.js';

// Peringatan satu menit sebelum keluar otomatis (lihat useBatasSesi di utils/sesi.js).
// "diam" bisa diperpanjang dengan aktivitas apa pun; batas 12 jam tidak bisa.
export function PeringatanSesi({ peringatan, role }) {
  const [batasDitutup, setBatasDitutup] = useState(false);
  if (!peringatan) return null;
  const detik = Math.max(0, Math.ceil(peringatan.sisa / 1000));

  if (peringatan.jenis === 'batas') {
    if (batasDitutup) return null;
    return (
      <Modal
        title="Sesi hampir berakhir"
        onClose={() => setBatasDitutup(true)}
        footer={<button type="button" className="btn btn-primary" onClick={() => setBatasDitutup(true)}>Mengerti</button>}
      >
        <p role="alert">
          Login dibatasi 12 jam. Anda akan keluar dalam <strong>{detik} detik</strong>. Simpan pekerjaan Anda
          sekarang, lalu masuk lagi.
        </p>
      </Modal>
    );
  }

  const menit = Math.round((BATAS_DIAM[role] || BATAS_DIAM.admin) / 60e3);
  return (
    <Modal
      title="Masih di sana?"
      onClose={catatAktivitas}
      footer={(
        <>
          <button type="button" className="btn" onClick={() => logout()}>Keluar sekarang</button>
          <button type="button" className="btn btn-primary" onClick={catatAktivitas} autoFocus>Tetap masuk</button>
        </>
      )}
    >
      <p role="alert">
        Tidak ada aktivitas selama hampir {menit} menit. Anda akan keluar otomatis dalam <strong>{detik} detik</strong>,
        dan perubahan yang belum disimpan akan hilang.
      </p>
    </Modal>
  );
}
