import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { formatTanggal, todayISO, bidangLabel, jenisMagangOf, HARI } from './helpers.js';
import { periodePerpanjangan, periodeSuratPerpanjangan, periodeSuratTugasKP } from './perpanjangan.js';
import { siapkanQrVerifikasi, pasangQrVerifikasi } from './qrVerifikasi.js';

/**
 * Generates and downloads a .docx file based on a template and JSON data.
 * @param {string} templatePath - The path inside the public folder (e.g., 'KP/pembimbing-kp-st.docx')
 * @param {string} outputName - The desired name of the downloaded file (e.g., 'Surat_Tugas_Budi.docx')
 * @param {object} data - The JSON object mapping exactly to the {tags} in the document
 */
function readBlobAsBinaryString(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca berkas template.'));
    reader.readAsBinaryString(blob);
  });
}

// Layanan konversi .docx -> PDF (Cloud Run, LibreOffice headless — lihat
// converter-service/). Surat yang dihasilkan dari template selalu diunduh
// sebagai PDF; kalau layanan ini gagal/tidak terjangkau, jatuh kembali ke
// .docx supaya pengguna tetap dapat suratnya.
const CONVERTER_URL = 'https://simantap-pdf-converter-493633903702.asia-southeast2.run.app';

async function convertDocxToPdf(docxBlob) {
  const res = await fetch(`${CONVERTER_URL}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    body: docxBlob,
  });
  if (!res.ok) throw new Error(`Konversi PDF gagal (${res.status})`);
  return res.blob();
}

// qrPng: gambar QR verifikasi (lihat qrVerifikasi.js), untuk surat ber-config.verifikasi.
async function buildDocxBlob(templatePath, data, qrPng = null) {
  const response = await fetch(`/doc-templates/${templatePath}`);
  if (!response.ok) throw new Error(`Template not found at /doc-templates/${templatePath}`);

  const blob = await response.blob();
  const content = await readBlobAsBinaryString(blob);

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Inject the data into the template
  doc.render(data);
  if (qrPng) pasangQrVerifikasi(doc.getZip(), qrPng);

  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// Render + convert a template into its final downloadable blob. {tgl_cetak}
// must reflect the real moment the letter is printed, so this always runs
// fresh at click time — it is never cached/reused across time.
async function buildDocument(templatePath, data, qrPng) {
  const docxBlob = await buildDocxBlob(templatePath, data, qrPng);
  try {
    const pdfBlob = await convertDocxToPdf(docxBlob);
    return { blob: pdfBlob, isPdf: true };
  } catch (convertErr) {
    console.error('Gagal mengonversi ke PDF, unduh .docx sebagai gantinya:', convertErr);
    return { blob: docxBlob, isPdf: false };
  }
}

// The .docx templates themselves don't change per-click, so they're safe to
// warm ahead of time (dedup'd per path). This just primes the browser's HTTP
// cache — it does not touch {tgl_cetak} or any other per-click data.
const warmedTemplates = new Set();

export function prefetchTemplate(templatePath) {
  if (warmedTemplates.has(templatePath)) return;
  warmedTemplates.add(templatePath);
  fetch(`/doc-templates/${templatePath}`).catch(() => warmedTemplates.delete(templatePath));
}

// The PDF converter (Cloud Run) can cold-start; pinging its health route on
// page load keeps an instance warm so the real conversion at click time
// doesn't pay that cold-start cost. Fire-and-forget, no document data sent.
let converterWarmed = false;

export function warmConverter() {
  if (converterWarmed) return;
  converterWarmed = true;
  fetch(CONVERTER_URL).catch(() => { converterWarmed = false; });
}

// opts.docx = true: unduh sebagai .docx yang bisa diedit (mis. Lembar
// Pengesahan KP), tanpa konversi PDF. opts.verifikasi: surat ber-QR verifikasi.
// Pemanggil cukup meneruskan config dari getTemplateConfig sebagai opts.
export const generateDocument = async (templatePath, outputName, data, opts = {}) => {
  try {
    const qrPng = opts.verifikasi ? await siapkanQrVerifikasi(opts.verifikasi) : null;
    const { blob, isPdf } = opts.docx
      ? { blob: await buildDocxBlob(templatePath, data, qrPng), isPdf: false }
      : await buildDocument(templatePath, data, qrPng);
    saveAs(blob, isPdf ? outputName.replace(/\.docx$/i, '.pdf') : outputName);
  } catch (error) {
    console.error("Error generating document:", error);
    alert(error.pesanPengguna || "Gagal mencetak dokumen. Periksa konsol untuk detail error.");
  }
};

// config.verifikasi untuk surat ber-QR: jenis surat (kunci JENIS_SURAT di
// functions/verifikasiSurat.js) dan isi yang tercetak, untuk dicocokkan dengan catatan server.
function verifikasiSurat(jenis, m, jEv, dari, sampai) {
  return {
    jenis,
    mahasiswaId: m.id,
    cetak: { nomor: m.nomorSurat || jEv.nomorST || '', nama: m.nama || '', nim: m.nim || '', judul: m.judul || '', dari: dari || '', sampai: sampai || '' },
  };
}

export const getTemplateConfig = (docType, m, dosenByKode, jEv = {}) => {
  const d1 = dosenByKode[m.pembimbing1] || {};
  const dw = dosenByKode[m.dosenWali] || {};
  const wali = { nama_dosen_wali: dw.nama || m.dosenWali || "-", nip_dosen_wali: dw.nip || "-" };
  // Tanggal cetak: tanggal saat berkas ini dibangun (di-prefetch saat halaman
  // dimuat, atau saat tombol Unduh ditekan bila belum ada di cache).
  const tgl_cetak = formatTanggal(todayISO());
  const hari_cetak = HARI[(new Date().getDay() + 6) % 7]; // HARI mulai Senin, getDay() mulai Minggu
  // Magang & Mata Kuliah Terapan (MKT) berbagi seluruh alur & docType, tapi
  // masing-masing punya berkas .docx sendiri (mis. kelayakan-magang.docx vs
  // kelayakan-mkt.docx) — pilih file yang tepat berdasarkan m.jenisMagang.
  const mktMhs = jenisMagangOf(m) === 'MKT';
  const magangTemplate = (magangPath, mktPath) => (mktMhs ? mktPath : magangPath);
  const jenisLabel = mktMhs ? 'MKT' : 'Magang';

  switch (docType) {
    case 'Kelayakan KP':
      return {
        template: 'KP/kelayakan-kp.docx',
        filename: `Kelayakan_KP_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          tgl_cetak,
          ...wali,
        }
      };

    case 'Kelayakan Magang':
      return {
        template: magangTemplate('Magang/kelayakan-magang.docx', 'Magang/kelayakan-mkt.docx'),
        filename: `Kelayakan_${jenisLabel}_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          nama_dosen_wali: wali.nama_dosen_wali,
          nip_dosen_wali: wali.nip_dosen_wali,
          tgl_cetak,
        }
      };

    case 'Kelayakan Proposal Magang': {
      const sfx = mktMhs ? 'mkt' : 'magang';
      return {
        template: magangTemplate('Magang/kelayakan-proposal-magang.docx', 'Magang/kelayakan-proposal-mkt.docx'),
        filename: `Kelayakan_Proposal_${jenisLabel}_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          [`tema_${sfx}`]: bidangLabel(m.bidang),
          [`judul_${sfx}`]: m.judul,
          tgl_cetak,
        }
      };
    }

    case 'ST Pembimbing Magang': {
      const sfx = mktMhs ? 'mkt' : 'magang';
      return {
        template: magangTemplate('Magang/pembimbing-magang-st.docx', 'Magang/pembimbing-mkt-st.docx'),
        filename: `ST_Pembimbing_${jenisLabel}_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          nama_mhs: m.nama,
          nim: m.nim,
          [`judul_${sfx}`]: m.judul,
          [`mulai_${sfx}`]: formatTanggal(m.tanggalMulai) || "-",
          [`akhir_${sfx}`]: formatTanggal(m.batasAkhir) || "-",
          tgl_cetak,
          ...wali,
        }
      };
    }

    case 'Persetujuan Expo Magang': {
      const sfx = mktMhs ? 'mkt' : 'magang';
      return {
        template: magangTemplate('Magang/persetujuan-expo-magang.docx', 'Magang/persetujuan-expo-mkt.docx'),
        filename: `Persetujuan_SM_${jenisLabel}_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          [`judul_${sfx}`]: m.judul,
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          ...wali,
        }
      };
    }

    case 'BA Expo Magang': {
      // seminar-magang-ba.docx & seminar-mkt-ba.docx: tag jadwalnya
      // hari_smmagang/... vs hari_smmkt/....
      const sfx = mktMhs ? 'mkt' : 'magang';
      const evTag = `sm${sfx}`;
      return {
        template: magangTemplate('Magang/seminar-magang-ba.docx', 'Magang/seminar-mkt-ba.docx'),
        filename: `BA_Expo_${jenisLabel}_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          [`judul_${sfx}`]: m.judul,
          [`hari_${evTag}`]: jEv.hari || "-",
          [`tgl_${evTag}`]: formatTanggal(jEv.tanggal) || "-",
          [`waktu_${evTag}`]: `${jEv.jamMulai || '-'} s.d ${jEv.jamSelesai || '-'}`,
          [`tempat_${evTag}`]: jEv.ruang || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          ...wali,
        }
      };
    }

    case 'Perpanjangan Magang': {
      const sfx = mktMhs ? 'mkt' : 'magang';
      const pp = periodeSuratPerpanjangan(m);
      return {
        template: magangTemplate('Magang/perpanjangan-magang.docx', 'Magang/perpanjangan-mkt.docx'),
        filename: `Perpanjangan_${jenisLabel}_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          [`judul_${sfx}`]: m.judul,
          [`mulai_${sfx}`]: formatTanggal(m.tanggalMulai) || "-",
          [`akhir_${sfx}`]: formatTanggal(pp.dari) || "-",
          [`mulai_pp${sfx}`]: formatTanggal(pp.dari) || "-",
          [`akhir_pp${sfx}`]: formatTanggal(pp.sampai) || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          ...wali,
        }
      };
    }

    case 'Kelayakan Proposal KP':
      return {
        template: 'KP/kelayakan-proposal-kp.docx',
        filename: `Kelayakan_Proposal_KP_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          tema_kp: bidangLabel(m.bidang),
          judul_kp: m.judul,
          tgl_cetak,
        }
      };

    // Tetap .docx (docx: true) supaya mahasiswa bisa melengkapinya sebelum
    // dicetak & ditandatangani.
    case 'Lembar Pengesahan Proposal KP':
      return {
        template: 'KP/lempeng-proposal-kp.docx',
        filename: `Lembar_Pengesahan_Proposal_KP_${m.nama}.docx`,
        docx: true,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          tgl_cetak,
          ...wali,
        }
      };

    case 'Lembar Pengesahan KP':
      return {
        template: 'KP/lempeng_kp.docx',
        filename: `Lembar_Pengesahan_KP_${m.nama}.docx`,
        docx: true,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          nama_pembimbing: d1.nama || m.pembimbing1 || "-",
          nip_pembimbing: d1.nip || "-",
          tgl_cetak,
          ...wali,
        }
      };

    // Menggantikan BA Seminar KP (tahap Seminar sudah dihapus): tidak ada
    // jadwal, jadi hari/tanggal penilaian = tanggal cetak; tempat diisi tangan.
    case 'Penilaian KP':
      return {
        template: 'KP/penilaian-kp.docx',
        filename: `Penilaian_KP_${m.nama}.docx`,
        verifikasi: verifikasiSurat('penilaian-kp', m, jEv, m.tanggalMulai, m.batasAkhir),
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          nama_pembimbing: d1.nama || m.pembimbing1 || "-",
          nip_pembimbing: d1.nip || "-",
          hari_cetak,
          tgl_cetak,
          ...wali,
        }
      };

    case 'ST Pembimbing KP': {
      // Mulai/sampai = jendela program 3 bulan sejak tanggal surat tugas ("Jangka Waktu: 3
      // (tiga) bulan" di template), bukan periode di perusahaan. Dengan 1 bulan perpanjangan
      // totalnya 4 bulan, batas di Buku Panduan KP.
      const st = periodeSuratTugasKP(m);
      return {
        template: 'KP/pembimbing-kp-st.docx',
        filename: `ST_Pembimbing_KP_${m.nama}.docx`,
        verifikasi: verifikasiSurat('st-pembimbing-kp', m, jEv, st.dari, st.sampai),
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          mulai_kp: formatTanggal(st.dari) || "-",
          akhir_kp: formatTanggal(st.sampai) || "-",
          // "Semarang, {tgl_cetak}" di surat tugas = tanggal surat tugas (mulaiProgram, yang
          // juga bulan di nomornya), bukan tanggal unduh; data lama tanpa tanggal itu tetap tanggal cetak.
          tgl_cetak: m.mulaiProgram ? formatTanggal(m.mulaiProgram) : tgl_cetak,
          ...wali,
        }
      };
    }

    case 'Perpanjangan KP': {
      const pp = periodeSuratPerpanjangan(m);
      return {
        template: 'KP/perpanjangan-kp.docx',
        filename: `Perpanjangan_KP_${m.nama}.docx`,
        verifikasi: verifikasiSurat('perpanjangan-kp', m, jEv, pp.dari, pp.sampai),
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          // Periode yang diperpanjang = jendela program KP (sejak surat tugas), bukan
          // periode di perusahaan; data lama tanpa mulaiProgram jatuh ke tanggalMulai.
          mulai_kp: formatTanggal(m.mulaiProgram || m.tanggalMulai) || "-",
          akhir_kp: formatTanggal(pp.dari) || "-",
          mulai_ppkp: formatTanggal(pp.dari) || "-",
          akhir_ppkp: formatTanggal(pp.sampai) || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          ...wali,
        }
      };
    }

    // Tugas Akhir — tata letak dulu; tag mengikuti "List of Tags.txt", isinya
    // belum dicocokkan ke tiap template.
    case 'ST Pembimbing TA':
      return {
        template: 'TA/st-pembimbing-ta.docx',
        filename: `ST_Pembimbing_TA_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          tema_ta: bidangLabel(m.bidang),
          mulai_ta: formatTanggal(m.tanggalMulai) || "-",
          akhir_ta: formatTanggal(m.batasAkhir) || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1 || "-",
          nip_pembimbing: d1.nip || "-",
          ...wali,
        }
      };

    case 'Persetujuan UGB TA':
      return {
        template: 'TA/persetujuan-ugb.docx',
        filename: `Persetujuan_UGB_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          tema_ta: bidangLabel(m.bidang),
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          ...wali,
        }
      };

    // TA jenis proyek dosen (pengganti Persetujuan UGB): ditandatangani dosen
    // pengusul proyek yang dipilih mahasiswa di form pendaftaran.
    case 'Persetujuan Proyek Dosen TA': {
      const dp = dosenByKode[(m.pendaftaran || {}).namaPersetujuanDosen] || {};
      return {
        template: 'TA/persetujuan-proyek-dosen.docx',
        filename: `Persetujuan_Proyek_Dosen_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          tema_ta: bidangLabel(m.bidang),
          tgl_cetak,
          nama_dosen_proyek: dp.nama || (m.pendaftaran || {}).namaPersetujuanDosen || "-",
          nip_dosen_proyek: dp.nip || "-",
          ...wali,
        }
      };
    }

    case 'Kelayakan TA': {
      const pd = m.pendaftaran || {};
      return {
        template: 'TA/kelayakan-ta.docx',
        filename: `Kelayakan_TA_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          ipk: pd.ipk || "-",
          total_sks: pd.totalSks || "-",
          hasil_toefl: pd.toefl || "-",
          tgl_cetak,
          ...wali,
        }
      };
    }

    // Sempro & Semhas: pembimbing + penguji 1.
    case 'BA Sempro TA': {
      const d2 = dosenByKode[m.penguji1] || {};
      return {
        template: 'TA/ba-sempro-ta.docx',
        filename: `BA_Sempro_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          tema_ta: bidangLabel(m.bidang),
          tgl_sempro: formatTanggal(jEv.tanggal) || "-",
          waktu_sempro: `${jEv.jamMulai || '-'} s.d ${jEv.jamSelesai || '-'}`,
          tempat_sempro: jEv.ruang || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          nama_penguji1: d2.nama || m.penguji1 || "-",
          nip_penguji1: d2.nip || "-",
          ...wali,
        }
      };
    }

    case 'Perpanjangan TA': {
      // Maks. 2x perpanjangan @1 bulan: pp1 menyambung batas akhir, pp2 menyambung pp1
      // (periode yang sudah disetujui diambil dari riwayat — lihat perpanjangan.js).
      const pp1 = periodePerpanjangan(m, 0);
      const pp2 = periodePerpanjangan(m, 1);
      return {
        template: 'TA/perpanjangan-ta.docx',
        filename: `Perpanjangan_TA_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          tema_ta: bidangLabel(m.bidang),
          mulai_ta: formatTanggal(m.tanggalMulai) || "-",
          akhir_ta: formatTanggal(pp1.dari) || "-",
          mulai_ta_pp1: formatTanggal(pp1.dari) || "-",
          akhir_ta_pp1: formatTanggal(pp1.sampai) || "-",
          mulai_ta_pp2: formatTanggal(pp2.dari) || "-",
          akhir_ta_pp2: formatTanggal(pp2.sampai) || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          ...wali,
        }
      };
    }

    case 'BA Semhas TA': {
      const d2 = dosenByKode[m.penguji1] || {};
      return {
        template: 'TA/ba-expo-ta.docx',
        filename: `BA_Semhas_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          tema_ta: bidangLabel(m.bidang),
          tgl_expo: formatTanggal(jEv.tanggal) || "-",
          waktu_expo: `${jEv.jamMulai || '-'} s.d ${jEv.jamSelesai || '-'}`,
          tempat_expo: jEv.ruang || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          nama_penguji1: d2.nama || m.penguji1 || "-",
          nip_penguji1: d2.nip || "-",
          ...wali,
        }
      };
    }

    case 'BA Sidang TA': {
      // Pembimbing + penguji 1 + penguji 2.
      const d2 = dosenByKode[m.penguji1] || {};
      const d3 = dosenByKode[m.penguji2] || {};
      return {
        template: 'TA/ba-sidang-ta.docx',
        filename: `BA_Sidang_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_ta: m.judul,
          tema_ta: bidangLabel(m.bidang),
          hari_sidang: jEv.hari || "-",
          tgl_sidang: formatTanggal(jEv.tanggal) || "-",
          waktu_sidang: `${jEv.jamMulai || '-'} s.d ${jEv.jamSelesai || '-'}`,
          tempat_sidang: jEv.ruang || "-",
          tgl_cetak,
          nama_pembimbing: d1.nama || m.pembimbing1,
          nip_pembimbing: d1.nip || "-",
          nama_penguji1: d2.nama || m.penguji1 || "-",
          nip_penguji1: d2.nip || "-",
          nama_penguji2: d3.nama || m.penguji2 || "-",
          nip_penguji2: d3.nip || "-",
          ...wali,
        }
      };
    }

    default:
      return null;
  }
};
