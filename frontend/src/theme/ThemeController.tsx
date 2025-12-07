"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import { buildThemeTokens, resolveThemeVariant, type ThemeVariant } from "./theme";

function getSystemPreference(): ThemeVariant {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeController() {
  const { appearance, contrast, fontScale } = useAccessibility();
  const [systemPreference, setSystemPreference] = useState<ThemeVariant>(getSystemPreference);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches ? "dark" : "light");
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const themeVariant = useMemo(
    () => resolveThemeVariant(appearance, systemPreference),
    [appearance, systemPreference]
  );

  const tokens = useMemo(
    () => buildThemeTokens(themeVariant, contrast, fontScale, appearance),
    [themeVariant, contrast, fontScale, appearance]
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;

    root.dataset.theme = themeVariant;
    root.dataset.contrast = contrast;

    Object.entries(tokens).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
  }, [tokens, themeVariant, contrast]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.style.setProperty("color-scheme", themeVariant);
  }, [themeVariant]);

  return null;
}
