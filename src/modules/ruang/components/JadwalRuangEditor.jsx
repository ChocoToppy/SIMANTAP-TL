import React, { useState } from 'react';
import { JadwalRuangGrid } from './JadwalRuangGrid.jsx';
import { BookingEditor } from './BookingEditor.jsx';
import { todayISO } from '../host.js';
import { Modal } from '../host.js';

// Grid + editor booking (admin): klik sel kosong untuk menambah, klik blok untuk
// mengubah/membatalkan. `aksi` dari useJadwalRuang.
export function JadwalRuangEditor({ data, dosen, mahasiswa, semester, aksi }) {
  const [edit, setEdit] = useState(null); // { booking?, ruangId?, tanggal, mulai? }
  const [info, setInfo] = useState(null); // booking dari program (hanya baca)

  if (!semester) return <JadwalRuangGrid data={data} semester={semester} />;
  const bukaBaru = (info) => setEdit({ tanggal: todayISO(), ...info });
  return (
    <>
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={() => bukaBaru({})}>+ Booking baru</button>
        <span className="hint" style={{ margin: 0 }}>Klik sel kosong untuk menambah, klik blok untuk mengubah atau membatalkan.</span>
      </div>
      <JadwalRuangGrid
        data={data}
        semester={semester}
        onKosong={(info) => bukaBaru(info)}
        onBlok={(slot, tanggal) => {
          const booking = data.bookings.find((b) => b.id === slot.id);
          if (booking && booking.sumber === 'program') setInfo(booking);
          else if (booking) setEdit({ booking, tanggal });
        }}
      />
      {info && (
        <Modal title={info.judul} onClose={() => setInfo(null)} footer={<button className="btn btn-primary" onClick={() => setInfo(null)}>Tutup</button>}>
          <p>Booking ini berasal dari jadwal program yang sudah dikonfirmasi ({info.mulai}–{info.selesai}), jadi tidak diubah dari sini. Untuk memindahkan atau membatalkannya, ubah jadwal di data mahasiswa — grid ikut menyesuaikan.</p>
        </Modal>
      )}
      {edit && (
        <BookingEditor
          key={(edit.booking && edit.booking.id) || `${edit.ruangId}|${edit.tanggal}|${edit.mulai}`}
          data={data}
          dosen={dosen}
          mahasiswa={mahasiswa}
          semester={semester}
          awal={edit}
          onTutup={() => setEdit(null)}
          onTulis={(perubahan) => aksi.tulisBooking(perubahan, semester)}
        />
      )}
    </>
  );
}
