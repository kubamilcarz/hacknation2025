"use client";

import { Breadcrumbs } from "@/components/Breadcrumbs";

type BreadcrumbItem = {
  href?: string;
  labelKey?: string;
  label?: string;
};

type DashboardHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description: string;
  onCreateDocument: () => void;
  onExportClick: () => void;
};

export default function DashboardHeader({
  breadcrumbs,
  title,
  description,
  onCreateDocument,
  onExportClick,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">{title}</h1>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onCreateDocument}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-(--color-accent) px-5 py-2.5 text-sm font-semibold text-(--color-accent-text) transition hover:bg-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 4v12" />
              <path d="M4 10h12" />
            </svg>
            Dodaj dokument
          </button>
          <button
            type="button"
            onClick={onExportClick}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-subtle bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3H8a1 1 0 0 0-1 1v6H5.2a.2.2 0 0 0-.14.34l4.8 4.8a.2.2 0 0 0 .28 0l4.8-4.8a.2.2 0 0 0-.14-.34H13V4a1 1 0 0 0-1-1Z" />
              <path d="M5 17h10" />
            </svg>
            Eksportuj listę
          </button>
        </div>
      </div>
    </div>
  );
}
