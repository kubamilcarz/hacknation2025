"use client";

import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

type DocumentFiltersPanelProps = {
  searchValue: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchBlur: () => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
};

export default function DocumentFiltersPanel({
  searchValue,
  onSearchChange,
  onSearchBlur,
  onSearchKeyDown,
}: DocumentFiltersPanelProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border border-subtle bg-surface-subdued p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex w-full items-center gap-3 sm:flex-1">
        <input
          type="search"
          placeholder="Szukaj po imieniu, nazwisku, PESEL lub miejscu wypadku"
          value={searchValue}
          onChange={onSearchChange}
          onBlur={onSearchBlur}
          onKeyDown={onSearchKeyDown}
          className="flex-1 rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
        />
      </div>
    </div>
  );
}
