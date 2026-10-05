import React, { useState } from 'react';
import { TeksLive } from './TeksLive.jsx';

// ===================== InspektorField.jsx =====================
// Panel di sebelah pratinjau form (Pengaturan → Form Pendaftaran): mengedit field
// yang sedang dipilih di pratinjau. Field-nya sendiri tidak bisa dihapus/ditambah —
// hanya teks, wajib, dan urutan (lihat utils/formPendaftaran.js). Ubahan masuk ke
// draf (SeksiForm) dan baru disimpan lewat tombol "Simpan perubahan".
// Beri `key` = id field supaya kolom teks ikut ganti saat pilihan berpindah.

export function InspektorField({ f, onUbah, onReset, bisaNaik, bisaTurun, onGeser, catatan, children }) {
  const [versi, setVersi] = useState(0); // naik saat "Kembalikan ke bawaan" agar kolom teks mengambil ulang nilainya
  if (!f) {
    return (
      <div className="ff-inspector">
        <div className="ff-inspector-title">Ubah field</div>
        <p className="hint" style={{ margin: 0 }}>Klik sebuah field pada form di sebelah kiri untuk mengubah judul, deskripsi, wajib-tidaknya, atau urutannya.</p>
      </div>
    );
  }
  const bisaPlaceholder = f.tipe === 'text' || f.tipe === 'textarea';
  const bisaWajib = f.tipe !== 'blok' && f.tipe !== 'centang' && !f.kunciPosisi;

  return (
    <div className="ff-inspector">
      <div className="ff-inspector-title">
        Ubah field
        {f.diubah && <span className="chip chip-on" style={{ marginLeft: 8 }}>Diubah</span>}
      </div>
      <div className="ff-inspector-name">{f.nama}</div>

      <label className="field">
        <span className="field-label">Judul field</span>
        <TeksLive key={'l' + versi} nilai={f.label} onUbah={(v) => onUbah({ label: v })} />
      </label>
      <label className="field">
        <span className="field-label">Deskripsi (teks kecil di bawah field)</span>
        <TeksLive key={'h' + versi} area nilai={f.hint} onUbah={(v) => onUbah({ hint: v })} placeholder="Kosongkan bila tidak perlu" />
      </label>
      {bisaPlaceholder && (
        <label className="field">
          <span className="field-label">Contoh isian (placeholder)</span>
          <TeksLive key={'p' + versi} nilai={f.placeholder} onUbah={(v) => onUbah({ placeholder: v })} placeholder="Kosongkan bila tidak perlu" />
        </label>
      )}
      {bisaWajib && (
        <label className="check">
          <input type="checkbox" checked={f.wajib} disabled={f.wajibTetap} onChange={(e) => onUbah({ wajib: e.target.checked })} />
          <span>Wajib diisi{f.wajibTetap ? ' (selalu, ditetapkan sistem)' : ''}</span>
        </label>
      )}
      {!f.kunciPosisi && (
        <div className="ff-inspector-move">
          <button type="button" className="btn ghost" onClick={() => onGeser(-1)} disabled={!bisaNaik}>↑ Naikkan</button>
          <button type="button" className="btn ghost" onClick={() => onGeser(1)} disabled={!bisaTurun}>↓ Turunkan</button>
        </div>
      )}
      {catatan && <div className="hint">{catatan}</div>}
      {children}
      {f.diubah && <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { onReset(); setVersi((v) => v + 1); }}>Kembalikan field ini ke bawaan</button>}
    </div>
  );
}
