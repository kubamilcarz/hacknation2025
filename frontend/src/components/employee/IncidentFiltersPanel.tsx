"use client";

import type { IncidentStatus } from "@/types/incident";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

type IncidentFiltersPanelProps = {
  searchValue: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchBlur: () => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  statusValue: IncidentStatus | "all";
  onStatusChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export default function IncidentFiltersPanel({
  searchValue,
  onSearchChange,
  onSearchBlur,
  onSearchKeyDown,
  statusValue,
  onStatusChange,
}: IncidentFiltersPanelProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border border-subtle bg-surface-subdued p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex w-full items-center gap-3 sm:flex-1">
        <input
          type="search"
          placeholder="Szukaj po tytule, nazwisku, e-mailu lub numerze sprawy"
          value={searchValue}
          onChange={onSearchChange}
          onBlur={onSearchBlur}
          onKeyDown={onSearchKeyDown}
          className="flex-1 rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
        />
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <label htmlFor="status" className="text-sm font-medium text-secondary">
          Status
        </label>
        <select
          id="status"
          value={statusValue}
          onChange={onStatusChange}
          className="rounded-md border border-subtle bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
        >
          <option value="all">Wszystkie</option>
          <option value="pending">Oczekujące</option>
          <option value="in-progress">W trakcie</option>
          <option value="resolved">Rozwiązane</option>
          <option value="rejected">Odrzucone</option>
        </select>
      </div>
    </div>
  );
}
