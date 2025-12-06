import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { Spinner } from '@/components/Spinner';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function ReviewStepSection() {
  const {
    hasSubmittedSuccessfully,
    submitError,
    submittedDocumentId,
    downloadState,
    handleDownload,
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
          <IncidentAiSuggestion title="Zgłoszenie wysłane">
            Zgłoszenie nr <strong>{submittedDocumentId ?? 'w przygotowaniu'}</strong> zostało wysłane. Skontaktujemy się, gdy tylko rozpoczniemy weryfikację. Jeśli zauważysz potrzebę korekty, przygotuj notatkę i poinformuj nas w odpowiedzi na wiadomość.
          </IncidentAiSuggestion>
          <div className="rounded-xl border border-dashed border-subtle bg-surface p-4">
            <p className="text-sm text-muted">
              Zapisz potwierdzenie w preferowanym formacie. Przyda się jako kompletna dokumentacja sprawy oraz podczas kontaktu z urzędami, lekarzem prowadzącym lub partnerami biznesowymi.
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
          Przejrzyj dane i upewnij się, że opisujesz zdarzenie tak, jak chcesz. Każdy krok możesz jeszcze skorygować, ale jeśli chcesz wysłać zgłoszenie już teraz, śmiało.
        </IncidentAiSuggestion>
      )}
      {submitError && (
        <IncidentAiSuggestion title="Komunikat systemowy" variant="warning">
          {submitError}
        </IncidentAiSuggestion>
      )}
    </IncidentWizardSection>
  );
}
