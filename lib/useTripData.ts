"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  joinTripBySlug,
  fetchMembers,
  fetchPlaces,
  fetchDayPlans,
  fetchAssignments,
  ensureDatedDays,
} from "./api";
import { desiredDatedDays } from "./days";
import type { Trip, TripMember, Place, DayPlan, PlaceDayAssignment } from "./types";

export interface TripData {
  trip: Trip | null;
  members: TripMember[];
  places: Place[];
  days: DayPlan[];
  assignments: PlaceDayAssignment[];
  loading: boolean;
  notFound: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads everything for a trip (by slug) and keeps it live via a Supabase
 * Realtime channel. Any change to the trip's rows triggers a debounced reload —
 * simple and correct for a low-traffic friend trip.
 */
export function useTripData(slug: string): TripData {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [assignments, setAssignments] = useState<PlaceDayAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(
    async (showSpinner: boolean) => {
      // The actual work. Wrapped below so we can time it out and retry — a
      // Supabase request occasionally stalls on first load (auth-lock edge case)
      // and used to hang the "Loading trip…" spinner until a manual refresh.
      const doLoad = async () => {
        const t = await joinTripBySlug(slug);
        if (!t) {
          setNotFound(true);
          return;
        }

        const desired = desiredDatedDays(t);
        if (desired.length > 0) {
          await ensureDatedDays(t.id, desired);
        }

        const [m, p, d, a] = await Promise.all([
          fetchMembers(t.id),
          fetchPlaces(t.id),
          fetchDayPlans(t.id),
          fetchAssignments(t.id),
        ]);
        // Commit everything together, only after all fetches succeed, so a
        // partial failure shows the error screen instead of an empty board.
        tripIdRef.current = t.id;
        setTrip(t);
        setMembers(m);
        setPlaces(p);
        setDays(d);
        setAssignments(a);
        setError(null);
      };

      const withTimeout = (ms: number) =>
        Promise.race([
          doLoad(),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
        ]);

      if (showSpinner) setLoading(true);
      try {
        try {
          await withTimeout(8000);
        } catch {
          // One automatic retry before surfacing an error (mirrors a manual refresh).
          await withTimeout(8000);
        }
      } catch (e) {
        setError(
          e instanceof Error && e.message !== "timeout"
            ? e.message
            : "This trip is taking too long to load.",
        );
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [slug],
  );

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadAll(false), 250);
  }, [loadAll]);

  useEffect(() => {
    loadAll(true);
  }, [loadAll]);

  // Realtime: subscribe once we know the trip id.
  useEffect(() => {
    const tripId = trip?.id;
    if (!tripId) return;

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "places", filter: `trip_id=eq.${tripId}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "day_plans", filter: `trip_id=eq.${tripId}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${tripId}` }, scheduleReload)
      // assignment rows have no trip_id column; listen broadly and reconcile on reload.
      .on("postgres_changes", { event: "*", schema: "public", table: "place_day_assignment" }, scheduleReload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trip?.id, scheduleReload]);

  return {
    trip,
    members,
    places,
    days,
    assignments,
    loading,
    notFound,
    error,
    reload: () => loadAll(false),
  };
}
