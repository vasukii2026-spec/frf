require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const siteRoutes = require('./routes/site');
const clientsRoutes = require('./routes/clients');
const portfolioRoutes = require('./routes/portfolio');
const contactRoutes = require('./routes/contact');
const careerRoutes = require('./routes/career');
const uploadRoutes = require('./routes/upload');
const setupRoutes = require('./routes/setup');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/site-settings', siteRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/setup-admin', setupRoutes);

// GET /api/health — checks whether the app can actually reach and query
// Postgres. Visit this URL directly on your deployed site
// (yoursite.vercel.app/api/health) to diagnose "database not working"
// issues instead of guessing.
app.get('/api/health', async (req, res) => {
  const pool = require('./db/pool');
  const envVarUsed = pool.__connectionSource;
  try {
    if (!envVarUsed) {
      return res.status(500).json({
        ok: false,
        database: 'not configured',
        error: 'No usable Postgres connection string found in any environment variable. Set POSTGRES_URL (or DATABASE_URL) in Vercel → Project → Settings → Environment Variables, then redeploy.',
      });
    }
    const result = await pool.query('SELECT 1 AS ok');
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    const tableNames = tables.rows.map((r) => r.table_name);
    const expected = ['admin_users', 'site_settings', 'clients', 'portfolio_items', 'contact_submissions', 'career_submissions'];
    const missing = expected.filter((t) => !tableNames.includes(t));

    let adminUsernames = [];
    if (tableNames.includes('admin_users')) {
      const admins = await pool.query('SELECT username FROM admin_users ORDER BY id ASC');
      adminUsernames = admins.rows.map((r) => r.username);
    }

    res.json({
      ok: result.rows[0].ok === 1 && missing.length === 0 && adminUsernames.length > 0,
      database: 'connected',
      connection_env_var: envVarUsed,
      tables_found: tableNames,
      tables_missing: missing,
      admin_users: adminUsernames,
      note: missing.length
        ? `Connected fine, but these tables don't exist yet: ${missing.join(', ')}. See "Fix the admin login on Neon" in README.md.`
        : adminUsernames.length === 0
        ? 'Connected and tables exist, but there is no admin user yet — that\'s why login fails. See "Fix the admin login on Neon" in README.md.'
        : 'Database connected, tables present, admin user(s) exist. If login still fails, the password doesn\'t match — use the /api/setup-admin endpoint (see README) to reset it.',
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      database: 'connection failed',
      connection_env_var: envVarUsed || null,
      error: err.message,
      hint: 'Double-check the connection string is correct and that this database allows connections from Vercel (some providers require enabling an "allow from anywhere" / 0.0.0.0/0 rule, or using a pooled connection string ending in "-pooler" for Neon).',
    });
  }
});

// Serve the static frontend (index.html, app.js, images)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for any non-API route (simple single-page site)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Local dev entry point. On Vercel, api/index.js imports this app instead.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`ASGES server running on http://localhost:${PORT}`));
}

module.exports = app;
