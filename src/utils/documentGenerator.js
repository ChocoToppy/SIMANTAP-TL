import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { formatTanggal, todayISO, tambahHari, bidangLabel } from './helpers.js';

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

async function buildDocxBlob(templatePath, data) {
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

  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// Render + convert a template into its final downloadable blob. {tgl_cetak}
// must reflect the real moment the letter is printed, so this always runs
// fresh at click time — it is never cached/reused across time.
async function buildDocument(templatePath, data) {
  const docxBlob = await buildDocxBlob(templatePath, data);
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

export const generateDocument = async (templatePath, outputName, data) => {
  try {
    const { blob, isPdf } = await buildDocument(templatePath, data);
    saveAs(blob, isPdf ? outputName.replace(/\.docx$/i, '.pdf') : outputName);
  } catch (error) {
    console.error("Error generating document:", error);
    alert("Gagal mencetak dokumen. Periksa konsol untuk detail error.");
  }
};

export const getTemplateConfig = (docType, m, dosenByKode, jEv = {}) => {
  const d1 = dosenByKode[m.pembimbing1] || {};
  const dw = dosenByKode[m.dosenWali] || {};
  const wali = { nama_dosen_wali: dw.nama || m.dosenWali || "-", nip_dosen_wali: dw.nip || "-" };
  // Tanggal cetak: tanggal saat berkas ini dibangun (di-prefetch saat halaman
  // dimuat, atau saat tombol Unduh ditekan bila belum ada di cache).
  const tgl_cetak = formatTanggal(todayISO());

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
        template: 'Magang/kelayakan-magang.docx',
        filename: `Kelayakan_Magang_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          nama_dosen_wali: wali.nama_dosen_wali,
          // Nama tag ini ("nio", bukan "nip") sesuai berkas .docx apa adanya —
          // lihat public/doc-templates/Magang/kelayakan-magang.docx.
          nio_dosen_wali: wali.nip_dosen_wali,
        }
      };

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

    case 'ST Pembimbing KP':
      return {
        template: 'KP/pembimbing-kp-st.docx',
        filename: `ST_Pembimbing_KP_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_dosen1: d1.nama || m.pembimbing1,
          nip1: d1.nip || "-",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          mulai_kp: formatTanggal(m.tanggalMulai) || "-",
          akhir_kp: formatTanggal(m.batasAkhir) || "-",
          tgl_cetak,
          ...wali,
        }
      };

    case 'BA Seminar KP':
      return {
        template: 'KP/seminar-kp-ba.docx',
        filename: `BA_Seminar_KP_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          hari_smkp: jEv.hari || "-",
          tanggal_smkp: formatTanggal(jEv.tanggal) || "-",
          tgl_smkp: formatTanggal(jEv.tanggal) || "-",
          waktu_smkp: `${jEv.jamMulai || '-'} s.d ${jEv.jamSelesai || '-'}`,
          tempat_smkp: jEv.ruang || "-",
          tgl_cetak,
          nama_dosen1: d1.nama || m.pembimbing1,
          nip1: d1.nip || "-",
          ...wali,
        }
      };

    case 'Perpanjangan KP': {
      return {
        template: 'KP/perpanjangan-kp.docx',
        filename: `Perpanjangan_KP_${m.nama}.docx`,
        data: {
          no_surat: m.nomorSurat || jEv.nomorST || "___/UN7.../2026",
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          mulai_kp: formatTanggal(m.tanggalMulai) || "-",
          akhir_kp: formatTanggal(m.batasAkhir) || "-",
          mulai_ppkp: formatTanggal(m.batasAkhir) || "-",
          akhir_ppkp: formatTanggal(tambahHari(m.batasAkhir, 30)) || "-",
          tgl_cetak,
          nama_dosen1: d1.nama || m.pembimbing1,
          nip1: d1.nip || "-",
          ...wali,
        }
      };
    }

    case 'Persetujuan SMKP':
      return {
        template: 'KP/persetujuan-smkp.docx',
        filename: `Persetujuan_SMKP_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          judul_kp: m.judul,
          tgl_cetak,
          nama_dosen1: d1.nama || m.pembimbing1,
          nip1: d1.nip || "-",
          ...wali,
        }
      };

    default:
      return null;
  }
};
