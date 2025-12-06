"use client";

import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type AppearanceSetting,
  type ContrastSetting,
  useAccessibility,
} from "../context/AccessibilityContext";

type DropdownKey = "contrast" | "font" | "appearance";

const contrastOptions: Array<{ label: string; value: ContrastSetting }> = [
  { label: "Standardowy", value: "normal" },
  { label: "Wysoki kontrast", value: "high" },
  { label: "Niski kontrast", value: "low" },
  { label: "Czarno-żółty", value: "blackYellow" },
];

const contrastSwatches: Record<ContrastSetting, CSSProperties> = {
  normal: {
    backgroundImage: "linear-gradient(90deg, #e2e8f0 0%, #cbd5f5 100%)",
  },
  high: {
    backgroundImage: "linear-gradient(90deg, #ffffff 0%, #0f172a 100%)",
  },
  low: {
    backgroundImage: "linear-gradient(90deg, #f8fafc 0%, #e2e8f0 100%)",
  },
  blackYellow: {
    backgroundImage: "linear-gradient(90deg, #000000 0%, #ffe800 100%)",
  },
};

const appearanceOptions: Array<{ label: string; value: AppearanceSetting }> = [
  { label: "Automatyczny", value: "auto" },
  { label: "Jasny", value: "light" },
  { label: "Ciemny", value: "dark" },
];

export default function AccessibilityToolbar() {
  const [openMenu, setOpenMenu] = useState<DropdownKey | null>(null);
  const { contrast, setContrast, appearance, setAppearance, fontScale, increaseFont, decreaseFont } =
    useAccessibility();
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  const dropdownStyles = useMemo(
    () =>
      "absolute right-0 top-full mt-2 w-48 rounded-lg border border-subtle bg-surface-elevated p-3 text-xs shadow-popover",
    []
  );

  const toggleMenu = (key: DropdownKey) => {
    setOpenMenu((current) => (current === key ? null : key));
  };

  const containerClassName = useMemo(() => {
    const base =
      "fixed top-6 right-6 z-50 flex items-center divide-x divide-subtle rounded-lg border bg-toolbar text-toolbar backdrop-blur-sm transition-all duration-200";
    const highlight = contrast !== "normal" || appearance !== "auto" || fontScale !== 0;
    return highlight
      ? `${base} border-(--color-accent-strong) shadow-toolbar-strong`
      : `${base} border-toolbar shadow-toolbar`;
  }, [appearance, contrast, fontScale]);

  return (
    <div
      ref={toolbarRef}
      className={containerClassName}
      role="presentation"
    >
      <ToolbarButton
        label="Kontrast"
        ariaLabel="Przełącz menu kontrastu"
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 21a9 9 0 1 0 0-18"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 3a9 9 0 0 0 0 18" fill="currentColor" />
          </svg>
        }
        isOpen={openMenu === "contrast"}
        isActive={contrast !== "normal"}
        onToggle={() => toggleMenu("contrast")}
        dropdown={
          openMenu === "contrast" && (
            <div className={dropdownStyles} role="menu" aria-label="Opcje kontrastu">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Kontrast</p>
              <div className="flex flex-col gap-1.5 text-xs">
                {contrastOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 font-medium transition focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1 ${contrast === option.value ? "bg-surface-subdued text-primary" : "text-secondary hover:bg-(--color-surface-subdued)"}`}
                    role="menuitemradio"
                    aria-label={`Ustaw kontrast na ${option.label}`}
                    aria-checked={contrast === option.value}
                    onClick={() => setContrast(option.value)}
                  >
                    {option.label}
                    <span
                      className="h-2 w-10 rounded-full"
                      style={contrastSwatches[option.value]}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          )
        }
      />

      <ToolbarButton
        label="Rozmiar tekstu"
        ariaLabel="Przełącz menu rozmiaru tekstu"
        icon={<span className="text-xs font-semibold" aria-hidden="true">Aa</span>}
        isOpen={openMenu === "font"}
        isActive={fontScale !== 0}
        onToggle={() => toggleMenu("font")}
        dropdown={
          openMenu === "font" && (
            <div className={dropdownStyles} role="menu" aria-label="Sterowanie rozmiarem tekstu">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Rozmiar tekstu</p>
              <div className="flex items-center justify-between gap-2 rounded-md border border-subtle bg-surface-subdued px-2 py-1.5">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-subtle text-base font-semibold text-secondary transition hover:bg-(--color-surface-subdued) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1"
                  aria-label="Zmniejsz rozmiar tekstu"
                  onClick={decreaseFont}
                >
                  -
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-primary">Aa</span>
                  <span className="text-[10px] text-muted">{fontScale === 0 ? "Domyślny" : `Poziom ${fontScale}`}</span>
                </div>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-subtle text-base font-semibold text-secondary transition hover:bg-(--color-surface-subdued) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1"
                  aria-label="Zwiększ rozmiar tekstu"
                  onClick={increaseFont}
                >
                  +
                </button>
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-muted">
                <p>Dostosuj rozmiar tekstu, aby poprawić czytelność.</p>
                <p>Zmiany zostaną zastosowane do tekstu interfejsu po włączeniu.</p>
              </div>
            </div>
          )
        }
      />

      <ToolbarButton
        label="Wygląd"
        ariaLabel="Przełącz menu motywu"
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path
              d="M12 2v2M12 20v2M4 12h2M18 12h2M5.64 5.64l1.42 1.42M18.36 5.64l-1.42 1.42M5.64 18.36l1.42-1.42M18.36 18.36l-1.42-1.42"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        }
        isOpen={openMenu === "appearance"}
        isActive={appearance !== "auto"}
        onToggle={() => toggleMenu("appearance")}
        dropdown={
          openMenu === "appearance" && (
            <div className={dropdownStyles} role="menu" aria-label="Opcje motywu">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Motyw</p>
              <div className="flex flex-col gap-1.5 text-xs">
                {appearanceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 font-medium transition focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1 ${appearance === option.value ? "bg-surface-subdued text-primary" : "text-secondary hover:bg-(--color-surface-subdued)"}`}
                    role="menuitemradio"
                    aria-checked={appearance === option.value}
                    aria-label={`Ustaw motyw na ${option.label}`}
                    onClick={() => setAppearance(option.value)}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-subtle bg-surface aspect-square"
                      aria-hidden="true"
                    >
                      {option.value === "auto" && (
                        <svg className="h-4 w-4 text-secondary" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M21 12a9 9 0 0 1-9 9V3a9 9 0 0 1 9 9Z"
                            fill="currentColor"
                            opacity="0.2"
                          />
                          <path
                            d="m8 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                      {option.value === "light" && (
                        <svg className="h-4 w-4 text-secondary" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                      {option.value === "dark" && (
                        <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 3a7 7 0 1 0 7 7A5 5 0 0 1 12 3Z"
                            fill="currentColor"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex flex-col text-left">
                      <span>{option.label}</span>
                      <span className="text-[11px] font-normal text-muted">
                        {option.value === "auto" && "Zgodnie z ustawieniami systemu"}
                        {option.value === "light" && "Jasne tło"}
                        {option.value === "dark" && "Przyjazny w słabym oświetleniu"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        }
      />
    </div>
  );
}

type ToolbarButtonProps = {
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
  dropdown: ReactNode;
};

function ToolbarButton({ label, ariaLabel, icon, isOpen, isActive, onToggle, dropdown }: ToolbarButtonProps) {
  return (
    <div className="relative">
      <button
        type="button"
        className={`flex h-11 w-12 items-center justify-center transition focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1 ${isOpen ? "bg-surface-subdued" : "bg-transparent"} ${isActive ? "text-(--color-accent-strong)" : "text-toolbar-muted hover:text-foreground"}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={onToggle}
      >
        <span className="sr-only">{label}</span>
        {icon}
      </button>
      {dropdown}
    </div>
  );
}
