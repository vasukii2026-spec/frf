const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/portfolio — public
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM portfolio_items ORDER BY sort_order ASC, id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load portfolio.' });
  }
});

// POST /api/portfolio — admin only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title = '', category = 'general', img_url, sort_order = 0 } = req.body || {};
    if (!img_url) return res.status(400).json({ error: 'img_url is required (upload the image first via /api/upload).' });
    const result = await pool.query(
      'INSERT INTO portfolio_items (title, category, img_url, sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [title, category, img_url, sort_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add portfolio item.' });
  }
});

// DELETE /api/portfolio/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM portfolio_items WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete portfolio item.' });
  }
});

module.exports = router;
