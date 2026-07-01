-- Trip Planner — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: drops are guarded and policies are recreated.

-- ---------- Tables ----------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  start_date date,
  end_date date,
  budget numeric,
  currency text default 'THB',
  created_at timestamptz default now()
);

create table if not exists trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  neighborhood text not null,
  category text not null,
  category_other text,
  desire_level text not null,
  added_by_member_id uuid references trip_members(id),
  notes text,
  google_maps_url text,
  lat double precision,
  lng double precision,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists day_plans (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_number int not null,
  date date
);

create table if not exists place_day_assignment (
  id uuid primary key default gen_random_uuid(),
  place_id uuid unique references places(id) on delete cascade,
  day_plan_id uuid references day_plans(id) on delete cascade,
  time text,
  sort_order int not null default 0
);

create index if not exists idx_places_trip on places(trip_id);
create index if not exists idx_members_trip on trip_members(trip_id);
create index if not exists idx_dayplans_trip on day_plans(trip_id);
create index if not exists idx_assignment_day on place_day_assignment(day_plan_id);

-- ---------- Realtime ----------
-- Add tables to the supabase_realtime publication (ignore "already member" errors).
do $$
begin
  alter publication supabase_realtime add table places;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table day_plans;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table place_day_assignment;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table trip_members;
exception when duplicate_object then null; end $$;

-- ---------- RLS (permissive: no auth, anon can do everything) ----------
-- Privacy = knowing the trip URL. Fine for a low-stakes friend trip.
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table places enable row level security;
alter table day_plans enable row level security;
alter table place_day_assignment enable row level security;

do $$
declare t text;
begin
  foreach t in array array['trips','trip_members','places','day_plans','place_day_assignment']
  loop
    execute format('drop policy if exists anon_all on %I', t);
    execute format(
      'create policy anon_all on %I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ---------- Storage bucket for photos ----------
insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', true)
on conflict (id) do nothing;

drop policy if exists "trip photos public read" on storage.objects;
create policy "trip photos public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'trip-photos');

drop policy if exists "trip photos anon write" on storage.objects;
create policy "trip photos anon write" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'trip-photos');
