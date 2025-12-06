"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type AppearanceSetting,
  type ContrastSetting,
  useAccessibility,
} from "../context/AccessibilityContext";

type DropdownKey = "contrast" | "font" | "appearance";

const contrastOptions: Array<{ label: string; value: ContrastSetting }> = [
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Low", value: "low" },
];

const appearanceOptions: Array<{ label: string; value: AppearanceSetting }> = [
  { label: "Auto", value: "auto" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
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
        label="Contrast"
        ariaLabel="Toggle contrast menu"
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
            <div className={dropdownStyles} role="menu" aria-label="Contrast options">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Contrast</p>
              <div className="flex flex-col gap-1.5 text-xs">
                {contrastOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 font-medium transition focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1 ${contrast === option.value ? "bg-surface-subdued text-primary" : "text-secondary hover:bg-(--color-surface-subdued)"}`}
                    role="menuitemradio"
                    aria-label={`Set contrast to ${option.label}`}
                    aria-checked={contrast === option.value}
                    onClick={() => setContrast(option.value)}
                  >
                    {option.label}
                    <span className="h-2 w-10 rounded-full bg-linear-to-r from-gray-200 via-gray-300 to-gray-500" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )
        }
      />

      <ToolbarButton
        label="Font size"
        ariaLabel="Toggle font size menu"
        icon={<span className="text-xs font-semibold" aria-hidden="true">Aa</span>}
        isOpen={openMenu === "font"}
        isActive={fontScale !== 0}
        onToggle={() => toggleMenu("font")}
        dropdown={
          openMenu === "font" && (
            <div className={dropdownStyles} role="menu" aria-label="Font size controls">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Text size</p>
              <div className="flex items-center justify-between gap-2 rounded-md border border-subtle bg-surface-subdued px-2 py-1.5">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-subtle text-base font-semibold text-secondary transition hover:bg-(--color-surface-subdued) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1"
                  aria-label="Decrease text size"
                  onClick={decreaseFont}
                >
                  -
                </button>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-primary">Aa</span>
                  <span className="text-[10px] text-muted">{fontScale === 0 ? "Default" : `Level ${fontScale}`}</span>
                </div>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-subtle text-base font-semibold text-secondary transition hover:bg-(--color-surface-subdued) focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1"
                  aria-label="Increase text size"
                  onClick={increaseFont}
                >
                  +
                </button>
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-muted">
                <p>Adjust text size to improve readability.</p>
                <p>Changes apply to interface text once enabled.</p>
              </div>
            </div>
          )
        }
      />

      <ToolbarButton
        label="Appearance"
        ariaLabel="Toggle appearance menu"
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
            <div className={dropdownStyles} role="menu" aria-label="Appearance options">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Theme</p>
              <div className="flex flex-col gap-1.5 text-xs">
                {appearanceOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 font-medium transition focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-1 ${appearance === option.value ? "bg-surface-subdued text-primary" : "text-secondary hover:bg-(--color-surface-subdued)"}`}
                    role="menuitemradio"
                    aria-checked={appearance === option.value}
                    aria-label={`Set appearance to ${option.label}`}
                    onClick={() => setAppearance(option.value)}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-surface"
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
                        {option.value === "auto" && "Match system setting"}
                        {option.value === "light" && "Bright background"}
                        {option.value === "dark" && "Low-light friendly"}
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
