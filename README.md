# ASGES Website — Express + Postgres + Vercel Blob

This replaces the old single-file `index.html` (which only saved admin edits to
browser localStorage — meaning changes never actually persisted anywhere real).
Now everything lives in a real database and is editable from the admin panel:
company name, logo, address, phone, founder photo/bio, clients, portfolio photos,
and stats — plus contact & career form submissions are saved and viewable in the
admin panel.

**Tables and the admin login are created automatically** — there is no
manual "run this script" step. The app creates whatever's missing the first
time it handles a request after each deploy, as long as the environment
variables below are set.

## What's inside

```
server.js          Express app (routes, static file serving)
api/index.js        Vercel serverless entrypoint (wraps server.js)
vercel.json          Vercel routing config
db/schema.sql        Postgres tables
db/ensureSetup.js     Runs automatically: creates tables + admin login if missing
db/setup.js           Optional: same thing, run manually from a local terminal
routes/               auth, site-settings, clients, portfolio, contact, career, upload, setup-admin
middleware/auth.js    JWT-based admin authentication
public/index.html    The website (all content loaded from the API, nothing hardcoded)
public/app.js         Front-end logic + admin panel
public/setup.html     Optional manual password-reset page (see Troubleshooting)
public/styles.css     Styling (same navy/lime design as before)
```

## 1. Set up the database

You need a Postgres database. The easiest options:

- **Vercel Postgres**: In your Vercel project → Storage tab → Create → Postgres.
  It gives you a `POSTGRES_URL` automatically.
- **Neon** (neon.tech) or **Supabase**: both have a free tier; copy their
  connection string, or connect Neon via Vercel's Storage tab integration.

## 2. Set up image storage (Vercel Blob)

Logo, founder photo, client logos, and portfolio photos are uploaded through
the admin panel. Vercel's servers can't save files to disk permanently, so
uploads go to **Vercel Blob** instead.

In your Vercel project → Storage tab → Create → Blob store. Connect it to the
project — this automatically sets `BLOB_READ_WRITE_TOKEN` as an environment
variable for you.

## 3. Environment variables — this is the step that actually matters

Set these in Vercel → your project → Settings → Environment Variables, for
**Production** (tick that checkbox for each one):

- `POSTGRES_URL` — from step 1 (often added automatically by the integration —
  check it's actually there and says "Production")
- `BLOB_READ_WRITE_TOKEN` — from step 2
- `JWT_SECRET` — any long random string you type in yourself
- `ADMIN_DEFAULT_USERNAME` — e.g. `admin`
- `ADMIN_DEFAULT_PASSWORD` — your real starting password, 6+ characters

Once all five are set, **redeploy** (env var changes never apply to a
deployment that already exists — you must trigger a new one). On that first
request after deploying, the app creates the tables and your admin account
from `ADMIN_DEFAULT_USERNAME`/`ADMIN_DEFAULT_PASSWORD` by itself. Log in with
those, then change the password from the admin panel's Account tab.

For local development, copy `.env.example` to `.env` and fill in the same
values, then `npm install && npm start`.

## 5. Run locally

```bash
npm start
```

Visit `http://localhost:3000`. Click the small lock icon bottom-left to open
the admin login.

## 6. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel                  # first deploy, follow prompts
vercel --prod            # production deploy
```

Or connect the GitHub repo to Vercel from the dashboard for automatic
deploys on every push. Make sure the environment variables from step 3 are
set on the Vercel project (Production, and Preview if you want previews to
work too) **before** deploying, and run `npm run db:setup` once (locally,
pointed at the same `POSTGRES_URL` you configured in Vercel) to create the
tables and first admin login.

## Using the admin panel

Click the lock icon (bottom-left of the site) → log in → you get tabs for:

- **Company Info** — name, tagline, about text, logo, contact details,
  founder name/title/bio/photo, and the homepage stats/counters
- **Portfolio** — upload/delete project photos
- **Clients** — add/remove client logos shown on the site
- **Inquiries** — view contact form and career form submissions
- **Account** — change your admin password

Every change here writes straight to the database and is live on the site
immediately for all visitors — no more "browser-local only" limitation.

## Renaming the company / changing address / logo

You don't need to tell anyone the new details — once this is deployed, log
into the admin panel and edit:
- **Company Info tab** → Company Name, Short Name, Address, Phone, GSTIN,
  Udyam Registration
- **Logo** → upload a new image file, it replaces the logo everywhere
  (navbar, hero, footer) automatically

## Troubleshooting: "the database isn't working" on Vercel

Visit `https://your-site.vercel.app/api/health` first — it tells you exactly
what's wrong instead of guessing:

- **`"database": "not configured"`** → `POSTGRES_URL` (or `DATABASE_URL`) is
  not set in Vercel. Go to Project → Settings → Environment Variables, add it
  for **Production** (and Preview, if you test on preview deployments too),
  then redeploy — env var changes don't apply to deployments already running.
- **`"tables_missing": [...]`** → the connection works, but nobody has ever
  run `npm run db:setup` against this database, so the tables don't exist
  yet. Run it locally once, with your `.env` (or shell) pointed at the exact
  same `POSTGRES_URL` your Vercel project uses:
  ```bash
  POSTGRES_URL="paste-your-real-connection-string-here" npm run db:setup
  ```
- **`"database": "connection failed"`** → the string is set but wrong, or
  the provider is rejecting Vercel's connection. Common causes:
  - Neon/Supabase: make sure you copied the **pooled** connection string
    (Neon's has `-pooler` in the hostname) — serverless functions open many
    short-lived connections, and a non-pooled/direct string can exceed the
    database's connection limit under load.
  - The connection string still has the placeholder `user:password@` from
    `.env.example` — `db/pool.js` deliberately refuses to use that value
    silently so it doesn't look like a "working" connection to nowhere.
  - Some providers require you to explicitly allow external connections
    (an "allow from anywhere" / `0.0.0.0/0` setting) before Vercel can reach
    them.

If the page loads but looks blank/unstyled or images (like the logo) are
missing in production while everything works fine with `npm start` locally,
that's a static-file bundling issue, not the database — make sure
`vercel.json` still has the `"functions": { "api/index.js": { "includeFiles":
"public/**" } }` block, then redeploy.

## Forgot the admin password, or need to reset it

Tables and the *first* admin account are created automatically (see step 3
above). If you later forget that password, use this to reset it without
touching the database directly:

1. In Vercel → your project → Settings → Environment Variables, add
   `SETUP_SECRET` (any long random string) for Production, then redeploy.
2. **Easiest way — no terminal needed:** visit
   `https://your-site.vercel.app/setup.html`, fill in the secret, a username,
   and a password, and click "Run setup".

   Or, if you prefer a terminal, call this once (replace the placeholders):
   ```bash
   curl -X POST https://your-site.vercel.app/api/setup-admin \
     -H "Content-Type: application/json" \
     -d '{"secret":"the-SETUP_SECRET-you-just-set","username":"admin","password":"a-new-password-6chars-plus"}'
   ```
3. You should get back `{"ok":true,"action":"created",...}` (or
   `"password reset"` if the user already existed). Log in at your site with
   that username/password immediately.
4. Optional but recommended: remove `SETUP_SECRET` from Vercel afterwards
   (or just keep it private) since anyone who knows it can reset the admin
   password.

This endpoint also creates any missing tables first, so it doubles as a
one-shot fix if `npm run db:setup` was never run against your Neon database
at all.

## Custom domain

The old site used a `CNAME` file (GitHub Pages style) pointing to
`asinfrastructuresolutions.in`. On Vercel, instead: Project → Settings →
Domains → add your domain and follow the DNS instructions Vercel shows you.
