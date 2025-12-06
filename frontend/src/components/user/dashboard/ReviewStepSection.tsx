import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';

type ReviewStepSectionProps = {
  hasSubmittedSuccessfully: boolean;
  submitError: string | null;
  submittedDocumentId: number | null;
};

export function ReviewStepSection({ hasSubmittedSuccessfully, submitError, submittedDocumentId }: ReviewStepSectionProps) {
  return (
    <IncidentWizardSection
      title="Podsumowanie"
      description="Przejrzyj wszystkie dane przed wysłaniem."
    >
      {hasSubmittedSuccessfully ? (
        <IncidentAiSuggestion title="Zgłoszenie wysłane">
          Zgłoszenie nr <strong>{submittedDocumentId ?? 'w przygotowaniu'}</strong> zostało wysłane. Skontaktujemy się, gdy tylko rozpoczniemy weryfikację.
        </IncidentAiSuggestion>
      ) : (
        <IncidentAiSuggestion>
          Sprawdź prezentowane dane. Jeśli wszystko się zgadza, wyślij zgłoszenie.
        </IncidentAiSuggestion>
      )}
      {submitError && (
        <IncidentAiSuggestion title="Błąd zapisu" variant="warning">
          {submitError}
        </IncidentAiSuggestion>
      )}
    </IncidentWizardSection>
  );
}
