const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const EDITABLE_FIELDS = [
  'company_name', 'company_short_name', 'tagline', 'hero_tagline', 'about_text',
  'logo_url', 'phone', 'whatsapp_number', 'email', 'address', 'udyam_reg', 'gstin',
  'founder_name', 'founder_title', 'founder_bio', 'founder_photo_url',
  'stat_years', 'stat_projects', 'stat_team',
];

// GET /api/site-settings — public, powers the whole front-end
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM site_settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load site settings.' });
  }
});

// PUT /api/site-settings — admin only, partial update (send only changed fields)
router.put('/', requireAdmin, async (req, res) => {
  try {
    const updates = req.body || {};
    const fields = Object.keys(updates).filter((k) => EDITABLE_FIELDS.includes(k));
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map((f) => updates[f]);
    const result = await pool.query(
      `UPDATE site_settings SET ${setClause}, updated_at = now() WHERE id = 1 RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update site settings.' });
  }
});

module.exports = router;
