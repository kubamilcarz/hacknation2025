"use client";

import { AccessibilityProvider } from "../context/AccessibilityContext";
import { IncidentProvider } from "../context/IncidentContext";
import { ThemeController } from "../theme/ThemeController";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider>
      <ThemeController />
      <IncidentProvider>{children}</IncidentProvider>
    </AccessibilityProvider>
  );
}
