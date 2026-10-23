import { formatTanggal, programDisplayLabel, programOf, tenggat, todayISO } from './helpers.js';
import { aturanPerpanjangan, perpanjanganDisetujui, tambahBulan } from './nomorSurat.js';

// ===================== perpanjangan.js =====================
// Persetujuan perpanjangan oleh admin: sekali setuju = tenggat maju sesuai
// ATURAN_PERPANJANGAN (nomorSurat.js, saat ini +1 bulan). Tenggat = tenggat() di
// helpers.js: KP memperpanjang jendela program (batasProgram), program lain
// batasAkhir. Periodenya dicatat di
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
// selain itu pratinjau — yang berikutnya mulai dari tenggat sekarang.
export function periodePerpanjangan(m, ke = 0) {
  const r = riwayatPerpanjangan(m);
  if (r[ke]) return r[ke];
  const dari = ke <= r.length ? tenggat(m) : periodePerpanjangan(m, ke - 1).sampai;
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
    + `${programOf(m) === 'KP' ? 'Batas program' : 'Batas akhir'} akan diubah:\n${formatTanggal(dari)}  →  ${formatTanggal(sampai)}  (+${a.bulan} bulan)\n\n`
    + `Ini perpanjangan ke-${perpanjanganDisetujui(m) + 1} dari ${a.maks}. Surat perpanjangan dengan periode ini `
    + 'langsung terlihat di Portal mahasiswa setelah Anda menekan Simpan.';
}

export function patchSetujuiPerpanjangan(m) {
  const r = riwayatPerpanjangan(m);
  const { dari, sampai } = periodePerpanjangan(m, r.length);
  return {
    ...(programOf(m) === 'KP' ? { batasProgram: sampai } : { batasAkhir: sampai }),
    perpanjangan: {
      ...(m.perpanjangan || {}),
      suratAdminTersedia: true,
      disetujui: perpanjanganDisetujui(m) + 1,
      riwayat: [...r, { dari, sampai, disetujuiPada: todayISO() }],
    },
  };
}

// ===================== Jendela program KP =====================
// Panduan KP: batas waktu 4 bulan terhitung mulai tanggal surat tugas, termasuk
// perpanjangan (dikonfirmasi departemen 23-10-2026): jendela awal 3 bulan (sama dengan "Jangka Waktu: 3 (tiga)
// bulan" di surat tugas) + 1× perpanjangan 1 bulan (ATURAN_PERPANJANGAN). Surat
// pertama yang bernomor adalah surat tugas, dan nomor surat KP satu untuk seluruh
// program, jadi mulaiProgram = tanggal surat tugas: ditetapkan admin di panel Nomor
// Surat sebelum mengambil nomor (bawaan 1 bulan sebelum KP di perusahaan, atau hari
// ini bila itu sudah lewat), dan bulan/tahun nomornya wajib sama (submit di
// FormMahasiswa). Mengganti tanggal = mengambil nomor baru. batasProgram disimpan
// (bukan dihitung saat dibaca) karena tabel arsip mem-filter tenggat lewat kueri.
export const BULAN_PROGRAM = { KP: 3 };

// Periode yang tercetak di surat tugas KP ("Jangka waktu 3 bulan, mulai … sampai …"):
// jendela program awal sejak tanggal surat tugas, tanpa perpanjangan (perpanjangan punya
// suratnya sendiri). Data lama tanpa tanggal surat tugas: periode KP di perusahaan.
// Sama dengan periodeSurat di functions/verifikasiSurat.js (QR membandingkan keduanya).
export function periodeSuratTugasKP(m) {
  if (!m.mulaiProgram) return { dari: m.tanggalMulai || '', sampai: m.batasAkhir || '' };
  return { dari: m.mulaiProgram, sampai: tambahBulan(m.mulaiProgram, BULAN_PROGRAM.KP) };
}

export function hitungBatasProgram(m, mulai = m.mulaiProgram) {
  const bulan = BULAN_PROGRAM[programOf(m)];
  if (!bulan || !mulai) return '';
  return tambahBulan(mulai, bulan + perpanjanganDisetujui(m) * bulanPerpanjangan(m));
}

// Dipanggil saat admin menyimpan (FormMahasiswa): batasProgram selalu dihitung ulang
// dari tanggal surat tugas. Nomor lama yang tercatat tanpa tanggal surat tugas
// (sebelum aturan ini) memakai hari ini.
export function isiJendelaProgram(m) {
  if (!BULAN_PROGRAM[programOf(m)] || !m.nomorSuratId) return m;
  const mulaiProgram = m.mulaiProgram || todayISO();
  return { ...m, mulaiProgram, batasProgram: hitungBatasProgram(m, mulaiProgram) };
}

// Tanggal surat tugas bawaan: 1 bulan sebelum KP di perusahaan dimulai (dosen perlu
// menerimanya sebelum mahasiswa berangkat), atau hari ini bila tanggal itu sudah lewat.
export function tanggalSuratTugasBawaan(m) {
  if (!m.tanggalMulai) return '';
  const sebulanSebelum = tambahBulan(m.tanggalMulai, -1);
  return sebulanSebelum > todayISO() ? sebulanSebelum : todayISO();
}
