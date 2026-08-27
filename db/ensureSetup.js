// Auto-setup: runs automatically, on its own, the first time the app
// handles a request after a cold start. No manual step required.
//
// What it does, every time it runs:
//   1. Creates all tables if they don't exist yet (schema.sql uses
//      CREATE TABLE IF NOT EXISTS, so this is always safe to re-run).
//   2. If there is no admin_users row yet, creates one using
//      ADMIN_DEFAULT_USERNAME / ADMIN_DEFAULT_PASSWORD (falls back to
//      admin / change-me-now if those aren't set — change it after login).
//
// This means: as long as POSTGRES_URL is set in Vercel, simply deploying
// is enough. There's nothing else to run by hand.
//
// The work only actually happens once per cold start — later requests on
// the same warm instance just await the already-resolved result, which is
// effectively instant. If it fails (e.g. DB briefly unreachable), the next
// request tries again instead of being stuck failing forever.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./pool');

let inFlight = null;

async function runSetup() {
  if (!pool.__connectionSource) {
    // No connection string at all — nothing this module can do.
    // /api/health and the individual routes already report this clearly.
    return { ok: false, reason: 'not configured' };
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  const username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  const existing = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);

  if (existing.rows.length === 0) {
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'change-me-now';
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
      [username, hash]
    );
    console.log(`[auto-setup] Created admin user "${username}" (from ADMIN_DEFAULT_USERNAME/PASSWORD).`);
  }

  return { ok: true };
}

function ensureSetupOnce() {
  if (!inFlight) {
    inFlight = runSetup().catch((err) => {
      console.error('[auto-setup] Failed:', err.message);
      inFlight = null; // let the next request try again instead of caching a permanent failure
      throw err;
    });
  }
  return inFlight;
}

module.exports = { ensureSetupOnce };
