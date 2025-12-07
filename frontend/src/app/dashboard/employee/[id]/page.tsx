'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAiFeedback } from '@/context/AiFeedbackContext';
import { useDocuments } from '@/context/DocumentContext';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  DOCUMENT_DETAIL_ASSESSMENT_SECTIONS,
  documentDetailService,
  type DocumentPreviewHandle,
} from '@/lib/services/documentDetailService';
import {
  buildCompanySnapshot,
  fetchMockPkdProfile,
  type PkdProfileMock,
} from '@/lib/services/pkdProfileMockService';
import { formatFileSize, formatStatus } from '@/lib/services/employeeDocumentService';
import type { EmployeeDocument, EmployeeDocumentAssessmentEntry } from '@/types/employeeDocument';

export default function DocumentDetail() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const documentId = Number.parseInt(params?.id ?? '', 10);
  const { isLoading, getDocumentById, downloadAccidentCard, downloadAnonymizedDocument } = useDocuments();

  const documentFromStore = useMemo(
    () => (Number.isNaN(documentId) ? undefined : getDocumentById(documentId)),
    [documentId, getDocumentById],
  );

  const [remoteDocument, setRemoteDocument] = useState<EmployeeDocument | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const documentData = documentFromStore ?? remoteDocument;
  const companySnapshot = useMemo(() => buildCompanySnapshot(documentData), [documentData]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isGeneratingAccidentCard, setIsGeneratingAccidentCard] = useState(false);
  const [accidentCardError, setAccidentCardError] = useState<string | null>(null);
  const [pkdProfile, setPkdProfile] = useState<PkdProfileMock | null>(null);
  const [isPkdLoading, setIsPkdLoading] = useState(false);
  const [pkdError, setPkdError] = useState<string | null>(null);

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

  const runPkdFetch = useCallback(
    (preferMismatch: boolean, abortRef?: { cancelled: boolean }) => {
      if (!companySnapshot.nip) {
        return;
      }

      setIsPkdLoading(true);
      setPkdError(null);
      setPkdProfile(null);

      fetchMockPkdProfile(companySnapshot.nip, {
        preferredIndustry: companySnapshot.declaredIndustry,
        preferMismatch,
      })
        .then((profile) => {
          if (abortRef?.cancelled) {
            return;
          }
          setPkdProfile(profile);
        })
        .catch((error) => {
          console.error(error);
          if (!abortRef?.cancelled) {
            setPkdError('Nie udało się pobrać profilu PKD.');
          }
        })
        .finally(() => {
          if (!abortRef?.cancelled) {
            setIsPkdLoading(false);
          }
        });
    },
    [companySnapshot.declaredIndustry, companySnapshot.nip],
  );

  useEffect(() => {
    if (!documentData) {
      setPkdProfile(null);
      setPkdError(null);
      setIsPkdLoading(false);
      return;
    }

    if (!companySnapshot.nip) {
      setPkdProfile(null);
      setIsPkdLoading(false);
      setPkdError('Brak numeru NIP w metadanych zgłoszenia.');
      return;
    }

    const abortRef = { cancelled: false };
    const preferMismatch = Math.random() < 0.5;
    runPkdFetch(preferMismatch, abortRef);

    return () => {
      abortRef.cancelled = true;
    };
  }, [companySnapshot.declaredIndustry, companySnapshot.nip, documentData, runPkdFetch]);

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

  useEffect(() => {
    setAccidentCardError(null);
    setIsGeneratingAccidentCard(false);
  }, [documentData?.id]);

  const handleGenerateAccidentCard = async () => {
    if (documentData?.id == null) {
      return;
    }

    setAccidentCardError(null);
    setIsGeneratingAccidentCard(true);

    try {
      await downloadAccidentCard(documentData.id);
    } catch (err) {
      console.error(err);
      setAccidentCardError('Nie udało się wygenerować karty wypadku. Spróbuj ponownie.');
    } finally {
      setIsGeneratingAccidentCard(false);
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

  const handleRefreshPkdProfile = useCallback(() => {
    if (!documentData) {
      setPkdProfile(null);
      setPkdError('Brak danych dokumentu do sprawdzenia profilu PKD.');
      setIsPkdLoading(false);
      return;
    }

    if (!companySnapshot.nip) {
      setPkdProfile(null);
      setIsPkdLoading(false);
      setPkdError('Brak numeru NIP w metadanych zgłoszenia.');
      return;
    }

    const preferMismatch = Math.random() < 0.5;
    runPkdFetch(preferMismatch);
  }, [companySnapshot.nip, documentData, runPkdFetch]);

  const metadataCards = useMemo(() => documentDetailService.buildMetadataCards(documentData), [documentData]);
  const isIndustryMismatch = useMemo(() => {
    if (!companySnapshot.declaredIndustry || !pkdProfile) {
      return false;
    }
    return companySnapshot.declaredIndustry !== pkdProfile.registeredIndustry;
  }, [companySnapshot.declaredIndustry, pkdProfile]);
  const pkdUpdatedAtLabel = useMemo(() => {
    if (!pkdProfile?.updatedAt) {
      return null;
    }
    const date = new Date(pkdProfile.updatedAt);
    if (Number.isNaN(date.getTime())) {
      return pkdProfile.updatedAt;
    }
    return date.toLocaleDateString('pl-PL', { dateStyle: 'long' });
  }, [pkdProfile?.updatedAt]);

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
                      onClick={handleGenerateAccidentCard}
                      disabled={isGeneratingAccidentCard}
                      aria-busy={isGeneratingAccidentCard}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isGeneratingAccidentCard ? 'Generowanie...' : 'Stwórz kartę wypadku'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadAnonymized}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-(--color-accent) px-4 py-2 text-sm font-semibold text-(--color-accent) transition hover:border-(--color-accent-strong) hover:text-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                    >
                      Pobierz zanonimizowany
                    </button>
                  </div>
                  {accidentCardError && (
                    <p className="text-sm text-(--color-error)">{accidentCardError}</p>
                  )}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ocena przesłanek</p>
                <div className="mt-4 grid gap-6 sm:grid-cols-2">
                  {DOCUMENT_DETAIL_ASSESSMENT_SECTIONS.map((section) => {
                    const entry = documentDetailService.getAssessmentEntry(documentData, section.key);
                    if (!entry) {
                      return null;
                    }

                    return (
                      <AssessmentCard
                        key={section.key}
                        section={section}
                        entry={entry}
                        documentData={documentData}
                        onDownloadAnonymized={handleDownloadAnonymized}
                      />
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

              <section className="rounded-xl border border-subtle bg-surface px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">NIP i region</p>
                    <p className="mt-1 text-base font-semibold text-primary">Profil działalności płatnika</p>
                    <p className="text-sm text-muted">Zewnętrzna weryfikacja PKD pomaga szybciej wykryć możliwe niezgodności branżowe.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshPkdProfile}
                    disabled={isPkdLoading}
                    className="inline-flex items-center justify-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPkdLoading ? 'Odświeżanie…' : 'Odśwież profil PKD'}
                  </button>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-subtle bg-surface-subdued px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">NIP</p>
                    <p className="mt-1 text-base font-semibold text-primary">{companySnapshot.nip ?? 'Brak danych'}</p>
                    <p className="text-xs text-muted">Identyfikator płatnika składek</p>
                  </div>
                  <div className="rounded-lg border border-subtle bg-surface-subdued px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Region działalności</p>
                    <p className="mt-1 text-base font-semibold text-primary">{companySnapshot.region ?? 'Brak danych'}</p>
                    <p className="text-xs text-muted">Województwo rejestru REGON</p>
                  </div>
                  <div className="rounded-lg border border-subtle bg-surface-subdued px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Branża z opisu zgłoszenia</p>
                    <p className="mt-1 text-base font-semibold text-primary">{companySnapshot.declaredIndustry ?? 'Brak danych'}</p>
                    <p className="text-xs text-muted">Wykryta z treści dokumentu</p>
                  </div>
                </div>
                <div className="mt-6 rounded-lg border border-dashed border-subtle bg-surface-subdued px-4 py-3">
                  {isPkdLoading && <p className="text-sm text-muted">Ładowanie profilu PKD…</p>}
                  {!isPkdLoading && pkdError && <p className="text-sm text-(--color-error)">{pkdError}</p>}
                  {!isPkdLoading && !pkdError && pkdProfile && (
                    <div className="md:grid md:grid-cols-2 md:gap-6">
                      <div className="mb-4 md:mb-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dominujące PKD</p>
                        <p className="mt-1 text-base font-semibold text-primary">{pkdProfile.pkdCode}</p>
                        <p className="text-sm text-secondary">{pkdProfile.pkdName}</p>
                      </div>
                      <div className="rounded-lg border border-subtle bg-surface px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Profil firmy</p>
                        <p className="mt-1 text-base font-medium text-primary">{pkdProfile.registeredIndustry}</p>
                        <p className="text-xs text-muted">
                          Ostatnia aktualizacja: {pkdUpdatedAtLabel ?? 'brak danych'} • Wielkość: {pkdProfile.employeesRange} • Wiarygodność: {pkdProfile.reliabilityScore}%
                        </p>
                      </div>
                    </div>
                  )}
                  {!isPkdLoading && !pkdError && !pkdProfile && (
                    <p className="text-sm text-muted">Profil PKD będzie dostępny po zakończeniu analizy dokumentu.</p>
                  )}
                </div>
                {isIndustryMismatch && pkdProfile && (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-(--color-warning) bg-(--color-warning-softest) px-4 py-3 text-sm text-(--color-warning)">
                    <span className="text-base font-black leading-none">!</span>
                    <p>
                      Wykryto potencjalną niezgodność między opisem zdarzenia a profilem działalności w rejestrze. 
                      Zalecamy weryfikację, czy okoliczności wypadku odpowiadają rzeczywistemu zakresowi działalności płatnika.
                    </p>
                  </div>
                )}
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
                      className="h-128 w-full rounded-lg border border-subtle bg-surface"
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

type AssessmentCardProps = {
  section: (typeof DOCUMENT_DETAIL_ASSESSMENT_SECTIONS)[number];
  entry: EmployeeDocumentAssessmentEntry;
  documentData: EmployeeDocument;
  onDownloadAnonymized: () => void;
};

function AssessmentCard({ section, entry, documentData, onDownloadAnonymized }: AssessmentCardProps) {
  const cardOutline = documentDetailService.getAssessmentCardOutline(entry.status);
  const statusClasses = documentDetailService.getAssessmentStatusClasses(entry.status);
  const statusLabel = documentDetailService.getAssessmentStatusLabel(entry.status);
  const actionContent = (() => {
    if (entry.status === 'met') {
      return (
        <button
          type="button"
          onClick={onDownloadAnonymized}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-(--color-accent) px-3 py-1.5 text-xs font-semibold text-(--color-accent) transition hover:border-(--color-accent-strong) hover:text-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
        >
          Pobierz zanonimizowany PDF
        </button>
      );
    }

    if (entry.status === 'partial') {
      return <AssessmentRecommendation section={section} entry={entry} documentData={documentData} />;
    }

    return null;
  })();

  return (
    <div className={`flex h-full flex-col justify-between rounded-2xl border p-3 shadow-sm ${cardOutline}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{section.label}</p>
          <p className="text-xs leading-snug text-secondary">{section.helper}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${statusClasses}`}>{statusLabel}</span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-primary">{entry.summary}</p>
      {actionContent && <div className="mt-4">{actionContent}</div>}
    </div>
  );
}

type AssessmentRecommendationProps = {
  section: (typeof DOCUMENT_DETAIL_ASSESSMENT_SECTIONS)[number];
  entry: EmployeeDocumentAssessmentEntry;
  documentData: EmployeeDocument;
};

function AssessmentRecommendation({ section, entry, documentData }: AssessmentRecommendationProps) {
  const fallbackText = entry.recommendation?.trim() || 'Poproś o uzupełnienie brakujących informacji.';

  const aiInput = useMemo(() => {
    const details: string[] = [];
    details.push('Cel: Przygotuj krótką, uprzejmą odpowiedź w imieniu pracownika ZUS kierowaną do osoby zgłaszającej wypadek.');
    details.push('Forma: język polski, ton profesjonalny i wspierający, podkreślający dalsze kroki oraz potrzebne informacje.');
    details.push('Uwzględnij: 1) krótkie potwierdzenie otrzymania dokumentu, 2) wnioski z oceny przesłanki, 3) wyjaśnienie co jeszcze jest potrzebne, 4) uprzejme zakończenie z propozycją kontaktu.');
    details.push(`Sekcja: ${section.label}`);
    details.push(`Status oceny: ${documentDetailService.getAssessmentStatusLabel(entry.status)}`);
    if (entry.summary) {
      details.push(`Podsumowanie oceny: ${entry.summary}`);
    }
    if (documentData.incidentDescription) {
      details.push(`Opis zdarzenia z systemu: ${documentData.incidentDescription}`);
    }
    if (entry.recommendation) {
      details.push(`Poprzednia sugestia dla pracownika: ${entry.recommendation}`);
    }
    details.push('Zwróć się bezpośrednio do zgłaszającego w liczbie pojedynczej. Jeśli prosisz o informacje, wskaż konkretnie jakie.');
    return details.join('\n');
  }, [documentData.incidentDescription, entry.recommendation, entry.status, entry.summary, section.label]);

  const { message, error, status, isDebouncing, isLoading, refresh } = useAiFeedback(
    `assessment-${section.key}-recommendation`,
    aiInput,
    {
      metadata: {
        documentId: documentData.id,
        sectionKey: section.key,
        sectionLabel: section.label,
        assessmentStatus: entry.status,
        assessmentSummary: entry.summary,
        previousRecommendation: entry.recommendation ?? null,
        responseAudience: 'claimant',
        responseRole: 'ZUS employee',
        document: {
          id: documentData.id,
          analysisStatus: documentData.analysisStatus,
          incidentDescription: documentData.incidentDescription,
        },
      },
      context: {
        documentData: {
          id: documentData.id,
          incidentDescription: documentData.incidentDescription,
          assessment: documentData.assessment,
        },
        history: documentData.incidentDescription,
      },
      debounceMs: 0,
    },
  );

  const isWaiting = isDebouncing || isLoading;
  const aiMessage = message?.trim();
  const displayText = isWaiting
    ? 'Generujemy wiadomość na podstawie analizy…'
    : aiMessage || fallbackText;

  return (
    <div className="rounded-md border border-dashed border-subtle bg-surface px-3 py-2 text-xs text-secondary">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-primary">Proponowana wiadomość (przesłanka niepełna)</p>
        <button
          type="button"
          onClick={refresh}
          disabled={isWaiting}
          className="text-[11px] font-semibold text-(--color-accent) transition hover:text-(--color-accent-strong) disabled:cursor-not-allowed disabled:text-muted"
        >
          Odśwież
        </button>
      </div>
      <p className={`mt-1 leading-relaxed ${isWaiting ? 'text-muted' : 'text-secondary'}`}>{displayText}</p>
      {status === 'error' && error && (
        <p className="mt-2 text-[11px] text-(--color-error)">Nie udało się pobrać rekomendacji: {error}</p>
      )}
    </div>
  );
}
