import { formatTanggal, programDisplayLabel, todayISO } from './helpers.js';
import { aturanPerpanjangan, perpanjanganDisetujui, tambahBulan } from './nomorSurat.js';

// ===================== perpanjangan.js =====================
// Persetujuan perpanjangan oleh admin: sekali setuju = batas akhir maju sesuai
// ATURAN_PERPANJANGAN (nomorSurat.js, saat ini +1 bulan), periodenya dicatat di
// m.perpanjangan.riwayat, dan surat langsung terlihat di Portal mahasiswa.
// Surat perpanjangan dicetak dari riwayat ini, bukan dari batasAkhir saat ini,
// supaya mengunduh ulang setelah batas akhir maju tidak ikut menggeser periode.

export function riwayatPerpanjangan(m) {
  return (m.perpanjangan && m.perpanjangan.riwayat) || [];
}

function bulanPerpanjangan(m) {
  return (aturanPerpanjangan(m) || {}).bulan || 1;
}

// Periode perpanjangan ke-`ke` (0 = pertama): dari riwayat bila sudah disetujui,
// selain itu pratinjau — yang berikutnya mulai dari batas akhir sekarang.
export function periodePerpanjangan(m, ke = 0) {
  const r = riwayatPerpanjangan(m);
  if (r[ke]) return r[ke];
  const dari = ke <= r.length ? m.batasAkhir : periodePerpanjangan(m, ke - 1).sampai;
  return { dari, sampai: dari ? tambahBulan(dari, bulanPerpanjangan(m)) : '' };
}

// Periode di surat KP/Magang (satu kali perpanjangan): yang terakhir disetujui,
// atau pratinjau bila belum ada.
export function periodeSuratPerpanjangan(m) {
  return periodePerpanjangan(m, Math.max(0, riwayatPerpanjangan(m).length - 1));
}

export function teksKonfirmasiPerpanjangan(m) {
  const a = aturanPerpanjangan(m);
  const { dari, sampai } = periodePerpanjangan(m, riwayatPerpanjangan(m).length);
  return `Setujui perpanjangan ${programDisplayLabel(m)} untuk ${m.nama}?\n\n`
    + `Batas akhir akan diubah:\n${formatTanggal(dari)}  →  ${formatTanggal(sampai)}  (+${a.bulan} bulan)\n\n`
    + `Ini perpanjangan ke-${perpanjanganDisetujui(m) + 1} dari ${a.maks}. Surat perpanjangan dengan periode ini `
    + 'langsung terlihat di Portal mahasiswa setelah Anda menekan Simpan.';
}

export function patchSetujuiPerpanjangan(m) {
  const r = riwayatPerpanjangan(m);
  const { dari, sampai } = periodePerpanjangan(m, r.length);
  return {
    batasAkhir: sampai,
    perpanjangan: {
      ...(m.perpanjangan || {}),
      suratAdminTersedia: true,
      disetujui: perpanjanganDisetujui(m) + 1,
      riwayat: [...r, { dari, sampai, disetujuiPada: todayISO() }],
    },
  };
}
