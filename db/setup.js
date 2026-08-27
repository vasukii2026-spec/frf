// One-time setup script.
// Run with: npm run db:setup
// Creates all tables (if not already there) and a default admin login.
//
// Default admin credentials (CHANGE THESE after first login):
//   username: admin
//   password: change-me-now
//
// You can override the default password by setting ADMIN_DEFAULT_PASSWORD
// in your environment before running this script.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('[setup] Creating tables...');
  await pool.query(schema);

  const username = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'change-me-now';

  const existing = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`[setup] Created admin user "${username}" with password "${password}".`);
    console.log('[setup] IMPORTANT: log in and change this password immediately from the admin panel.');
  } else {
    console.log(`[setup] Admin user "${username}" already exists, skipping.`);
  }

  console.log('[setup] Done.');
  await pool.end();
}

main().catch((err) => {
  console.error('[setup] Failed:', err);
  process.exit(1);
});
