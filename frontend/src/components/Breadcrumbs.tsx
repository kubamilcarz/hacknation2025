'use client';

import Link from 'next/link';
import { useMemo } from 'react';

interface BreadcrumbItem {
  href?: string;
  labelKey?: string;
  label?: string;
}

const labelTranslations: Record<string, string> = {
  home: 'Generator zgłoszeń',
  'report-incident': 'Zgłoszenie zdarzenia',
  panel: 'Panel weryfikacji',
  'incident-list': 'Lista zgłoszeń',
  report: 'Zgłoszenie',
};

function resolveLabel(item: BreadcrumbItem) {
  if (item.label) {
    return item.label;
  }

  if (item.labelKey) {
    return labelTranslations[item.labelKey] ?? item.labelKey;
  }

  if (item.href) {
    return item.href;
  }

  return '';
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const resolvedItems = useMemo(
    () =>
      items
        .map((item) => ({ ...item, label: resolveLabel(item) }))
        .filter((item) => Boolean(item.label)),
    [items],
  );

  if (resolvedItems.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Ścieżka nawigacji" className="text-xs text-secondary">
      <ol className="flex flex-wrap items-center gap-2">
        {resolvedItems.map((item, index) => {
          const isLast = index === resolvedItems.length - 1;
          const label = item.label as string;

          return (
            <li key={`${label}-${index}`} className="flex items-center gap-2">
              {isLast || !item.href ? (
                <span className="font-semibold text-primary">{label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="font-medium text-secondary transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                >
                  {label}
                </Link>
              )}
              {!isLast && <span aria-hidden="true" className="text-muted">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
