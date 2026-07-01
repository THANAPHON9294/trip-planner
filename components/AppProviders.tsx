"use client";

import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "./AuthGate";
import { ConfirmProvider } from "./ConfirmProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <AuthGate>{children}</AuthGate>
      </ConfirmProvider>
    </AuthProvider>
  );
}
