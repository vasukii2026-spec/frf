-- ============================================================
-- ASGES Website Database Schema
-- Run this once against your Postgres database (Vercel Postgres,
-- Neon, Supabase, or any Postgres works).
-- ============================================================

-- Single-row table holding all editable "global" site content:
-- company name, logo, address, phone, founder info, stats, etc.
CREATE TABLE IF NOT EXISTS site_settings (
    id                  INT PRIMARY KEY DEFAULT 1,
    company_name        TEXT NOT NULL DEFAULT 'AS Global Engineering Solutions LLP',
    company_short_name  TEXT NOT NULL DEFAULT 'ASGES',
    tagline             TEXT NOT NULL DEFAULT 'AS Global Engineering Solutions — delivering innovative, reliable, and high-quality infrastructure solutions across India.',
    hero_tagline        TEXT NOT NULL DEFAULT 'Leading Infrastructure Consultancy Across India',
    about_text          TEXT NOT NULL DEFAULT 'AS Global Engineering Solutions is a leading engineering consultancy and infrastructure service provider delivering innovative, reliable, and high-quality solutions across India.',
    logo_url            TEXT NOT NULL DEFAULT '/logo.PNG',
    phone               TEXT NOT NULL DEFAULT '+91 92343 67036',
    whatsapp_number     TEXT NOT NULL DEFAULT '919234367036',
    email               TEXT NOT NULL DEFAULT '',
    address             TEXT NOT NULL DEFAULT 'MIG-76, Housing Board Colony, Old Subhash Nagar, Bhopal - 462023 (M.P.)',
    udyam_reg           TEXT NOT NULL DEFAULT 'UDYAM-MP-10-0158693',
    gstin               TEXT NOT NULL DEFAULT '23AMXPI4407L1ZP',
    founder_name        TEXT NOT NULL DEFAULT 'Md Imran',
    founder_title       TEXT NOT NULL DEFAULT 'Founder & Civil Engineer',
    founder_bio         TEXT NOT NULL DEFAULT 'Founder of AS Global Engineering Solutions and a qualified Civil Engineer with an M.Tech specialization in Structural Engineering.',
    founder_photo_url   TEXT NOT NULL DEFAULT '/founder.jpeg',
    stat_years          INT  NOT NULL DEFAULT 10,
    stat_projects       INT  NOT NULL DEFAULT 500,
    stat_team           INT  NOT NULL DEFAULT 50,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Admin users who can log in and edit the site
CREATE TABLE IF NOT EXISTS admin_users (
    id            SERIAL PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clients / happy-clients logos shown on the site
CREATE TABLE IF NOT EXISTS clients (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    img_url     TEXT DEFAULT '',
    icon        TEXT DEFAULT 'fa-building',
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Portfolio / project photos
CREATE TABLE IF NOT EXISTS portfolio_items (
    id          SERIAL PRIMARY KEY,
    title       TEXT DEFAULT '',
    category    TEXT DEFAULT 'general',
    img_url     TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact form submissions (general inquiries)
CREATE TABLE IF NOT EXISTS contact_submissions (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT DEFAULT '',
    service     TEXT DEFAULT '',
    message     TEXT DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'new',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Career / job applications
CREATE TABLE IF NOT EXISTS career_submissions (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL,
    email         TEXT DEFAULT '',
    position      TEXT DEFAULT '',
    qualification TEXT DEFAULT '',
    message       TEXT DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'new',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
