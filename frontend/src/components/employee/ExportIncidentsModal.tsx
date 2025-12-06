"use client";

import Modal from "@/components/Modal";

type ExportIncidentsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isExporting: boolean;
  totalCount: number;
  recordLabel: string;
  hasIncidentsToExport: boolean;
};

export default function ExportIncidentsModal({
  isOpen,
  onClose,
  onConfirm,
  isExporting,
  totalCount,
  recordLabel,
  hasIncidentsToExport,
}: ExportIncidentsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eksportuj listę zgłoszeń"
      description={`Obecny widok zawiera ${totalCount} ${recordLabel}. Eksport obejmie aktywne filtry i sortowanie.`}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-subtle bg-surface-subdued px-5 py-4 text-sm text-secondary">
          <div className="flex items-center justify-between text-base font-semibold text-primary">
            <span>Zakres eksportu</span>
            <span>{totalCount}</span>
          </div>
          <p className="mt-3">
            Plik CSV zachowa aktualne kryteria wyszukiwania, statusy i bieżące ustawienia sortowania.
          </p>
          {!hasIncidentsToExport && (
            <p className="mt-3 font-medium text-(--color-error)">
              Brak zgłoszeń spełniających bieżące kryteria.
            </p>
          )}
        </div>
        <div className="space-y-2 rounded-xl border border-dashed border-subtle px-5 py-4 text-sm text-secondary">
          <p className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
              <svg
                className="h-3 w-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 8h10" />
                <path d="m8 3 5 5-5 5" />
              </svg>
            </span>
            Operacja może potrwać chwilę przy większej liczbie rekordów.
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="m5 12 7-7 7 7" />
              </svg>
            </span>
            Po zakończeniu pobieranie rozpocznie się automatycznie.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-subtle px-5 py-2.5 text-sm font-semibold text-secondary transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!hasIncidentsToExport || isExporting}
            className={`inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-(--color-accent-text) transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 ${!hasIncidentsToExport || isExporting ? "bg-(--color-border) text-muted" : "bg-(--color-accent) hover:bg-(--color-accent-strong)"}`}
          >
            {isExporting ? "Przygotowuję plik…" : "Eksportuj CSV"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
