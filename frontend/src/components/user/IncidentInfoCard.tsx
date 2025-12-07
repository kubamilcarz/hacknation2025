"use client";

import type { ReactNode } from "react";

interface IncidentInfoCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function IncidentInfoCard({ title, icon, children }: IncidentInfoCardProps) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface-subdued px-5 py-4 shadow-inner">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">{icon}</span>}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          <div className="text-sm leading-6 text-secondary">{children}</div>
        </div>
      </div>
    </div>
  );
}
