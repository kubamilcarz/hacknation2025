"use client";

import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/user/InfoTooltip";

interface IncidentWizardLayoutProps {
  stepIndex: number;
  stepCount: number;
  title: string;
  description?: string;
  children: ReactNode;
  rightColumn?: ReactNode;
  info?: {
    label: string;
    content: ReactNode;
  };
}

export function IncidentWizardLayout({
  stepIndex,
  stepCount,
  title,
  description,
  children,
  rightColumn,
  info,
}: IncidentWizardLayoutProps) {
  const stepCountLabel = `${stepIndex + 1} z ${stepCount}`;
  const hasAside = Boolean(rightColumn);

  return (
    <section className={`grid grid-cols-1 gap-8 ${hasAside ? "lg:grid-cols-[2fr,1fr]" : "lg:grid-cols-1"}`}>
      <div className="lg:col-span-1">
        <header className="mb-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Krok {stepCountLabel}</p>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-primary">{title}</h2>
              {description && <p className="max-w-3xl text-sm leading-6 text-secondary">{description}</p>}
            </div>
            {info && (
              <InfoTooltip label={info.label} className="mt-1">
                {info.content}
              </InfoTooltip>
            )}
          </div>
        </header>

        <div className="rounded-2xl border border-subtle bg-surface p-6 shadow-card">
          {children}
        </div>
      </div>
      {hasAside && <aside className="space-y-4">{rightColumn}</aside>}
    </section>
  );
}
