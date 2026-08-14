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

export const generateDocument = async (templatePath, outputName, data) => {
  try {
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

    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // Trigger the download
    saveAs(out, outputName);
  } catch (error) {
    console.error("Error generating document:", error);
    alert("Gagal mencetak dokumen. Periksa konsol untuk detail error.");
  }
};

export const getTemplateConfig = (docType, m, dosenByKode, jEv = {}) => {
  const d1 = dosenByKode[m.pembimbing1] || {};
  const dw = dosenByKode[m.dosenWali] || {};
  const wali = { nama_dosen_wali: dw.nama || m.dosenWali || "-", nip_dosen_wali: dw.nip || "-" };

  switch (docType) {
    case 'Permohonan KP':
      return {
        template: 'KP/permohonan-kp.docx',
        filename: `Permohonan_KP_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          semester: m.pendaftaran?.semester || "-",
          sks: (m.pendaftaran?.sksIpk || "").split('/')[0]?.trim() || "-",
          no_telpon: m.pendaftaran?.nomorWA || "-",
          judul_kp: m.judul,
          tgl_surat_pmkp: formatTanggal(todayISO()),
          ...wali,
        }
      };

    case 'Kelayakan KP':
      return {
        template: 'KP/kelayakan-kp.docx',
        filename: `Kelayakan_KP_${m.nama}.docx`,
        data: {
          nama_mhs: m.nama,
          nim: m.nim,
          ...wali,
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
          tgl_surat_stkp: formatTanggal(todayISO()),
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
          tgl_surat_smkp: formatTanggal(todayISO()),
          nama_dosen1: d1.nama || m.pembimbing1,
          nip1: d1.nip || "-",
          ...wali,
        }
      };

    case 'Perpanjangan KP': {
      const pp = m.perpanjangan || {};
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
          tgl_surat_ppkp: formatTanggal(pp.tanggalDiminta || todayISO()),
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
          nama_dosen1: d1.nama || m.pembimbing1,
          nip1: d1.nip || "-",
          ...wali,
        }
      };

    default:
      return null;
  }
};