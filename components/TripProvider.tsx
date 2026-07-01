"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useTripData, type TripData } from "@/lib/useTripData";
import { TripNav } from "./TripNav";
import { Spinner, Button } from "./ui";
import { TripNameModal } from "./TripNameModal";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

const TripContext = createContext<TripData | null>(null);

export function useTrip(): TripData {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used inside <TripProvider>");
  return ctx;
}

export function TripProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const data = useTripData(slug);
  const { user } = useAuth();

  const myMember = data.members.find((m) => m.user_id === user?.id);
  const [namePromptOpen, setNamePromptOpen] = useState(false);

  // First time you land on this trip in this browser, offer to set a per-trip name.
  useEffect(() => {
    if (!data.trip || !myMember) return;
    const key = `tp.named.${data.trip.id}`;
    if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
      setNamePromptOpen(true);
    }
  }, [data.trip, myMember]);

  function closeNamePrompt() {
    if (data.trip) window.localStorage.setItem(`tp.named.${data.trip.id}`, "1");
    setNamePromptOpen(false);
  }

  if (data.notFound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="font-heading text-2xl font-semibold">Trip not found</p>
        <p className="mt-2 text-ink-soft">
          The code <span className="font-mono">{slug}</span> doesn&apos;t match any trip.
        </p>
        <Link href="/" className="mt-4 text-river underline">
          Back to my trips
        </Link>
      </div>
    );
  }

  // Genuine load error (not just "still loading") — don't spin forever.
  if (!data.loading && !data.trip && data.error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="font-heading text-2xl font-semibold">Couldn&apos;t load this trip</p>
        <p className="mt-2 text-sm text-ink-soft">{data.error}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => data.reload()}>Try again</Button>
          <Link href="/" className="inline-flex items-center px-3 text-river underline">
            My trips
          </Link>
        </div>
      </div>
    );
  }

  if (data.loading || !data.trip) {
    return (
      <div className="min-h-screen">
        <Spinner label="Loading trip…" />
      </div>
    );
  }

  return (
    <TripContext.Provider value={data}>
      <TripNav slug={data.trip.slug} tripName={data.trip.name} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:pb-10">{children}</main>
      <TripNameModal
        open={namePromptOpen}
        firstTime
        onClose={closeNamePrompt}
        tripId={data.trip.id}
        currentName={myMember?.name ?? ""}
        onSaved={data.reload}
      />
    </TripContext.Provider>
  );
}
