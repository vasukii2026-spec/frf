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

// Vercel's Blob integration doesn't always name the token exactly
// "BLOB_READ_WRITE_TOKEN" — if you set a custom environment variable
// prefix when connecting the store (same as with Postgres), it can come
// through as something like "MYPREFIX_READ_WRITE_TOKEN" instead. Rather
// than hard-require the default name, look for any env var that looks
// like a real Blob token, so this works regardless of the prefix chosen.
function resolveBlobToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return { token: process.env.BLOB_READ_WRITE_TOKEN, source: 'BLOB_READ_WRITE_TOKEN' };
  }
  for (const [key, val] of Object.entries(process.env)) {
    if (/READ_WRITE_TOKEN/i.test(key) && typeof val === 'string' && val.startsWith('vercel_blob_')) {
      return { token: val, source: key };
    }
  }
  return { token: undefined, source: null };
}

// POST /api/upload — admin only, form field name: "file"
router.post('/', requireAdmin, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Multer errors (file too large, wrong field name, etc.) land here,
      // bypassing the route handler below — without this, Express's
      // default HTML error page would break the front-end's JSON parsing.
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'That file is too large — please use an image under 8MB.'
          : err.message || 'Upload failed.';
      return res.status(400).json({ error: message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { token, source } = resolveBlobToken();
    if (!token) {
      return res.status(500).json({
        error: 'Image storage is not configured yet. Create a Vercel Blob store (Storage tab), connect it to this project, then redeploy. See /api/health for which env vars are visible.',
      });
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `${Date.now()}-${safeName}`;

    const blob = await put(key, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
      token,
    });

    res.status(201).json({ url: blob.url });
  } catch (err) {
    console.error('[upload] failed:', err.message, err.stack);
    res.status(500).json({ error: `Upload failed: ${err.message}` });
  }
});

module.exports = router;
module.exports.resolveBlobToken = resolveBlobToken;
