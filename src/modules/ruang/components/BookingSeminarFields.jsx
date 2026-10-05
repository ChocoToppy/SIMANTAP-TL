import React from 'react';
import { Field } from '../host.js';
import { PROGRAMS, PROGRAM_KEYS, programOf, eventsFor } from '../host.js';

// Jumlah mahasiswa maksimum per kegiatan menurut program (TA bisa berkelompok 3, Capstone 4).
export const MAKS_MAHASISWA = { TA: 3, CAP: 4, KP: 1, MG: 1, S2: 1 };
export const maksMahasiswa = (program) => MAKS_MAHASISWA[program] || 1;

// Isian khusus booking seminar/sidang: program -> kegiatan (daftar mengikuti program) ->
// 1..N mahasiswa (nama bebas, dengan saran dari mahasiswa terdaftar di program itu).
export function BookingSeminarFields({ f, set, mahasiswa = [] }) {
  const maks = maksMahasiswa(f.program);
  const saran = mahasiswa.filter((m) => programOf(m) === f.program && !m.dibatalkan);
  const idList = 'saran-mhs-' + f.program;
  const ubahProgram = (program) => {
    const evs = eventsFor(program);
    set('program', program);
    set('kegiatan', evs.includes(f.kegiatan) ? f.kegiatan : evs[0]);
    set('mhs', f.mhs.slice(0, maksMahasiswa(program)));
  };
  const ubahMhs = (i, v) => set('mhs', f.mhs.map((x, j) => (j === i ? v : x)));

  return (
    <>
      <Field label="Program">
        <select value={f.program} onChange={(e) => ubahProgram(e.target.value)}>
          {PROGRAM_KEYS.map((k) => <option key={k} value={k}>{PROGRAMS[k].label}</option>)}
        </select>
      </Field>
      <Field label="Kegiatan">
        <select value={f.kegiatan} onChange={(e) => set('kegiatan', e.target.value)}>
          {eventsFor(f.program).map((ev) => <option key={ev} value={ev}>{ev}</option>)}
        </select>
      </Field>
      <Field label={`Mahasiswa (maks. ${maks})`} full>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {f.mhs.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input list={idList} value={v} onChange={(e) => ubahMhs(i, e.target.value)} placeholder={`Nama mahasiswa ${f.mhs.length > 1 ? i + 1 : ''}`.trim()} />
              {f.mhs.length > 1 && <button type="button" className="btn btn-sm" onClick={() => set('mhs', f.mhs.filter((_, j) => j !== i))} aria-label="Hapus mahasiswa">✕</button>}
            </div>
          ))}
          <datalist id={idList}>{saran.map((m) => <option key={m.id} value={m.nama}>{m.nim}</option>)}</datalist>
          {f.mhs.length < maks && <div><button type="button" className="btn btn-sm" onClick={() => set('mhs', [...f.mhs, ''])}>+ Tambah mahasiswa</button></div>}
        </div>
      </Field>
    </>
  );
}
