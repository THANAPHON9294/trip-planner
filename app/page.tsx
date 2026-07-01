"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchMyTrips, createTrip, joinTripBySlug, leaveTrip } from "@/lib/api";
import { generateSlug, normalizeSlug } from "@/lib/slug";
import { Button, Modal, Field, inputClass, Spinner } from "@/components/ui";
import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/lib/auth";
import type { Trip } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrips(await fetchMyTrips());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setErr(null);
    try {
      const trip = await createTrip({
        slug: generateSlug(),
        name: newName.trim(),
        start_date: null,
        end_date: null,
        budget: null,
        currency: "THB",
      });
      router.push(`/trip/${trip.slug}/setup`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create trip");
      setCreating(false);
    }
  }

  async function handleJoin() {
    const code = normalizeSlug(joinCode);
    if (!code) return;
    setJoining(true);
    setErr(null);
    try {
      const trip = await joinTripBySlug(code);
      if (!trip) {
        setErr("No trip found with that code.");
        setJoining(false);
        return;
      }
      router.push(`/trip/${trip.slug}/board`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to join");
      setJoining(false);
    }
  }

  async function handleLeave(e: React.MouseEvent, tripId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Leave this trip? You can rejoin with the code later.")) return;
    await leaveTrip(tripId);
    load();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-bold">My Trips</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {profile?.display_name ? `Hey ${profile.display_name} — ` : ""}plan group trips with friends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowNew(true)}>+ New trip</Button>
          <AccountMenu />
        </div>
      </header>

      {loading ? (
        <Spinner label="Loading your trips…" />
      ) : trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/40 px-6 py-12 text-center">
          <p className="text-lg font-medium">No trips yet</p>
          <p className="mt-1 text-sm text-ink-soft">Create one, or join with a code a friend shared.</p>
          <div className="mt-4">
            <Button onClick={() => setShowNew(true)}>+ New trip</Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trip/${t.slug}/board`}
                className="group flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-4 shadow-sm transition hover:border-river"
              >
                <div className="min-w-0">
                  <p className="truncate font-heading text-lg font-semibold">{t.name}</p>
                  <p className="font-mono text-xs text-ink-soft">{t.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleLeave(e, t.id)}
                    className="text-xs text-ink-soft opacity-0 transition hover:text-coral group-hover:opacity-100"
                  >
                    Leave
                  </button>
                  <span className="text-ink-soft">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Join by code */}
      <div className="mt-8 rounded-2xl border border-line bg-river-soft/60 p-4">
        <p className="text-sm font-medium">Join by code</p>
        <p className="mb-2 text-xs text-ink-soft">Got a code from a friend? Enter it here.</p>
        <div className="flex gap-2">
          <input
            className={inputClass}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="e.g. k3m9xqd"
          />
          <Button onClick={handleJoin} disabled={joining || !joinCode.trim()}>
            {joining ? "…" : "Join"}
          </Button>
        </div>
      </div>

      {err && <p className="mt-4 rounded-lg bg-coral-soft px-3 py-2 text-sm text-coral">{err}</p>}

      <Modal open={showNew} onClose={() => !creating && setShowNew(false)} title="New trip">
        <div className="space-y-4">
          <Field label="Trip name" required>
            <input
              className={inputClass}
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Chiang Mai with the crew"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowNew(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? "Creating…" : "Create trip"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
