"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Modal, Field, inputClass, Button, Spinner } from "./ui";
import { Combobox } from "./Combobox";
import { CATEGORIES, DESIRE_LEVELS } from "@/lib/constants";
import { resolveCoords, type LatLng } from "@/lib/mapsUrl";
import { createPlace, updatePlace, deletePlace, uploadPhoto, type PlaceInput } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Place, TripMember, Category, DesireLevel } from "@/lib/types";

const PinDropMap = dynamic(() => import("./map/PinDropMap"), {
  ssr: false,
  loading: () => <div className="flex h-[320px] items-center justify-center rounded-xl bg-white text-ink-soft">Loading map…</div>,
});

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function PlaceFormModal({
  open,
  onClose,
  tripId,
  members,
  neighborhoods = [],
  onMembersChange,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  members: TripMember[];
  neighborhoods?: string[];
  onMembersChange: () => void;
  editing: Place | null;
}) {
  const { user } = useAuth();
  const myMemberId = members.find((m) => m.user_id === user?.id)?.id ?? "";

  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [categoryOther, setCategoryOther] = useState("");
  const [desire, setDesire] = useState<DesireLevel>("would_like");
  const [addedBy, setAddedBy] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");

  const [showPinDrop, setShowPinDrop] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveMsg, setResolveMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Hydrate fields when opening / switching target.
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setResolveMsg(null);
    setShowPinDrop(false);
    if (editing) {
      setName(editing.name);
      setNeighborhood(editing.neighborhood);
      setCategory(editing.category);
      setCategoryOther(editing.category_other ?? "");
      setDesire(editing.desire_level);
      setAddedBy(editing.added_by_member_id ?? "");
      setNotes(editing.notes ?? "");
      setMapsUrl(editing.google_maps_url ?? "");
      setCoords(editing.lat != null && editing.lng != null ? { lat: editing.lat, lng: editing.lng } : null);
      setPhotoUrl(editing.photo_url ?? "");
    } else {
      setName("");
      setNeighborhood("");
      setCategory("food");
      setCategoryOther("");
      setDesire("would_like");
      setAddedBy(myMemberId || members[0]?.id || "");
      setNotes("");
      setMapsUrl("");
      setCoords(null);
      setPhotoUrl("");
    }
  }, [open, editing, members]);

  async function handleResolveUrl() {
    if (!mapsUrl.trim()) return;
    setResolving(true);
    setResolveMsg(null);
    try {
      const ll = await resolveCoords(mapsUrl.trim());
      if (ll) {
        setCoords(ll);
        setResolveMsg(`Pinned at ${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`);
      } else {
        setResolveMsg("Couldn't read coordinates — drop the pin manually below.");
        setShowPinDrop(true);
      }
    } finally {
      setResolving(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      setErr("Photo must be jpg, png, or webp.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("Photo must be under 5 MB.");
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const url = await uploadPhoto(tripId, file);
      setPhotoUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim() || !neighborhood.trim()) {
      setErr("Name and neighborhood are required.");
      return;
    }
    setErr(null);
    setSaving(true);
    const payload: PlaceInput = {
      name: name.trim(),
      neighborhood: neighborhood.trim(),
      category,
      category_other: category === "other" ? categoryOther.trim() || null : null,
      desire_level: desire,
      added_by_member_id: addedBy || null,
      notes: notes.trim() || null,
      google_maps_url: mapsUrl.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      photo_url: photoUrl.trim() || null,
    };
    try {
      if (editing) {
        await updatePlace(editing.id, payload);
      } else {
        await createPlace(tripId, payload);
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!window.confirm(`Delete "${editing.name}"?`)) return;
    setSaving(true);
    try {
      await deletePlace(editing.id);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit place" : "Add a place"} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Wat Arun" />
          </Field>
          <Field
            label="Neighborhood / Province"
            required
            hint={neighborhoods.length > 0 ? "Pick an existing one or type a new one." : undefined}
          >
            <Combobox
              freeText
              value={neighborhood}
              onChange={setNeighborhood}
              items={neighborhoods.map((n) => ({ value: n, label: n }))}
              placeholder="Bangkok Yai"
              ariaLabel="Neighborhood"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Combobox
              value={category}
              onChange={(v) => setCategory(v as Category)}
              items={CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon: c.emoji }))}
              placeholder="Pick a category"
              ariaLabel="Category"
            />
            {category === "other" && (
              <input
                className={`${inputClass} mt-2`}
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
                placeholder="Describe the category"
              />
            )}
          </Field>
          <Field label="Desire level">
            <div className="flex gap-2">
              {DESIRE_LEVELS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDesire(d.value)}
                  className="flex-1 rounded-xl border px-2 py-2 text-xs font-medium transition"
                  style={{
                    borderColor: desire === d.value ? d.colorVar : "var(--line)",
                    backgroundColor: desire === d.value ? d.tintVar : "white",
                    color: desire === d.value ? d.colorVar : "var(--ink-soft)",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Added by" hint="Whoever wants to go. Defaults to you.">
            <Combobox
              value={addedBy}
              onChange={setAddedBy}
              items={members.map((m) => ({ value: m.id, label: m.name }))}
              placeholder="Pick a member"
              ariaLabel="Added by"
            />
          </Field>
          <Field label="Notes" hint="Short — why you want to go.">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sunset views" />
          </Field>
        </div>

        {/* Google Maps URL + coordinate flow */}
        <Field label="Google Maps URL" hint="Paste a link; we'll try to pull the pin. Short goo.gl links work too.">
          <div className="flex gap-2">
            <input
              className={inputClass}
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/…"
            />
            <Button variant="outline" onClick={handleResolveUrl} disabled={resolving || !mapsUrl.trim()} className="shrink-0">
              {resolving ? "…" : "Get pin"}
            </Button>
          </div>
        </Field>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          {coords ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-mint-soft px-3 py-1 text-mint">
              📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
          ) : (
            <span className="text-ink-soft">No pin yet.</span>
          )}
          <Button variant="ghost" onClick={() => setShowPinDrop((s) => !s)}>
            {showPinDrop ? "Hide map" : coords ? "Adjust pin" : "Drop pin manually"}
          </Button>
          {coords && (
            <Button variant="ghost" onClick={() => setCoords(null)}>
              Clear pin
            </Button>
          )}
        </div>
        {resolveMsg && <p className="text-xs text-ink-soft">{resolveMsg}</p>}

        {showPinDrop && (
          <PinDropMap value={coords} onPick={(ll) => setCoords(ll)} />
        )}

        {/* Photo */}
        <Field label="Photo" hint="Upload (jpg/png/webp, ≤5 MB) or paste an image URL.">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input type="file" accept={ACCEPT.join(",")} onChange={handleFile} className="text-sm" />
            <span className="text-xs text-ink-soft">or</span>
            <input
              className={inputClass}
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…/photo.jpg"
            />
          </div>
          {uploading && <Spinner label="Uploading…" />}
          {photoUrl && !uploading && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
          )}
        </Field>

        {err && <p className="rounded-lg bg-coral-soft px-3 py-2 text-sm text-coral">{err}</p>}

        <div className="flex items-center justify-between pt-1">
          {editing ? (
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add place"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
