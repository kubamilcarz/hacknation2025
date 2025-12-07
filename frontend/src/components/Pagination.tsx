'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

const MAX_VISIBLE_PAGE_BUTTONS = 5;

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const [pageInput, setPageInput] = useState(() => String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const paginationItems = useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= MAX_VISIBLE_PAGE_BUTTONS) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: (number | 'ellipsis')[] = [];
    const halfWindow = Math.floor(MAX_VISIBLE_PAGE_BUTTONS / 2);
    let windowStart = currentPage - halfWindow;
    let windowEnd = currentPage + halfWindow;

    if (windowStart < 1) {
      windowEnd += 1 - windowStart;
      windowStart = 1;
    }

    if (windowEnd > totalPages) {
      windowStart -= windowEnd - totalPages;
      windowEnd = totalPages;
    }

    windowStart = Math.max(1, windowStart);
    windowEnd = Math.min(totalPages, windowEnd);

    if (windowStart > 1) {
      items.push(1);
      if (windowStart > 2) {
        items.push('ellipsis');
      }
    }

    for (let page = windowStart; page <= windowEnd; page += 1) {
      items.push(page);
    }

    if (windowEnd < totalPages) {
      if (windowEnd < totalPages - 1) {
        items.push('ellipsis');
      }
      items.push(totalPages);
    }

    return items;
  }, [currentPage, totalPages]);

  const requestPageChange = useCallback(
    (page: number) => {
      const normalized = Math.max(1, Math.min(totalPages, Math.floor(page)));
      if (normalized === currentPage) {
        return;
      }
      onPageChange(normalized);
    },
    [currentPage, onPageChange, totalPages]
  );

  const handlePrevPage = useCallback(() => {
    requestPageChange(currentPage - 1);
  }, [currentPage, requestPageChange]);

  const handleNextPage = useCallback(() => {
    requestPageChange(currentPage + 1);
  }, [currentPage, requestPageChange]);

  const handlePageButtonClick = useCallback(
    (page: number) => {
      requestPageChange(page);
    },
    [requestPageChange]
  );

  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/[^0-9]/g, '');
    setPageInput(digitsOnly);
  }, []);

  const handleInputSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = Number.parseInt(pageInput, 10);
      if (Number.isNaN(value)) {
        setPageInput(String(currentPage));
        return;
      }
      requestPageChange(value);
    },
    [currentPage, pageInput, requestPageChange]
  );

  const handleInputBlur = useCallback(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`.trim()}>
      <div className="text-sm text-muted">Strona {currentPage} z {totalPages}</div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-surface text-secondary transition hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Poprzednia strona"
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
            <path d="m12 15-5-5 5-5" />
          </svg>
        </button>

        {paginationItems.map((item, index) => {
          if (item === 'ellipsis') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted">
                ...
              </span>
            );
          }

          const isActive = item === currentPage;
          return (
            <button
              key={item}
              type="button"
              onClick={() => handlePageButtonClick(item)}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) ${isActive ? 'border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)' : 'border-subtle bg-surface text-secondary hover:border-(--color-border-strong) hover:text-foreground'}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item}
            </button>
          );
        })}

        <form onSubmit={handleInputSubmit} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageInput}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            aria-label="Przejdź do strony"
            className="h-9 w-16 rounded-md border border-subtle bg-input px-2 text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring)"
          />
          <span className="text-sm text-muted">/ {totalPages}</span>
        </form>

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-subtle bg-surface text-secondary transition hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Następna strona"
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
            <path d="m8 5 5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
