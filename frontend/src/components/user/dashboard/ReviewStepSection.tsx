import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { Spinner } from '@/components/Spinner';
import { useIncidentReport } from '@/context/IncidentReportContext';
import { formatFileSize } from '@/lib/utils/formatFileSize';

export function ReviewStepSection() {
  const {
    hasSubmittedSuccessfully,
    submitError,
    submittedDocumentId,
    downloadState,
    handleDownload,
    witnessStatements,
  } = useIncidentReport();

  const canDownload = submittedDocumentId != null;
  const isDownloadingDocx = downloadState === 'docx';
  const isDownloadingPdf = downloadState === 'pdf';

  return (
    <IncidentWizardSection
      title="Podsumowanie"
      description="Sprawdź, czy wszystko wygląda dobrze. W razie potrzeby zawsze możesz wrócić do wcześniejszych kroków."
    >
      {hasSubmittedSuccessfully ? (
        <div className="space-y-4">
          <IncidentAiSuggestion title="Formularz gotowy do pobrania">
            Twoje zgłoszenie zostało przygotowane w formie pliku. Pobierz dokument i samodzielnie przekaż go do ZUS — system nie wysyła formularza w Twoim imieniu. W razie potrzeby wróć do wcześniejszych kroków, popraw treść i przygotuj nową wersję.
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
                Zapisz te pliki razem z formularzem — będziesz je dołączać przy przekazywaniu dokumentów do ZUS.
              </p>
            </div>
          )}
          <div className="rounded-xl border border-dashed border-subtle bg-surface p-4">
            <p className="text-sm text-muted">
              Zapisz potwierdzenie w preferowanym formacie. Dokument przyda się jako kompletna dokumentacja sprawy i dołączysz go podczas składania zgłoszenia w ZUS.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleDownload('docx')}
                disabled={!canDownload || isDownloadingDocx}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloadingDocx && <Spinner size={16} />}
                Pobierz jako .docx
              </button>
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
          Przejrzyj dane i upewnij się, że opisujesz zdarzenie tak, jak chcesz. Gdy będziesz gotowy, kliknij „Przygotuj formularz”, a otrzymasz pliki do pobrania i samodzielnego złożenia w ZUS.
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
            Po przygotowaniu formularza pobierz go wraz z tymi plikami i prześlij wszystko do ZUS.
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
