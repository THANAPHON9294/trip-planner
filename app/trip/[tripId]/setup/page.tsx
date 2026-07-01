"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTrip } from "@/components/TripProvider";
import { Button, Field, inputClass } from "@/components/ui";
import { updateTrip, removeMember } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SetupPage() {
  const router = useRouter();
  const { trip, members, reload } = useTrip();
  const { user } = useAuth();
  const isOwner = trip!.created_by === user?.id;

  const [name, setName] = useState(trip!.name);
  const [start, setStart] = useState(trip!.start_date ?? "");
  const [end, setEnd] = useState(trip!.end_date ?? "");
  const [budget, setBudget] = useState(trip!.budget != null ? String(trip!.budget) : "");
  const [currency, setCurrency] = useState(trip!.currency || "THB");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Keep local fields in sync if realtime updates the trip from elsewhere.
  useEffect(() => {
    setName(trip!.name);
    setStart(trip!.start_date ?? "");
    setEnd(trip!.end_date ?? "");
    setBudget(trip!.budget != null ? String(trip!.budget) : "");
    setCurrency(trip!.currency || "THB");
  }, [trip]);

  async function handleSave() {
    setErr(null);
    if (end && start && end < start) {
      setErr("End date can't be before the start date.");
      return;
    }
    setSaving(true);
    try {
      await updateTrip(trip!.id, {
        name: name.trim() || trip!.name,
        start_date: start || null,
        end_date: end || null,
        budget: budget.trim() ? Number(budget) : null,
        currency: currency.trim() || "THB",
      });
      await reload();
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(id: string) {
    try {
      await removeMember(id);
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove member");
    }
  }

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/trip/${trip!.slug}/board` : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">Trip setup</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Dates are optional — set both to get one planner column per day.
        </p>
      </div>

      {/* Share */}
      <section className="rounded-2xl border border-line bg-river-soft/60 p-4">
        <p className="text-sm font-medium">Share this trip</p>
        <p className="mb-2 text-xs text-ink-soft">
          Anyone with the link or code can view and edit. Code: <span className="font-mono">{trip!.slug}</span>
        </p>
        <div className="flex gap-2">
          <input className={`${inputClass} font-mono text-xs`} value={shareUrl} readOnly />
          <Button variant="outline" onClick={copyLink} className="shrink-0">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </section>

      {/* Trip fields */}
      <section className="space-y-4">
        <Field label="Trip name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start date">
            <input type="date" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End date">
            <input type="date" className={inputClass} value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Total budget" hint="Display only — not tracked against spend.">
            <input
              type="number"
              inputMode="decimal"
              className={inputClass}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Currency">
            <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="THB" />
          </Field>
        </div>

        {err && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-coral">{err}</p>}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save trip"}
          </Button>
          {savedMsg && <span className="text-sm text-mint">Saved ✓</span>}
        </div>
      </section>

      {/* Members */}
      <section className="space-y-3">
        <h3 className="font-heading text-lg font-semibold">Who&apos;s on this trip</h3>
        <p className="text-sm text-ink-soft">
          People join by opening the link above and signing in with Google. Everyone here can view and edit.
        </p>
        {members.length > 0 ? (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-sm"
              >
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-river-soft text-xs font-semibold text-river">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="flex-1 truncate font-medium">{m.name}</span>
                {trip!.created_by === m.user_id && (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-xs font-medium text-gold">owner</span>
                )}
                {m.user_id === user?.id && (
                  <span className="rounded-full bg-river-soft px-2 py-0.5 text-xs font-medium text-river">you</span>
                )}
                {/* Owner can remove others; anyone can remove a legacy label member */}
                {((isOwner && m.user_id !== user?.id) || m.user_id === null) && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-ink-soft hover:text-coral"
                    aria-label={`Remove ${m.name}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">No members yet.</p>
        )}
      </section>

      <div className="border-t border-line pt-4">
        <Button variant="outline" onClick={() => router.push(`/trip/${trip!.slug}/board`)}>
          Go to board →
        </Button>
      </div>
    </div>
  );
}
