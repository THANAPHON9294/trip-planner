"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, "display_name" | "avatar_url">>) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Best-effort display name from Google metadata. */
function nameFromUser(user: User): string {
  const m = user.user_metadata ?? {};
  return (
    (m.full_name as string) ||
    (m.name as string) ||
    (user.email ? user.email.split("@")[0] : "") ||
    "Traveler"
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Make sure a profile row exists for this user; seed it from Google metadata.
  const ensureProfile = useCallback(async (user: User) => {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (existing) {
      setProfile(existing as Profile);
      return;
    }
    const seed = {
      id: user.id,
      display_name: nameFromUser(user),
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    };
    const { data } = await supabase.from("profiles").upsert(seed).select().single();
    setProfile((data as Profile) ?? seed);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await ensureProfile(data.session.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      if (sess?.user) await ensureProfile(sess.user);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [ensureProfile]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", session.user.id)
        .select()
        .single();
      if (data) setProfile(data as Profile);
    },
    [session],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signInWithGoogle,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
