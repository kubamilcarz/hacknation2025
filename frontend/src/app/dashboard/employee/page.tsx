'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidents } from '@/context/IncidentContext';
import { type Incident, type IncidentPriority, type IncidentStatus } from '@/types/incident';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import Footer from '@/components/Footer';

const statusLabels: Record<IncidentStatus, string> = {
  pending: 'Oczekujące',
  'in-progress': 'W trakcie',
  resolved: 'Rozwiązane',
  rejected: 'Odrzucone',
};

const priorityLabels: Record<IncidentPriority, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  critical: 'Krytyczny',
};

const priorityRank: Record<IncidentPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const statusRank: Record<IncidentStatus, number> = {
  pending: 1,
  'in-progress': 2,
  resolved: 3,
  rejected: 4,
};

const MIN_COLUMN_WIDTH = 140;

type ColumnDefinition = {
  id: string;
  label: string;
  minWidth?: number;
  render: (incident: Incident) => ReactNode;
  cellClassName?: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  sortAccessor?: (incident: Incident) => string | number | Date;
  defaultSortDirection?: 'asc' | 'desc';
  sticky?: 'left' | 'right';
};

type SortConfig = { columnId: string; direction: 'asc' | 'desc' } | null;

export default function EmployeeDashboard() {
  const router = useRouter();
  const { incidents, isLoading } = useIncidents();
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const getStatusBadge = useCallback((status: IncidentStatus) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';
    const styles: Record<IncidentStatus, string> = {
      pending: 'bg-(--color-warning-soft) text-(--color-warning)',
      'in-progress': 'bg-(--color-info-soft) text-(--color-info)',
      resolved: 'bg-(--color-success-soft) text-(--color-success)',
      rejected: 'bg-(--color-error-soft) text-(--color-error)',
    };

    return <span className={`${base} ${styles[status]}`}>{statusLabels[status]}</span>;
  }, []);

  const getPriorityBadge = useCallback((priority: IncidentPriority) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';
    const styles: Record<IncidentPriority, string> = {
      low: 'bg-(--color-support-soft) text-(--color-support)',
      medium: 'bg-(--color-info-soft) text-(--color-info)',
      high: 'bg-(--color-warning-soft) text-(--color-warning)',
      critical: 'bg-(--color-error-soft) text-(--color-error)',
    };

    return <span className={`${base} ${styles[priority]}`}>{priorityLabels[priority]}</span>;
  }, []);

  const formatDate = useCallback(
    (input: Date) =>
      new Date(input).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    []
  );

  const actionMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
      if (event.key === 'Escape') {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
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
            onClick={() => router.push(`/dashboard/employee/${incident.id}`)}
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
            <div className="absolute right-0 top-12 z-20 w-48 rounded-lg border border-subtle bg-surface p-1 text-sm shadow-lg">
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
    [closeActionMenu, openActionMenuId, router, toggleActionMenu]
  );

  const columns = useMemo<ColumnDefinition[]>(
    () => [
      {
        id: 'caseNumber',
        label: 'Numer sprawy',
        minWidth: 160,
        cellClassName: 'font-semibold text-secondary',
        render: (incident) => incident.caseNumber,
        sortable: true,
        sortAccessor: (incident) => incident.caseNumber,
        sticky: 'left',
      },
      {
        id: 'title',
        label: 'Tytuł',
        minWidth: 220,
        cellClassName: 'text-primary',
        render: (incident) => incident.title,
        sortable: true,
        sortAccessor: (incident) => incident.title,
      },
      {
        id: 'reporterName',
        label: 'Zgłaszający',
        minWidth: 190,
        cellClassName: 'text-secondary',
        render: (incident) => incident.reporterName,
        sortable: true,
        sortAccessor: (incident) => incident.reporterName,
      },
      {
        id: 'category',
        label: 'Kategoria',
        minWidth: 170,
        cellClassName: 'text-secondary',
        render: (incident) => incident.category,
        sortable: true,
        sortAccessor: (incident) => incident.category,
      },
      {
        id: 'priority',
        label: 'Priorytet',
        minWidth: 150,
        render: (incident) => getPriorityBadge(incident.priority),
        sortable: true,
        sortAccessor: (incident) => priorityRank[incident.priority],
      },
      {
        id: 'status',
        label: 'Status',
        minWidth: 150,
        render: (incident) => getStatusBadge(incident.status),
        sortable: true,
        sortAccessor: (incident) => statusRank[incident.status],
      },
      {
        id: 'createdAt',
        label: 'Data',
        minWidth: 150,
        cellClassName: 'text-secondary',
        render: (incident) => formatDate(incident.createdAt),
        sortable: true,
        sortAccessor: (incident) => incident.createdAt.getTime(),
        defaultSortDirection: 'desc',
      },
      {
        id: 'actions',
        label: 'Akcje',
        minWidth: 120,
        sticky: 'right',
        align: 'right',
        render: renderActionsCell,
      },
    ],
    [formatDate, getPriorityBadge, getStatusBadge, renderActionsCell]
  );

  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const defaultSorted = columns.find((column) => column.sortable && column.defaultSortDirection);
    if (defaultSorted && defaultSorted.defaultSortDirection) {
      return { columnId: defaultSorted.id, direction: defaultSorted.defaultSortDirection };
    }
    const firstSortable = columns.find((column) => column.sortable);
    return firstSortable ? { columnId: firstSortable.id, direction: 'asc' } : null;
  });

  const filteredIncidents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchesStatus = (incident: Incident) =>
      filterStatus === 'all' ? true : incident.status === filterStatus;

    const matchesSearch = (incident: Incident) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        incident.title,
        incident.reporterName,
        incident.reporterEmail,
        incident.caseNumber,
      ];

      return haystack.some((value) => value.toLowerCase().includes(normalizedSearch));
    };

    const filtered = incidents.filter((incident) => matchesStatus(incident) && matchesSearch(incident));

    if (!sortConfig) {
      return filtered;
    }

    const activeColumn = columns.find((column) => column.id === sortConfig.columnId && column.sortable);
    if (!activeColumn) {
      return filtered;
    }

    const accessor: NonNullable<ColumnDefinition['sortAccessor']> =
      activeColumn.sortAccessor ?? ((incident) => {
        const value = incident[activeColumn.id as keyof Incident];
        return value instanceof Date ? value.getTime() : (value as string | number | undefined) ?? '';
      });

    const directionFactor = sortConfig.direction === 'asc' ? 1 : -1;

    return [...filtered].sort((first, second) => {
      const firstValue = accessor(first);
      const secondValue = accessor(second);

      if (firstValue == null && secondValue == null) {
        return 0;
      }

      if (firstValue == null) {
        return -directionFactor;
      }

      if (secondValue == null) {
        return directionFactor;
      }

      if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return (firstValue - secondValue) * directionFactor;
      }

      const firstComparable = firstValue instanceof Date ? firstValue.getTime() : firstValue;
      const secondComparable = secondValue instanceof Date ? secondValue.getTime() : secondValue;

      if (typeof firstComparable === 'number' && typeof secondComparable === 'number') {
        return (firstComparable - secondComparable) * directionFactor;
      }

      return firstComparable.toString().localeCompare(secondComparable.toString(), 'pl') * directionFactor;
    });
  }, [columns, filterStatus, incidents, searchTerm, sortConfig]);

  const handleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((entry) => entry.id === columnId && entry.sortable);
      if (!column) {
        return;
      }

      setSortConfig((current) => {
        if (!current || current.columnId !== columnId) {
          return { columnId, direction: column.defaultSortDirection ?? 'asc' };
        }

        return { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      });
    },
    [columns]
  );


  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    columns.reduce<Record<string, number>>((accumulator, column) => {
      accumulator[column.id] = column.minWidth ?? MIN_COLUMN_WIDTH;
      return accumulator;
    }, {})
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizeStylesRef = useRef<{ userSelect: string; cursor: string } | null>(null);

  useEffect(() => {
    if (isResizing) {
      resizeStylesRef.current = {
        userSelect: document.body.style.userSelect,
        cursor: document.body.style.cursor,
      };

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

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

  const getColumnWidth = (columnId: string, fallback: number) =>
    columnWidths[columnId] ?? fallback;

  const startResize = (columnId: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const headerCell = event.currentTarget.closest('th') as HTMLTableCellElement | null;
    if (!headerCell) {
      return;
    }

    const startX = event.clientX;
    const startWidth = columnWidths[columnId] ?? headerCell.offsetWidth;
    const columnDefinition = columns.find((column) => column.id === columnId);
    const minWidth = columnDefinition?.minWidth ?? MIN_COLUMN_WIDTH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(minWidth, startWidth + delta);
      setColumnWidths((current) => ({ ...current, [columnId]: nextWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    setIsResizing(true);
  };

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
          <div className="mb-8 flex flex-col gap-4">
            <Breadcrumbs
              items={[
                { href: '/dashboard/employee', labelKey: 'panel' },
                { labelKey: 'incident-list' },
              ]}
            />
            <div>
              <h1 className="text-3xl font-semibold text-primary">Panel pracownika ZUS</h1>
              <p className="mt-2 text-sm text-muted">
                Przegląd zgłoszeń z wirtualnego asystenta. Obecnie korzystamy z danych testowych – po integracji
                z backendem lista zostanie zsynchronizowana z systemami ZUS.
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-4 border border-subtle bg-surface-subdued p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex w-full gap-3 sm:flex-1">
              <input
                type="search"
                placeholder="Szukaj po tytule, nazwisku, e-mailu lub numerze sprawy"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="flex-1 rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <label htmlFor="status" className="text-sm font-medium text-secondary">
                Status
              </label>
              <select
                id="status"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as IncidentStatus | 'all')}
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

          <div className="mb-4 text-sm text-muted">
            {isLoading ? 'Ładowanie danych…' : `Wyświetlono ${filteredIncidents.length} z ${incidents.length} zgłoszeń`}
          </div>

          <div className="rounded-lg border border-subtle">
            <div className="overflow-x-auto">
              <table
                className="w-full divide-y divide-subtle text-sm"
                style={{ minWidth: `${columns.reduce((sum, column) => sum + getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH), 0)}px` }}
              >
                <thead className="bg-surface-subdued text-xs font-medium uppercase tracking-wide text-muted">
                  <tr>
                    {columns.map((column) => {
                      const isSortable = Boolean(column.sortable);
                      const isActiveSort = sortConfig?.columnId === column.id;
                      const width = getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH);
                      const stickyClassName =
                        column.sticky === 'left'
                          ? 'sticky left-0'
                          : column.sticky === 'right'
                            ? 'sticky right-0'
                            : '';
                      return (
                        <th
                          key={column.id}
                          className={`group relative px-3 py-2.5 ${stickyClassName} ${column.align === 'right' ? 'text-right' : 'text-left'} select-none`}
                          style={{
                            width,
                            minWidth: width,
                            zIndex: column.sticky ? 10 : undefined,
                            background: column.sticky ? 'var(--color-surface-subdued)' : undefined,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => (isSortable ? handleSort(column.id) : undefined)}
                              className={`flex min-w-0 flex-1 items-center gap-1 truncate text-left font-medium transition ${isSortable ? 'cursor-pointer hover:text-(--color-foreground)' : 'cursor-default'}`}
                              tabIndex={isSortable ? 0 : -1}
                              disabled={!isSortable}
                            >
                              <span className="truncate">{column.label}</span>
                              {isSortable && (
                                <span className={`flex h-4 w-4 items-center justify-center text-muted transition ${isActiveSort ? 'text-(--color-accent)' : 'opacity-0 group-hover:opacity-60'}`} aria-hidden="true">
                                  <svg
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.4}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={`h-3.5 w-3.5 transition ${isActiveSort && sortConfig?.direction === 'desc' ? 'rotate-180' : ''}`}
                                  >
                                    <path d="M4 6.5 8 2.5l4 4" />
                                    <path d="M8 3v10" />
                                  </svg>
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onMouseDown={(event) => startResize(column.id, event)}
                              className="ml-1 flex h-6 w-2 cursor-col-resize items-center justify-center rounded-md bg-transparent opacity-0 transition hover:bg-(--color-accent-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 group-hover:opacity-100"
                              aria-label={`Dostosuj szerokość kolumny ${column.label}`}
                            >
                              <span className="h-full w-px bg-(--color-border-strong)" aria-hidden="true" />
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle bg-surface">
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="transition hover:bg-surface-subdued">
                      {columns.map((column) => {
                        const width = getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH);
                        const stickyClassName =
                          column.sticky === 'left'
                            ? 'sticky left-0'
                            : column.sticky === 'right'
                              ? 'sticky right-0'
                              : '';
                        return (
                          <td
                            key={`${incident.id}-${column.id}`}
                            className={`px-3 py-3 ${stickyClassName} ${column.cellClassName ?? ''}`.trim()}
                            style={{
                              width,
                              minWidth: width,
                              zIndex: column.sticky ? 5 : undefined,
                              background: column.sticky ? 'var(--color-surface)' : undefined,
                            }}
                          >
                            {column.render(incident)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {!isLoading && filteredIncidents.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted">
                        Brak zgłoszeń spełniających kryteria wyszukiwania.
                      </td>
                    </tr>
                  )}

                  {isLoading && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted">
                        Trwa ładowanie danych testowych…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <Footer router={router} showPanelButton={false} />
      </div>
    </div>
  );
}
