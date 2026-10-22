import React, { useMemo } from 'react';
import { hitungBeban, programOf, programLabel, rolesFor } from '../../utils/helpers.js';

// Versi ringkas grafik "Beban dosen" di Dashboard, ditaruh di samping dropdown
// pembimbing/penguji supaya admin bisa memilih dosen tanpa bolak-balik ke
// Dashboard. Dihitung per periode mahasiswa ini, termasuk yang sudah lulus
// (sama dengan mode "Semua" di Dashboard). Beban pembimbing terpisah per
// program (pembimbing KP ≠ pembimbing TA), beban penguji lintas program.
// peran: 'bimbingan' | 'penguji' (penguji 1 + 2) | 'penguji1' | 'penguji2' —
// Ketua (penguji1) & Anggota (penguji2) Penguji TA dihitung terpisah.
// Isian form yang belum disimpan ikut dihitung, jadi grafik langsung berubah
// saat dosen dipilih.
export function BebanDosenMini({ m, allMahasiswa, dosen, peran }) {
  const program = programOf(m);
  const perProgram = peran === 'bimbingan';
  const roles = rolesFor(program);
  const namaPeran = { bimbingan: 'pembimbing', penguji: 'penguji', penguji1: roles.penguji1Label || 'Penguji 1', penguji2: roles.penguji2Label || 'Penguji 2' }[peran];
  const judul = perProgram ? `Beban pembimbing ${programLabel(program)}` : `Beban ${namaPeran} (semua program)`;
  const data = useMemo(() => {
    const lain = allMahasiswa.filter((x) => x.id !== m.id && x.periode === m.periode && (!perProgram || programOf(x) === program));
    const list = [...lain, m];
    return dosen
      .map((d) => ({ kode: d.kode, nama: d.nama, n: hitungBeban(list, d.kode, { semua: true })[peran] }))
      .sort((a, b) => a.kode.localeCompare(b.kode));
  }, [allMahasiswa, m, dosen, peran, perProgram, program]);

  const dipilih = { bimbingan: [m.pembimbing1, m.pembimbing2], penguji: [m.penguji1, m.penguji2], penguji1: [m.penguji1], penguji2: [m.penguji2] }[peran];
  const max = Math.max(1, ...data.map((d) => d.n));

  return (
    <div className="beban-mini">
      <div className="sebaran-group-title">{judul} · {m.periode || 'tanpa periode'}</div>
      <div className="bars beban-mini-list">
        {data.map((d) => (
          <div className={'bar-row tight' + (dipilih.includes(d.kode) ? ' dipilih' : '')} key={d.kode} title={`${d.nama}: ${d.n} sebagai ${namaPeran}`}>
            <span className="bar-key">{d.kode}</span>
            <div className="bar-track">
              <div className="bar-fill fill-blue" style={{ width: `${(d.n / max) * 100}%` }} />
            </div>
            <span className="bar-val">{d.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
