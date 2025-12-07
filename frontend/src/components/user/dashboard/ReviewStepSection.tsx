import { useMemo } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { Spinner } from '@/components/Spinner';
import { useIncidentReport } from '@/context/IncidentReportContext';
import { useAiFeedback } from '@/context/AiFeedbackContext';
import { formatFileSize } from '@/lib/utils/formatFileSize';

export function ReviewStepSection() {
  const {
    hasSubmittedSuccessfully,
    submitError,
    submittedDocumentId,
    downloadState,
    handleDownload,
    witnessStatements,
    incidentDraft,
  } = useIncidentReport();

  const canDownload = submittedDocumentId != null;
  const isDownloadingPdf = downloadState === 'pdf';
  const aiContext = useMemo(() => ({ documentData: incidentDraft }), [incidentDraft]);
  const reviewMetadata = useMemo(() => ({ step: 'review', field: 'summary' as const }), []);

  const reviewSummaryInput = useMemo(() => {
    const lines: string[] = [];
    const addLine = (label: string, value?: string | null) => {
      if (typeof value !== 'string') {
        return;
      }
      const normalized = value.trim();
      if (normalized.length > 0) {
        lines.push(`${label}: ${normalized}`);
      }
    };

    addLine('Data wypadku', incidentDraft.data_wypadku);
    addLine('Godzina wypadku', incidentDraft.godzina_wypadku);
    addLine('Miejsce wypadku', incidentDraft.miejsce_wypadku);
    addLine('Opis zdarzenia', incidentDraft.szczegoly_okolicznosci);
    addLine('Rodzaj urazów', incidentDraft.rodzaj_urazow);
    addLine('Gdzie udzielono pomocy', incidentDraft.miejsce_udzielenia_pomocy);
    addLine('Organ prowadzący postępowanie', incidentDraft.organ_postepowania);
    addLine('Opis maszyny lub urządzenia', incidentDraft.opis_maszyn);

    const witnessNames = Array.isArray(incidentDraft.witnesses)
      ? incidentDraft.witnesses
        .map((witness) => [witness?.imie, witness?.nazwisko].filter(Boolean).join(' ').trim())
        .filter((name) => name.length > 0)
      : [];
    if (witnessNames.length > 0) {
      lines.push(`Świadkowie: ${witnessNames.join(', ')}`);
    }
    if (witnessStatements.length > 0) {
      lines.push(`Załączone oświadczenia świadków: ${witnessStatements.length}`);
    }

    return lines.join('\n').trim();
  }, [incidentDraft, witnessStatements]);

  const reviewFeedback = useAiFeedback(
    'review_summary',
    reviewSummaryInput,
    { metadata: reviewMetadata, context: aiContext, debounceMs: 0 },
  );

  const defaultReviewHint = (
    <>
      <p>
        To ostatni krok kreatora zgłoszenia. Sprawdź, czy wszystkie sekcje opisują miejsce, czas i przebieg zdarzenia tak, jak chcesz. Jeśli musisz coś doprecyzować, wróć do odpowiedniego kroku i popraw treść.
      </p>
      <p className="text-sm text-secondary">
        Kliknięcie „Przygotuj formularz” wygeneruje komplet dokumentów. Pobierz je, przeczytaj, podpisz i przekaż do ZUS przez PUE/eZUS lub złóż w placówce. W każdej chwili możesz przerwać i wrócić do zgłoszenia – nic nie zostanie wysłane bez Twojej zgody.
      </p>
    </>
  );

  const renderReviewHintContent = () => {
    if (!reviewSummaryInput || reviewFeedback.isIdle) {
      return defaultReviewHint;
    }

    if (reviewFeedback.isError) {
      return (
        <div className="flex flex-wrap items-center gap-3 text-(--color-error)">
          <span>{reviewFeedback.error ?? 'Nie udało się pobrać podpowiedzi.'}</span>
          <button
            type="button"
            onClick={reviewFeedback.refresh}
            className="font-semibold text-(--color-error) underline underline-offset-2"
          >
            Spróbuj ponownie
          </button>
        </div>
      );
    }

    if (reviewFeedback.isLoading) {
      return (
        <div className="flex items-center gap-2 text-muted">
          <Spinner size={16} />
          Analizuję zgłoszenie i przygotowuję podpowiedź…
        </div>
      );
    }

    if (reviewFeedback.isDebouncing) {
      return <p className="text-muted">Aktualizuję podpowiedź…</p>;
    }

    if (reviewFeedback.message) {
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Szybkie podsumowanie AI</p>
            <p className="whitespace-pre-line leading-6 text-foreground">{reviewFeedback.message}</p>
          </div>
          <div className="rounded-lg border border-dashed border-subtle bg-surface px-3 py-2 text-xs text-muted">
            <p>Jeśli widzisz brakujące informacje, wróć do odpowiedniego kroku i popraw treść przed pobraniem formularza.</p>
          </div>
        </div>
      );
    }

    return defaultReviewHint;
  };

  return (
    <IncidentWizardSection>
      {hasSubmittedSuccessfully ? (
        <div className="space-y-4">
          <IncidentAiSuggestion title="Formularz gotowy do pobrania">
            <div className="space-y-3">
              <p>
                Zgłoszenie zostało przygotowane w formie pliku. Pobierz dokument (formularz zawiadomienia lub zapis wyjaśnień poszkodowanego) i przekaż go do ZUS, system nie wysyła formularza w Twoim imieniu. W razie potrzeby wróć do wcześniejszych kroków, popraw treść i przygotuj nową wersję.
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-secondary">
                <li>Pobierz plik i dokładnie zapoznaj się z jego treścią.</li>
                <li>Jeżeli akceptujesz dokument, złóż na nim podpis.</li>
                <li>Przekaż podpisany formularz przez PUE/eZUS lub złóż go w dowolnej placówce ZUS.</li>
              </ol>
            </div>
          </IncidentAiSuggestion>
          {witnessStatements.length > 0 && (
            <div className="rounded-xl border border-subtle bg-surface p-4">
              <p className="text-sm font-semibold text-primary">Załączone oświadczenia świadków</p>
              <ul className="mt-2 space-y-2 text-sm text-secondary">
                {witnessStatements.map((statement) => (
                  <li key={statement.id} className="rounded-lg border border-dashed border-subtle px-3 py-2">
                    <p className="font-medium text-primary">{statement.name}</p>
                    <p className="text-xs text-muted">{formatFileSize(statement.size)}</p>
                  </li>
                ))}
              </ul>
                <p className="mt-3 text-xs text-muted">
                  Zapisz te pliki razem z formularzem, wykorzystasz je przy przekazywaniu dokumentów do ZUS.
                </p>
            </div>
          )}
          <div className="rounded-xl border border-dashed border-subtle bg-surface p-4">
            <p className="text-sm text-muted">
              Pobierz gotowy plik PDF i zachowaj go jako część dokumentacji sprawy. Dołączysz go podczas przekazywania zgłoszenia do ZUS.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleDownload('pdf')}
                disabled={!canDownload || isDownloadingPdf}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloadingPdf && <Spinner size={16} />}
                Pobierz PDF
              </button>
            </div>
          </div>
        </div>
      ) : (
        <IncidentAiSuggestion>
          <div className="space-y-2">{renderReviewHintContent()}</div>
        </IncidentAiSuggestion>
      )}
      {witnessStatements.length > 0 && !hasSubmittedSuccessfully && (
        <div className="mt-4 rounded-xl border border-subtle bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-primary">Załączone oświadczenia świadków</p>
          <ul className="mt-2 space-y-2 text-sm text-secondary">
            {witnessStatements.map((statement) => (
              <li key={statement.id} className="rounded-lg border border-dashed border-subtle px-3 py-2">
                <p className="font-medium text-primary">{statement.name}</p>
                <p className="text-xs text-muted">{formatFileSize(statement.size)}</p>
              </li>
            ))}
          </ul>
            <p className="mt-3 text-xs text-muted">
              Po przygotowaniu formularza pobierz go wraz z tymi plikami i prześlij komplet do ZUS.
            </p>
        </div>
      )}
      {submitError && (
        <IncidentAiSuggestion title="Komunikat systemowy" variant="warning">
          {submitError}
        </IncidentAiSuggestion>
      )}
    </IncidentWizardSection>
  );
}
