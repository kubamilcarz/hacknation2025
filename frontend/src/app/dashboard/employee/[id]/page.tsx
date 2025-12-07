'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  DOCUMENT_DETAIL_ASSESSMENT_SECTIONS,
  documentDetailService,
  type DocumentPreviewHandle,
} from '@/lib/services/documentDetailService';
import { formatFileSize, formatStatus } from '@/lib/services/employeeDocumentService';
import type { EmployeeDocument } from '@/types/employeeDocument';

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

    const fetchDocument = async () => {
      try {
        const remote = await documentDetailService.fetchDocument(documentId);
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
    let previewHandle: DocumentPreviewHandle | null = null;
    setIsPreviewLoading(true);
    setPreviewError(null);

    const loadPreview = async () => {
      try {
        previewHandle = await documentDetailService.createPreview(documentData.id);
        if (isCancelled) {
          previewHandle.release();
          return;
        }
        setPreviewUrl(previewHandle.url);
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
      if (previewHandle) {
        previewHandle.release();
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

  const metadataCards = useMemo(() => documentDetailService.buildMetadataCards(documentData), [documentData]);

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
                    <p className="text-sm text-muted">Przesłano {documentDetailService.formatUploadDate(documentData.uploadedAt)}</p>
                  )}
                  <p className="mt-3 text-sm text-primary">
                    {documentData?.incidentDescription ?? 'Opis zdarzenia pojawi się po zakończeniu analizy.'}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  {documentData && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${documentDetailService.getStatusBadgeClasses(documentData.analysisStatus)}`}
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

          {remoteError && (
            <div className="mb-6 rounded-lg border border-(--color-error) bg-(--color-error-softest) px-4 py-3 text-sm text-(--color-error)">
              {remoteError}
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
                  {DOCUMENT_DETAIL_ASSESSMENT_SECTIONS.map((section) => {
                    const entry = documentDetailService.getAssessmentEntry(documentData, section.key);
                    if (!entry) {
                      return null;
                    }

                    return (
                      <div
                        key={section.key}
                        className={`flex h-full flex-col justify-between rounded-2xl border p-3 shadow-sm ${documentDetailService.getAssessmentCardOutline(entry.status)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{section.label}</p>
                            <p className="text-xs leading-snug text-secondary">{section.helper}</p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${documentDetailService.getAssessmentStatusClasses(entry.status)}`}
                          >
                            {documentDetailService.getAssessmentStatusLabel(entry.status)}
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
