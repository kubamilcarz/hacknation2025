"use client";

import { AccessibilityProvider } from "../context/AccessibilityContext";
import { DocumentProvider } from "../context/DocumentContext";
import { SessionProvider } from "../context/SessionContext";
import { ThemeController } from "../theme/ThemeController";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AccessibilityProvider>
      <ThemeController />
      <SessionProvider>
        <DocumentProvider>{children}</DocumentProvider>
      </SessionProvider>
    </AccessibilityProvider>
  );
}
