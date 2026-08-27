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
const { ensureSetupOnce } = require('./db/ensureSetup');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Self-healing: create tables + a default admin automatically, the first
// time this warm instance handles a request. No manual setup step needed
// as long as POSTGRES_URL is set. Failures here don't block the request —
// the route itself (or /api/health) will surface a clear error instead.
app.use(async (req, res, next) => {
  try {
    await ensureSetupOnce();
  } catch (e) {
    // swallow — individual routes/health already report DB problems clearly
  }
  next();
});

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
      const relatedVars = pool.__listDbRelatedEnvVarNames();
      return res.status(500).json({
        ok: false,
        database: 'not configured',
        error: 'No usable Postgres connection string found in any environment variable. Set POSTGRES_URL (or DATABASE_URL) in Vercel → Project → Settings → Environment Variables, then redeploy.',
        db_related_env_vars_present: relatedVars,
        note: relatedVars.length
          ? `Found these env var name(s) but their value didn't look like a real connection string: ${relatedVars.join(', ')}. Either they're empty, still a placeholder, or this deployment hasn't picked up the latest values yet — trigger a fresh deploy.`
          : 'No database-related environment variables are visible to this function at all. This almost always means: (1) the integration/env var was added AFTER the current deployment was built — env vars only apply to deployments created after you save them, so redeploy; or (2) it was only added for "Preview"/"Development" and not "Production", and you\'re hitting the production URL.',
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
        ? `Auto-setup should have created these automatically but didn't: ${missing.join(', ')}. Check Vercel's function logs for an "[auto-setup] Failed" message — it usually means the DB user lacks CREATE TABLE permission, or the connection dropped mid-query. Reloading this page retries it.`
        : adminUsernames.length === 0
        ? 'Tables exist but no admin user was created. Set ADMIN_DEFAULT_USERNAME and ADMIN_DEFAULT_PASSWORD in Vercel and redeploy — auto-setup creates the admin account from those on the next request.'
        : 'Database connected, tables present, admin user(s) exist. If login still fails, the password doesn\'t match what ADMIN_DEFAULT_PASSWORD was set to — see README to reset it.',
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
