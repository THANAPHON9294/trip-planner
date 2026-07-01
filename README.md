# 🧭 Trip Planner

A collaborative group-trip planner for friends. Anyone you share a trip link with can add
candidate places, see them on a board grouped by neighborhood, view them pinned on a map, and
drag them into a day-by-day itinerary — live, together.

Built with **Next.js (App Router)** + **Tailwind**, **Supabase** (Postgres + Realtime + Storage),
**Leaflet + OpenStreetMap**, and **Google sign-in**.

---

## Features

- **Google login** — real accounts with editable profiles (name + avatar).
- **Trips by link** — open a trip link (or enter its code) while signed in and you're joined; your
  trip list is your memberships, synced server-side.
- **Board** — Kanban of place cards, grouped by neighborhood / person / desire tier / category.
- **Map** — one pin per place (colored by category, photo in the popup), filterable by day, person,
  tier, and category.
- **Plan** — day-by-day planner with drag-and-drop between days and an "Unplanned" pool, plus an
  optional time per stop.
- **Places** — name, neighborhood, category, desire tier, "added by", notes, photo (upload or URL),
  and a pin auto-parsed from a Google Maps URL (short `goo.gl` links resolved server-side) with a
  manual pin-drop fallback.
- **Realtime** — changes from other people appear live, no refresh.
- **Access control** — Postgres Row-Level Security: only members of a trip can read or write its data.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Backend / DB | Supabase (Postgres, Realtime, Storage) |
| Auth | Supabase Auth + Google OAuth |
| Map | Leaflet + OpenStreetMap tiles (no API key) |
| Drag & drop | @dnd-kit |
| Fonts | Kanit + IBM Plex Sans Thai (Latin + Thai) |

---

## Getting started

### 1. Prerequisites
- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project (free tier is fine)
- A Google Cloud project for OAuth (free — no billing account needed)

### 2. Install
```bash
npm install
```

### 3. Environment variables
Create `.env.local` in the project root (this file is gitignored — never commit it):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-anon-key>
```
Find both under **Supabase Dashboard → Project Settings → API**.

### 4. Database schema
Run these two files in the **Supabase SQL Editor**, in order:

1. **[`supabase-schema.sql`](supabase-schema.sql)** — tables, indexes, Realtime publication, and the
   `trip-photos` storage bucket.
2. **[`supabase-auth.sql`](supabase-auth.sql)** — profiles, membership columns, the
   membership-based RLS policies, the `join_trip_by_slug()` RPC, and member-only photo uploads.

Both are safe to re-run.

### 5. Google sign-in
1. **Google Cloud Console** → *APIs & Services → Credentials → Create OAuth client ID → Web
   application*. Add this authorized redirect URI:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Copy the **Client ID** and **Client secret**.
2. **Supabase Dashboard → Authentication → Providers → Google** — enable it and paste the ID + secret.
3. **Supabase Dashboard → Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: add `http://localhost:3000/**` (and your production URL, e.g.
     `https://your-app.vercel.app/**`).

### 6. Run
```bash
npm run dev
```
Open http://localhost:3000, sign in with Google, and create a trip.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |

---

## Deploying to Vercel

1. Import the repo in Vercel.
2. Add the two env vars from step 3 in **Project Settings → Environment Variables**.
3. After the first deploy, add your Vercel URL to Supabase **Redirect URLs** and **Site URL**, and to
   the Google OAuth client if you use a custom domain.

---

## How access works

There is real auth, but the sharing model is intentionally light: **knowing a trip's link/code is the
invite.** Opening the link (or entering the code) while signed in joins you as a member, and RLS then
lets you read and edit that trip's data. Everyone on a trip has equal edit rights; the trip creator is
flagged as **owner** and can remove other members. This suits a low-stakes friend trip — it is not
designed for sensitive data.

## Project layout

```
app/                      # App Router routes
  page.tsx                # My Trips (memberships) + create / join
  trip/[tripId]/
    setup/  board/  map/  plan/
  api/resolve-maps/       # resolves Google Maps short links server-side
components/               # UI: cards, combobox, maps, auth gate, account menu, …
lib/                      # supabase client, auth context, data API, hooks, helpers
supabase-schema.sql       # base tables + storage + realtime
supabase-auth.sql         # profiles + membership RLS + join RPC
```
