"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Pagination } from "@/components/Pagination";
import { Spinner } from "@/components/Spinner";
import type { Incident } from "@/types/incident";
import type { IncidentListOptions } from "@/lib/services/incidentService";
import { INCIDENT_PRIORITY_LABELS, INCIDENT_STATUS_LABELS } from "@/lib/constants/incidents";

const MIN_COLUMN_WIDTH = 140;
const TEXT_COLUMN_IDS = new Set(["caseNumber", "title", "reporterName", "category"]);

type ColumnDefinition = {
  id: string;
  label: string;
  minWidth?: number;
  render: (incident: Incident) => ReactNode;
  cellClassName?: string;
  align?: "left" | "right";
  sortable?: boolean;
  defaultSortDirection?: "asc" | "desc";
  sticky?: "left" | "right";
  resizable?: boolean;
  width?: number;
};

export type SortConfig = { columnId: IncidentListOptions["sort"]; direction: "asc" | "desc" } | null;

const SORTABLE_COLUMNS: Array<{ id: IncidentListOptions["sort"]; defaultDirection: "asc" | "desc" }> = [
  { id: "caseNumber", defaultDirection: "asc" },
  { id: "title", defaultDirection: "asc" },
  { id: "reporterName", defaultDirection: "asc" },
  { id: "category", defaultDirection: "asc" },
  { id: "priority", defaultDirection: "asc" },
  { id: "status", defaultDirection: "asc" },
  { id: "createdAt", defaultDirection: "desc" },
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

export function isEmployeeSortableColumn(columnId: string | null): columnId is IncidentListOptions["sort"] {
  return Boolean(columnId && SORTABLE_COLUMN_MAP[columnId]);
}

export function getEmployeeColumnDefaultDirection(columnId: IncidentListOptions["sort"]): "asc" | "desc" {
  return SORTABLE_COLUMN_MAP[columnId]?.defaultDirection ?? "asc";
}

type EmployeeIncidentsTableProps = {
  incidents: Incident[];
  totalCount: number;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  sortConfig: SortConfig;
  onSortChange: (columnId: IncidentListOptions["sort"], direction: "asc" | "desc") => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  formatDate: (input: Date) => string;
  onNavigateToIncident: (incidentId: string) => void;
};

export default function EmployeeIncidentsTable({
  incidents,
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
  onNavigateToIncident,
}: EmployeeIncidentsTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    ({
      caseNumber: 160,
      title: 220,
      reporterName: 190,
      category: 170,
      priority: 150,
      status: 150,
      createdAt: 150,
      actions: 124,
    }) satisfies Record<string, number>
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeStylesRef = useRef<{ userSelect: string; cursor: string } | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getStatusBadge = useCallback((status: Incident["status"]) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
    const styles: Record<Incident["status"], string> = {
      pending: "bg-(--color-warning-soft) text-(--color-warning)",
      "in-progress": "bg-(--color-info-soft) text-(--color-info)",
      resolved: "bg-(--color-success-soft) text-(--color-success)",
      rejected: "bg-(--color-error-soft) text-(--color-error)",
    };

    return <span className={`${base} ${styles[status]}`}>{INCIDENT_STATUS_LABELS[status]}</span>;
  }, []);

  const getPriorityBadge = useCallback((priority: Incident["priority"]) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
    const styles: Record<Incident["priority"], string> = {
      low: "bg-(--color-support-soft) text-(--color-support)",
      medium: "bg-(--color-info-soft) text-(--color-info)",
      high: "bg-(--color-warning-soft) text-(--color-warning)",
      critical: "bg-(--color-error-soft) text-(--color-error)",
    };

    return <span className={`${base} ${styles[priority]}`}>{INCIDENT_PRIORITY_LABELS[priority]}</span>;
  }, []);

  const closeActionMenu = useCallback(() => {
    setOpenActionMenuId(null);
  }, []);

  const toggleActionMenu = useCallback((incidentId: string) => {
    setOpenActionMenuId((current) => (current === incidentId ? null : incidentId));
  }, []);

  useEffect(() => {
    if (!openActionMenuId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      const currentRoot = actionMenuRefs.current[openActionMenuId];
      if (currentRoot && !currentRoot.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openActionMenuId]);

  const renderActionsCell = useCallback(
    (incident: Incident) => {
      const isOpen = openActionMenuId === incident.id;

      return (
        <div
          ref={(node) => {
            if (node) {
              actionMenuRefs.current[incident.id] = node;
            } else {
              delete actionMenuRefs.current[incident.id];
            }
          }}
          className="relative flex items-center justify-end gap-2"
        >
          <button
            type="button"
            onClick={() => toggleActionMenu(incident.id)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-subtle text-muted transition hover:border-(--color-border-stronger) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label={`Dostępne działania dla zgłoszenia ${incident.caseNumber}`}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigateToIncident(incident.id);
              closeActionMenu();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-(--color-accent-soft) text-(--color-accent) transition hover:bg-(--color-accent) hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
            aria-label={`Przejdź do szczegółów zgłoszenia ${incident.caseNumber}`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-subtle bg-surface p-1 text-sm shadow-lg">
              <button
                type="button"
                onClick={closeActionMenu}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-secondary transition hover:bg-(--color-surface-subdued) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
              >
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-(--color-success)" aria-hidden="true" />
                Oznacz jako rozwiązane
              </button>
              <button
                type="button"
                onClick={closeActionMenu}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-secondary transition hover:bg-(--color-surface-subdued) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
              >
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-(--color-warning)" aria-hidden="true" />
                Przypisz pracownika
              </button>
              <button
                type="button"
                onClick={closeActionMenu}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-secondary transition hover:bg-(--color-surface-subdued) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
              >
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-(--color-info)" aria-hidden="true" />
                Dodaj notatkę
              </button>
            </div>
          )}
        </div>
      );
    },
    [closeActionMenu, onNavigateToIncident, openActionMenuId, toggleActionMenu]
  );

  const columns = useMemo<ColumnDefinition[]>(
    () => [
      {
        id: "caseNumber",
        label: "Numer sprawy",
        minWidth: 160,
        cellClassName: "font-semibold text-secondary",
        render: (incident) => <span className="block truncate">{incident.caseNumber}</span>,
        sortable: true,
        defaultSortDirection: "asc",
        sticky: "left",
      },
      {
        id: "title",
        label: "Tytuł",
        minWidth: 220,
        cellClassName: "text-primary",
        render: (incident) => <span className="block truncate">{incident.title}</span>,
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "reporterName",
        label: "Zgłaszający",
        minWidth: 190,
        cellClassName: "text-secondary",
        render: (incident) => <span className="block truncate">{incident.reporterName}</span>,
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "category",
        label: "Kategoria",
        minWidth: 170,
        cellClassName: "text-secondary",
        render: (incident) => <span className="block truncate">{incident.category}</span>,
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "priority",
        label: "Priorytet",
        minWidth: 150,
        render: (incident) => getPriorityBadge(incident.priority),
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "status",
        label: "Status",
        minWidth: 150,
        render: (incident) => getStatusBadge(incident.status),
        sortable: true,
        defaultSortDirection: "asc",
      },
      {
        id: "createdAt",
        label: "Data",
        minWidth: 150,
        cellClassName: "text-secondary",
        render: (incident) => formatDate(incident.createdAt),
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
        render: renderActionsCell,
      },
    ],
    [formatDate, getPriorityBadge, getStatusBadge, renderActionsCell]
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

      const columnId = column.id as IncidentListOptions["sort"];
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
  const shouldReserveLoadingSpace = isInitialLoad || (isRefetching && incidents.length === 0);
  const tableContainerClassName = `relative rounded-lg border border-subtle${
    shouldReserveLoadingSpace ? " min-h-[12rem]" : ""
  }`;
  const firstItemIndex = (currentPage - 1) * pageSize;
  const displayRangeStart = hasResults ? firstItemIndex + 1 : 0;
  const displayRangeEnd = hasResults ? Math.min(totalCount, firstItemIndex + incidents.length) : 0;

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
    return `Wyświetlono ${displayRangeStart}-${displayRangeEnd} z ${totalCount} zgłoszeń (łącznie ${incidents.length})`;
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
                    isFallbackState && column.id !== "caseNumber" && column.id !== "actions"
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
              {incidents.map((incident) => (
                <tr key={incident.id} className="transition hover:bg-surface-subdued">
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
                    const isActionsColumn = column.id === "actions";
                    const isMenuOpenForRow = isActionsColumn && openActionMenuId === incident.id;
                    const baseZIndex = column.sticky ? 5 : undefined;
                    const cellZIndex = isMenuOpenForRow ? 80 : baseZIndex;
                    const fallbackVisibilityClass =
                      isFallbackState && column.id !== "caseNumber" && column.id !== "actions"
                        ? "hidden sm:table-cell"
                        : "";
                    const cellStyle: CSSProperties = {
                      zIndex: cellZIndex,
                      background: column.sticky ? "var(--color-surface)" : undefined,
                    };
                    if (width != null) {
                      cellStyle.width = width;
                      cellStyle.minWidth = width;
                    }
                    return (
                      <td
                        key={`${incident.id}-${column.id}`}
                        className={`px-3 py-3 ${alignmentClass} ${stickyClassName} ${fallbackVisibilityClass} ${column.cellClassName ?? ""} ${
                          isTextColumn ? "overflow-hidden whitespace-nowrap" : ""
                        }`.trim()}
                        style={cellStyle}
                      >
                        {column.render(incident)}
                      </td>
                    );
                  })}
                </tr>
              ))}
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
                        "Brak zgłoszeń spełniających kryteria wyszukiwania."
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
