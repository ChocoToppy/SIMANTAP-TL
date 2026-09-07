import React, { useState } from 'react';
import { Field } from '../../components/ui.jsx';
import { KP_DOKUMEN, MAGANG_DOKUMEN, BERKAS_SYARAT } from '../../utils/helpers.js';

// ----- Editor konten: label/syarat dokumen KP + daftar berkas per kegiatan -----
// Hanya teks informasional yang bisa diubah di sini — alur/tahapan/kelayakan
// tetap ditentukan di kode (KP_DOKUMEN/BERKAS_SYARAT di helpers.js), yang juga
// jadi nilai bawaan (default) tiap field selama admin belum meng-override-nya.
export function SeksiKonten({ konten = {}, onSimpan }) {
  const overrideDokumen = konten.dokumen || {};
  const overrideBerkas = konten.berkasSyarat || {};

  function simpanDokumen(key, patch) {
    onSimpan({ ...konten, dokumen: { ...overrideDokumen, [key]: patch } });
  }
  function resetDokumen(key) {
    const next = { ...overrideDokumen };
    delete next[key];
    onSimpan({ ...konten, dokumen: next });
  }
  function simpanBerkas(ev, list) {
    onSimpan({ ...konten, berkasSyarat: { ...overrideBerkas, [ev]: list } });
  }
  function resetBerkas(ev) {
    const next = { ...overrideBerkas };
    delete next[ev];
    onSimpan({ ...konten, berkasSyarat: next });
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>
        Ubah teks yang tampil untuk mahasiswa — label & syarat tiap dokumen KP/Magang, dan
        daftar berkas yang perlu disiapkan per kegiatan. Ini hanya teks; alur/tahapan/kelayakan
        dokumen tetap ditentukan di kode, tidak berubah dari sini.
      </p>

      <div className="sched-title" style={{ marginTop: 20 }}>Dokumen KP</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {KP_DOKUMEN.map((d) => (
          <KontenDokumenCard
            key={d.key}
            d={d}
            override={overrideDokumen[d.key]}
            onSimpan={(patch) => simpanDokumen(d.key, patch)}
            onReset={() => resetDokumen(d.key)}
          />
        ))}
      </div>

      <div className="sched-title" style={{ marginTop: 24 }}>Dokumen Magang</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MAGANG_DOKUMEN.map((d) => (
          <KontenDokumenCard
            key={d.key}
            d={d}
            override={overrideDokumen[d.key]}
            onSimpan={(patch) => simpanDokumen(d.key, patch)}
            onReset={() => resetDokumen(d.key)}
          />
        ))}
      </div>

      <div className="sched-title" style={{ marginTop: 24 }}>Dokumen yang perlu disiapkan (per kegiatan)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.keys(BERKAS_SYARAT).map((ev) => (
          <KontenBerkasCard
            key={ev}
            ev={ev}
            defaultList={BERKAS_SYARAT[ev]}
            override={overrideBerkas[ev]}
            onSimpan={(list) => simpanBerkas(ev, list)}
            onReset={() => resetBerkas(ev)}
          />
        ))}
      </div>
    </div>
  );
}

function KontenDokumenCard({ d, override, onSimpan, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState(override?.label || d.label);
  const [syarat, setSyarat] = useState(override?.syarat || d.syarat);
  const overridden = !!override;

  function simpan() {
    onSimpan({ label: label.trim() || d.label, syarat: syarat.trim() || d.syarat });
  }
  function reset() {
    setLabel(d.label);
    setSyarat(d.syarat);
    onReset();
  }

  return (
    <div className="kp-dok-item" style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" className="link-btn" style={{ padding: '2px 0', fontSize: '0.85rem' }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▾' : '▸'} {override?.label || d.label}
        </button>
        {overridden && <span className="chip chip-on">Di-override</span>}
      </div>
      {expanded && (
        <div className="form-grid" style={{ marginTop: 10 }}>
          <Field label="Label" full><input value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field label="Syarat / hint" full><textarea rows={2} value={syarat} onChange={(e) => setSyarat(e.target.value)} /></Field>
          <div className="field-full" style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={simpan}>Simpan</button>
            {overridden && <button className="btn ghost" onClick={reset}>Reset ke default</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function KontenBerkasCard({ ev, defaultList, override, onSimpan, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const [teks, setTeks] = useState((override || defaultList).join('\n'));
  const [err, setErr] = useState('');
  const overridden = !!override;

  function simpan() {
    const list = teks.split('\n').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) { setErr('Isi minimal satu baris.'); return; }
    setErr('');
    onSimpan(list);
  }
  function reset() {
    setTeks(defaultList.join('\n'));
    setErr('');
    onReset();
  }

  return (
    <div className="kp-dok-item" style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" className="link-btn" style={{ padding: '2px 0', fontSize: '0.85rem' }} onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▾' : '▸'} {ev}
        </button>
        {overridden && <span className="chip chip-on">Di-override</span>}
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          <Field label="Satu berkas per baris" full>
            <textarea rows={4} value={teks} onChange={(e) => setTeks(e.target.value)} />
          </Field>
          {err && <div className="login-err" style={{ marginTop: 4 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={simpan}>Simpan</button>
            {overridden && <button className="btn ghost" onClick={reset}>Reset ke default</button>}
          </div>
        </div>
      )}
    </div>
  );
}
