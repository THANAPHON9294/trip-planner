-- ============================================================================
-- Trip Planner — AUTH UPGRADE (scope C: real accounts + access control)
-- Run this AFTER supabase-schema.sql, in the Supabase SQL editor.
--
-- What it does:
--   * profiles table (one row per Google account, editable display name/avatar)
--   * trip_members gains user_id + role (real membership, not just a label)
--   * trips gains created_by
--   * RLS: only members of a trip can read/write its places/days/assignments
--   * join_trip_by_slug() RPC: the one controlled way to join a trip by its code
--   * storage: only trip members can upload photos
--
-- Safe to re-run. Existing name-only members (user_id null) stay as historical
-- labels; they just don't grant access to anyone.
-- ============================================================================

-- ---------- Profiles ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles readable by authenticated" on profiles;
create policy "profiles readable by authenticated" on profiles
  for select to authenticated using (true);

drop policy if exists "profiles upsert own" on profiles;
create policy "profiles upsert own" on profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles update own" on profiles;
create policy "profiles update own" on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Column additions ----------
alter table trips add column if not exists created_by uuid references auth.users(id);

-- Let a member leave (or be removed) even after they've added places: their
-- places stay, just un-attributed. Without this, the FK blocks the delete.
alter table places drop constraint if exists places_added_by_member_id_fkey;
alter table places add constraint places_added_by_member_id_fkey
  foreign key (added_by_member_id) references trip_members(id) on delete set null;
alter table trip_members add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table trip_members add column if not exists role text not null default 'member';

-- One membership row per (trip, user). NULLs are distinct, so legacy
-- name-only members don't collide.
create unique index if not exists uniq_member_trip_user
  on trip_members(trip_id, user_id) where user_id is not null;

-- ---------- Membership helper (SECURITY DEFINER avoids RLS recursion) ----------
create or replace function is_trip_member(p_trip uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from trip_members
    where trip_id = p_trip and user_id = auth.uid()
  );
$$;

-- ---------- Join-by-code RPC (controlled entry point) ----------
-- Signs the current user into a trip they know the slug for, then returns it.
create or replace function join_trip_by_slug(p_slug text)
returns trips
language plpgsql
security definer
set search_path = public
as $$
declare
  t trips;
begin
  select * into t from trips where slug = p_slug;
  if t.id is null then
    return null;
  end if;

  insert into trip_members (trip_id, user_id, name)
  values (
    t.id,
    auth.uid(),
    coalesce((select display_name from profiles where id = auth.uid()), 'Traveler')
  )
  on conflict (trip_id, user_id) where user_id is not null do nothing;

  return t;
end;
$$;

grant execute on function join_trip_by_slug(text) to authenticated;
grant execute on function is_trip_member(uuid) to authenticated;

-- ---------- Replace permissive policies with membership-based ones ----------
-- Drop the old anon_all policies from supabase-schema.sql.
do $$
declare t text;
begin
  foreach t in array array['trips','trip_members','places','day_plans','place_day_assignment']
  loop
    execute format('drop policy if exists anon_all on %I', t);
  end loop;
end $$;

-- trips: members (or the creator) can read; any authed user can create; members can edit.
drop policy if exists trips_select on trips;
create policy trips_select on trips for select to authenticated
  using (is_trip_member(id) or created_by = auth.uid());

drop policy if exists trips_insert on trips;
create policy trips_insert on trips for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists trips_update on trips;
create policy trips_update on trips for update to authenticated
  using (is_trip_member(id)) with check (is_trip_member(id));

drop policy if exists trips_delete on trips;
create policy trips_delete on trips for delete to authenticated
  using (created_by = auth.uid());

-- trip_members: members can see the roster; a user manages only their own row.
drop policy if exists members_select on trip_members;
create policy members_select on trip_members for select to authenticated
  using (is_trip_member(trip_id));

drop policy if exists members_insert_self on trip_members;
create policy members_insert_self on trip_members for insert to authenticated
  with check (user_id = auth.uid());

-- A user can rename themselves on a trip (per-trip display name).
drop policy if exists members_update_self on trip_members;
create policy members_update_self on trip_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists members_delete_self on trip_members;
create policy members_delete_self on trip_members for delete to authenticated
  using (user_id = auth.uid() or is_trip_member(trip_id));

-- places / day_plans: gated by trip membership.
drop policy if exists places_all on places;
create policy places_all on places for all to authenticated
  using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

drop policy if exists dayplans_all on day_plans;
create policy dayplans_all on day_plans for all to authenticated
  using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

-- assignments: gated via the parent place's trip.
drop policy if exists assignment_all on place_day_assignment;
create policy assignment_all on place_day_assignment for all to authenticated
  using (exists (select 1 from places p where p.id = place_id and is_trip_member(p.trip_id)))
  with check (exists (select 1 from places p where p.id = place_id and is_trip_member(p.trip_id)));

-- ---------- Storage: only members can upload (folder name = trip id) ----------
drop policy if exists "trip photos anon write" on storage.objects;
drop policy if exists "trip photos member write" on storage.objects;
create policy "trip photos member write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and is_trip_member(((storage.foldername(name))[1])::uuid)
  );
-- public read stays as defined in supabase-schema.sql.
