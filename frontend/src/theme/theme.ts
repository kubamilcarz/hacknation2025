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
    "--color-background": "#E6EEF8",
    "--color-surface": "#FFFFFF",
    "--color-surface-subdued": "#F3F7FC",
    "--color-surface-elevated": "#FFFFFF",
    "--color-divider": "#E3E5E8",
    "--color-border": "#E3E5E8",
    "--color-border-strong": "#C7CCD4",
    "--color-text-primary": "#1A1A1A",
    "--color-text-secondary": "#5E6A73",
    "--color-text-muted": "#9AA5B1",
    "--color-accent": "#003A8F",
    "--color-accent-strong": "#002C6B",
    "--color-accent-soft": "rgba(0, 58, 143, 0.12)",
    "--color-accent-text": "#FFFFFF",
    "--color-focus-ring": "rgba(0, 58, 143, 0.55)",
    "--color-toolbar-background": "rgba(255, 255, 255, 0.94)",
    "--color-toolbar-border": "rgba(227, 229, 232, 0.9)",
    "--color-toolbar-foreground": "#1A1A1A",
    "--color-toolbar-muted": "#5E6A73",
    "--color-toolbar-hover": "rgba(0, 58, 143, 0.08)",
    "--color-toolbar-active": "rgba(0, 58, 143, 0.12)",
    "--color-toolbar-selection": "rgba(0, 58, 143, 0.16)",
    "--color-toolbar-selection-muted": "rgba(0, 58, 143, 0.06)",
    "--color-toolbar-selection-soft": "rgba(255, 255, 255, 0.82)",
    "--color-input": "#FFFFFF",
    "--color-success": "#2E7D32",
    "--color-success-soft": "rgba(46, 125, 50, 0.12)",
    "--color-warning": "#ED6C02",
    "--color-warning-soft": "rgba(237, 108, 2, 0.12)",
    "--color-error": "#C62828",
    "--color-error-soft": "rgba(198, 40, 40, 0.12)",
    "--color-info": "#0288D1",
    "--color-info-soft": "rgba(2, 136, 209, 0.12)",
    "--color-support": "#6BA539",
    "--color-support-strong": "#4F7E2C",
    "--color-support-soft": "rgba(107, 165, 57, 0.18)",
    "--color-support-text": "#FFFFFF",
    "--shadow-card": "0 24px 60px -32px rgba(0, 28, 72, 0.24)",
    "--shadow-popover": "0 22px 45px -30px rgba(0, 28, 72, 0.3)",
    "--shadow-toolbar": "0 18px 48px -32px rgba(0, 28, 72, 0.28)",
    "--shadow-toolbar-strong": "0 24px 56px -30px rgba(0, 58, 143, 0.32)",
    "--line-height-base": "1.65",
  },
  dark: {
    "--color-background": "#0D1B2A",
    "--color-surface": "#13273E",
    "--color-surface-subdued": "#1A3450",
    "--color-surface-elevated": "#1F3F5E",
    "--color-divider": "rgba(227, 229, 232, 0.14)",
    "--color-border": "rgba(227, 229, 232, 0.2)",
    "--color-border-strong": "rgba(227, 229, 232, 0.32)",
    "--color-text-primary": "#F5F7FA",
    "--color-text-secondary": "#C6D4E4",
    "--color-text-muted": "#9FB1C7",
    "--color-accent": "#4A8BE4",
    "--color-accent-strong": "#326CC0",
    "--color-accent-soft": "rgba(74, 139, 228, 0.24)",
    "--color-accent-text": "#F5F9FF",
    "--color-focus-ring": "rgba(74, 139, 228, 0.6)",
    "--color-toolbar-background": "rgba(19, 39, 62, 0.94)",
    "--color-toolbar-border": "rgba(227, 229, 232, 0.24)",
    "--color-toolbar-foreground": "#F5F7FA",
    "--color-toolbar-muted": "#9FB1C7",
    "--color-toolbar-hover": "rgba(74, 139, 228, 0.18)",
    "--color-toolbar-active": "rgba(74, 139, 228, 0.24)",
    "--color-toolbar-selection": "rgba(74, 139, 228, 0.28)",
    "--color-toolbar-selection-muted": "rgba(74, 139, 228, 0.16)",
    "--color-toolbar-selection-soft": "rgba(19, 39, 62, 0.78)",
    "--color-input": "#13273E",
    "--color-success": "#5DBA6B",
    "--color-success-soft": "rgba(93, 186, 107, 0.2)",
    "--color-warning": "#FFB547",
    "--color-warning-soft": "rgba(255, 181, 71, 0.22)",
    "--color-error": "#F26D6D",
    "--color-error-soft": "rgba(242, 109, 109, 0.2)",
    "--color-info": "#62B9F3",
    "--color-info-soft": "rgba(98, 185, 243, 0.22)",
    "--color-support": "#8BCB63",
    "--color-support-strong": "#6BA539",
    "--color-support-soft": "rgba(139, 203, 99, 0.22)",
    "--color-support-text": "#0D1B2A",
    "--shadow-card": "0 24px 60px -32px rgba(1, 8, 20, 0.6)",
    "--shadow-popover": "0 22px 45px -30px rgba(1, 8, 20, 0.55)",
    "--shadow-toolbar": "0 18px 48px -32px rgba(1, 8, 20, 0.62)",
    "--shadow-toolbar-strong": "0 24px 56px -28px rgba(74, 139, 228, 0.38)",
    "--line-height-base": "1.7",
  },
};

const HIGH_CONTRAST_OVERRIDES: Record<ThemeVariant, Partial<ThemeTokens>> = {
  light: {
    "--color-background": "#FFFFFF",
    "--color-surface": "#FFFFFF",
    "--color-surface-subdued": "#F5F8FF",
    "--color-surface-elevated": "#FFFFFF",
    "--color-divider": "#003A8F",
    "--color-border": "#003A8F",
    "--color-border-strong": "#001F5C",
    "--color-text-primary": "#000000",
    "--color-text-secondary": "#1A1A1A",
    "--color-text-muted": "#2F3A44",
    "--color-accent": "#003A8F",
    "--color-accent-strong": "#002C6B",
    "--color-accent-soft": "rgba(0, 58, 143, 0.25)",
    "--color-accent-text": "#FFFFFF",
    "--color-focus-ring": "rgba(0, 58, 143, 0.85)",
    "--color-toolbar-background": "rgba(255, 255, 255, 0.98)",
    "--color-toolbar-border": "#003A8F",
    "--color-toolbar-foreground": "#000000",
    "--color-toolbar-muted": "#1A1A1A",
    "--color-toolbar-hover": "rgba(0, 58, 143, 0.18)",
    "--color-toolbar-active": "rgba(0, 58, 143, 0.26)",
    "--color-toolbar-selection": "rgba(0, 58, 143, 0.32)",
    "--color-toolbar-selection-muted": "rgba(0, 58, 143, 0.16)",
    "--color-toolbar-selection-soft": "rgba(255, 255, 255, 0.96)",
    "--color-input": "#FFFFFF",
    "--color-success": "#1E5E23",
    "--color-success-soft": "rgba(30, 94, 35, 0.3)",
    "--color-warning": "#B94A00",
    "--color-warning-soft": "rgba(185, 74, 0, 0.3)",
    "--color-error": "#8B1E1E",
    "--color-error-soft": "rgba(139, 30, 30, 0.3)",
    "--color-info": "#005E99",
    "--color-info-soft": "rgba(0, 94, 153, 0.3)",
    "--color-support": "#34581D",
    "--color-support-strong": "#254112",
    "--color-support-soft": "rgba(52, 88, 29, 0.35)",
    "--color-support-text": "#FFFFFF",
    "--shadow-card": "0 0 0 3px rgba(0, 58, 143, 0.85)",
    "--shadow-toolbar": "0 0 0 3px rgba(0, 58, 143, 0.85)",
    "--shadow-toolbar-strong": "0 0 0 3px rgba(0, 58, 143, 0.85)",
  },
  dark: {
    "--color-background": "#000000",
    "--color-surface": "#020A16",
    "--color-surface-subdued": "#041832",
    "--color-surface-elevated": "#052142",
    "--color-divider": "rgba(229, 234, 242, 0.85)",
    "--color-border": "rgba(229, 234, 242, 0.92)",
    "--color-border-strong": "#E5EAF2",
    "--color-text-primary": "#FFFFFF",
    "--color-text-secondary": "#F5F7FA",
    "--color-text-muted": "#E1E7EF",
    "--color-accent": "#4A8BE4",
    "--color-accent-strong": "#326CC0",
    "--color-accent-soft": "rgba(74, 139, 228, 0.4)",
    "--color-accent-text": "#041832",
    "--color-focus-ring": "rgba(229, 234, 242, 0.9)",
    "--color-toolbar-background": "rgba(4, 30, 58, 0.95)",
    "--color-toolbar-border": "rgba(229, 234, 242, 0.85)",
    "--color-toolbar-foreground": "#FFFFFF",
    "--color-toolbar-muted": "#F5F7FA",
    "--color-toolbar-hover": "rgba(229, 234, 242, 0.28)",
    "--color-toolbar-active": "rgba(229, 234, 242, 0.34)",
    "--color-toolbar-selection": "rgba(229, 234, 242, 0.4)",
    "--color-toolbar-selection-muted": "rgba(229, 234, 242, 0.22)",
    "--color-toolbar-selection-soft": "rgba(4, 24, 46, 0.82)",
    "--color-input": "#041832",
    "--color-success": "#6FDB7E",
    "--color-success-soft": "rgba(111, 219, 126, 0.4)",
    "--color-warning": "#FFCB74",
    "--color-warning-soft": "rgba(255, 203, 116, 0.4)",
    "--color-error": "#FFA1A1",
    "--color-error-soft": "rgba(255, 161, 161, 0.4)",
    "--color-info": "#7CD3FF",
    "--color-info-soft": "rgba(124, 211, 255, 0.4)",
    "--color-support": "#A4E782",
    "--color-support-strong": "#6BA539",
    "--color-support-soft": "rgba(164, 231, 130, 0.4)",
    "--color-support-text": "#020A16",
    "--shadow-card": "0 0 0 3px rgba(229, 234, 242, 0.9)",
    "--shadow-toolbar": "0 0 0 3px rgba(229, 234, 242, 0.9)",
    "--shadow-toolbar-strong": "0 0 0 3px rgba(74, 139, 228, 0.9)",
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
    "--color-toolbar-hover": "rgba(255, 232, 0, 0.24)",
    "--color-toolbar-active": "rgba(255, 232, 0, 0.32)",
    "--color-toolbar-selection": "rgba(255, 232, 0, 0.36)",
    "--color-toolbar-selection-muted": "rgba(255, 232, 0, 0.18)",
    "--color-toolbar-selection-soft": "rgba(0, 0, 0, 0.78)",
    "--color-input": "#000000",
    "--color-success": "#ffe800",
    "--color-success-soft": "rgba(255, 232, 0, 0.2)",
    "--color-warning": "#ffe800",
    "--color-warning-soft": "rgba(255, 232, 0, 0.2)",
    "--color-error": "#ffe800",
    "--color-error-soft": "rgba(255, 232, 0, 0.2)",
    "--color-info": "#ffe800",
    "--color-info-soft": "rgba(255, 232, 0, 0.2)",
    "--color-support": "#ffe800",
    "--color-support-strong": "#facc15",
    "--color-support-soft": "rgba(255, 232, 0, 0.2)",
    "--color-support-text": "#000000",
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
    "--color-toolbar-hover": "rgba(255, 232, 0, 0.24)",
    "--color-toolbar-active": "rgba(255, 232, 0, 0.32)",
    "--color-toolbar-selection": "rgba(255, 232, 0, 0.36)",
    "--color-toolbar-selection-muted": "rgba(255, 232, 0, 0.18)",
    "--color-toolbar-selection-soft": "rgba(0, 0, 0, 0.78)",
    "--color-input": "#000000",
    "--color-success": "#ffe800",
    "--color-success-soft": "rgba(255, 232, 0, 0.2)",
    "--color-warning": "#ffe800",
    "--color-warning-soft": "rgba(255, 232, 0, 0.2)",
    "--color-error": "#ffe800",
    "--color-error-soft": "rgba(255, 232, 0, 0.2)",
    "--color-info": "#ffe800",
    "--color-info-soft": "rgba(255, 232, 0, 0.2)",
    "--color-support": "#ffe800",
    "--color-support-strong": "#facc15",
    "--color-support-soft": "rgba(255, 232, 0, 0.2)",
    "--color-support-text": "#000000",
    "--shadow-card": "0 0 0 3px rgba(255, 232, 0, 0.9)",
    "--shadow-toolbar": "0 0 0 3px rgba(255, 232, 0, 0.85)",
    "--shadow-toolbar-strong": "0 0 0 3px rgba(255, 232, 0, 0.95)",
  },
};

const LOW_CONTRAST_OVERRIDES: Record<ThemeVariant, Partial<ThemeTokens>> = {
  light: {
    "--color-divider": "rgba(227, 229, 232, 0.1)",
    "--color-border": "rgba(227, 229, 232, 0.16)",
    "--color-border-strong": "rgba(27, 40, 63, 0.12)",
    "--color-text-primary": "#2A3238",
    "--color-text-secondary": "#6B7680",
    "--color-text-muted": "#A6B2BC",
    "--color-accent": "#1D5BB5",
    "--color-accent-strong": "#17478C",
    "--color-accent-soft": "rgba(29, 91, 181, 0.1)",
    "--color-toolbar-hover": "rgba(29, 91, 181, 0.08)",
    "--color-toolbar-active": "rgba(29, 91, 181, 0.12)",
    "--color-toolbar-selection": "rgba(29, 91, 181, 0.16)",
    "--color-toolbar-selection-muted": "rgba(29, 91, 181, 0.05)",
    "--color-toolbar-selection-soft": "rgba(255, 255, 255, 0.82)",
    "--color-success": "#4B8E50",
    "--color-success-soft": "rgba(75, 142, 80, 0.12)",
    "--color-warning": "#D87316",
    "--color-warning-soft": "rgba(216, 115, 22, 0.12)",
    "--color-error": "#C94C4C",
    "--color-error-soft": "rgba(201, 76, 76, 0.12)",
    "--color-info": "#1F8FCC",
    "--color-info-soft": "rgba(31, 143, 204, 0.12)",
    "--color-support": "#5F9540",
    "--color-support-strong": "#4F7E2C",
    "--color-support-soft": "rgba(95, 149, 64, 0.14)",
    "--color-support-text": "#FFFFFF",
    "--shadow-card": "0 18px 42px -28px rgba(0, 28, 72, 0.18)",
    "--shadow-toolbar": "0 14px 30px -26px rgba(0, 28, 72, 0.2)",
    "--shadow-toolbar-strong": "0 18px 40px -24px rgba(0, 58, 143, 0.24)",
  },
  dark: {
    "--color-divider": "rgba(227, 229, 232, 0.18)",
    "--color-border": "rgba(227, 229, 232, 0.2)",
    "--color-border-strong": "rgba(227, 229, 232, 0.28)",
    "--color-text-primary": "#BFD2E6",
    "--color-text-secondary": "#9EB4D0",
    "--color-text-muted": "#7F95B3",
    "--color-accent": "#3E7BD1",
    "--color-accent-strong": "#2F61A5",
    "--color-accent-soft": "rgba(62, 123, 209, 0.18)",
    "--color-toolbar-hover": "rgba(62, 123, 209, 0.16)",
    "--color-toolbar-active": "rgba(62, 123, 209, 0.22)",
    "--color-toolbar-selection": "rgba(62, 123, 209, 0.26)",
    "--color-toolbar-selection-muted": "rgba(62, 123, 209, 0.12)",
    "--color-toolbar-selection-soft": "rgba(19, 39, 62, 0.78)",
    "--color-success": "#56B36C",
    "--color-success-soft": "rgba(86, 179, 108, 0.18)",
    "--color-warning": "#F1A854",
    "--color-warning-soft": "rgba(241, 168, 84, 0.18)",
    "--color-error": "#E96F6F",
    "--color-error-soft": "rgba(233, 111, 111, 0.18)",
    "--color-info": "#5AAEDD",
    "--color-info-soft": "rgba(90, 174, 221, 0.18)",
    "--color-support": "#7DC863",
    "--color-support-strong": "#6BA539",
    "--color-support-soft": "rgba(125, 200, 99, 0.18)",
    "--color-support-text": "#0D1B2A",
    "--shadow-card": "0 18px 42px -28px rgba(1, 8, 20, 0.5)",
    "--shadow-toolbar": "0 14px 30px -26px rgba(1, 8, 20, 0.55)",
    "--shadow-toolbar-strong": "0 18px 40px -24px rgba(74, 139, 228, 0.3)",
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
