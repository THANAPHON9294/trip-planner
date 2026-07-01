"use client";

import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "./AuthGate";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
