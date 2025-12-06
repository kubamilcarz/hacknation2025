"use client";

import type { ReactNode } from "react";

interface IncidentWizardSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function IncidentWizardSection({ title, description, actions, children }: IncidentWizardSectionProps) {
  const showHeader = Boolean(title || description || actions);

  return (
    <section className="space-y-6">
      {showHeader && (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          {(title || description) && (
            <div>
              {title && <h2 className="text-lg font-semibold text-primary">{title}</h2>}
              {description && <p className="mt-1 text-sm leading-6 text-secondary">{description}</p>}
            </div>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}
