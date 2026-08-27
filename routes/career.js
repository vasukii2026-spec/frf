const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/career — public, saves a job application
router.post('/', async (req, res) => {
  try {
    const { name, phone, email = '', position = '', qualification = '', message = '' } = req.body || {};
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required.' });
    const result = await pool.query(
      'INSERT INTO career_submissions (name, phone, email, position, qualification, message) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, phone, email, position, qualification, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit application.' });
  }
});

// GET /api/career — admin only
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM career_submissions ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load applications.' });
  }
});

module.exports = router;
