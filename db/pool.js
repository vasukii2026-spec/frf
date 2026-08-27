const { Pool } = require('pg');

// ---------------------------------------------------------------------
// Connection-string auto-detection.
//
// Works with a plain POSTGRES_URL / DATABASE_URL, AND with the
// variables Vercel's native storage integrations generate — including
// Neon's, which (when connected with a custom "environment variable
// prefix" in the Vercel Storage tab) creates names like
// POSTGRES_URL_DATABASE_URL, POSTGRES_URL_POSTGRES_URL, or
// MYPREFIX_DATABASE_URL instead of a plain POSTGRES_URL.
//
// Detection order:
//   1. The standard names, in priority order.
//   2. Any other env var whose value looks like a real Postgres
//      connection string (covers prefixed integration variables).
// Placeholder/example values (e.g. the sample in .env.example) are
// never treated as valid, so an accidentally-unedited example won't
// silently "succeed" and connect to nowhere.
// ---------------------------------------------------------------------

function isValidConnectionString(val) {
  if (typeof val !== 'string') return false;
  if (!/^postgres(ql)?:\/\//.test(val)) return false;
  if (val.includes('example.com')) return false;
  if (val.includes('user:pass@') || val.includes('user:password@')) return false;
  return true;
}

function resolveConnectionString() {
  const priorityNames = [
    'POSTGRES_URL',
    'DATABASE_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'DATABASE_URL_UNPOOLED',
  ];
  for (const key of priorityNames) {
    if (isValidConnectionString(process.env[key])) {
      return { value: process.env[key], source: key };
    }
  }
  // Fallback: scan every env var for anything that looks like a real
  // Postgres URL (catches prefixed integration variable names).
  for (const [key, val] of Object.entries(process.env)) {
    if (isValidConnectionString(val)) {
      return { value: val, source: key };
    }
  }
  return { value: undefined, source: null };
}

const { value: connectionString, source } = resolveConnectionString();

if (!connectionString) {
  console.warn('[db] WARNING: No usable Postgres connection string found in any environment variable. Set POSTGRES_URL (or DATABASE_URL) in your Vercel project settings — see README.md.');
} else {
  // Log which variable name it used (never the value itself) so this
  // is easy to confirm from Vercel's runtime logs.
  console.log(`[db] Using Postgres connection string from env var: ${source}`);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  // Vercel runs this app as a serverless function: every cold start creates
  // a brand-new pool, and many can run concurrently. A default pool (max 10)
  // can quickly exhaust a small/free Postgres plan's connection limit, which
  // then makes queries hang until they time out — looking exactly like "the
  // database isn't working" with no clear error. Keep this pool small and
  // fail fast instead of hanging silently.
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Idle clients can be dropped by the DB provider between invocations;
  // without this handler an unexpected disconnect crashes the whole
  // serverless function on the next unrelated request.
  console.error('[db] Unexpected error on idle client:', err.message);
});

pool.__connectionSource = source;

module.exports = pool;
