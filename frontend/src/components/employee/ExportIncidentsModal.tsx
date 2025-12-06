"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/Modal";
import {
  incidentService,
  type IncidentExportFormat,
} from "@/lib/services/incidentService";

const FORMAT_OPTIONS: Array<{
  value: IncidentExportFormat;
  label: string;
  helper: string;
}> = [
  {
    value: "csv",
    label: "CSV",
    helper: "Uniwersalny format do arkuszy i narzędzi BI.",
  },
  {
    value: "excel",
    label: "Excel (.xls)",
    helper: "Tabela otwierana w Excelu oraz LibreOffice.",
  },
  {
    value: "json",
    label: "JSON",
    helper: "Struktura danych do integracji z innymi systemami.",
  },
  {
    value: "pdf",
    label: "PDF",
    helper: "Gotowy do druku raport z tabelą zgłoszeń.",
  },
];

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
  const [selectedFormat, setSelectedFormat] = useState<IncidentExportFormat>("csv");

  const confirmLabel = useMemo(() => {
    switch (selectedFormat) {
      case "excel":
        return "Eksportuj Excel";
      case "json":
        return "Eksportuj JSON";
      case "pdf":
        return "Eksportuj PDF";
      default:
        return "Eksportuj CSV";
    }
  }, [selectedFormat]);

  const handleConfirm = () => {
    incidentService.setExportFormat(selectedFormat);
    onConfirm();
    setSelectedFormat("csv");
  };

  const handleClose = () => {
    setSelectedFormat("csv");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
        <div className="space-y-3">
          <p className="text-sm font-semibold text-secondary">Format eksportu</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FORMAT_OPTIONS.map((option) => {
              const isChecked = selectedFormat === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col rounded-lg border px-4 py-3 text-sm transition ${
                    isChecked
                      ? "border-(--color-accent) bg-(--color-accent-soft) text-foreground"
                      : "border-subtle bg-surface text-secondary hover:border-(--color-border-strong)"
                  } ${isExporting ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <input
                      type="radio"
                      name="export-format"
                      value={option.value}
                      checked={isChecked}
                      disabled={isExporting}
                      onChange={() => setSelectedFormat(option.value)}
                      className="h-4 w-4"
                    />
                    {option.label}
                  </span>
                  <span className="mt-2 text-xs text-secondary">{option.helper}</span>
                </label>
              );
            })}
          </div>
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
            onClick={handleClose}
            className="inline-flex items-center justify-center rounded-md border border-subtle px-5 py-2.5 text-sm font-semibold text-secondary transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasIncidentsToExport || isExporting}
            className={`inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold text-(--color-accent-text) transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 ${!hasIncidentsToExport || isExporting ? "bg-(--color-border) text-muted" : "bg-(--color-accent) hover:bg-(--color-accent-strong)"}`}
          >
            {isExporting ? "Przygotowuję plik…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
