# ASGES Website — Express + Postgres + Vercel Blob

This replaces the old single-file `index.html` (which only saved admin edits to
browser localStorage — meaning changes never actually persisted anywhere real).
Now everything lives in a real database and is editable from the admin panel:
company name, logo, address, phone, founder photo/bio, clients, portfolio photos,
and stats — plus contact & career form submissions are saved and viewable in the
admin panel.

## What's inside

```
server.js          Express app (routes, static file serving)
api/index.js        Vercel serverless entrypoint (wraps server.js)
vercel.json          Vercel routing config
db/schema.sql        Postgres tables
db/setup.js           One-time script: creates tables + first admin login
routes/               auth, site-settings, clients, portfolio, contact, career, upload
middleware/auth.js    JWT-based admin authentication
public/index.html    The website (all content loaded from the API, nothing hardcoded)
public/app.js         Front-end logic + admin panel
public/styles.css     Styling (same navy/lime design as before)
```

## 1. Set up the database

You need a Postgres database. The easiest options:

- **Vercel Postgres**: In your Vercel project → Storage tab → Create → Postgres.
  It gives you a `POSTGRES_URL` automatically.
- **Neon** (neon.tech) or **Supabase**: both have a free tier; copy their
  connection string.

## 2. Set up image storage (Vercel Blob)

Logo, founder photo, client logos, and portfolio photos are uploaded through
the admin panel. Vercel's servers can't save files to disk permanently, so
uploads go to **Vercel Blob** instead.

In your Vercel project → Storage tab → Create → Blob store. Connect it to the
project — this automatically sets `BLOB_READ_WRITE_TOKEN` as an environment
variable for you.

## 3. Environment variables

Copy `.env.example` to `.env` (for local dev) and fill in:

- `POSTGRES_URL` — from step 1
- `BLOB_READ_WRITE_TOKEN` — from step 2 (skip locally if you just want to test
  text fields; image upload will show a clear error until this is set)
- `JWT_SECRET` — any long random string
- `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` — your first login,
  used only once by the setup script

On Vercel, add the same variables under Project → Settings → Environment
Variables (POSTGRES_URL and BLOB_READ_WRITE_TOKEN are added automatically
when you create/connect the stores in steps 1–2; add JWT_SECRET and the
ADMIN_DEFAULT_* ones yourself).

## 4. Install dependencies & create tables

```bash
npm install
npm run db:setup
```

This creates all tables and one admin login (`ADMIN_DEFAULT_USERNAME` /
`ADMIN_DEFAULT_PASSWORD`, default `admin` / `change-me-now` if you didn't set
them). **Log in and change this password immediately** from the admin panel's
Account tab.

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

## Custom domain

The old site used a `CNAME` file (GitHub Pages style) pointing to
`asinfrastructuresolutions.in`. On Vercel, instead: Project → Settings →
Domains → add your domain and follow the DNS instructions Vercel shows you.
