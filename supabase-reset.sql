-- ============================================================================
-- Trip Planner — RESET DATA
-- Run in the Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- The SQL editor runs as the service role, so it bypasses RLS.
--
-- This DELETES data but KEEPS your tables, policies, functions, and the
-- storage bucket. Pick the section you want. ⚠️ There is no undo.
-- ============================================================================

-- ---------- 1) Clear all trip data (keeps user accounts + profiles) ----------
-- CASCADE handles the foreign keys between these tables.
truncate table
  place_day_assignment,
  day_plans,
  places,
  trip_members,
  trips
restart identity cascade;


-- ---------- 2) (Optional) Delete uploaded trip photos from Storage ----------
-- NOTE: Supabase blocks direct SQL deletes on storage.objects
--   (ERROR 42501: "Direct deletion from storage tables is not allowed").
-- Clear photos instead via:
--   Dashboard → Storage → trip-photos → ⋯ menu → "Empty bucket".
-- (The bucket itself stays. External image URLs were never stored here.)


-- ---------- 3) (Optional) Also wipe user profiles ----------
-- Profiles are re-created automatically the next time each user signs in.
-- Uncomment to use.
-- delete from profiles;


-- ---------- 4) (Optional, DANGER) Also delete the Google accounts ----------
-- This removes the auth users themselves — everyone must sign in again and
-- gets a brand-new identity. Usually you do NOT want this.
-- Prefer the Dashboard → Authentication → Users screen for deleting accounts.
-- delete from auth.users;
