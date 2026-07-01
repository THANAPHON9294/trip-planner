"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ProfileModal } from "./ProfileModal";

export function AccountMenu() {
  const { profile, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const name = profile?.display_name ?? "Traveler";
  const avatar = profile?.avatar_url;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-2.5 text-sm shadow-sm hover:border-river"
        aria-label="Account menu"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-river-soft text-xs font-semibold text-river">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate font-medium sm:block">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-[900] mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-ink-soft">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              setProfileOpen(true);
              setOpen(false);
            }}
            className="block w-full px-4 py-2.5 text-left text-sm hover:bg-river-soft"
          >
            Edit profile
          </button>
          <button
            onClick={() => signOut()}
            className="block w-full px-4 py-2.5 text-left text-sm text-coral hover:bg-coral-soft"
          >
            Sign out
          </button>
        </div>
      )}

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
