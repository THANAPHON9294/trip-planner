"use client";

import { useEffect, useState } from "react";
import { Modal, Field, inputClass, Button } from "./ui";
import { useAuth } from "@/lib/auth";

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(profile?.display_name ?? "");
      setAvatar(profile?.avatar_url ?? "");
    }
  }, [open, profile]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ display_name: name.trim() || "Traveler", avatar_url: avatar.trim() || null });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Your profile">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-river-soft text-xl font-semibold text-river">
              {(name || "T").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{name || "Traveler"}</p>
            <p className="truncate text-xs text-ink-soft">{user?.email}</p>
          </div>
        </div>

        <Field label="Display name" hint="This is how you appear on trips you join.">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Avatar URL" hint="Optional. Defaults to your Google picture.">
          <input className={inputClass} value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
