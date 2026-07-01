import { TripProvider } from "@/components/TripProvider";

export default function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tripId: string };
}) {
  // The dynamic segment is the trip slug (the short code used in the URL).
  return <TripProvider slug={params.tripId}>{children}</TripProvider>;
}
