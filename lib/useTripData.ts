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
      try {
        if (showSpinner) setLoading(true);
        // Joining is idempotent and, being SECURITY DEFINER, also lets a brand-new
        // visitor read a trip they weren't a member of yet (opening a link = joining).
        const t = await joinTripBySlug(slug);
        if (!t) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        tripIdRef.current = t.id;
        setTrip(t);

        // Reconcile dated days before reading them back.
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
        setMembers(m);
        setPlaces(p);
        setDays(d);
        setAssignments(a);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load trip");
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
