"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface SessionContextValue {
  sessionUserId: string | null;
  isSessionUserReady: boolean;
  setSessionUserId: (id: string) => void;
  resetSessionUserId: () => string;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "zn-session-user-id";

const generateSessionUserId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `emp-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
  }

  const fallbackRandom = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `EMP-${fallbackRandom}`;
};

const getInitialSessionUserId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.sessionStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = generateSessionUserId();
  window.sessionStorage.setItem(STORAGE_KEY, generated);
  return generated;
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionUserId, setSessionUserIdState] = useState<string | null>(getInitialSessionUserId);
  const isSessionUserReady = sessionUserId !== null;

  const setSessionUserId = useCallback((id: string) => {
    if (typeof window === "undefined") {
      setSessionUserIdState(id);
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, id);
    setSessionUserIdState(id);
  }, []);

  const resetSessionUserId = useCallback(() => {
    const nextId = generateSessionUserId();
    setSessionUserId(nextId);
    return nextId;
  }, [setSessionUserId]);

  const value = useMemo<SessionContextValue>(
    () => ({
      sessionUserId,
      isSessionUserReady,
      setSessionUserId,
      resetSessionUserId,
    }),
    [sessionUserId, isSessionUserReady, setSessionUserId, resetSessionUserId]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
