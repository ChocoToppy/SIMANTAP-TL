import React, { useMemo, useState } from 'react';
import { slotPadaTanggal, teksSlot } from '../logic/ruangBooking.js';
import { menitJam, formatTanggal } from '../host.js';

const STEP = 30; // menit per baris tampilan
const LEBAR_MIN_RUANG = 64; // px — batas terkecil kolom ruang; di bawah ini baru boleh digulir
const LEBAR_JAM = 40;
const TINGGI_BARIS = 20; // px, harus sama dengan .jr-kosong di styles.css
// Jumlah baris teks yang muat di blok setinggi `span` baris (dikurangi satu baris untuk jam).
const barisTeks = (span) => Math.max(1, Math.floor((span * TINGGI_BARIS - 4 - 12) / 13.6));
const DEFAULT_RENTANG = [7 * 60, 17 * 60];

const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Tampilan harian: kolom = ruang aktif, baris = jam, untuk SATU TANGGAL.
// Sel berwarna = terpakai, kosong = tersedia. Yang tampil adalah booking yang
// benar-benar berlaku pada tanggal itu (rentang berlaku & blackout dihormati).
// onKosong({ruangId, tanggal, mulai}) / onBlok(slot, tanggal): opsional — bila diberikan,
// sel kosong & blok bisa diklik (mode admin).
export function JadwalRuangHarian({ data, semester, tanggal, onKosong, onBlok }) {
  const [semuaRuang, setSemuaRuang] = useState(false); // false = sembunyikan ruang yang kosong seharian

  const { ruang, baris, sel, adaData, kosongSeharian = [], jendela = [] } = useMemo(() => {
    if (!data || !semester) return { ruang: [], baris: [], sel: {}, adaData: false };
    const dari = slotPadaTanggal(data, semester, tanggal);
    const ruangAktif = (data.ruang || []).filter((r) => r.aktif !== false).sort((a, b) => (a.urut || 0) - (b.urut || 0));
    // Ruang nonaktif tetap tampil bila pada tanggal ini masih punya booking.
    const idPakai = new Set(dari.map((s) => s.ruangId));
    const semuaKolom = [...ruangAktif, ...(data.ruang || []).filter((r) => r.aktif === false && idPakai.has(r.id))];
    const kolom = semuaRuang ? semuaKolom : semuaKolom.filter((r) => idPakai.has(r.id));
    const kosongSeharian = semuaKolom.filter((r) => !idPakai.has(r.id));
    // Rentang jam mengikuti data (bukan dipatok 07–17) supaya tidak ada baris kosong sia-sia.
    let min = DEFAULT_RENTANG[0], max = DEFAULT_RENTANG[1];
    if (dari.length) {
      min = Math.min(...dari.map((s) => menitJam(s.mulai)));
      max = Math.max(...dari.map((s) => menitJam(s.selesai)));
    }
    min = Math.floor(min / STEP) * STEP; max = Math.ceil(max / STEP) * STEP;
    const barisJam = [];
    for (let t = min; t < max; t += STEP) barisJam.push(t);
    const peta = {};
    kolom.forEach((r) => {
      dari.filter((s) => s.ruangId === r.id).sort((a, b) => menitJam(a.mulai) - menitJam(b.mulai)).forEach((s) => {
        const i = Math.floor((menitJam(s.mulai) - min) / STEP);
        const j = Math.max(i + 1, Math.ceil((menitJam(s.selesai) - min) / STEP));
        for (let k = i; k < j; k++) if (peta[`${k}|${r.id}`]) return; // tumpang tindih: tampilkan yang pertama
        peta[`${i}|${r.id}`] = { slot: s, span: j - i };
        for (let k = i + 1; k < j; k++) peta[`${k}|${r.id}`] = 'skip';
      });
    });
    // Jendela kosong >= 60 menit per ruang dalam rentang tampilan (untuk ringkasan di bawah grid).
    const jendela = semuaKolom.map((r) => {
      const pakai = dari.filter((s) => s.ruangId === r.id).map((s) => [menitJam(s.mulai), menitJam(s.selesai)]).sort((a, b) => a[0] - b[0]);
      const out = []; let kursor = min;
      pakai.forEach(([a, b]) => { if (a - kursor >= 60) out.push([kursor, a]); kursor = Math.max(kursor, b); });
      if (max - kursor >= 60) out.push([kursor, max]);
      return { ruang: r, jendela: out };
    }).filter((x) => x.jendela.length && idPakai.has(x.ruang.id));
    return { ruang: kolom, baris: barisJam, sel: peta, adaData: dari.length > 0, kosongSeharian, jendela };
  }, [data, semester, tanggal, semuaRuang]);

  const luar = tanggal < semester.mulai || tanggal > semester.selesai;
  return (
    <>
      {luar &&<div className="callout" style={{ marginBottom: 10 }}>Tanggal ini di luar {semester.label} ({formatTanggal(semester.mulai)} – {formatTanggal(semester.selesai)}).</div>}
      {!adaData && !luar && <div className="hint" style={{ marginBottom: 8 }}>Tidak ada pemakaian ruang pada tanggal ini (mungkin hari libur/blackout).</div>}
      {ruang.length === 0 && <div className="hint" style={{ marginBottom: 8 }}>Semua ruang kosong pada tanggal ini.</div>}
      <div className="jr-scroll">
        <table className="jr-tbl" style={{ minWidth: LEBAR_JAM + ruang.length * LEBAR_MIN_RUANG }}>
          <colgroup>
            <col style={{ width: LEBAR_JAM }} />
            {ruang.map((r) => <col key={r.id} />)}
          </colgroup>
          <thead>
            <tr><th className="jr-jam">Jam</th>{ruang.map((r) => <th key={r.id}>{r.nama}</th>)}</tr>
          </thead>
          <tbody>
            {baris.map((t, i) => (
              <tr key={t}>
                <td className="jr-jam">{fmt(t)}</td>
                {ruang.map((r) => {
                  const c = sel[`${i}|${r.id}`];
                  if (c === 'skip') return null;
                  if (!c) {
                    return onKosong
                      ? <td key={r.id} className="jr-kosong jr-klik" onClick={() => onKosong({ ruangId: r.id, tanggal, mulai: fmt(t) })} title="Tambah booking" />
                      : <td key={r.id} className="jr-kosong" />;
                  }
                  return (
                    <td key={r.id} rowSpan={c.span} className={'jr-pakai jr-' + c.slot.jenis + (onBlok ? ' jr-klik' : '')} onClick={onBlok ? () => onBlok(c.slot, tanggal) : undefined} title={teksSlot(c.slot)}>
                      <div className="jr-label" style={{ WebkitLineClamp: barisTeks(c.span), lineClamp: barisTeks(c.span) }}>{c.slot.label}</div>
                      <div className="jr-waktu">{c.slot.mulai}–{c.slot.selesai}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="jr-ringkas">
        {kosongSeharian.length > 0 && (
          <div>
            <strong>{semuaRuang ? 'Kosong seharian' : `${kosongSeharian.length} ruang kosong seharian`}:</strong> {kosongSeharian.map((r) => r.nama).join(', ')}{' '}
            <button type="button" className="btn btn-sm" onClick={() => setSemuaRuang((v) => !v)}>{semuaRuang ? 'Sembunyikan ruang kosong' : 'Tampilkan sebagai kolom'}</button>
          </div>
        )}
        {kosongSeharian.length === 0 && !semuaRuang && null}
        {jendela.length > 0 && (
          <details>
            <summary>Jendela kosong ≥ 1 jam pada ruang yang terpakai</summary>
            <div className="jr-jendela">
              {jendela.map((x) => <span key={x.ruang.id} className="jr-chip"><b>{x.ruang.nama}</b> {x.jendela.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(', ')}</span>)}
            </div>
          </details>
        )}
      </div>
    </>
  );
}
