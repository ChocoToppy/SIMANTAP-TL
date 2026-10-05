import React, { useMemo, useState } from 'react';
import { Modal, Field } from '../host.js';
import { NAMA_HARI } from '../logic/jadwalRuang.js';
import { JENIS_BOOKING, hariDariTanggal, bentrokBookingBaru, rancangPerubahan, rancangHapus } from '../logic/ruangBooking.js';
import { formatTanggal, buatId, PROGRAMS, eventsFor, programOf, programLabel } from '../host.js';
import { BookingSeminarFields } from './BookingSeminarFields.jsx';

// Penanggung jawab: maks. 2 slot. Dosen departemen disimpan {kode, nama}; dosen luar
// {nama, luar:true} tanpa kode — sengaja tidak masuk daftar dosen (tidak bisa jadi pembimbing).
const LUAR = '__luar__';
const bentukPj = (pj = []) => [0, 1].map((i) => {
  const p = pj[i];
  if (!p) return { mode: 'dosen', kode: '', nama: '' };
  return p.luar || !p.kode ? { mode: 'luar', kode: '', nama: p.nama || '' } : { mode: 'dosen', kode: p.kode, nama: p.nama || '' };
});

const bentukSeminar = (b = {}) => {
  const program = PROGRAMS[b.program] ? b.program : 'TA';
  return { program, kegiatan: b.kegiatan || eventsFor(program)[0], mhs: b.mahasiswa && b.mahasiswa.length ? b.mahasiswa.map((m) => m.nama) : [''] };
};

// Editor booking untuk admin: tambah (klik sel kosong / tombol), ubah & batalkan
// (klik blok). Kuliah berulang bisa diubah untuk semua pekan, mulai tanggal
// tertentu, atau hanya pada tanggal yang sedang dilihat.
export function BookingEditor({ data, dosen = [], mahasiswa = [], semester, awal, onTutup, onTulis }) {
  const lama = awal.booking || null; // booking yang diubah (null = baru)
  const [f, setF] = useState(() => lama
    ? { jenis: lama.jenis, judul: lama.judul, pj: bentukPj(lama.pj), ...bentukSeminar(lama), ruangId: lama.ruangId, mulai: lama.mulai, selesai: lama.selesai, hari: lama.hari ?? hariDariTanggal(awal.tanggal), tanggal: lama.tanggal || awal.tanggal, dari: lama.dari || semester.mulai, sampai: lama.sampai || semester.selesai }
    : { jenis: 'pengganti', judul: '', pj: bentukPj(), ...bentukSeminar(), ruangId: awal.ruangId || '', mulai: awal.mulai || '08:00', selesai: awal.mulai ? '' : '09:00', hari: hariDariTanggal(awal.tanggal), tanggal: awal.tanggal, dari: semester.mulai, sampai: semester.selesai });
  const [cakupan, setCakupan] = useState('sekali'); // hanya untuk kuliah berulang yang sudah ada
  const [err, setErr] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const ubahPj = (i, patch) => setF((p) => ({ ...p, pj: p.pj.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const mingguan = f.jenis === 'kuliah';
  const seminar = f.jenis === 'seminar';
  const punyaCakupan = !!lama && lama.pola === 'mingguan';
  const ruangPilihan = (data.ruang || []).filter((r) => r.aktif !== false || r.id === f.ruangId).sort((a, b) => (a.urut || 0) - (b.urut || 0));

  const kandidat = useMemo(() => {
    if (!f.ruangId || !f.mulai || !f.selesai) return null;
    // Cakupan 'sekali' pada kuliah berulang = satu tanggal saja; 'mulai' = dari tanggal ini.
    if (punyaCakupan && cakupan === 'sekali') return { pola: 'sekali', tanggal: awal.tanggal, ruangId: f.ruangId, mulai: f.mulai, selesai: f.selesai };
    if (mingguan) return { pola: 'mingguan', hari: Number(f.hari), dari: punyaCakupan && cakupan === 'mulai' ? awal.tanggal : f.dari, sampai: f.sampai, kecuali: lama ? lama.kecuali : [], ruangId: f.ruangId, mulai: f.mulai, selesai: f.selesai };
    return { pola: 'sekali', tanggal: f.tanggal, ruangId: f.ruangId, mulai: f.mulai, selesai: f.selesai };
  }, [f, cakupan, mingguan, punyaCakupan, lama, awal.tanggal]);
  const bentrok = useMemo(() => (kandidat && f.mulai < f.selesai ? bentrokBookingBaru(data, semester, kandidat, lama && lama.id) : []), [kandidat, data, semester, lama, f.mulai, f.selesai]);

  async function simpan() {
    const namaMhs = seminar ? f.mhs.map((n) => n.trim()).filter(Boolean) : [];
    if (!f.judul.trim() && !namaMhs.length) { setErr(seminar ? 'Isi nama mahasiswa atau judul/keterangan.' : 'Judul/keterangan wajib diisi.'); return; }
    if (!f.ruangId) { setErr('Pilih ruang.'); return; }
    if (!f.mulai || !f.selesai || f.selesai <= f.mulai) { setErr('Jam selesai harus setelah jam mulai.'); return; }
    if (!mingguan && (f.tanggal < semester.mulai || f.tanggal > semester.selesai)) { setErr(`Tanggal harus dalam ${semester.label} (${formatTanggal(semester.mulai)} – ${formatTanggal(semester.selesai)}).`); return; }
    if (mingguan && (!f.dari || !f.sampai || f.sampai < f.dari)) { setErr('Rentang tanggal berlaku belum valid.'); return; }
    if (bentrok.length) {
      const ring = bentrok.slice(0, 5).map((b) => `• ${formatTanggal(b.tanggal)}: ${b.label} (${b.mulai}–${b.selesai})`).join('\n');
      if (!window.confirm(`Bentrok dengan booking lain:\n${ring}${bentrok.length > 5 ? `\n… dan ${bentrok.length - 5} lainnya` : ''}\n\nTetap simpan?`)) return;
    }
    const pj = f.pj.map((p) => (p.mode === 'luar' ? { nama: p.nama.trim(), luar: true } : p.kode ? { kode: p.kode, nama: (dosen.find((d) => d.kode === p.kode) || {}).nama || p.nama } : null)).filter((p) => p && p.nama);
    // Judul kosong pada seminar/sidang dibuat otomatis: "Kegiatan Program — nama, nama".
    const judul = f.judul.trim() || `${f.kegiatan} ${programLabel(f.program)} — ${namaMhs.join(', ')}`;
    const infoSeminar = seminar
      ? { program: f.program, kegiatan: f.kegiatan, mahasiswa: namaMhs.map((nama) => { const m = mahasiswa.find((x) => programOf(x) === f.program && x.nama === nama); return m && m.nim ? { nama, nim: m.nim } : { nama }; }) }
      : lama && lama.kegiatan ? { program: '', kegiatan: '', mahasiswa: [] } : {};
    const nilai = { jenis: f.jenis, judul, pj, ...infoSeminar, ruangId: f.ruangId, mulai: f.mulai, selesai: f.selesai };
    const baru = mingguan
      ? { ...nilai, pola: 'mingguan', hari: Number(f.hari), dari: f.dari, sampai: f.sampai }
      : { ...nilai, pola: 'sekali', tanggal: f.tanggal };
    let perubahan;
    if (lama) perubahan = rancangPerubahan(lama, baru, punyaCakupan ? cakupan : 'semua', awal.tanggal, semester, buatId());
    else perubahan = { set: [{ ...baru, id: buatId(), sumber: 'manual', kecuali: [] }], hapus: [] };
    setSibuk(true);
    try { await onTulis(perubahan); onTutup(); } catch (e) { setErr(e.message || String(e)); setSibuk(false); }
  }

  async function batalkan() {
    const teks = punyaCakupan
      ? { sekali: `Batalkan ${lama.judul} hanya pada ${formatTanggal(awal.tanggal)}?`, mulai: `Akhiri ${lama.judul} mulai ${formatTanggal(awal.tanggal)}?`, semua: `Hapus ${lama.judul} dari SELURUH semester?` }[cakupan]
      : `Hapus ${lama.judul}?`;
    if (!window.confirm(teks)) return;
    setSibuk(true);
    try { await onTulis(rancangHapus(lama, punyaCakupan ? cakupan : 'semua', awal.tanggal, semester)); onTutup(); } catch (e) { setErr(e.message || String(e)); setSibuk(false); }
  }

  const footer = (
    <>
      {lama && <button className="btn" style={{ marginRight: 'auto' }} onClick={batalkan} disabled={sibuk}>{punyaCakupan ? { sekali: 'Batalkan tanggal ini', mulai: 'Akhiri mulai tanggal ini', semua: 'Hapus semua pekan' }[cakupan] : 'Hapus'}</button>}
      <button className="btn" onClick={onTutup}>Tutup</button>
      <button className="btn btn-primary" onClick={simpan} disabled={sibuk}>{lama ? 'Simpan perubahan' : 'Tambah'}</button>
    </>
  );

  return (
    <Modal title={lama ? `Ubah: ${lama.judul}` : 'Booking baru'} onClose={onTutup} footer={footer}>
      {punyaCakupan && (
        <div className="callout" style={{ marginBottom: 12 }}>
          <strong>Kuliah berulang.</strong> Perubahan atau pembatalan berlaku untuk:
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            <label className="check"><input type="radio" checked={cakupan === 'sekali'} onChange={() => setCakupan('sekali')} /><span>Hanya {formatTanggal(awal.tanggal)} (kelas pengganti / dipindah sekali)</span></label>
            <label className="check"><input type="radio" checked={cakupan === 'mulai'} onChange={() => setCakupan('mulai')} /><span>Mulai {formatTanggal(awal.tanggal)} dan seterusnya</span></label>
            <label className="check"><input type="radio" checked={cakupan === 'semua'} onChange={() => setCakupan('semua')} /><span>Seluruh semester</span></label>
          </div>
        </div>
      )}
      <div className="form-grid">
        <Field label="Jenis">
          <select value={f.jenis} onChange={(e) => set('jenis', e.target.value)}>
            {Object.entries(JENIS_BOOKING).map(([k, v]) => <option key={k} value={k}>{v}{k === 'kuliah' ? ' (berulang tiap pekan)' : ' (sekali, bertanggal)'}</option>)}
          </select>
        </Field>
        {seminar && <BookingSeminarFields f={f} set={set} mahasiswa={mahasiswa} />}
        <Field label={seminar ? 'Judul / keterangan (opsional)' : 'Judul / keterangan'}><input value={f.judul} onChange={(e) => set('judul', e.target.value)} placeholder={seminar ? 'Kosongkan untuk otomatis dari kegiatan & nama' : 'Mis. Fisika I — Dr. Asep'} /></Field>
        <Field label="Ruang">
          <select value={f.ruangId} onChange={(e) => set('ruangId', e.target.value)}>
            <option value="">— pilih ruang —</option>
            {ruangPilihan.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
          </select>
        </Field>
        <Field label="Penanggung jawab (opsional, maks. 2)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {f.pj.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <select value={p.mode === 'luar' ? LUAR : p.kode} onChange={(e) => ubahPj(i, e.target.value === LUAR ? { mode: 'luar', kode: '', nama: '' } : { mode: 'dosen', kode: e.target.value, nama: '' })}>
                  <option value="">— tanpa —</option>
                  {dosen.filter((d) => d.isActive !== false || d.kode === p.kode).map((d) => <option key={d.kode} value={d.kode}>{d.nama}</option>)}
                  <option value={LUAR}>Dosen luar departemen…</option>
                </select>
                {p.mode === 'luar' && <input value={p.nama} onChange={(e) => ubahPj(i, { nama: e.target.value })} placeholder="Nama dosen luar" />}
              </div>
            ))}
          </div>
        </Field>
        <Field label="Jam mulai"><input type="time" value={f.mulai} onChange={(e) => set('mulai', e.target.value)} /></Field>
        <Field label="Jam selesai"><input type="time" value={f.selesai} onChange={(e) => set('selesai', e.target.value)} /></Field>
        {!mingguan && !(punyaCakupan && cakupan === 'sekali') && <Field label="Tanggal"><input type="date" value={f.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>}
        {mingguan && !(punyaCakupan && cakupan === 'sekali') && (
          <>
            <Field label="Hari">
              <select value={f.hari} onChange={(e) => set('hari', e.target.value)}>
                {NAMA_HARI.map((n, i) => <option key={n} value={i}>{n}</option>)}
              </select>
            </Field>
            {!(punyaCakupan && cakupan === 'mulai') && <Field label="Berlaku dari"><input type="date" value={f.dari} onChange={(e) => set('dari', e.target.value)} /></Field>}
            <Field label="Sampai"><input type="date" value={f.sampai} onChange={(e) => set('sampai', e.target.value)} /></Field>
          </>
        )}
      </div>
      {bentrok.length > 0 && (
        <div className="callout callout-amber" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
          ⚠ Bentrok dengan booking lain (boleh tetap disimpan):{'\n' + bentrok.slice(0, 5).map((b) => `• ${formatTanggal(b.tanggal)}: ${b.label} (${b.mulai}–${b.selesai})`).join('\n')}{bentrok.length > 5 ? `\n… dan ${bentrok.length - 5} lainnya` : ''}
        </div>
      )}
      {err && <div className="login-err" style={{ marginTop: 12 }}>{err}</div>}
    </Modal>
  );
}
