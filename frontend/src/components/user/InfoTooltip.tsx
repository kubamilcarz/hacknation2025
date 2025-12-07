"use client";

import { useId, useState, type ReactNode } from "react";

interface InfoTooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function InfoTooltip({ label, children, className }: InfoTooltipProps) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);

  const show = () => setIsOpen(true);
  const hide = () => setIsOpen(false);
  const toggle = () => setIsOpen((previous) => !previous);

  return (
    <div
      className={`relative inline-flex ${className ?? ""}`.trim()}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen ? "true" : "false"}
        aria-describedby={tooltipId}
        onClick={(event) => {
          event.preventDefault();
          toggle();
        }}
        onFocus={show}
        onBlur={hide}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-surface text-xs font-semibold text-secondary transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
      >
        ?
        <span className="sr-only">{label}</span>
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        aria-hidden={isOpen ? undefined : "true"}
        className={`absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-subtle bg-surface p-4 text-left shadow-lg transition focus-within:outline-none focus-within:ring-2 focus-within:ring-(--color-focus-ring) focus-within:ring-offset-2 ${
          isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="mt-2 space-y-2 text-sm leading-5 text-secondary">{children}</div>
      </div>
    </div>
  );
}
