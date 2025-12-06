'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import {
  documentService,
  type DocumentListOptions,
} from '@/lib/services/documentService';
import Footer from '@/components/Footer';
import DashboardHeader from '@/components/employee/DashboardHeader';
import DocumentFiltersPanel, { type BooleanFilterValue } from '@/components/employee/DocumentFiltersPanel';
import EmployeeDocumentsTable, {
  type SortConfig,
  getEmployeeColumnDefaultDirection,
  getEmployeeDefaultSortConfig,
  isEmployeeSortableColumn,
} from '@/components/employee/EmployeeDocumentsTable';
import ExportDocumentsModal from '@/components/employee/ExportDocumentsModal';

const isSortDirectionValue = (value: string | null): value is 'asc' | 'desc' =>
  value === 'asc' || value === 'desc';

const PAGE_SIZE = 10;

const HELP_PROVIDED_PARAM = 'help';
const MACHINE_INVOLVED_PARAM = 'machine';

const parseFilterParamToState = (value: string | null): BooleanFilterValue => {
  if (value === 'yes') {
    return 'yes';
  }

  if (value === 'no') {
    return 'no';
  }

  return 'all';
};

const filterStateToParam = (value: BooleanFilterValue): string | null => {
  if (value === 'yes') {
    return 'yes';
  }

  if (value === 'no') {
    return 'no';
  }

  return null;
};

const filterParamToBoolean = (value: string | null): boolean | null => {
  if (value === 'yes') {
    return true;
  }

  if (value === 'no') {
    return false;
  }

  return null;
};

export default function EmployeeDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const documentsContext = useDocuments();
  const {
    documents,
    isLoading,
    totalPages: totalPagesFromService,
    page: currentServicePage,
    pageSize: currentPageSize,
    loadDocuments,
    error,
  } = documentsContext;
  const totalCount = documentsContext.totalCount;
  const hasLoaded = documentsContext.hasLoaded;
  const recordLabel = useMemo(() => {
    if (totalCount === 1) {
      return 'dokument';
    }
    if (totalCount >= 2 && totalCount <= 4) {
      return 'dokumenty';
    }
    return 'dokumentów';
  }, [totalCount]);
  const hasDocumentsToExport = totalCount > 0;
  const initialSearchTerm = searchParams.get('search') ?? '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [helpProvidedFilter, setHelpProvidedFilter] = useState<BooleanFilterValue>(
    parseFilterParamToState(searchParams.get(HELP_PROVIDED_PARAM))
  );
  const [machineInvolvedFilter, setMachineInvolvedFilter] = useState<BooleanFilterValue>(
    parseFilterParamToState(searchParams.get(MACHINE_INVOLVED_PARAM))
  );
  const searchCommittedValueRef = useRef<string | null>(
    initialSearchTerm.trim().length > 0 ? initialSearchTerm.trim() : null
  );
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCreateDocument = useCallback(() => {
    router.push('/dashboard/employee/new');
  }, [router]);

  const handleNavigateToDocument = useCallback((documentId: number) => {
    router.push(`/dashboard/employee/${documentId}`);
  }, [router]);

  const handleOpenExportModal = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleCloseExportModal = useCallback(() => {
    setIsExportModalOpen(false);
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

  const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
    const sortParam = searchParams.get('sort');
    const directionParam = searchParams.get('direction');
    if (sortParam && isEmployeeSortableColumn(sortParam)) {
      const nextDirection = isSortDirectionValue(directionParam)
        ? directionParam
        : getEmployeeColumnDefaultDirection(sortParam);
      return { columnId: sortParam, direction: nextDirection };
    }

    return getEmployeeDefaultSortConfig();
  });

  const currentQueryOptionsRef = useRef<DocumentListOptions>({ page: 1, pageSize: PAGE_SIZE });

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

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const rawSearchParam = params.get('search');
    const normalizedSearch = rawSearchParam?.trim() ?? '';
    const searchOption = normalizedSearch.length > 0 ? normalizedSearch : null;
    searchCommittedValueRef.current = searchOption;

    const sortParam = params.get('sort');
    const directionParam = params.get('direction');
    const helpParam = params.get(HELP_PROVIDED_PARAM);
    const machineParam = params.get(MACHINE_INVOLVED_PARAM);
    const defaultSort = getEmployeeDefaultSortConfig();
    const hasValidSortParam = sortParam ? isEmployeeSortableColumn(sortParam) : false;

    if (sortParam && !hasValidSortParam) {
      return;
    }

    const resolvedSort = (hasValidSortParam ? sortParam : defaultSort?.columnId ?? 'data_wypadku') as DocumentListOptions['sort'];
    const resolvedDirection: 'asc' | 'desc' = hasValidSortParam
      ? (isSortDirectionValue(directionParam)
        ? directionParam
        : getEmployeeColumnDefaultDirection(sortParam as DocumentListOptions['sort']))
      : defaultSort?.direction ?? 'desc';
    const resolvedHelpProvided = filterParamToBoolean(helpParam);
    const resolvedMachineInvolved = filterParamToBoolean(machineParam);

    const nextOptions: DocumentListOptions = {
      page: normalizedRequestedPage,
      pageSize: currentPageSize,
      search: searchOption,
      sort: resolvedSort,
      direction: resolvedDirection,
      helpProvided: resolvedHelpProvided,
      machineInvolved: resolvedMachineInvolved,
    };

    currentQueryOptionsRef.current = nextOptions;
    void loadDocuments(nextOptions);
  }, [currentPageSize, loadDocuments, normalizedRequestedPage, searchParamsString]);

  const commitSearchTerm = useCallback(
    (value?: string) => {
      const nextValue = value ?? searchTerm;
      const normalized = nextValue.trim();
      const canonical = normalized.length > 0 ? normalized : null;
      if (searchCommittedValueRef.current === canonical) {
        return false;
      }

      searchCommittedValueRef.current = canonical;
      commitQueryParams({
        search: canonical,
        page: null,
      });
      return true;
    },
    [commitQueryParams, searchTerm]
  );

  useEffect(() => {
    if (!hasLoaded || isLoading) {
      return;
    }

    const desiredValue = currentServicePage <= 1 ? null : String(currentServicePage);
    const currentValue = rawPageParam ?? null;

    if (desiredValue === currentValue) {
      return;
    }

    commitQueryParams({ page: desiredValue });
  }, [commitQueryParams, currentServicePage, hasLoaded, isLoading, rawPageParam]);

  const handlePageChange = useCallback(
    (page: number) => {
      const searchChanged = commitSearchTerm();
      if (searchChanged) {
        return;
      }
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

  const handleHelpProvidedChange = useCallback(
    (value: BooleanFilterValue) => {
      setHelpProvidedFilter(value);
      commitQueryParams({
        [HELP_PROVIDED_PARAM]: filterStateToParam(value),
        page: null,
      });
    },
    [commitQueryParams]
  );

  const handleMachineInvolvedChange = useCallback(
    (value: BooleanFilterValue) => {
      setMachineInvolvedFilter(value);
      commitQueryParams({
        [MACHINE_INVOLVED_PARAM]: filterStateToParam(value),
        page: null,
      });
    },
    [commitQueryParams]
  );

  useEffect(() => {
    const currentParams = new URLSearchParams(searchParamsString);
    const rawSearchParam = currentParams.get('search');
    const normalizedSearchParam = rawSearchParam?.trim() ?? '';
    const canonicalValue = normalizedSearchParam.length > 0 ? normalizedSearchParam : null;
    const nextHelpFilter = parseFilterParamToState(currentParams.get(HELP_PROVIDED_PARAM));
    const nextMachineFilter = parseFilterParamToState(currentParams.get(MACHINE_INVOLVED_PARAM));

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
      setHelpProvidedFilter((currentValue) => (currentValue === nextHelpFilter ? currentValue : nextHelpFilter));
      setMachineInvolvedFilter((currentValue) => (currentValue === nextMachineFilter ? currentValue : nextMachineFilter));
    });
  }, [commitQueryParams, searchParamsString]);


  useEffect(() => {
    const sortParam = searchParams.get('sort');
    const directionParam = searchParams.get('direction');
    let nextSortConfig: SortConfig = null;

    if (sortParam && isEmployeeSortableColumn(sortParam)) {
      const nextDirection = isSortDirectionValue(directionParam)
        ? directionParam
        : getEmployeeColumnDefaultDirection(sortParam);
      nextSortConfig = { columnId: sortParam, direction: nextDirection };
    }

    if (!nextSortConfig) {
      nextSortConfig = getEmployeeDefaultSortConfig();
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
  }, [commitQueryParams, searchParams, sortConfig]);

  const handleExportCsv = useCallback(async () => {
    if (totalCount === 0) {
      return;
    }

    const formatCsvField = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const header = [
      'ID',
      'Imię',
      'Nazwisko',
      'PESEL',
      'Data wypadku',
      'Godzina wypadku',
      'Miejsce wypadku',
      'Rodzaj urazów',
      'Czy udzielono pomocy',
    ];

    const baseOptions = currentQueryOptionsRef.current;
    const exportPageSize = Math.max(totalCount, baseOptions.pageSize ?? PAGE_SIZE);

    try {
      const response = await documentService.list({
        ...baseOptions,
        page: 1,
        pageSize: exportPageSize,
      });
      const dataset = response.items;
      if (dataset.length === 0) {
        return;
      }

      const rows = dataset
        .map((documentRow) => [
          documentRow.id ?? 'Brak danych',
          documentRow.imie,
          documentRow.nazwisko,
          documentRow.pesel,
          documentRow.data_wypadku,
          documentRow.godzina_wypadku,
          documentRow.miejsce_wypadku,
          documentRow.rodzaj_urazow,
          documentRow.czy_udzielona_pomoc ? 'Tak' : 'Nie',
        ].map(formatCsvField).join(';'));

      const csvContent = [header.map(formatCsvField).join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lista-dokumentow-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Nie udało się wyeksportować dokumentów.', error);
    }
  }, [totalCount]);

  const handleConfirmExport = useCallback(async () => {
    if (isExporting || totalCount === 0) {
      return;
    }

    try {
      setIsExporting(true);
      await handleExportCsv();
      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  }, [handleExportCsv, isExporting, totalCount]);

  const handleSort = useCallback(
    (columnId: DocumentListOptions['sort'], direction: 'asc' | 'desc') => {
      if (sortConfig?.columnId === columnId && sortConfig.direction === direction) {
        return;
      }

      commitSearchTerm();
      setSortConfig({ columnId, direction });
      commitQueryParams({
        sort: columnId,
        direction,
        page: null,
      });
    },
    [commitQueryParams, commitSearchTerm, sortConfig]
  );

  return (
    <>
      <div className="min-h-screen bg-app py-8">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
            <DashboardHeader
              breadcrumbs={[
                { href: '/dashboard/employee', labelKey: 'panel' },
                { labelKey: 'incident-list' },
              ]}
              title="Lista dokumentów"
              description="Przegląd przetworzonych dokumentów zgłoszeń ZUS."
              onCreateDocument={handleCreateDocument}
              onExportClick={handleOpenExportModal}
            />

            <DocumentFiltersPanel
              searchValue={searchTerm}
              onSearchChange={handleSearchInputChange}
              onSearchBlur={handleSearchInputBlur}
              onSearchKeyDown={handleSearchInputKeyDown}
              helpProvidedValue={helpProvidedFilter}
              onHelpProvidedChange={handleHelpProvidedChange}
              machineInvolvedValue={machineInvolvedFilter}
              onMachineInvolvedChange={handleMachineInvolvedChange}
            />

            <EmployeeDocumentsTable
              documents={documents}
              totalCount={totalCount}
              isLoading={isLoading}
              hasLoaded={hasLoaded}
              error={error}
              sortConfig={sortConfig}
              onSortChange={handleSort}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={currentPageSize}
              formatDate={formatDate}
              onNavigateToDocument={handleNavigateToDocument}
            />
          </div>
          <Footer router={router} showPanelButton={false} />
        </div>
      </div>

      <ExportDocumentsModal
        isOpen={isExportModalOpen}
        onClose={handleCloseExportModal}
        onConfirm={handleConfirmExport}
        isExporting={isExporting}
        totalCount={totalCount}
        recordLabel={recordLabel}
        hasDocumentsToExport={hasDocumentsToExport}
      />
    </>
  );
}
