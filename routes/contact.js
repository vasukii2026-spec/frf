const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/contact — public, saves a general inquiry
router.post('/', async (req, res) => {
  try {
    const { name, phone, email = '', service = '', message = '' } = req.body || {};
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });
    const result = await pool.query(
      'INSERT INTO contact_submissions (name, phone, email, service, message) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, phone, email, service, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit inquiry.' });
  }
});

// GET /api/contact — admin only, view submissions
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact_submissions ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load submissions.' });
  }
});

module.exports = router;
