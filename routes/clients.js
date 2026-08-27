const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients — public
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY sort_order ASC, id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load clients.' });
  }
});

// POST /api/clients — admin only
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description = '', img_url = '', icon = 'fa-building', sort_order = 0 } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Client name is required.' });
    const result = await pool.query(
      'INSERT INTO clients (name, description, img_url, icon, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, description, img_url, icon, sort_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add client.' });
  }
});

// DELETE /api/clients/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete client.' });
  }
});

module.exports = router;
