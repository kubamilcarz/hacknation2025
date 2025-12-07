'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import {
  employeeDocumentService,
  formatFileSize,
  formatStatus,
} from '@/lib/services/employeeDocumentService';
import type { EmployeeDocument } from '@/types/employeeDocument';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface DocumentDetailPageProps {
  params: { id: string };
}

const DESCRIPTION_SOURCE_LABEL: Record<EmployeeDocument['descriptionSource'], string> = {
  ai: 'Opis wygenerowany przez AI',
  manual: 'Opis dodany ręcznie',
};

function getStatusBadgeClasses(status: EmployeeDocument['analysisStatus']) {
  switch (status) {
    case 'completed':
      return 'border-(--color-success) bg-(--color-success-soft) text-(--color-success)';
    case 'processing':
      return 'border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent-text)';
    case 'failed':
      return 'border-(--color-error) bg-(--color-error-soft) text-(--color-error)';
    default:
      return 'border-subtle bg-surface text-secondary';
  }
}

function formatUploadDate(iso: string) {
  if (!iso) {
    return 'Brak danych';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export default function DocumentDetail({ params }: DocumentDetailPageProps) {
  const router = useRouter();
  const documentId = Number.parseInt(params.id, 10);
  const { isLoading, getDocumentById, downloadOriginalDocument } = useDocuments();

  const documentFromStore = useMemo(
    () => (Number.isNaN(documentId) ? undefined : getDocumentById(documentId)),
    [documentId, getDocumentById],
  );

  const [remoteDocument, setRemoteDocument] = useState<EmployeeDocument | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(
    Number.isNaN(documentId) ? 'Nieprawidłowy identyfikator dokumentu.' : null,
  );

  const documentData = documentFromStore ?? remoteDocument;
  const error = documentFromStore ? null : remoteError;

  useEffect(() => {
    if (documentFromStore || isLoading || Number.isNaN(documentId)) {
      return;
    }

    let isCancelled = false;

    const fetchDocument = async () => {
      try {
        const remote = await employeeDocumentService.getById(documentId);
        if (isCancelled) {
          return;
        }

        if (remote) {
          setRemoteDocument(remote);
          setRemoteError(null);
        } else {
          setRemoteError('Nie znaleziono dokumentu.');
        }
      } catch {
        if (!isCancelled) {
          setRemoteError('Nie udało się pobrać dokumentu.');
        }
      }
    };

    void fetchDocument();

    return () => {
      isCancelled = true;
    };
  }, [documentFromStore, documentId, isLoading]);

  const breadcrumbItems = useMemo(() => {
    if (documentData) {
      return [
        { href: '/dashboard/employee', labelKey: 'panel' },
        { label: documentData.id != null ? `Dokument #${documentData.id}` : documentData.fileName },
      ];
    }

    return [
      { href: '/dashboard/employee', labelKey: 'panel' },
      { label: 'Dokument' },
    ];
  }, [documentData]);

  const handleDownload = async () => {
    if (documentData?.id == null) {
      return;
    }

    try {
      await downloadOriginalDocument(documentData.id);
    } catch (err) {
      console.error(err);
    }
  };

  const metadataCards = documentData
    ? [
        { label: 'ID dokumentu', value: documentData.id != null ? `#${documentData.id}` : 'Brak danych' },
        { label: 'Rozmiar pliku', value: formatFileSize(documentData.fileSize) },
        { label: 'Data przesłania', value: formatUploadDate(documentData.uploadedAt) },
        { label: 'Status analizy', value: formatStatus(documentData.analysisStatus) },
        { label: 'Źródło opisu', value: DESCRIPTION_SOURCE_LABEL[documentData.descriptionSource] ?? 'Brak danych' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
          <div className="mb-8 flex flex-col gap-4">
            <Breadcrumbs items={breadcrumbItems} />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-semibold text-primary">
                {documentData ? documentData.fileName : 'Dokument'}
              </h1>
              <button
                type="button"
                onClick={() => router.push('/dashboard/employee')}
                className="inline-flex items-center justify-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground"
              >
                Wróć do listy
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-error bg-error-soft px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {!documentData && isLoading && (
            <div className="rounded-lg border border-subtle bg-surface-subdued px-4 py-6 text-sm text-muted">
              Ładowanie dokumentu…
            </div>
          )}

          {documentData && (
            <div className="space-y-8">
              <section className="rounded-xl border border-subtle bg-surface-subdued px-6 py-5">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Nazwa pliku</p>
                    <p className="mt-1 text-2xl font-semibold text-primary">{documentData.fileName}</p>
                    <p className="mt-2 text-sm text-muted">
                      Przesłano {formatUploadDate(documentData.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:items-end">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(documentData.analysisStatus)}`}
                    >
                      {formatStatus(documentData.analysisStatus)}
                    </span>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                      >
                        Pobierz PDF
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {metadataCards.map((card) => (
                  <div key={card.label} className="rounded-lg border border-subtle bg-surface px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{card.label}</p>
                    <p className="mt-1 text-base font-medium text-primary">{card.value}</p>
                  </div>
                ))}
              </section>

              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Opis zdarzenia</p>
                    <h2 className="text-xl font-semibold text-primary">Podsumowanie analizy</h2>
                  </div>
                  <span className="text-xs font-medium text-muted">
                    {DESCRIPTION_SOURCE_LABEL[documentData.descriptionSource] ?? 'Brak informacji'}
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-subtle bg-surface-subdued px-5 py-4 text-sm leading-relaxed text-primary">
                  {documentData.incidentDescription || 'Brak szczegółowego opisu zdarzenia.'}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
