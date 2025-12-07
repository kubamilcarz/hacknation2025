"use client";

import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

export type BooleanFilterValue = "all" | "yes" | "no";

type DocumentFiltersPanelProps = {
  searchValue: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchBlur: () => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  helpProvidedValue: BooleanFilterValue;
  onHelpProvidedChange: (value: BooleanFilterValue) => void;
  machineInvolvedValue: BooleanFilterValue;
  onMachineInvolvedChange: (value: BooleanFilterValue) => void;
};

export default function DocumentFiltersPanel({
  searchValue,
  onSearchChange,
  onSearchBlur,
  onSearchKeyDown,
  helpProvidedValue,
  onHelpProvidedChange,
  machineInvolvedValue,
  onMachineInvolvedChange,
}: DocumentFiltersPanelProps) {
  return (
    <div className="mb-6 rounded-lg border border-subtle bg-surface-subdued p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-tight text-muted">Szukaj</span>
          <input
            type="search"
            placeholder="Szukaj po imieniu, nazwisku, PESEL lub miejscu wypadku"
            value={searchValue}
            onChange={onSearchChange}
            onBlur={onSearchBlur}
            onKeyDown={onSearchKeyDown}
            className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-tight text-muted">Udzielono pomocy</span>
            <select
              value={helpProvidedValue}
              onChange={(event) => onHelpProvidedChange(event.target.value as BooleanFilterValue)}
              className="min-w-44 rounded-md border border-subtle bg-input px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
            >
              <option value="all">Wszystkie</option>
              <option value="yes">Tak</option>
              <option value="no">Nie</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-tight text-muted">Maszyna w użyciu</span>
            <select
              value={machineInvolvedValue}
              onChange={(event) => onMachineInvolvedChange(event.target.value as BooleanFilterValue)}
              className="min-w-44 rounded-md border border-subtle bg-input px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
            >
              <option value="all">Wszystkie</option>
              <option value="yes">Tak</option>
              <option value="no">Nie</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
