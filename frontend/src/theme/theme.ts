import { type AppearanceSetting, type ContrastSetting } from "../context/AccessibilityContext";

export type ThemeVariant = "light" | "dark";

export type ThemeTokens = Record<string, string>;

function mergeTokens(base: ThemeTokens, overrides: Partial<ThemeTokens>): ThemeTokens {
  const result: ThemeTokens = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}

const BASE_TOKENS: Record<ThemeVariant, ThemeTokens> = {
  light: {
    "--color-background": "#f8fafc",
    "--color-surface": "#ffffff",
    "--color-surface-subdued": "#f1f5f9",
    "--color-surface-elevated": "#fefefe",
    "--color-divider": "rgba(148, 163, 184, 0.28)",
    "--color-border": "rgba(148, 163, 184, 0.35)",
    "--color-border-strong": "rgba(51, 65, 85, 0.25)",
    "--color-text-primary": "#0f172a",
    "--color-text-secondary": "#334155",
    "--color-text-muted": "#64748b",
    "--color-accent": "#10b981",
    "--color-accent-strong": "#047857",
    "--color-accent-soft": "rgba(16, 185, 129, 0.14)",
    "--color-accent-text": "#ecfdf5",
    "--color-focus-ring": "rgba(16, 185, 129, 0.55)",
    "--color-toolbar-background": "rgba(255, 255, 255, 0.92)",
    "--color-toolbar-border": "rgba(148, 163, 184, 0.45)",
    "--color-toolbar-foreground": "#0f172a",
    "--color-toolbar-muted": "#475569",
    "--shadow-card": "0 24px 60px -32px rgba(15, 23, 42, 0.25)",
    "--shadow-popover": "0 22px 45px -30px rgba(15, 23, 42, 0.35)",
    "--shadow-toolbar": "0 18px 48px -32px rgba(15, 23, 42, 0.32)",
    "--shadow-toolbar-strong": "0 24px 56px -30px rgba(16, 185, 129, 0.35)",
    "--line-height-base": "1.65",
  },
  dark: {
    "--color-background": "#0b1120",
    "--color-surface": "#111827",
    "--color-surface-subdued": "#1e293b",
    "--color-surface-elevated": "#1f2937",
    "--color-divider": "rgba(71, 85, 105, 0.4)",
    "--color-border": "rgba(71, 85, 105, 0.45)",
    "--color-border-strong": "rgba(148, 163, 184, 0.62)",
    "--color-text-primary": "#e2e8f0",
    "--color-text-secondary": "#cbd5f5",
    "--color-text-muted": "#94a3b8",
    "--color-accent": "#34d399",
    "--color-accent-strong": "#22c55e",
    "--color-accent-soft": "rgba(52, 211, 153, 0.18)",
    "--color-accent-text": "#042f1a",
    "--color-focus-ring": "rgba(52, 211, 153, 0.6)",
    "--color-toolbar-background": "rgba(17, 24, 39, 0.88)",
    "--color-toolbar-border": "rgba(148, 163, 184, 0.35)",
    "--color-toolbar-foreground": "#e2e8f0",
    "--color-toolbar-muted": "#94a3b8",
    "--shadow-card": "0 24px 60px -32px rgba(2, 6, 23, 0.65)",
    "--shadow-popover": "0 22px 45px -30px rgba(15, 23, 42, 0.55)",
    "--shadow-toolbar": "0 18px 48px -32px rgba(2, 6, 23, 0.68)",
    "--shadow-toolbar-strong": "0 24px 56px -28px rgba(52, 211, 153, 0.38)",
    "--line-height-base": "1.7",
  },
};

const HIGH_CONTRAST_OVERRIDES: Record<ThemeVariant, Partial<ThemeTokens>> = {
  light: {
    "--color-background": "#ffffff",
    "--color-surface": "#ffffff",
    "--color-surface-subdued": "#fafafa",
    "--color-surface-elevated": "#ffffff",
    "--color-divider": "rgba(15, 23, 42, 0.7)",
    "--color-border": "rgba(15, 23, 42, 0.9)",
    "--color-border-strong": "rgba(15, 23, 42, 1)",
    "--color-text-primary": "#000000",
    "--color-text-secondary": "#0f172a",
    "--color-text-muted": "#1f2937",
    "--color-accent": "#1d4ed8",
    "--color-accent-strong": "#1e40af",
    "--color-accent-soft": "rgba(29, 78, 216, 0.18)",
    "--color-accent-text": "#eef2ff",
    "--color-focus-ring": "rgba(15, 23, 42, 0.85)",
    "--color-toolbar-background": "rgba(255, 255, 255, 0.96)",
    "--color-toolbar-border": "rgba(15, 23, 42, 0.75)",
    "--color-toolbar-foreground": "#0f172a",
    "--color-toolbar-muted": "#1f2937",
    "--shadow-card": "0 0 0 3px rgba(15, 23, 42, 0.9)",
    "--shadow-toolbar": "0 0 0 3px rgba(15, 23, 42, 0.85)",
    "--shadow-toolbar-strong": "0 0 0 3px rgba(29, 78, 216, 0.8)",
  },
  dark: {
    "--color-background": "#000000",
    "--color-surface": "#020617",
    "--color-surface-subdued": "#0f172a",
    "--color-surface-elevated": "#111827",
    "--color-divider": "rgba(226, 232, 240, 0.75)",
    "--color-border": "rgba(226, 232, 240, 0.85)",
    "--color-border-strong": "rgba(226, 232, 240, 1)",
    "--color-text-primary": "#ffffff",
    "--color-text-secondary": "#f1f5f9",
    "--color-text-muted": "#e2e8f0",
    "--color-accent": "#38bdf8",
    "--color-accent-strong": "#0ea5e9",
    "--color-accent-soft": "rgba(14, 165, 233, 0.22)",
    "--color-accent-text": "#082f49",
    "--color-focus-ring": "rgba(226, 232, 240, 0.85)",
    "--color-toolbar-background": "rgba(15, 23, 42, 0.92)",
    "--color-toolbar-border": "rgba(226, 232, 240, 0.7)",
    "--color-toolbar-foreground": "#f8fafc",
    "--color-toolbar-muted": "#e2e8f0",
    "--shadow-card": "0 0 0 3px rgba(226, 232, 240, 0.85)",
    "--shadow-toolbar": "0 0 0 3px rgba(226, 232, 240, 0.75)",
    "--shadow-toolbar-strong": "0 0 0 3px rgba(56, 189, 248, 0.7)",
  },
};

const BLACK_YELLOW_CONTRAST_OVERRIDES: Record<ThemeVariant, Partial<ThemeTokens>> = {
  light: {
    "--color-background": "#000000",
    "--color-surface": "#000000",
    "--color-surface-subdued": "#111111",
    "--color-surface-elevated": "#111111",
    "--color-divider": "rgba(255, 232, 0, 0.9)",
    "--color-border": "rgba(255, 232, 0, 0.95)",
    "--color-border-strong": "#ffe800",
    "--color-text-primary": "#ffe800",
    "--color-text-secondary": "#fff8b0",
    "--color-text-muted": "#facc15",
    "--color-accent": "#ffe800",
    "--color-accent-strong": "#facc15",
    "--color-accent-soft": "rgba(255, 232, 0, 0.2)",
    "--color-accent-text": "#000000",
    "--color-focus-ring": "rgba(255, 232, 0, 0.95)",
    "--color-toolbar-background": "rgba(0, 0, 0, 0.94)",
    "--color-toolbar-border": "rgba(255, 232, 0, 0.85)",
    "--color-toolbar-foreground": "#ffe800",
    "--color-toolbar-muted": "#facc15",
    "--shadow-card": "0 0 0 3px rgba(255, 232, 0, 0.9)",
    "--shadow-toolbar": "0 0 0 3px rgba(255, 232, 0, 0.85)",
    "--shadow-toolbar-strong": "0 0 0 3px rgba(255, 232, 0, 0.95)",
  },
  dark: {
    "--color-background": "#000000",
    "--color-surface": "#000000",
    "--color-surface-subdued": "#111111",
    "--color-surface-elevated": "#111111",
    "--color-divider": "rgba(255, 232, 0, 0.9)",
    "--color-border": "rgba(255, 232, 0, 0.95)",
    "--color-border-strong": "#ffe800",
    "--color-text-primary": "#ffe800",
    "--color-text-secondary": "#fff8b0",
    "--color-text-muted": "#facc15",
    "--color-accent": "#ffe800",
    "--color-accent-strong": "#facc15",
    "--color-accent-soft": "rgba(255, 232, 0, 0.2)",
    "--color-accent-text": "#000000",
    "--color-focus-ring": "rgba(255, 232, 0, 0.95)",
    "--color-toolbar-background": "rgba(0, 0, 0, 0.94)",
    "--color-toolbar-border": "rgba(255, 232, 0, 0.85)",
    "--color-toolbar-foreground": "#ffe800",
    "--color-toolbar-muted": "#facc15",
    "--shadow-card": "0 0 0 3px rgba(255, 232, 0, 0.9)",
    "--shadow-toolbar": "0 0 0 3px rgba(255, 232, 0, 0.85)",
    "--shadow-toolbar-strong": "0 0 0 3px rgba(255, 232, 0, 0.95)",
  },
};

const LOW_CONTRAST_OVERRIDES: Record<ThemeVariant, Partial<ThemeTokens>> = {
  light: {
    "--color-divider": "rgba(148, 163, 184, 0.12)",
    "--color-border": "rgba(148, 163, 184, 0.18)",
    "--color-border-strong": "rgba(51, 65, 85, 0.15)",
    "--color-text-primary": "#1e293b",
    "--color-text-secondary": "#475569",
    "--color-text-muted": "#94a3b8",
    "--color-accent": "#22c55e",
    "--color-accent-strong": "#16a34a",
    "--color-accent-soft": "rgba(34, 197, 94, 0.12)",
    "--shadow-card": "0 18px 42px -28px rgba(15, 23, 42, 0.18)",
    "--shadow-toolbar": "0 14px 30px -26px rgba(15, 23, 42, 0.22)",
    "--shadow-toolbar-strong": "0 18px 40px -24px rgba(34, 197, 94, 0.28)",
  },
  dark: {
    "--color-divider": "rgba(71, 85, 105, 0.28)",
    "--color-border": "rgba(71, 85, 105, 0.32)",
    "--color-border-strong": "rgba(148, 163, 184, 0.48)",
    "--color-text-primary": "#cbd5f5",
    "--color-text-secondary": "#a5b4fc",
    "--color-text-muted": "#94a3b8",
    "--color-accent": "#4ade80",
    "--color-accent-strong": "#22c55e",
    "--color-accent-soft": "rgba(74, 222, 128, 0.18)",
    "--shadow-card": "0 18px 42px -28px rgba(2, 6, 23, 0.55)",
    "--shadow-toolbar": "0 14px 30px -26px rgba(2, 6, 23, 0.6)",
    "--shadow-toolbar-strong": "0 18px 40px -24px rgba(74, 222, 128, 0.32)",
  },
};

const FONT_SCALE_STEP = 0.12;

function computeFontTokens(fontScale: number, scheme: ThemeVariant): ThemeTokens {
  const multiplier = 1 + fontScale * FONT_SCALE_STEP;
  const clampMultiplier = Math.min(1.5, Math.max(0.75, multiplier));

  const base = 16 * clampMultiplier;
  const sm = 14 * clampMultiplier;
  const lg = 18 * clampMultiplier;
  const xl = 20 * clampMultiplier;

  const defaultLineHeight = parseFloat(BASE_TOKENS[scheme]["--line-height-base"]) || 1.65;
  const lineHeight = (defaultLineHeight + fontScale * 0.05).toFixed(2);

  return {
    "--font-size-root": `${base.toFixed(2)}px`,
    "--font-size-sm": `${sm.toFixed(2)}px`,
    "--font-size-lg": `${lg.toFixed(2)}px`,
    "--font-size-xl": `${xl.toFixed(2)}px`,
    "--line-height-base": lineHeight,
  };
}

function applyContrastOverrides(scheme: ThemeVariant, contrast: ContrastSetting, tokens: ThemeTokens): ThemeTokens {
  if (contrast === "normal") {
    return tokens;
  }

  if (contrast === "high") {
    return mergeTokens(tokens, HIGH_CONTRAST_OVERRIDES[scheme]);
  }

  if (contrast === "blackYellow") {
    return mergeTokens(tokens, BLACK_YELLOW_CONTRAST_OVERRIDES[scheme]);
  }

  return mergeTokens(tokens, LOW_CONTRAST_OVERRIDES[scheme]);
}

export function buildThemeTokens(
  scheme: ThemeVariant,
  contrast: ContrastSetting,
  fontScale: number,
  appearance: AppearanceSetting
): ThemeTokens {
  const base = { ...BASE_TOKENS[scheme] };
  const withContrast = applyContrastOverrides(scheme, contrast, base);
  const fontTokens = computeFontTokens(fontScale, scheme);

  const resolvedScheme = appearance === "auto" ? scheme : (appearance as ThemeVariant);

  return {
    ...withContrast,
    ...fontTokens,
    "--theme-appearance": resolvedScheme,
    "--theme-contrast": contrast,
  };
}

export function resolveThemeVariant(
  appearance: AppearanceSetting,
  systemPreference: ThemeVariant
): ThemeVariant {
  if (appearance === "auto") {
    return systemPreference;
  }
  return appearance;
}
