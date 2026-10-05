import React, { useState } from 'react';
import { parseJadwalRuang, NAMA_HARI } from '../logic/jadwalRuang.js';
import { rancangImpor } from '../logic/ruangBooking.js';
import { parseRekapKuliah, cocokkanDosen } from '../logic/jadwalKuliahRekap.js';
import { ImporRekapModal } from './ImporRekapModal.jsx';
import { formatTanggal } from '../host.js';
import { JadwalRuangEditor } from '../components/JadwalRuangEditor.jsx';
import { Badge } from '../host.js';
import { SemesterForm } from './SemesterForm.jsx';
import { RuangDaftar } from './RuangDaftar.jsx';

// Jadwal ruang (eksperimental) — kelola semester, ruang master, dan impor Excel
// ke DRAFT semester. Mahasiswa baru melihatnya setelah semester diterbitkan.
export function SeksiJadwalRuang({ data, dosen = [], mahasiswa = [], aksi }) {
  const [semId, setSemId] = useState('');
  const [sub, setSub] = useState('jadwal'); // jadwal | ruang
  const [form, setForm] = useState(null); // null | 'baru' | 'ubah'
  const [pesan, setPesan] = useState(null); // { tone, teks }
  const [hasil, setHasil] = useState(null); // hasil parse belum diimpor
  const [sibuk, setSibuk] = useState(false);
  const [rekap, setRekap] = useState(null); // hasil parse rekap kuliah, menunggu periode
  const [galatRekap, setGalatRekap] = useState('');

  if (!data) return <p className="hint">Jadwal ruang hanya tersedia di build eksperimental.</p>;
  const semesters = (data.semesters || []).slice().sort((a, b) => String(b.mulai).localeCompare(String(a.mulai)));
  const semester = semesters.find((s) => s.id === semId) || semesters[0] || null;
  const galat = (e) => setPesan({ tone: 'err', teks: e.message || String(e) });

  async function simpanSemester(s) {
    const id = form === 'ubah' ? semester.id : `sem-${Date.now().toString(36)}`;
    try {
      await aksi.simpanSemester({ status: 'draft', ...(form === 'ubah' ? semester : {}), ...s, id });
      setSemId(id); setForm(null); setPesan(null);
    } catch (e) { galat(e); }
  }
  async function pilihFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setPesan(null); setSibuk(true);
    try {
      // Rekap jadwal kuliah sistem pusat: baris diberi flag, periode ditanyakan di pop-up.
      const rekap = await parseRekapKuliah(f);
      if (rekap) { setHasil(null); setRekap({ ...rekap, sumber: f.name }); return; }
      if (!semester || semester.status === 'terbit') throw new Error('Impor format grid per hari butuh semester draft. Buat semester dulu, atau tarik semester ke draft.');
      const r = await parseJadwalRuang(f);
      if (!r.slots.length) throw new Error('Tidak ada jadwal terbaca. Pastikan sheet bernama hari (SENIN, SELASA, …) dan baris pertama berisi nama ruang.');
      setHasil({ ...r, sumber: f.name });
    } catch (ex) { setHasil(null); galat(ex); } finally { setSibuk(false); }
  }
  async function imporSekarang() {
    setSibuk(true);
    try {
      const r = await aksi.imporKeSemester(semester, hasil);
      setHasil(null);
      setPesan({ tone: 'ok', teks: `Impor selesai: ${r.booking} pemakaian ruang, ${r.ruangBaru} ruang baru. Masih draft — terbitkan bila sudah sesuai.` });
    } catch (ex) { galat(ex); } finally { setSibuk(false); }
  }
  async function imporRekap({ baru }) {
    setSibuk(true); setGalatRekap('');
    try {
      let sem = semester;
      if (baru) {
        sem = { status: 'draft', blackout: [], ...baru, id: `sem-${Date.now().toString(36)}` };
        await aksi.simpanSemester(sem);
      }
      // Dua pengampu pertama jadi penanggung jawab; yang tidak ada di daftar dosen = dosen luar.
      const slots = rekap.slots.map((s) => ({ ...s, pj: s.pengampu.slice(0, 2).map((n) => cocokkanDosen(n, dosen)) }));
      const r = await aksi.imporKeSemester(sem, { ...rekap, slots });
      setSemId(sem.id); setRekap(null); setHasil(null);
      setPesan({ tone: 'ok', teks: `Impor selesai di ${sem.label}: ${r.booking} pemakaian ruang, ${r.ruangBaru} ruang baru. Masih draft — cek grid, tambahkan blackout (libur/UTS/UAS) bila perlu, lalu terbitkan.` });
    } catch (ex) { setGalatRekap(ex.message || String(ex)); } finally { setSibuk(false); }
  }
  async function toggleTerbit() {
    const terbit = semester.status !== 'terbit';
    if (terbit && !window.confirm(`Terbitkan ${semester.label}? Mahasiswa akan melihat jadwal ini.`)) return;
    try { await aksi.setTerbit(semester, terbit); setPesan(null); } catch (ex) { galat(ex); }
  }
  async function hapusSemester() {
    if (!window.confirm(`Hapus ${semester.label} beserta SELURUH jadwalnya? Tidak bisa dibatalkan.`)) return;
    try { await aksi.hapusSemester(semester); setSemId(''); } catch (ex) { galat(ex); }
  }

  const rencana = hasil && semester ? rancangImpor(hasil, data.ruang, semester) : null;
  const terbit = semester && semester.status === 'terbit';
  const diubahManual = semester ? data.bookings.filter((b) => b.semesterId === semester.id && b.sumber === 'impor' && b.diubah).length : 0;
  const jumlahBooking = semester ? data.bookings.filter((b) => b.semesterId === semester.id).length : 0;

  return (
    <div>
      <div className="toolbar">
        <select value={semester ? semester.id : ''} onChange={(e) => { setSemId(e.target.value); setHasil(null); }} disabled={!semesters.length}>
          {!semesters.length && <option value="">Belum ada semester</option>}
          {semesters.map((s) => <option key={s.id} value={s.id}>{s.label}{s.status === 'terbit' ? ' (terbit)' : ' (draft)'}</option>)}
        </select>
        <button className="btn" onClick={() => setForm('baru')}>+ Semester baru</button>
        {semester && <button className="btn" onClick={() => setForm('ubah')}>Ubah semester</button>}
        <div className="seg-wrap" style={{ marginLeft: 'auto' }}>
          <button className={'seg-btn' + (sub === 'jadwal' ? ' active' : '')} onClick={() => setSub('jadwal')}>Jadwal</button>
          <button className={'seg-btn' + (sub === 'ruang' ? ' active' : '')} onClick={() => setSub('ruang')}>Ruang</button>
        </div>
      </div>

      {form && <SemesterForm key={form} awal={form === 'ubah' ? semester : null} onSimpan={simpanSemester} onBatal={() => setForm(null)} />}
      {pesan && <div className={pesan.tone === 'err' ? 'login-err' : 'callout'} style={{ marginBottom: 12 }}>{pesan.teks}</div>}

      {sub === 'ruang' && <RuangDaftar data={data} aksi={aksi} onGalat={galat} />}

      {sub === 'jadwal' && !semester && (
        <div className="toolbar">
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            {sibuk ? 'Memproses…' : 'Impor jadwal kuliah (Excel)'}
            <input type="file" accept=".xlsx,.xls" hidden onChange={pilihFile} disabled={sibuk} />
          </label>
          <span className="hint" style={{ margin: 0 }}>Pilih rekap jadwal kuliah dari sistem pusat — semester dibuat otomatis setelah Anda mengisi periodenya.</span>
        </div>
      )}
      {rekap && <ImporRekapModal hasil={rekap} ruang={data.ruang || []} semesterAda={semester} sibuk={sibuk} galat={galatRekap} onImpor={imporRekap} onBatal={() => { setRekap(null); setGalatRekap(''); }} />}
      {sub === 'jadwal' && semester && (
        <>
          <div className="callout" style={{ marginBottom: 12 }}>
            <strong>{semester.label}</strong> · {formatTanggal(semester.mulai)} – {formatTanggal(semester.selesai)} ·{' '}
            <Badge tone={terbit ? 'green' : 'amber'}>{terbit ? 'Terbit' : 'Draft'}</Badge> · {jumlahBooking} pemakaian ruang
            {semester.imporTerakhir && <> · impor terakhir: {semester.imporTerakhir.sumber}</>}
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-primary" onClick={toggleTerbit} disabled={!terbit && jumlahBooking === 0}>{terbit ? 'Tarik ke draft' : 'Terbitkan'}</button>
              {!terbit && <button className="btn btn-sm" onClick={hapusSemester}>Hapus semester</button>}
            </div>
          </div>

          <div className="toolbar">
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              {sibuk ? 'Memproses…' : 'Impor dari Excel'}
              <input type="file" accept=".xlsx,.xls" hidden onChange={pilihFile} disabled={sibuk} />
            </label>
            <span className="hint" style={{ margin: 0 }}>Rekap jadwal kuliah sistem pusat: periode ditanyakan lalu semester dibuat otomatis. Impor ulang ke semester draft mengganti hasil impor sebelumnya; booking manual tidak tersentuh.</span>
          </div>

          {hasil && rencana && (
            <div className="callout" style={{ marginBottom: 12 }}>
              Pratinjau <strong>{hasil.sumber}</strong>: {rencana.bookings.length} pemakaian ruang di {hasil.ruang.length} ruang, hari {hasil.hari.map((h) => NAMA_HARI[h]).join(', ')}
              {hasil.dilewati > 0 && <>; {hasil.dilewati} catatan teks dilewati</>}.
              {rencana.sekaliDilewati.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary>{rencana.sekaliDilewati.length} seminar/sidang sekali jalan tidak diimpor (tanpa tanggal) — lihat daftar</summary>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                    {rencana.sekaliDilewati.map((s, i) => <li key={i}>{NAMA_HARI[s.hari]} {s.mulai}–{s.selesai} · {s.ruang} · {s.label}</li>)}
                  </ul>
                </details>
              )}
              {rencana.bertanggal.length > 0 && (
                <details style={{ marginTop: 6 }} open>
                  <summary>{rencana.bertanggal.length} entri menyebut tanggal di teksnya — diimpor sebagai booking bertanggal (tidak berulang tiap pekan)</summary>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                    {rencana.bertanggal.map((s, i) => <li key={i}>{s.pola === 'sekali' ? formatTanggal(s.tanggal) : `${formatTanggal(s.dari)} – ${formatTanggal(s.sampai)} tiap ${NAMA_HARI[s.hari]}`} {s.mulai}–{s.selesai} · {s.ruang} · {s.label}</li>)}
                  </ul>
                </details>
              )}
              {rencana.tanggalDilewati.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary>{rencana.tanggalDilewati.length} entri bertanggal tidak diimpor — lihat alasan</summary>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                    {rencana.tanggalDilewati.map((s, i) => <li key={i}>{s.label} — {s.alasan}</li>)}
                  </ul>
                </details>
              )}
              {diubahManual > 0 && <div><strong>Perhatian:</strong> {diubahManual} kuliah hasil impor sebelumnya pernah diubah manual dan akan tertimpa versi Excel. Booking yang ditambahkan manual tidak terpengaruh.</div>}
              {rencana.ruangBaru.length > 0 && <div>Ruang baru yang akan dibuat: {rencana.ruangBaru.map((r) => r.nama).join(', ')}.</div>}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={imporSekarang} disabled={sibuk}>Impor ke draft</button>
                <button className="btn btn-sm" onClick={() => setHasil(null)}>Batal</button>
              </div>
            </div>
          )}

          <JadwalRuangEditor key={semester.id} data={data} dosen={dosen} mahasiswa={mahasiswa} semester={semester} aksi={aksi} />
        </>
      )}
    </div>
  );
}
