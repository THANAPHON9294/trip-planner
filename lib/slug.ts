import { customAlphabet } from "nanoid";

// Lowercase + digits, no look-alikes (0/o/1/l/i) — easy to read aloud and type.
const nanoid = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 7);

export function generateSlug(): string {
  return nanoid();
}

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}
