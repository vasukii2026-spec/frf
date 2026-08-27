const express = require('express');
const multer = require('multer');
const { put } = require('@vercel/blob');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Keep uploads in memory — Vercel's filesystem is read-only/ephemeral,
// so every image must go straight to Vercel Blob (or another object store).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per image
});

// POST /api/upload — admin only, form field name: "file"
router.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: 'Image storage is not configured yet. Set BLOB_READ_WRITE_TOKEN (create a Vercel Blob store and connect it to this project) and redeploy.',
      });
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `${Date.now()}-${safeName}`;

    const blob = await put(key, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    res.status(201).json({ url: blob.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed.' });
  }
});

module.exports = router;
