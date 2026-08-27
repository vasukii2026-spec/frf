const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { signToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid ID or password.' });
    }

    const token = signToken({ id: user.id, username: user.username });
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === '28P01') {
      return res.status(500).json({ error: 'Cannot reach the database. Check that POSTGRES_URL is set correctly in your environment variables (see README.md).' });
    }
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

// PUT /api/auth/password
router.put('/password', requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [hash, req.admin.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not change password.' });
  }
});

module.exports = router;
