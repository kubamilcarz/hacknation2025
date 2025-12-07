'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import {
  employeeDocumentService,
  formatFileSize,
  formatStatus,
} from '@/lib/services/employeeDocumentService';
import type { EmployeeDocument } from '@/types/employeeDocument';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const DESCRIPTION_SOURCE_LABEL: Record<EmployeeDocument['descriptionSource'], string> = {
  ai: 'Opis wygenerowany przez AI',
  manual: 'Opis dodany ręcznie',
};

const ASSESSMENT_SECTIONS = [
  { key: 'suddenness', label: 'Nagłość', helper: 'Czy zdarzenie nastąpiło w krótkim czasie.' },
  { key: 'externalCause', label: 'Przyczyna zewnętrzna', helper: 'Czy wystąpił czynnik spoza organizmu.' },
  { key: 'injury', label: 'Uraz', helper: 'Czy doszło do uszkodzenia ciała lub zdrowia.' },
  { key: 'workRelation', label: 'Związek z pracą', helper: 'Czy zdarzenie pozostaje w związku z obowiązkami.' },
] as const;

type AssessmentSectionKey = (typeof ASSESSMENT_SECTIONS)[number]['key'];

const STATUS_LABEL: Record<EmployeeDocument['assessment']['suddenness']['status'], string> = {
  met: 'Spełniona',
  partial: 'Niepełna',
  unmet: 'Niespełniona',
};

function getAssessmentStatusClasses(status: EmployeeDocument['assessment']['suddenness']['status']) {
  switch (status) {
    case 'met':
      return 'bg-(--color-success-soft) text-(--color-success) border-(--color-success)';
    case 'partial':
      return 'bg-(--color-warning-soft) text-(--color-warning) border-(--color-warning)';
    case 'unmet':
    default:
      return 'bg-(--color-error-soft) text-(--color-error) border-(--color-error)';
  }
}

function getAssessmentCardOutline(status: EmployeeDocument['assessment']['suddenness']['status']) {
  switch (status) {
    case 'met':
      return 'border-(--color-success-softest) bg-(--color-success-softest)';
    case 'partial':
      return 'border-(--color-warning-softest) bg-(--color-warning-softest)';
    case 'unmet':
    default:
      return 'border-(--color-error-softest) bg-(--color-error-softest)';
  }
}

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

export default function DocumentDetail() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const documentId = Number.parseInt(params?.id ?? '', 10);
  const { isLoading, getDocumentById, downloadOriginalDocument, downloadAnonymizedDocument } = useDocuments();

  const documentFromStore = useMemo(
    () => (Number.isNaN(documentId) ? undefined : getDocumentById(documentId)),
    [documentId, getDocumentById],
  );

  const [remoteDocument, setRemoteDocument] = useState<EmployeeDocument | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const documentData = documentFromStore ?? remoteDocument;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (documentFromStore || isLoading || Number.isNaN(documentId)) {
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;

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

  useEffect(() => {
    if (!documentData?.id) {
      setPreviewUrl(null);
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;
    setIsPreviewLoading(true);
    setPreviewError(null);

    const loadPreview = async () => {
      try {
        const blob = await employeeDocumentService.getOriginalFile(documentData.id!);
        if (isCancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (err) {
        if (!isCancelled) {
          console.error(err);
          setPreviewError('Nie udało się wczytać podglądu PDF.');
          setPreviewUrl(null);
        }
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      isCancelled = true;
      setIsPreviewLoading(false);
      setPreviewError(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentData?.id]);

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

  const handleDownloadAnonymized = async () => {
    if (documentData?.id == null) {
      return;
    }

    try {
      await downloadAnonymizedDocument(documentData.id);
    } catch (err) {
      console.error(err);
    }
  };

  const metadataCards = documentData
    ? [
        { label: 'ID dokumentu', value: documentData.id != null ? `#${documentData.id}` : 'Brak danych' },
        { label: 'Rozmiar pliku', value: formatFileSize(documentData.fileSize) },
        { label: 'Status analizy', value: formatStatus(documentData.analysisStatus) },
        { label: 'Źródło opisu', value: DESCRIPTION_SOURCE_LABEL[documentData.descriptionSource] ?? 'Brak danych' },
      ]
    : [];

  const resolveAssessmentEntry = (key: AssessmentSectionKey) => {
    if (!documentData) {
      return null;
    }
    const assessment = documentData.assessment;
    switch (key) {
      case 'suddenness':
        return assessment.suddenness;
      case 'externalCause':
        return assessment.externalCause;
      case 'injury':
        return assessment.injury;
      case 'workRelation':
        return assessment.workRelation;
      default:
        return null;
    }
  };

  const renderAssessmentAction = (status: EmployeeDocument['assessment']['suddenness']['status'], recommendation?: string) => {
    if (status === 'met') {
      return (
        <button
          type="button"
          onClick={handleDownloadAnonymized}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-(--color-accent) px-3 py-1.5 text-xs font-semibold text-(--color-accent) transition hover:border-(--color-accent-strong) hover:text-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
        >
          Pobierz zanonimizowany PDF
        </button>
      );
    }

    const label =
      status === 'partial'
        ? 'Proponowana wiadomość (przesłanka niepełna)'
        : 'Proponowana wiadomość (przesłanka niespełniona)';

    return (
      <div className="rounded-md border border-dashed border-subtle bg-surface px-3 py-2 text-xs text-secondary">
        <p className="font-semibold text-primary">{label}</p>
        <p className="mt-1 leading-relaxed">{recommendation ?? 'Poproś o uzupełnienie brakujących informacji.'}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
          <div className="mb-8 flex flex-col gap-4">
            <Breadcrumbs items={breadcrumbItems} />
            <div className="rounded-xl border border-subtle bg-surface-subdued px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dokument #{documentData?.id ?? '—'}</p>
                  <h1 className="mt-1 text-2xl font-semibold text-primary">{documentData?.fileName ?? 'Dokument'}</h1>
                  {documentData && (
                    <p className="text-sm text-muted">Przesłano {formatUploadDate(documentData.uploadedAt)}</p>
                  )}
                  <p className="mt-3 text-sm text-primary">
                    {documentData?.incidentDescription ?? 'Opis zdarzenia pojawi się po zakończeniu analizy.'}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  {documentData && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClasses(documentData.analysisStatus)}`}
                    >
                      {formatStatus(documentData.analysisStatus)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/employee')}
                    className="inline-flex items-center justify-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground"
                  >
                    Wróć do listy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!documentData && isLoading && (
            <div className="rounded-lg border border-subtle bg-surface-subdued px-4 py-6 text-sm text-muted">
              Ładowanie dokumentu…
            </div>
          )}

          {documentData && (
            <div className="space-y-8">
              <section className="rounded-xl border border-subtle bg-surface-subdued px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Plik źródłowy</p>
                    <p className="mt-1 text-base font-semibold text-primary">{documentData.fileName}</p>
                    <p className="text-sm text-muted">
                      {formatFileSize(documentData.fileSize)} • {documentData.fileType || 'application/pdf'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                    >
                      Pobierz oryginał
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadAnonymized}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent) transition hover:border-(--color-accent-strong) hover:text-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                    >
                      Pobierz zanonimizowany
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ocena przesłanek</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {ASSESSMENT_SECTIONS.map((section) => {
                    const entry = resolveAssessmentEntry(section.key);
                    if (!entry) {
                      return null;
                    }

                    return (
                      <div
                        key={section.key}
                        className={`flex h-full flex-col justify-between rounded-2xl border p-3 shadow-sm ${getAssessmentCardOutline(entry.status)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{section.label}</p>
                            <p className="text-xs leading-snug text-secondary">{section.helper}</p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${getAssessmentStatusClasses(entry.status)}`}
                          >
                            {STATUS_LABEL[entry.status]}
                          </span>
                        </div>
                        <p className="mt-3 flex-1 text-sm leading-relaxed text-primary">{entry.summary}</p>
                        <div className="mt-4">
                          {renderAssessmentAction(entry.status, entry.recommendation)}
                        </div>
                      </div>
                    );
                  })}
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

              <section className="rounded-xl border border-dashed border-subtle bg-surface-subdued px-6 py-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-primary">Podgląd PDF</p>
                    {isPreviewLoading && <span className="text-xs text-muted">Ładowanie pliku…</span>}
                  </div>
                  {previewError && <p className="text-xs text-error">{previewError}</p>}
                  {previewUrl ? (
                    <object
                      data={previewUrl}
                      type="application/pdf"
                      className="h-[32rem] w-full rounded-lg border border-subtle bg-surface"
                    >
                      <p className="p-4 text-sm text-muted">
                        Ten przeglądarka nie obsługuje podglądu PDF. Pobierz dokument, aby go otworzyć.
                      </p>
                    </object>
                  ) : (
                    !isPreviewLoading && !previewError && (
                      <div className="flex h-48 items-center justify-center rounded-lg border border-subtle bg-surface text-sm text-muted">
                        Podgląd będzie dostępny po ukończeniu analizy.
                      </div>
                    )
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
