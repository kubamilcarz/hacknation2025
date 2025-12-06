'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useIncidents } from '@/context/IncidentContext';
import {
  incidentService,
  type IncidentListOptions,
} from '@/lib/services/incidentService';
import { type Incident, type IncidentPriority, type IncidentStatus } from '@/types/incident';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import Footer from '@/components/Footer';
import { Pagination } from '@/components/Pagination';

const VALID_STATUS_VALUES: IncidentStatus[] = ['pending', 'in-progress', 'resolved', 'rejected'];

const isIncidentStatusValue = (value: string | null): value is IncidentStatus =>
  value != null && VALID_STATUS_VALUES.includes(value as IncidentStatus);

const isSortDirectionValue = (value: string | null): value is 'asc' | 'desc' =>
  value === 'asc' || value === 'desc';

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

const PAGE_SIZE = 10;

const MIN_COLUMN_WIDTH = 140;
const TEXT_COLUMN_IDS = new Set(['caseNumber', 'title', 'reporterName', 'category']);

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
  resizable?: boolean;
  width?: number;
};

type SortConfig = { columnId: string; direction: 'asc' | 'desc' } | null;

export default function EmployeeDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const incidentsContext = useIncidents();
  const {
    incidents,
    isLoading,
    totalPages: totalPagesFromService,
    page: currentServicePage,
    pageSize: currentPageSize,
    loadIncidents,
  } = incidentsContext;
  const totalCount = incidentsContext.totalCount;
  const statusParam = searchParams.get('status');
  const initialFilterStatus: IncidentStatus | 'all' = isIncidentStatusValue(statusParam) ? statusParam : 'all';
  const initialSearchTerm = searchParams.get('search') ?? '';
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>(initialFilterStatus);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const searchCommittedValueRef = useRef<string | null>(
    initialSearchTerm.trim().length > 0 ? initialSearchTerm.trim() : null
  );
  const pageHydrationRef = useRef(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  const handleCreateIncident = useCallback(() => {
    router.push('/dashboard/employee/new');
  }, [router]);

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
    [closeActionMenu, openActionMenuId, router, toggleActionMenu]
  );

  const columns = useMemo<ColumnDefinition[]>(
    () => [
      {
        id: 'caseNumber',
        label: 'Numer sprawy',
        minWidth: 160,
        cellClassName: 'font-semibold text-secondary',
        render: (incident) => <span className="block truncate">{incident.caseNumber}</span>,
        sortable: true,
        sortAccessor: (incident) => incident.caseNumber,
        sticky: 'left',
      },
      {
        id: 'title',
        label: 'Tytuł',
        minWidth: 220,
        cellClassName: 'text-primary',
        render: (incident) => <span className="block truncate">{incident.title}</span>,
        sortable: true,
        sortAccessor: (incident) => incident.title,
      },
      {
        id: 'reporterName',
        label: 'Zgłaszający',
        minWidth: 190,
        cellClassName: 'text-secondary',
        render: (incident) => <span className="block truncate">{incident.reporterName}</span>,
        sortable: true,
        sortAccessor: (incident) => incident.reporterName,
      },
      {
        id: 'category',
        label: 'Kategoria',
        minWidth: 170,
        cellClassName: 'text-secondary',
        render: (incident) => <span className="block truncate">{incident.category}</span>,
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
        minWidth: 124,
        width: 124,
        sticky: 'right',
        align: 'right',
        resizable: false,
        render: renderActionsCell,
      },
    ],
    [formatDate, getPriorityBadge, getStatusBadge, renderActionsCell]
  );

  const computeDefaultSortConfig = useCallback((): SortConfig => {
    const defaultSorted = columns.find((column) => column.sortable && column.defaultSortDirection);
    if (defaultSorted && defaultSorted.defaultSortDirection) {
      return { columnId: defaultSorted.id, direction: defaultSorted.defaultSortDirection };
    }
    const firstSortable = columns.find((column) => column.sortable);
    return firstSortable ? { columnId: firstSortable.id, direction: 'asc' } : null;
  }, [columns]);

  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const sortParam = searchParams.get('sort');
    const directionParam = searchParams.get('direction');
    if (sortParam) {
      const column = columns.find((entry) => entry.id === sortParam && entry.sortable);
      if (column) {
        const nextDirection = isSortDirectionValue(directionParam)
          ? directionParam
          : column.defaultSortDirection ?? 'asc';
        return { columnId: column.id, direction: nextDirection };
      }
    }

    return computeDefaultSortConfig();
  });

  const currentQueryOptionsRef = useRef<IncidentListOptions>({ page: 1, pageSize: PAGE_SIZE });

  const searchParamsString = searchParams.toString();
  const commitQueryParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParamsString);
      let didChange = false;

      Object.entries(updates).forEach(([key, value]) => {
        const nextValue = value ?? null;
        const currentValue = params.get(key);

        if (nextValue === null) {
          if (currentValue !== null) {
            params.delete(key);
            didChange = true;
          }
          return;
        }

        if (currentValue !== nextValue) {
          params.set(key, nextValue);
          didChange = true;
        }
      });

      if (!didChange) {
        return;
      }

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParamsString]
  );

  const rawPageParam = searchParams.get('page');
  const parsedPageParam = rawPageParam ? Number.parseInt(rawPageParam, 10) : NaN;
  const requestedPage = Number.isNaN(parsedPageParam) ? 1 : parsedPageParam;
  const normalizedRequestedPage = requestedPage < 1 ? 1 : requestedPage;
  const totalPages = Math.max(1, totalPagesFromService);
  const currentPage = Math.min(Math.max(1, currentServicePage), totalPages);
  const firstItemIndex = (currentPage - 1) * currentPageSize;
  const hasResults = totalCount > 0;
  const displayRangeStart = hasResults ? firstItemIndex + 1 : 0;
  const displayRangeEnd = hasResults
    ? Math.min(totalCount, firstItemIndex + incidents.length)
    : 0;

  const showLoadingState = isLoading;
  const showEmptyState = !isLoading && totalCount === 0;
  const isFallbackState = showLoadingState || showEmptyState;

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const rawSearchParam = params.get('search');
    const normalizedSearch = rawSearchParam?.trim() ?? '';
    const searchOption = normalizedSearch.length > 0 ? normalizedSearch : null;

    const statusParam = params.get('status');
    if (statusParam && statusParam !== 'all' && !isIncidentStatusValue(statusParam)) {
      return;
    }
    const resolvedStatus: IncidentStatus | 'all' =
      statusParam && isIncidentStatusValue(statusParam) ? statusParam : 'all';

    const sortParam = params.get('sort');
    const directionParam = params.get('direction');
    const defaultSort = computeDefaultSortConfig();
    const columnForSort = sortParam
      ? columns.find((entry) => entry.id === sortParam && entry.sortable)
      : defaultSort
        ? columns.find((entry) => entry.id === defaultSort.columnId && entry.sortable)
        : null;

    if (sortParam && !columnForSort) {
      return;
    }

    const resolvedSort = (columnForSort?.id ?? defaultSort?.columnId ?? 'createdAt') as IncidentListOptions['sort'];
    const resolvedDirection: 'asc' | 'desc' = columnForSort
      ? (isSortDirectionValue(directionParam)
        ? directionParam
        : columnForSort.defaultSortDirection ?? 'asc')
      : defaultSort?.direction ?? 'desc';

    const nextOptions: IncidentListOptions = {
      page: normalizedRequestedPage,
      pageSize: currentPageSize,
      search: searchOption,
      status: resolvedStatus,
      sort: resolvedSort,
      direction: resolvedDirection,
    };

    currentQueryOptionsRef.current = nextOptions;
    void loadIncidents(nextOptions);
  }, [
    columns,
    computeDefaultSortConfig,
    currentPageSize,
    loadIncidents,
    normalizedRequestedPage,
    searchParamsString,
  ]);

  const commitSearchTerm = useCallback(
    (value?: string) => {
      const nextValue = value ?? searchTerm;
      const normalized = nextValue.trim();
      const canonical = normalized.length > 0 ? normalized : null;
      if (searchCommittedValueRef.current === canonical) {
        return;
      }

      searchCommittedValueRef.current = canonical;
      setOpenActionMenuId(null);
      commitQueryParams({
        search: canonical,
        page: null,
      });
    },
    [commitQueryParams, searchTerm]
  );

  useEffect(() => {
    if (!pageHydrationRef.current) {
      pageHydrationRef.current = true;
      return;
    }

    if (isLoading) {
      return;
    }

    const desiredPage = currentPage;
    const desiredValue = desiredPage <= 1 ? null : String(desiredPage);
    const currentValue = rawPageParam ?? null;

    if (desiredValue === currentValue) {
      return;
    }

    commitQueryParams({ page: desiredValue });
  }, [commitQueryParams, currentPage, isLoading, rawPageParam]);

  const handlePageChange = useCallback(
    (page: number) => {
      commitSearchTerm();
      setOpenActionMenuId(null);
      const normalizedTarget = Math.max(1, Math.min(totalPages, Math.floor(page)));
      const desiredValue = normalizedTarget <= 1 ? null : String(normalizedTarget);
      const currentValue = rawPageParam ?? null;
      if (desiredValue === currentValue) {
        return;
      }
      commitQueryParams({ page: desiredValue });
    },
    [commitQueryParams, commitSearchTerm, rawPageParam, totalPages]
  );

  const handleSearchInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setOpenActionMenuId(null);
      setSearchTerm(value);
    },
    []
  );

  const handleSearchInputBlur = useCallback(() => {
    commitSearchTerm();
  }, [commitSearchTerm]);

  const handleSearchInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        commitSearchTerm(event.currentTarget.value);
      }
    },
    [commitSearchTerm]
  );

  const handleStatusChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      const normalized: IncidentStatus | 'all' =
        value === 'all' ? 'all' : isIncidentStatusValue(value) ? (value as IncidentStatus) : 'all';
      commitSearchTerm();
      setFilterStatus(normalized);
      setOpenActionMenuId(null);
      commitQueryParams({
        status: normalized === 'all' ? null : normalized,
        page: null,
      });
    },
    [commitQueryParams, commitSearchTerm]
  );

  useEffect(() => {
    const currentParams = new URLSearchParams(searchParamsString);
    const rawSearchParam = currentParams.get('search');
    const normalizedSearchParam = rawSearchParam?.trim() ?? '';
    const canonicalValue = normalizedSearchParam.length > 0 ? normalizedSearchParam : null;

    if (rawSearchParam && rawSearchParam !== normalizedSearchParam) {
      searchCommittedValueRef.current = canonicalValue;
      commitQueryParams({ search: canonicalValue });
      return;
    }

    if (searchCommittedValueRef.current !== canonicalValue) {
      searchCommittedValueRef.current = canonicalValue;
    }

    startTransition(() => {
      setSearchTerm((currentValue) => {
        if (currentValue === normalizedSearchParam) {
          return currentValue;
        }
        return normalizedSearchParam;
      });
    });
  }, [commitQueryParams, searchParamsString]);


  useEffect(() => {
    const nextStatusParam = searchParams.get('status');
    const normalizedStatus: IncidentStatus | 'all' = isIncidentStatusValue(nextStatusParam)
      ? nextStatusParam
      : 'all';

    if (!isIncidentStatusValue(nextStatusParam) && nextStatusParam != null && nextStatusParam !== 'all') {
      commitQueryParams({ status: normalizedStatus === 'all' ? null : normalizedStatus });
      return;
    }

    if (normalizedStatus !== filterStatus) {
      startTransition(() => {
        setFilterStatus(normalizedStatus);
      });
    }
  }, [commitQueryParams, filterStatus, searchParams]);

  useEffect(() => {
    const sortParam = searchParams.get('sort');
    const directionParam = searchParams.get('direction');
    let nextSortConfig = null as SortConfig;

    if (sortParam) {
      const column = columns.find((entry) => entry.id === sortParam && entry.sortable);
      if (column) {
        const nextDirection = isSortDirectionValue(directionParam)
          ? directionParam
          : column.defaultSortDirection ?? 'asc';
        nextSortConfig = { columnId: column.id, direction: nextDirection };
      }
    }

    if (!nextSortConfig) {
      nextSortConfig = computeDefaultSortConfig();
    }

    const hasChanged =
      (sortConfig?.columnId ?? null) !== (nextSortConfig?.columnId ?? null) ||
      (sortConfig?.direction ?? null) !== (nextSortConfig?.direction ?? null);

    if (hasChanged) {
      startTransition(() => {
        setSortConfig(nextSortConfig);
      });
    }
    const canonicalSort = nextSortConfig?.columnId ?? null;
    const canonicalDirection = nextSortConfig?.direction ?? null;
    const currentSortParam = sortParam ?? null;
    const currentDirectionParam = isSortDirectionValue(directionParam) ? directionParam : null;

    if (canonicalSort !== currentSortParam || canonicalDirection !== currentDirectionParam) {
      commitQueryParams({
        sort: canonicalSort,
        direction: canonicalDirection,
      });
    }
  }, [columns, commitQueryParams, computeDefaultSortConfig, searchParams, sortConfig]);

  const handleExportCsv = useCallback(async () => {
    if (totalCount === 0) {
      return;
    }

    const formatCsvField = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = [
      'Numer sprawy',
      'Tytuł',
      'Zgłaszający',
      'Kategoria',
      'Priorytet',
      'Status',
      'Data',
    ];

    const baseOptions = currentQueryOptionsRef.current;
    const exportPageSize = Math.max(totalCount, baseOptions.pageSize ?? PAGE_SIZE);

    try {
      const response = await incidentService.list({
        ...baseOptions,
        page: 1,
        pageSize: exportPageSize,
      });
      const dataset = response.items;
      if (dataset.length === 0) {
        return;
      }

      const rows = dataset
        .map((incident) => [
          incident.caseNumber,
          incident.title,
          incident.reporterName,
          incident.category,
          priorityLabels[incident.priority],
          statusLabels[incident.status],
          formatDate(incident.createdAt),
        ]
          .map(formatCsvField)
          .join(';'));

      const csvContent = [header.map(formatCsvField).join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-zgloszen-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Nie udało się wyeksportować zgłoszeń.', error);
    }
  }, [formatDate, totalCount]);

  const handleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((entry) => entry.id === columnId && entry.sortable);
      if (!column) {
        return;
      }

      const defaultDirection = column.defaultSortDirection ?? 'asc';
      const isSameColumn = sortConfig?.columnId === columnId;
      const nextDirection = isSameColumn
        ? sortConfig?.direction === 'asc'
          ? 'desc'
          : 'asc'
        : defaultDirection;
      const nextConfig: SortConfig = { columnId, direction: nextDirection };

      if (isSameColumn && sortConfig?.direction === nextDirection) {
        return;
      }

      commitSearchTerm();
      setSortConfig(nextConfig);
      setOpenActionMenuId(null);
      commitQueryParams({
        sort: columnId,
        direction: nextDirection,
        page: null,
      });
    },
    [columns, commitQueryParams, commitSearchTerm, sortConfig]
  );


  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    columns.reduce<Record<string, number>>((accumulator, column) => {
      const initialWidth = column.width ?? column.minWidth ?? MIN_COLUMN_WIDTH;
      accumulator[column.id] = initialWidth;
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

  const getColumnWidth = useCallback(
    (columnId: string, fallback: number) => {
      const column = columns.find((entry) => entry.id === columnId);
      const defaultWidth = column?.width ?? column?.minWidth ?? fallback;
      return columnWidths[columnId] ?? defaultWidth;
    },
    [columnWidths, columns]
  );

  const startResize = (columnId: string, event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.detail > 1) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const headerCell = event.currentTarget.closest('th') as HTMLTableCellElement | null;
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
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    setIsResizing(true);
  };

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
    (columnId: string, event: ReactMouseEvent<HTMLButtonElement>) => {
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-primary">Lista zgłoszeń</h1>
                <p className="mt-2 text-sm text-muted">
                  Przegląd zgłoszeń. Możesz filtrować, wyszukiwać i sortować zgłoszenia według różnych kryteriów.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleCreateIncident}
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
                  Dodaj zgłoszenie
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
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

          <div className="mb-6 flex flex-col gap-4 border border-subtle bg-surface-subdued p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex w-full gap-3 sm:flex-1">
              <input
                type="search"
                placeholder="Szukaj po tytule, nazwisku, e-mailu lub numerze sprawy"
                value={searchTerm}
                onChange={handleSearchInputChange}
                onBlur={handleSearchInputBlur}
                onKeyDown={handleSearchInputKeyDown}
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
                onChange={handleStatusChange}
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
              {isLoading
                ? 'Ładowanie danych…'
                : totalCount === 0
                  ? 'Brak zgłoszeń spełniających kryteria wyszukiwania.'
                  : `Wyświetlono ${displayRangeStart}-${displayRangeEnd} z ${totalCount} zgłoszeń (łącznie ${incidents.length})`}
          </div>

          <div className="rounded-lg border border-subtle">
            <div className={isFallbackState ? 'overflow-hidden' : 'overflow-x-auto'}>
              <table
                className={`w-full divide-y divide-subtle text-sm ${isFallbackState ? 'table-fixed' : ''}`}
                style={
                  isFallbackState
                    ? undefined
                    : {
                        minWidth: `${columns.reduce(
                          (sum, column) =>
                            sum + getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH),
                          0
                        )}px`,
                      }
                }
              >
                <thead className="bg-surface-subdued text-xs font-medium uppercase tracking-wide text-muted">
                  <tr>
                    {columns.map((column) => {
                      const isSortable = Boolean(column.sortable);
                      const isActiveSort = sortConfig?.columnId === column.id;
                      const width = isFallbackState
                        ? undefined
                        : getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH);
                      const stickyClassName =
                        column.sticky === 'left'
                          ? 'sticky left-0'
                          : column.sticky === 'right'
                            ? 'sticky right-0'
                            : '';
                      const canResize = !isFallbackState && column.resizable !== false;
                      const fallbackVisibilityClass =
                        isFallbackState && column.id !== 'caseNumber' && column.id !== 'actions'
                          ? 'hidden sm:table-cell'
                          : '';
                      const headerStyle: CSSProperties = {
                        zIndex: column.sticky ? 10 : undefined,
                        background: column.sticky ? 'var(--color-surface-subdued)' : undefined,
                        height: '3rem',
                        verticalAlign: 'middle',
                      };
                      if (width != null) {
                        headerStyle.width = width;
                        headerStyle.minWidth = width;
                      }
                      return (
                        <th
                          key={column.id}
                          className={`group relative px-3 py-2.5 ${stickyClassName} ${fallbackVisibilityClass} ${column.align === 'right' ? 'text-right' : 'text-left'} select-none`}
                          style={headerStyle}
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
                            {canResize && (
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
                        const width = isFallbackState
                          ? undefined
                          : getColumnWidth(column.id, column.minWidth ?? MIN_COLUMN_WIDTH);
                        const stickyClassName =
                          column.sticky === 'left'
                            ? 'sticky left-0'
                            : column.sticky === 'right'
                              ? 'sticky right-0'
                              : '';
                        const isTextColumn = TEXT_COLUMN_IDS.has(column.id);
                        const alignmentClass = column.align === 'right' ? 'text-right' : 'text-left';
                        const isActionsColumn = column.id === 'actions';
                        const isMenuOpenForRow = isActionsColumn && openActionMenuId === incident.id;
                        const baseZIndex = column.sticky ? 5 : undefined;
                        const cellZIndex = isMenuOpenForRow ? 80 : baseZIndex;
                        const fallbackVisibilityClass =
                          isFallbackState && column.id !== 'caseNumber' && column.id !== 'actions'
                            ? 'hidden sm:table-cell'
                            : '';
                        const cellStyle: CSSProperties = {
                          zIndex: cellZIndex,
                          background: column.sticky ? 'var(--color-surface)' : undefined,
                        };
                        if (width != null) {
                          cellStyle.width = width;
                          cellStyle.minWidth = width;
                        }
                        return (
                          <td
                            key={`${incident.id}-${column.id}`}
                            className={`px-3 py-3 ${alignmentClass} ${stickyClassName} ${fallbackVisibilityClass} ${column.cellClassName ?? ''} ${isTextColumn ? 'overflow-hidden whitespace-nowrap' : ''}`.trim()}
                            style={cellStyle}
                          >
                            {column.render(incident)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {(showEmptyState || showLoadingState) && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="p-0 align-middle"
                        style={{ height: 'calc(3 * 3.75rem)' }}
                      >
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted">
                          {showLoadingState ? 'Trwa ładowanie danych testowych…' : 'Brak zgłoszeń spełniających kryteria wyszukiwania.'}
                        </div>
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </div>
          {totalCount > 0 && (
            <Pagination
              className="mt-6"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
        <Footer router={router} showPanelButton={false} />
      </div>
    </div>
  );
}
