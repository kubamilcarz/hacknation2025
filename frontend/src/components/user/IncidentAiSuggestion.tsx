"use client";

import type { ReactNode } from "react";

interface IncidentAiSuggestionProps {
  title?: string;
  children: ReactNode;
  variant?: "info" | "warning";
}

export function IncidentAiSuggestion({ title = "Podpowiedź AI", children, variant = "info" }: IncidentAiSuggestionProps) {
  const palette =
    variant === "warning"
      ? {
          border: "border-(--color-accent-strong)",
          background: "bg-(--color-accent-soft)",
          text: "text-(--color-accent)",
        }
      : {
          border: "border-(--color-border-strong)",
          background: "bg-surface-subdued",
          text: "text-secondary",
        };

  return (
    <div className={`space-y-2 rounded-xl border ${palette.border} ${palette.background} px-4 py-3 text-base ${palette.text}`}>
      <p className="font-semibold text-foreground">{title}</p>
      <div className="leading-6 text-foreground/90">{children}</div>
    </div>
  );
}
