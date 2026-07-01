"use client";

import { createContext, useContext } from "react";
import { useTripData, type TripData } from "@/lib/useTripData";
import { TripNav } from "./TripNav";
import { Spinner } from "./ui";
import Link from "next/link";

const TripContext = createContext<TripData | null>(null);

export function useTrip(): TripData {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used inside <TripProvider>");
  return ctx;
}

export function TripProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const data = useTripData(slug);

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
    </TripContext.Provider>
  );
}
