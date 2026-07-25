# Cinémathèque — Web Deployment Guide

This guide explains how to deploy Cinémathèque as a website (accessible from any browser, mobile or desktop).

---

## Overview

The app has two deployment modes:

| Mode | Database | Use case |
|------|----------|----------|
| **Desktop (Tauri)** | Local SQLite file | Personal, offline, fast |
| **Web (Vercel + Turso)** | Cloud SQLite (Turso) | Accessible from anywhere |

This guide covers the **Web deployment**.

---

## Prerequisites

1. A **GitHub** account (free)
2. A **Vercel** account (free) — https://vercel.com
3. A **Turso** account (free) — https://turso.tech

---

## Step 1: Create a Turso Database

Turso provides free serverless SQLite databases.

1. Go to https://turso.tech → Sign up (use GitHub)
2. Install the Turso CLI (optional, or use the web UI):
   ```
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
3. Create a database:
   ```bash
   turso db create cinematheque
   ```
4. Get the database URL:
   ```bash
   turso db show cinematheque --url
   ```
   Output: `libsql://cinematheque-xxxxx.turso.io`
5. Get the auth token:
   ```bash
   turso db tokens create cinematheque
   ```
   Output: a long string like `eyJhbGciOi...`

**Save both values** — you'll need them for Vercel.

---

## Step 2: Push Your Project to GitHub

1. Create a new repository on GitHub (e.g. `cinematheque`)
2. Push your project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cinematheque.git
   git push -u origin main
   ```

---

## Step 3: Deploy to Vercel

1. Go to https://vercel.com → **Sign Up** / **Log In** with GitHub
2. Click **Add New Project**
3. **Import** your `cinematheque` repository
4. Vercel auto-detects Next.js — leave the build settings as default
5. **Important:** Under **Environment Variables**, add these:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `libsql://cinematheque-xxxxx.turso.io` (from Step 1) |
   | `DATABASE_AUTH_TOKEN` | `eyJhbGciOi...` (from Step 1) |
   | `TMDB_API_KEY` | `39adf355a4930c90981a9d8abc608dec` |
   | `TMDB_READ_ACCESS_TOKEN` | `eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzOWFkZjM1NWE0OTMwYzkwOTgxYTlkOGFiYzYwOGRlYyIsIm5iZiI6MTc4Mzc3ODYzMy4zMDgsInN1YiI6IjZhNTI0ZDQ5YjQzM2ZkZGZhMWFiMDhmYSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jIx1c4qk-q8lsnc6yCWFW4X0e4N8LYfMIwgI2YKbmTA` |

6. Click **Deploy**
7. Wait 2–5 minutes for the build to complete
8. You'll get a URL like: `https://cinematheque-xxxxx.vercel.app`

---

## Step 4: Initialize the Database Schema

After the first deployment, you need to create the database tables:

### Option A: Via Prisma (recommended)

Run this locally (your `.env` should point to Turso):
```bash
# Set these temporarily in your .env or shell
export DATABASE_URL="libsql://cinematheque-xxxxx.turso.io"
export DATABASE_AUTH_TOKEN="eyJhbGciOi..."

# Push the schema
npx prisma db push
```

### Option B: Via the app

The app has an auto-migration feature. On first visit, it will try to create the tables automatically via `/api/migrate`.

---

## Step 5: Migrate Your Existing Data (Optional)

If you have movies in your local SQLite database that you want on the web:

1. Export from desktop app: **Settings → Export Backup**
2. This downloads a JSON file with all your movies
3. Visit your deployed site: **Settings → Import Backup**
4. Upload the JSON file

---

## Step 6: Install as a Mobile App (PWA)

Your deployed site is a Progressive Web App:

### Android (Chrome):
1. Open the URL in Chrome
2. Menu (⋮) → **Add to Home screen**
3. App icon appears on home screen

### iPhone (Safari):
1. Open the URL in Safari
2. Share button → **Add to Home Screen**

### Desktop (Chrome/Edge):
1. Open the URL
2. Click the install icon (⊕) in the address bar
3. App opens in its own window

---

## Environment Variables Summary

| Variable | Where to get it | Required for |
|----------|----------------|--------------|
| `DATABASE_URL` | Turso dashboard | Web deployment |
| `DATABASE_AUTH_TOKEN` | Turso dashboard | Web deployment |
| `TMDB_API_KEY` | Hardcoded fallback | TMDb movie search |
| `TMDB_READ_ACCESS_TOKEN` | Hardcoded fallback | TMDb movie search |

For **desktop (Tauri)** builds, none of these are needed — the app uses a local SQLite file and hardcoded TMDb keys.

---

## Custom Domain (Optional)

1. In Vercel dashboard → your project → **Settings → Domains**
2. Add your domain (e.g. `cinematheque.yourdomain.com`)
3. Add the DNS records Vercel shows you
4. SSL is automatic

---

## Updating the App

When you make changes:
1. Push to GitHub
2. Vercel auto-deploys on every push to `main`
3. Changes go live in 2–5 minutes

---

## Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` starts with `libsql://`
- Check `DATABASE_AUTH_TOKEN` is correct
- Verify Turso database is active

### "Translation doesn't work"
- Translation uses a hardcoded ZAI API key — no env var needed
- Check browser console for errors

### "Images don't load"
- TMDb images are loaded from `image.tmdb.org` — requires internet
- This is normal, not a bug

### "Build failed on Vercel"
- Check the build logs in Vercel dashboard
- Common issue: missing environment variables

---

## Cost

| Service | Free tier | Your usage |
|---------|-----------|------------|
| Vercel | 100GB bandwidth, unlimited deployments | Well within free tier |
| Turso | 9GB storage, 1B reads/month | Well within free tier |
| TMDb API | Free | Free |
| **Total** | **$0/month** | |

The app will run completely free for personal use.

---

## Files Modified for Web Deployment

```
src/lib/db.ts              — Supports both local SQLite and Turso (libSQL)
next.config.ts             — Conditional standalone output (desktop only)
scripts/postbuild.js       — Skips on Vercel (not needed for serverless)
vercel.json                — Vercel build configuration
```

The desktop (Tauri) build continues to work exactly as before — the code detects which environment it's in and adapts automatically.
