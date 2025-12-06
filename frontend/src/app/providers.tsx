"use client";

import { AccessibilityProvider } from "../context/AccessibilityContext";
import { IncidentProvider } from "../context/IncidentContext";
import { SessionProvider } from "../context/SessionContext";
import { ThemeController } from "../theme/ThemeController";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider>
      <ThemeController />
      <SessionProvider>
        <IncidentProvider>{children}</IncidentProvider>
      </SessionProvider>
    </AccessibilityProvider>
  );
}
