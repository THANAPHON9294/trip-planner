# Trip Planner App — Implementation Spec

Status: grilling complete, ready to build.

## Goal
A collaborative group-trip planner for friends. Anyone with the trip link can add candidate
places, see them as a board grouped by neighborhood, see them pinned on a map, and drag them
into a day-by-day itinerary. No login.

## Stack (all free, no paid tier risk)
- **Frontend**: Next.js (App Router) + Tailwind, deployed on **Vercel** (free tier)
- **Backend/DB**: **Supabase** (Postgres + Realtime + Storage), free tier
- **Map**: **Leaflet + OpenStreetMap** tiles — no API key, no billing account, ever
- **Auth**: none. Identity = picking your name from a dropdown (no password, no email)

## Visual identity
CSS variables (from provided palette):
```
--paper: #FBF6EE        background
--ink: #1B2440           primary text, headers
--ink-soft: #5C6378      secondary text
--coral: #FF6F61         accent / "Must go" tier
--coral-soft: #FFE7E3    warning tint
--river: #2F6BE3         links, map buttons, tags
--river-soft: #E9F0FD    info callouts, map legend
--mint: #10B597          positive / "If time" tier
--mint-soft: #DDF6F0     ok callouts, tint
--gold: #F2A93B          "Would like" tier / recommended badge
--line: #E8DFD0          dividers, card borders
```
Fonts: **Kanit** (headings, numbers) + **IBM Plex Sans Thai** (body — covers Thai *and* Latin,
since friends may type Thai place names/notes even though all UI chrome is in English).
UI copy: English. Mobile-first, fully usable on desktop too (breakpoint ~768px).

## Routes
- `/` — **My Trips**: list of trips pulled from this browser's `localStorage` (private-by-link;
  there is no public/global trip list). Empty on a fresh browser until a trip is added to it —
  two ways that happens, no separate "Join" form required:
  1. **Create a trip** via the "+ New trip" button on this page → auto-added to this browser's list.
  2. **Open a shared trip link** (e.g. `/trip/abc123/board` sent by a friend) → on load, the app
     fetches the trip's name from Supabase and silently writes `{id, slug, name}` into this
     browser's `localStorage` list. Opening the link *is* joining; next visit to `/` shows it.
  - Also include a **"Join by code"** input on `/` (paste/type the trip slug) for cases where the
    link itself wasn't shared (e.g. code given verbally) — same auto-add-to-localStorage effect,
    then redirects to `/trip/[tripId]/board`.
- `/trip/[tripId]/setup` — create/edit trip: name, start date (optional), end date (optional),
  total budget (number, display-only, not tracked against spend), member list (add/remove names).
- `/trip/[tripId]/board` — Kanban-style board of place cards. Default grouping: neighborhood.
  Toggle to group by person or by desire tier.
- `/trip/[tripId]/map` — Leaflet map, one pin per place. Filters: by day (incl. "unplanned"),
  by person, by desire tier, by category.
- `/trip/[tripId]/plan` — day-by-day planner. One column per day (see "Day generation" below)
  plus an "Unplanned" pool. Drag cards from board/pool into a day; reorder within a day.

Nav: bottom tab bar (Board / Map / Plan) on mobile, top tab bar on desktop.

## Day generation
- If trip has both start_date and end_date set → generate one day per calendar date
  (label: "Day 1 · Aug 1", "Day 2 · Aug 2", …).
- If no dates set → generic days ("Day 1", "Day 2", …); user adds days manually with a
  "+ Add day" button on the Plan page.
- A place card can be assigned to **exactly one day** (unique constraint). To visit somewhere
  twice, duplicate the card.
- Within a day: optional time field per assignment (free `HH:MM` text, not required) +
  manual drag-to-reorder. Display order follows manual order, not auto-sort-by-time.

## Place card fields
| Field | Type | Notes |
|---|---|---|
| name | text, required | |
| neighborhood / province | text, required | |
| category | enum: cafe / food / attraction / shopping / other | if "other", show free-text `category_other` |
| desire level | enum: must_go / would_like / if_time | maps to coral / gold / mint |
| added_by | dropdown of trip members | members set up at trip creation, can add new names on the fly |
| notes | text, optional | short, "why I want to go" |
| google_maps_url | text, optional | see pin-coordinate flow below |
| photo | optional | upload to Supabase Storage **or** paste external image URL — both write to one `photo_url` field |

## Pin-coordinate flow
1. User pastes a Google Maps URL (optional).
2. Try to parse `lat,lng` from the URL (`@lat,lng,zoom` or `?q=lat,lng` patterns).
3. If it's a short link (`maps.app.goo.gl/...`, `goo.gl/maps/...`), resolve the redirect
   server-side first, then parse the resolved URL.
4. If parsing still fails (or no URL given), fall back to a manual pin-drop modal — a small
   Leaflet map the user taps to place the pin themselves.

## Permissions
No real auth, so no real enforcement. Anyone with the trip link can add/edit/delete **any**
card, member, or day assignment, regardless of who "added" it. The "added by" name is just a
label, not a permission gate.

⚠️ **Known tradeoff to flag**: since there's no auth, Supabase RLS will be permissive (anon role
can read/write everything). Privacy = knowing the trip's URL/ID, not real access control. Fine
for a low-stakes friend trip; would need real auth if this ever handles sensitive data.

## Realtime
Supabase Realtime channel per trip, subscribed to `places`, `day_plans`, and
`place_day_assignment` filtered by `trip_id`. UI reflects changes from other people live, no
refresh needed.

## Database schema (Postgres)
```sql
trips (
  id uuid pk default gen_random_uuid(),
  slug text unique,              -- short code used in the URL
  name text not null,
  start_date date,
  end_date date,
  budget numeric,
  currency text default 'THB',
  created_at timestamptz default now()
)

trip_members (
  id uuid pk default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
)

places (
  id uuid pk default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  neighborhood text not null,
  category text not null,            -- cafe | food | attraction | shopping | other
  category_other text,
  desire_level text not null,        -- must_go | would_like | if_time
  added_by_member_id uuid references trip_members(id),
  notes text,
  google_maps_url text,
  lat double precision,
  lng double precision,
  photo_url text,
  created_at timestamptz default now()
)

day_plans (
  id uuid pk default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_number int not null,
  date date                          -- null if trip has no fixed dates
)

place_day_assignment (
  id uuid pk default gen_random_uuid(),
  place_id uuid unique references places(id) on delete cascade,  -- unique = 1 card, 1 day
  day_plan_id uuid references day_plans(id) on delete cascade,
  time text,                         -- optional "HH:MM"
  sort_order int not null default 0
)
```

## Image upload
Supabase Storage bucket `trip-photos`, public read, anon-key upload from the browser
(supabase-js client SDK). Reasonable client-side size/type limit on upload (e.g. 5MB, jpg/png/webp).

## Open items for build time (not blocking, my call during implementation)
- Exact slug generation scheme for trip URLs (short random code, e.g. nanoid).
- Board's secondary grouping toggle (by person / by desire) is additive — not separately
  confirmed but a natural fit given the original ask.
