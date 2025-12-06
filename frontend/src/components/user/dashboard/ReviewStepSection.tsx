import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';

type ReviewStepSectionProps = {
  hasSubmittedSuccessfully: boolean;
  submitError: string | null;
};

export function ReviewStepSection({ hasSubmittedSuccessfully, submitError }: ReviewStepSectionProps) {
  return (
    <IncidentWizardSection
      title="Podsumowanie"
      description="Pokazujemy zebrane dane w formie do szybkiej weryfikacji."
    >
      {hasSubmittedSuccessfully ? (
        <IncidentAiSuggestion title="Zgłoszenie wysłane">
          Twój szkic został przesłany do systemu. Możesz wrócić do poprzednich kroków, by wprowadzić korekty lub zamknąć kreator.
        </IncidentAiSuggestion>
      ) : (
        <IncidentAiSuggestion>
          W finalnej wersji kreator zrenderuje tutaj listę wszystkich sekcji wraz z możliwością szybkiej edycji. Zatwierdzając, utworzysz pojedynczy dokument na podstawie zgromadzonych danych.
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
