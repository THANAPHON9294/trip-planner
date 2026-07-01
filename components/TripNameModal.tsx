"use client";

import { useEffect, useState } from "react";
import { Modal, Field, inputClass, Button } from "./ui";
import { updateMyTripName } from "@/lib/api";

/**
 * Shown once when you first land on a trip, so you can pick the name you'll go
 * by on *this* trip (defaults to your profile name). Also reused from Setup to
 * change it later.
 */
export function TripNameModal({
  open,
  onClose,
  tripId,
  currentName,
  onSaved,
  firstTime = false,
}: {
  open: boolean;
  onClose: () => void;
  tripId: string;
  currentName: string;
  onSaved: () => void;
  firstTime?: boolean;
}) {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (trimmed !== currentName) {
        await updateMyTripName(tripId, trimmed);
        onSaved();
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={firstTime ? "What should we call you here?" : "Your name on this trip"}>
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          {firstTime
            ? "Pick the name you'll go by on this trip. You can change it anytime in Setup."
            : "This is how you appear to everyone on this trip."}
        </p>
        <Field label="Your name on this trip" required>
          <input
            className={inputClass}
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. Toey"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {firstTime ? "Use my name" : "Cancel"}
          </Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
