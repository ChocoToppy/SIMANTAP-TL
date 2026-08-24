// ===================== converter-service/server.js =====================
// Layanan kecil (Cloud Run) yang mengonversi berkas .docx (surat hasil
// template dari documentGenerator.js) menjadi PDF lewat LibreOffice headless.
// Tidak menyimpan apa pun — berkas masuk, PDF keluar, folder kerja dihapus.

const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const app = express();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.raw({ type: () => true, limit: '15mb' }));

app.get('/', (req, res) => res.send('ok'));

app.post('/convert', async (req, res) => {
  if (!req.body || !req.body.length) {
    res.status(400).json({ error: 'Berkas kosong.' });
    return;
  }

  const workDir = path.join(os.tmpdir(), crypto.randomUUID());
  const inputPath = path.join(workDir, 'input.docx');
  const outputPath = path.join(workDir, 'input.pdf');

  try {
    await fs.mkdir(workDir, { recursive: true });
    await fs.writeFile(inputPath, req.body);

    await new Promise((resolve, reject) => {
      execFile(
        'soffice',
        ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', workDir, inputPath],
        { timeout: 60_000 },
        (err, stdout, stderr) => {
          if (err) reject(new Error(stderr?.toString() || err.message));
          else resolve();
        }
      );
    });

    const pdf = await fs.readFile(outputPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error('Convert error:', err);
    res.status(500).json({ error: 'Gagal mengonversi dokumen ke PDF.' });
  } finally {
    fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Converter listening on ${port}`));
