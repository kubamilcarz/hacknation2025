"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ContrastSetting = "normal" | "high" | "low" | "blackYellow";
export type AppearanceSetting = "auto" | "light" | "dark";

export type AccessibilityState = {
  contrast: ContrastSetting;
  appearance: AppearanceSetting;
  fontScale: number;
};

type AccessibilityContextValue = AccessibilityState & {
  setContrast: (value: ContrastSetting) => void;
  setAppearance: (value: AppearanceSetting) => void;
  increaseFont: () => void;
  decreaseFont: () => void;
  reset: () => void;
};

const defaultState: AccessibilityState = {
  contrast: "normal",
  appearance: "auto",
  fontScale: 0,
};

const STORAGE_KEY = "zant-accessibility-preferences";

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(
  undefined
);

function clampFontScale(value: number) {
  return Math.min(3, Math.max(-2, value));
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(defaultState);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AccessibilityState>;
        setState((prev) => ({
          contrast: parsed.contrast ?? prev.contrast,
          appearance: parsed.appearance ?? prev.appearance,
          fontScale: clampFontScale(parsed.fontScale ?? prev.fontScale),
        }));
      }
    } catch (error) {
      console.error("Failed to load accessibility preferences", error);
    } finally {
      hasHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated.current || typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to persist accessibility preferences", error);
    }
  }, [state]);

  const setContrast = useCallback((value: ContrastSetting) => {
    setState((prev) => ({ ...prev, contrast: value }));
  }, []);

  const setAppearance = useCallback((value: AppearanceSetting) => {
    setState((prev) => ({ ...prev, appearance: value }));
  }, []);

  const increaseFont = useCallback(() => {
    setState((prev) => ({ ...prev, fontScale: clampFontScale(prev.fontScale + 1) }));
  }, []);

  const decreaseFont = useCallback(() => {
    setState((prev) => ({ ...prev, fontScale: clampFontScale(prev.fontScale - 1) }));
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...state,
      setContrast,
      setAppearance,
      increaseFont,
      decreaseFont,
      reset,
    }),
    [state, setContrast, setAppearance, increaseFont, decreaseFont, reset]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}

export function getDefaultAccessibilityState(): AccessibilityState {
  return defaultState;
}
