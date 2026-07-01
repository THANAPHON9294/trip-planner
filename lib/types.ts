export type Category = "cafe" | "food" | "attraction" | "shopping" | "other";
export type DesireLevel = "must_go" | "would_like" | "if_time";

export interface Trip {
  id: string;
  slug: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  created_by: string | null;
  created_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  name: string;
  user_id: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface Place {
  id: string;
  trip_id: string;
  name: string;
  neighborhood: string;
  category: Category;
  category_other: string | null;
  desire_level: DesireLevel;
  added_by_member_id: string | null;
  notes: string | null;
  google_maps_url: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  created_at: string;
}

export interface DayPlan {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
}

export interface PlaceDayAssignment {
  id: string;
  place_id: string;
  day_plan_id: string;
  time: string | null;
  sort_order: number;
}

/** Local-storage record of a trip this browser has joined. */
export interface LocalTrip {
  id: string;
  slug: string;
  name: string;
}
