"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pagination } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import type { Document } from "@/types/document";
import type { DocumentListOptions } from "@/lib/services/documentService";

const MIN_COLUMN_WIDTH = 140;
const TEXT_COLUMN_IDS = new Set(["id", "nazwisko", "pesel", "miejsce_wypadku", "rodzaj_urazow"]);

type ColumnDefinition = {
  id: string;
  label: string;
  minWidth?: number;
  render: (document: Document) => ReactNode;
  cellClassName?: string;
  align?: "left" | "right";
  sortable?: boolean;
  defaultSortDirection?: "asc" | "desc";
  sticky?: "left" | "right";
  resizable?: boolean;
  width?: number;
};

export type SortConfig = { columnId: DocumentListOptions["sort"]; direction: "asc" | "desc" } | null;

const SORTABLE_COLUMNS: Array<{ id: DocumentListOptions["sort"]; defaultDirection: "asc" | "desc" }> = [
  { id: "data_wypadku", defaultDirection: "desc" },
  { id: "id", defaultDirection: "asc" },
  { id: "imie", defaultDirection: "asc" },
  { id: "nazwisko", defaultDirection: "asc" },
  { id: "pesel", defaultDirection: "asc" },
  { id: "miejsce_wypadku", defaultDirection: "asc" },
];

const SORTABLE_COLUMN_MAP = SORTABLE_COLUMNS.reduce<Record<string, { defaultDirection: "asc" | "desc" }>>(
  (accumulator, column) => {
    accumulator[column.id] = { defaultDirection: column.defaultDirection };
    return accumulator;
  },
  {}
);

export function getEmployeeDefaultSortConfig(): SortConfig {
  const defaultColumn = SORTABLE_COLUMNS.find((column) => column.defaultDirection) ?? SORTABLE_COLUMNS[0];
  if (!defaultColumn) {
    return null;
  }
  return { columnId: defaultColumn.id, direction: defaultColumn.defaultDirection };
}

export function isEmployeeSortableColumn(columnId: string | null): columnId is DocumentListOptions["sort"] {
  return Boolean(columnId && SORTABLE_COLUMN_MAP[columnId]);
}

export function getEmployeeColumnDefaultDirection(columnId: DocumentListOptions["sort"]): "asc" | "desc" {
  return SORTABLE_COLUMN_MAP[columnId]?.defaultDirection ?? "asc";
}

type EmployeeDocumentsTableProps = {
  documents: Document[];
  totalCount: number;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  sortConfig: SortConfig;
  onSortChange: (columnId: DocumentListOptions["sort"], direction: "asc" | "desc") => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  formatDate: (input: Date) => string;
  onNavigateToDocument: (documentId: number) => void;
};

export default function EmployeeDocumentsTable({
  documents,
  totalCount,
  isLoading,
  hasLoaded,
  error,
  sortConfig,
  onSortChange,
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  formatDate,
  onNavigateToDocument,
}: EmployeeDocumentsTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    ({
      detailsToggle: 48,
      id: 100,
      nazwisko: 220,
      pesel: 160,
      miejsce_wypadku: 220,
      rodzaj_urazow: 220,
      data_wypadku: 160,
      actions: 124,
    }) satisfies Record<string, number>
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeStylesRef = useRef<{ userSelect: string; cursor: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRowExpansion = useCallback((rawDocumentId: number | string) => {
    const documentKey = String(rawDocumentId);
    setExpandedRows((current) => ({
      ...current,
      [documentKey]: !current[documentKey],
    }));
  }, []);


  const columns = useMemo<ColumnDefinition[]>(
    () => [
      {
        id: "detailsToggle",
        label: "",
        minWidth: 48,
        width: 48,
        sticky: "left",
        align: "center",
        resizable: false,
        render: (documentRow) => {
          const key = String(documentRow.id ?? documentRow.pesel);
          const isExpanded = expandedRows[key] ?? false;
          return (
            <button
              type="button"
              aria-label={isExpanded ? "Ukryj szczegóły dokumentu" : "Pokaż szczegóły dokumentu"}
              aria-expanded={isExpanded}
              onClick={() => toggleRowExpansion(key)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-subtle text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
            >
              {isExpanded ? "−" : "+"}
            </button>
          );
        },
      },
      {
        id: "id",
        label: "ID",
        minWidth: 100,
        cellClassName: "font-semibold text-secondary",
        render: (documentRow) => <span className="block truncate">{documentRow.id ?? "Brak danych"}</span>,
        sortable: true,
        defaultSortDirection: "asc",
        sticky: "left",
      },
      {
        id: "nazwisko",
        label: "Poszkodowany",
        minWidth: 220,
        cellClassName: "text-primary",
        render: (documentRow) => <span className="block truncate">{`${documentRow.imie} ${documentRow.nazwisko}`.trim()}</span>,
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "pesel",
        label: "PESEL",
        minWidth: 160,
        render: (documentRow) => <span className="block truncate">{documentRow.pesel}</span>,
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "miejsce_wypadku",
        label: "Miejsce wypadku",
        minWidth: 220,
        cellClassName: "text-secondary",
        render: (documentRow) => <span className="block truncate">{documentRow.miejsce_wypadku}</span>,
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "rodzaj_urazow",
        label: "Rodzaj urazu",
        minWidth: 220,
        cellClassName: "text-secondary",
        render: (documentRow) => <span className="block truncate">{documentRow.rodzaj_urazow}</span>,
      },
      {
        id: "data_wypadku",
        label: "Data wypadku",
        minWidth: 160,
        cellClassName: "text-secondary",
        render: (documentRow) =>
          formatDate(new Date(`${documentRow.data_wypadku}T${documentRow.godzina_wypadku || "00:00"}`)),
        sortable: true,
        defaultSortDirection: "desc",
      },
      {
        id: "actions",
        label: "Akcje",
        minWidth: 124,
        width: 124,
        sticky: "right",
        align: "right",
        resizable: false,
        render: (documentRow) => (
          <button
            type="button"
            onClick={() => {
              if (documentRow.id != null) {
                onNavigateToDocument(documentRow.id);
              }
            }}
            disabled={documentRow.id == null}
            className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 ${
              documentRow.id == null
                ? 'cursor-not-allowed border-(--color-border) text-muted'
                : 'border-subtle text-secondary hover:border-(--color-border-stronger) hover:text-foreground'
            }`}
          >
            Szczegóły
          </button>
        ),
      },
    ],
    [expandedRows, formatDate, onNavigateToDocument, toggleRowExpansion]
  );

  useEffect(() => {
    if (isResizing) {
      resizeStylesRef.current = {
        userSelect: document.body.style.userSelect,
        cursor: document.body.style.cursor,
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      return () => {
        if (resizeStylesRef.current) {
          document.body.style.userSelect = resizeStylesRef.current.userSelect;
          document.body.style.cursor = resizeStylesRef.current.cursor;
          resizeStylesRef.current = null;
        }
      };
    }

    return undefined;
  }, [isResizing]);

  const formatDetailLabel = useCallback((key: string) => {
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }, []);

  const formatDetailValue = useCallback((value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return "Brak danych";
    }

    if (value instanceof Date) {
      return formatDate(value);
    }

    if (typeof value === "boolean") {
      return value ? "Tak" : "Nie";
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "Brak danych";
      }

      return value
        .map((entry) => (typeof entry === "object" ? JSON.stringify(entry, null, 2) : String(entry)))
        .join("\n");
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }, [formatDate]);

  const renderDetailsRow = useCallback(
    (documentRow: Document) => {
      const documentKey = String(documentRow.id ?? documentRow.pesel);
      const entries = Object.entries(documentRow)
        .filter(([key]) => key !== "witnesses")
        .map(([key, value]) => ({
          key,
          label: formatDetailLabel(key),
          value: formatDetailValue(value),
        }));

      const witnesses = documentRow.witnesses ?? [];

      return (
        <tr className="bg-surface-subdued">
          <td colSpan={columns.length} className="px-6 py-5 text-sm text-secondary">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <div key={`${documentKey}-${entry.key}`} className="rounded border border-subtle bg-surface px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{entry.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-primary">{entry.value}</p>
                </div>
              ))}
            </div>
            {witnesses.length > 0 && (
              <div className="mt-6 rounded border border-dashed border-subtle px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Świadkowie</p>
                <ul className="mt-3 space-y-2 text-sm text-primary">
                  {witnesses.map((witness, index) => (
                    <li key={`${documentKey}-witness-${index}`} className="rounded bg-surface-subdued px-3 py-2">
                      <span className="font-semibold text-secondary">{`${witness.imie} ${witness.nazwisko}`}</span>
                      <br />
                      <span className="text-xs text-muted">
                        {[witness.ulica, witness.nr_domu, witness.nr_lokalu].filter(Boolean).join(" ")},{" "}
                        {witness.kod_pocztowy} {witness.miejscowosc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </td>
        </tr>
      );
    },
    [columns.length, formatDetailLabel, formatDetailValue]
  );

  const getColumnWidth = useCallback(
    (columnId: string, fallback: number) => columnWidths[columnId] ?? fallback,
    [columnWidths]
  );

  const startResize = useCallback(
    (columnId: string, event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.detail > 1) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const headerCell = event.currentTarget.closest("th") as HTMLTableCellElement | null;
      if (!headerCell) {
        return;
      }

      const startX = event.clientX;
      const startWidth = columnWidths[columnId] ?? headerCell.offsetWidth;
      const columnDefinition = columns.find((column) => column.id === columnId);
      if (columnDefinition?.resizable === false) {
        return;
      }
      const minWidth = columnDefinition?.minWidth ?? MIN_COLUMN_WIDTH;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.max(minWidth, startWidth + delta);
        setColumnWidths((current) => ({ ...current, [columnId]: nextWidth }));
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        setIsResizing(false);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      setIsResizing(true);
    },
    [columnWidths, columns]
  );

  const applyWidthToAllColumns = useCallback(
    (targetColumnId: string) => {
      const referenceWidth = getColumnWidth(targetColumnId, MIN_COLUMN_WIDTH);
      setColumnWidths((current) =>
        columns.reduce<Record<string, number>>((accumulator, column) => {
          if (column.resizable === false) {
            accumulator[column.id] = current[column.id] ?? column.width ?? column.minWidth ?? MIN_COLUMN_WIDTH;
            return accumulator;
          }

          const minWidth = column.minWidth ?? MIN_COLUMN_WIDTH;
          accumulator[column.id] = Math.max(minWidth, referenceWidth);
          return accumulator;
        }, {})
      );
    },
    [columns, getColumnWidth]
  );

  const handleResizeDoubleClick = useCallback(
    (columnId: string, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const column = columns.find((entry) => entry.id === columnId);
      if (column?.resizable === false) {
        return;
      }
      applyWidthToAllColumns(columnId);
    },
    [applyWidthToAllColumns, columns]
  );

  const handleSortRequest = useCallback(
    (column: ColumnDefinition) => {
      if (!column.sortable || column.id === "actions") {
        return;
      }

      const columnId = column.id as DocumentListOptions["sort"];
      const defaultDirection = column.defaultSortDirection ?? "asc";
      const isSameColumn = sortConfig?.columnId === columnId;
      const nextDirection = isSameColumn
        ? sortConfig?.direction === "asc"
          ? "desc"
          : "asc"
        : defaultDirection;

      if (isSameColumn && sortConfig?.direction === nextDirection) {
        return;
      }

      onSortChange(columnId, nextDirection);
    },
    [onSortChange, sortConfig]
  );

  const isInitialLoad = !hasLoaded && isLoading;
  const isRefetching = hasLoaded && isLoading;
  const showLoadingState = isInitialLoad;
  const hasResults = totalCount > 0;
  const showEmptyState = hasLoaded && !isLoading && totalCount === 0;
  const isFallbackState = showLoadingState || showEmptyState;
  const shouldReserveLoadingSpace = isInitialLoad || (isRefetching && documents.length === 0);
  const tableContainerClassName = `relative rounded-lg border border-subtle${
    shouldReserveLoadingSpace ? " min-h-[12rem]" : ""
  }`;
  const firstItemIndex = (currentPage - 1) * pageSize;
  const displayRangeStart = hasResults ? firstItemIndex + 1 : 0;
  const displayRangeEnd = hasResults ? Math.min(totalCount, firstItemIndex + documents.length) : 0;

  const summaryMessage = (() => {
    if (error) {
      return error;
    }
    if (isInitialLoad) {
      return "Ładowanie danych…";
    }
    if (isRefetching) {
      return "Aktualizuję dane…";
    }
    if (totalCount === 0) {
      return null;
    }
    return `Wyświetlono ${displayRangeStart}-${displayRangeEnd} z ${totalCount} dokumentów (łącznie ${documents.length})`;
  })();

  return (
    <>
      <div className="mb-4 flex items-center gap-3 text-sm text-muted">
        {summaryMessage && <span>{summaryMessage}</span>}
      </div>
      <div className={tableContainerClassName}>
        {isRefetching && !error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/10 backdrop-blur-sm">
            <Spinner size={36} className="border-[3px]" />
            <span className="text-sm text-secondary">Aktualizuję dane…</span>
          </div>
        )}
        <div className={isFallbackState ? "overflow-hidden" : "overflow-x-auto"}>
          <table
            className={`w-full divide-y divide-subtle text-sm ${isFallbackState ? "table-fixed" : ""}`}
            style={
              isFallbackState
                ? undefined
                : {
                    minWidth: `${columns.reduce(
                      (sum, column) => sum + (column.minWidth ?? MIN_COLUMN_WIDTH),
                      0
                    )}px`,
                  }
            }
          >
            <thead className="bg-surface-subdued text-xs font-medium uppercase tracking-wide text-muted">
              <tr>
                {columns.map((column) => {
                  const isSortable = Boolean(column.sortable && column.id !== "actions");
                  const isActiveSort = sortConfig?.columnId === column.id;
                  const width = isFallbackState ? undefined : getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH);
                  const stickyClassName =
                    column.sticky === "left"
                      ? "sticky left-0"
                      : column.sticky === "right"
                        ? "sticky right-0"
                        : "";
                        const fallbackVisibilityClass =
                          isFallbackState && column.id !== "id" && column.id !== "actions"
                            ? "hidden sm:table-cell"
                            : "";
                  const headerStyle: CSSProperties = {
                    zIndex: column.sticky ? 10 : undefined,
                    background: column.sticky ? "var(--color-surface-subdued)" : undefined,
                    height: "3rem",
                    verticalAlign: "middle",
                  };
                  if (width != null) {
                    headerStyle.width = width;
                    headerStyle.minWidth = width;
                  }
                  return (
                    <th
                      key={column.id}
                      className={`group relative px-3 py-2.5 ${stickyClassName} ${fallbackVisibilityClass} ${column.align === "right" ? "text-right" : "text-left"} select-none`}
                      style={headerStyle}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => (isSortable ? handleSortRequest(column) : undefined)}
                          className={`flex min-w-0 flex-1 items-center gap-1 truncate text-left font-medium transition ${
                            isSortable ? "cursor-pointer hover:text-(--color-foreground)" : "cursor-default"
                          }`}
                          tabIndex={isSortable ? 0 : -1}
                          disabled={!isSortable}
                        >
                          <span className="truncate">{column.label}</span>
                          {isSortable && (
                            <span
                              className={`flex h-4 w-4 items-center justify-center text-muted transition ${
                                isActiveSort ? "text-(--color-accent)" : "opacity-0 group-hover:opacity-60"
                              }`}
                              aria-hidden="true"
                            >
                              <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.4}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`h-3.5 w-3.5 transition ${
                                  isActiveSort && sortConfig?.direction === "desc" ? "rotate-180" : ""
                                }`}
                              >
                                <path d="M4 6.5 8 2.5l4 4" />
                                <path d="M8 3v10" />
                              </svg>
                            </span>
                          )}
                        </button>
                        {!isFallbackState && column.resizable !== false && column.id !== "actions" && (
                          <button
                            type="button"
                            onMouseDown={(event) => startResize(column.id, event)}
                            onDoubleClick={(event) => handleResizeDoubleClick(column.id, event)}
                            className="ml-1 flex h-6 w-2 cursor-col-resize items-center justify-center rounded-md bg-transparent opacity-0 transition hover:bg-(--color-accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 group-hover:opacity-100"
                            aria-label={`Dostosuj szerokość kolumny ${column.label}`}
                          >
                            <span className="h-full w-px bg-(--color-border-strong)" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle bg-surface">
              {documents.map((documentRow) => {
                const documentKey = String(documentRow.id ?? documentRow.pesel);
                const isExpanded = expandedRows[documentKey] ?? false;
                return (
                  <Fragment key={documentKey}>
                    <tr className="transition hover:bg-surface-subdued">
                      {columns.map((column) => {
                        const width = isFallbackState ? undefined : getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH);
                        const stickyClassName =
                          column.sticky === "left"
                            ? "sticky left-0"
                            : column.sticky === "right"
                              ? "sticky right-0"
                              : "";
                        const isTextColumn = TEXT_COLUMN_IDS.has(column.id);
                        const alignmentClass = column.align === "right" ? "text-right" : "text-left";
                        const fallbackVisibilityClass =
                          isFallbackState && column.id !== "id" && column.id !== "actions"
                            ? "hidden sm:table-cell"
                            : "";
                        const cellStyle: CSSProperties = {
                          zIndex: column.sticky ? 5 : undefined,
                          background: column.sticky ? "var(--color-surface)" : undefined,
                        };
                        if (width != null) {
                          cellStyle.width = width;
                          cellStyle.minWidth = width;
                        }
                        return (
                          <td
                            key={`${documentKey}-${column.id}`}
                            className={`px-3 py-3 ${alignmentClass} ${stickyClassName} ${fallbackVisibilityClass} ${column.cellClassName ?? ""} ${
                              isTextColumn ? "overflow-hidden whitespace-nowrap" : ""
                            }`.trim()}
                            style={cellStyle}
                          >
                            {column.render(documentRow)}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && renderDetailsRow(documentRow)}
                  </Fragment>
                );
              })}
              {(showEmptyState || showLoadingState || error) && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-0 align-middle"
                    style={{ height: "calc(3 * 3.75rem)" }}
                  >
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted">
                      {showLoadingState && !error ? (
                        <>
                          <Spinner size={32} className="border-[3px]" />
                          <span>Ładowanie danych…</span>
                        </>
                      ) : error ? (
                        <span className="text-sm text-error">{error}</span>
                      ) : (
                        "Brak dokumentów spełniających kryteria wyszukiwania."
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {totalCount > 0 && (
        <Pagination className="mt-6" currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </>
  );
}
