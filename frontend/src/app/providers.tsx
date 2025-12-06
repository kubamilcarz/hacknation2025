"use client";

import { AccessibilityProvider } from "../context/AccessibilityContext";
import { ThemeController } from "../theme/ThemeController";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider>
      <ThemeController />
      {children}
    </AccessibilityProvider>
  );
}
