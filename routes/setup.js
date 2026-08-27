const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/setup-admin
//
// Creates all tables (if missing) and creates-or-resets the admin login.
// Exists so you can fix a broken admin login (e.g. on Neon) straight from
// your live Vercel deployment, without needing a local Node install pointed
// at your database.
//
// Protected by SETUP_SECRET — set this env var in Vercel, then call:
//
//   curl -X POST https://your-site.vercel.app/api/setup-admin \
//     -H "Content-Type: application/json" \
//     -d '{"secret":"YOUR_SETUP_SECRET","username":"admin","password":"a-new-password"}'
//
// Without SETUP_SECRET set, this route refuses to run at all — it is not
// safely exposable without one.
router.post('/', async (req, res) => {
  try {
    if (!process.env.SETUP_SECRET) {
      return res.status(500).json({
        error: 'SETUP_SECRET is not set. Add a SETUP_SECRET environment variable in Vercel (any long random string) and redeploy before using this endpoint.',
      });
    }

    const { secret, username, password } = req.body || {};
    if (!secret || secret !== process.env.SETUP_SECRET) {
      return res.status(401).json({ error: 'Invalid or missing secret.' });
    }
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'username and password (6+ characters) are required.' });
    }

    const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);

    const hash = await bcrypt.hash(password, 10);
    const existing = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);

    if (existing.rows.length === 0) {
      await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', [username, hash]);
      return res.status(201).json({ ok: true, action: 'created', username });
    }

    await pool.query('UPDATE admin_users SET password_hash = $1 WHERE username = $2', [hash, username]);
    res.json({ ok: true, action: 'password reset', username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Setup failed.', detail: err.message });
  }
});

module.exports = router;
