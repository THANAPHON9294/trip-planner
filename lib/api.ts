"use client";

import { supabase, PHOTO_BUCKET } from "./supabaseClient";
import type {
  Trip,
  TripMember,
  Place,
  DayPlan,
  PlaceDayAssignment,
} from "./types";

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You need to be signed in.");
  return data.user.id;
}

// ---------- Trips ----------
export async function fetchTripBySlug(slug: string): Promise<Trip | null> {
  const { data, error } = await supabase.from("trips").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

/** Trips the signed-in user belongs to (RLS scopes this to their memberships). */
export async function fetchMyTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTrip(input: {
  slug: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
}): Promise<Trip> {
  const created_by = await currentUserId();
  const { data, error } = await supabase
    .from("trips")
    .insert({ ...input, created_by })
    .select()
    .single();
  if (error) throw error;
  // Add the creator as the first member.
  await joinTripBySlug(data.slug);
  return data;
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<Trip> {
  const { data, error } = await supabase.from("trips").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/** Join a trip by its slug (server RPC creates the membership). Returns the trip. */
export async function joinTripBySlug(slug: string): Promise<Trip | null> {
  const { data, error } = await supabase.rpc("join_trip_by_slug", { p_slug: slug });
  if (error) throw error;
  // The RPC returns a trips composite; for an unknown slug every field is null.
  const trip = data as Trip | null;
  return trip && trip.id ? trip : null;
}

// ---------- Members ----------
export async function fetchMembers(tripId: string): Promise<TripMember[]> {
  const { data, error } = await supabase
    .from("trip_members")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data as TripMember[]) ?? [];

  // Fetch profiles separately and merge — there's no FK PostgREST can embed on
  // (trip_members.user_id and profiles.id both point at auth.users, not each other).
  const userIds = rows.map((r) => r.user_id).filter((v): v is string => !!v);
  const profById = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    (profs ?? []).forEach((p) =>
      profById.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }),
    );
  }

  // The per-trip name (trip_members.name) is authoritative; avatar comes from
  // the live profile. This lets someone go by a different name on each trip.
  return rows.map((m) => {
    const p = m.user_id ? profById.get(m.user_id) : undefined;
    return {
      id: m.id,
      trip_id: m.trip_id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      name: m.name || p?.display_name || "Traveler",
      avatar_url: p?.avatar_url ?? m.avatar_url ?? null,
    };
  });
}

/** Rename yourself on a specific trip (per-trip display name). */
export async function updateMyTripName(tripId: string, name: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from("trip_members")
    .update({ name })
    .eq("trip_id", tripId)
    .eq("user_id", uid);
  if (error) throw error;
}

/** Remove a member from the trip (used by the roster in setup). */
export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from("trip_members").delete().eq("id", id);
  if (error) throw error;
}

/** Leave a trip (delete your own membership). Removes it from your list. */
export async function leaveTrip(tripId: string): Promise<void> {
  const uid = await currentUserId();
  const { error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", uid);
  if (error) throw error;
}

// ---------- Places ----------
export async function fetchPlaces(tripId: string): Promise<Place[]> {
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type PlaceInput = Omit<Place, "id" | "trip_id" | "created_at">;

export async function createPlace(tripId: string, input: PlaceInput): Promise<Place> {
  const { data, error } = await supabase
    .from("places")
    .insert({ ...input, trip_id: tripId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlace(id: string, patch: Partial<PlaceInput>): Promise<Place> {
  const { data, error } = await supabase.from("places").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase.from("places").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Day plans ----------
export async function fetchDayPlans(tripId: string): Promise<DayPlan[]> {
  const { data, error } = await supabase
    .from("day_plans")
    .select("*")
    .eq("trip_id", tripId)
    .order("day_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addDayPlan(
  tripId: string,
  day_number: number,
  date: string | null,
): Promise<DayPlan> {
  const { data, error } = await supabase
    .from("day_plans")
    .insert({ trip_id: tripId, day_number, date })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeDayPlan(id: string): Promise<void> {
  const { error } = await supabase.from("day_plans").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Ensure dated trips have exactly the day_plans their date range implies.
 * Adds any missing dates; leaves manually-added generic days alone for
 * date-less trips. Returns the resulting day list.
 */
export async function ensureDatedDays(
  tripId: string,
  desired: { day_number: number; date: string }[],
): Promise<void> {
  if (desired.length === 0) return;
  const existing = await fetchDayPlans(tripId);
  const existingDates = new Set(existing.filter((d) => d.date).map((d) => d.date));
  const toAdd = desired.filter((d) => !existingDates.has(d.date));
  for (const d of toAdd) {
    await addDayPlan(tripId, d.day_number, d.date);
  }
}

// ---------- Assignments ----------
export async function fetchAssignments(tripId: string): Promise<PlaceDayAssignment[]> {
  // Join through places to scope by trip.
  const { data, error } = await supabase
    .from("place_day_assignment")
    .select("*, places!inner(trip_id)")
    .eq("places.trip_id", tripId);
  if (error) throw error;
  // Strip the joined relation, keep flat assignment rows.
  return (data ?? []).map(({ places: _places, ...a }) => a) as PlaceDayAssignment[];
}

export async function assignPlaceToDay(
  placeId: string,
  dayPlanId: string,
  sortOrder: number,
): Promise<void> {
  // Upsert on the unique place_id so a place moves rather than duplicates.
  const { error } = await supabase
    .from("place_day_assignment")
    .upsert(
      { place_id: placeId, day_plan_id: dayPlanId, sort_order: sortOrder },
      { onConflict: "place_id" },
    );
  if (error) throw error;
}

export async function unassignPlace(placeId: string): Promise<void> {
  const { error } = await supabase.from("place_day_assignment").delete().eq("place_id", placeId);
  if (error) throw error;
}

export async function updateAssignment(
  placeId: string,
  patch: Partial<Pick<PlaceDayAssignment, "time" | "sort_order" | "day_plan_id">>,
): Promise<void> {
  const { error } = await supabase
    .from("place_day_assignment")
    .update(patch)
    .eq("place_id", placeId);
  if (error) throw error;
}

/** Persist a whole day's ordering in one pass. */
export async function persistDayOrder(
  items: { place_id: string; day_plan_id: string; sort_order: number }[],
): Promise<void> {
  for (const it of items) {
    await assignPlaceToDay(it.place_id, it.day_plan_id, it.sort_order);
  }
}

// ---------- Photo upload ----------
export async function uploadPhoto(tripId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${tripId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
