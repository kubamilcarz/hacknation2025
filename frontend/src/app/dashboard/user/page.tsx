'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { IncidentWizardLayout } from '@/components/user/IncidentWizardLayout';
import { IncidentStepTracker } from '@/components/user/IncidentStepTracker';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { IncidentWizardNavigation } from '@/components/user/IncidentWizardNavigation';
import { IncidentInfoCard } from '@/components/user/IncidentInfoCard';
import type { IncidentWizardStep } from '@/components/user/IncidentStepTracker';
import { useDocuments } from '@/context/DocumentContext';
import { defaultDocumentData } from '@/lib/mock-documents';
import type { CreateDocumentInput } from '@/lib/services/documentService';

const steps: IncidentWizardStep[] = [
  {
    id: 'identity',
    title: 'Dane poszkodowanego',
    description: 'Imię, nazwisko oraz numery identyfikacyjne osoby, która uległa wypadkowi.',
  },
  {
    id: 'residence',
    title: 'Adres zamieszkania',
    description: 'Aktualne miejsce zamieszkania oraz dane korespondencyjne.',
  },
  {
    id: 'accident',
    title: 'Opis zdarzenia',
    description: 'Kluczowe fakty o wypadku: data, miejsce i okoliczności.',
  },
  {
    id: 'witnesses',
    title: 'Świadkowie',
    description: 'Dane kontaktowe osób, które widziały zdarzenie.',
    isOptional: true,
  },
  {
    id: 'review',
    title: 'Podsumowanie',
    description: 'Sprawdź zebrane informacje przed wysłaniem.',
  },
];

const INCIDENT_FIELD_KEYS = ['pesel', 'nr_dowodu', 'imie', 'nazwisko', 'numer_telefonu', 'ulica', 'szczegoly_okolicznosci'] as const;
type IncidentFieldKey = (typeof INCIDENT_FIELD_KEYS)[number];

const STEP_FIELDS_BY_STEP: Record<IncidentWizardStep['id'], IncidentFieldKey[]> = {
  identity: ['pesel', 'nr_dowodu', 'imie', 'nazwisko', 'numer_telefonu'],
  residence: ['ulica'],
  accident: ['szczegoly_okolicznosci'],
  witnesses: [],
  review: [],
};

const REQUIRED_FIELD_MESSAGE = 'To pole jest wymagane.';

const FIELD_VALIDATORS: Record<IncidentFieldKey, (value: string) => string | null> = {
  pesel: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (!/^\d{11}$/.test(normalized)) {
      return 'Numer PESEL musi składać się z 11 cyfr.';
    }
    return null;
  },
  nr_dowodu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (!/^[A-Z]{3}\d{6}$/.test(normalized)) {
      return 'Wpisz numer dokumentu w formacie ABC123456.';
    }
    return null;
  },
  imie: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (normalized.length < 2) {
      return 'Imię musi mieć co najmniej 2 znaki.';
    }
    if (/\d/.test(normalized)) {
      return 'Imię nie powinno zawierać cyfr.';
    }
    return null;
  },
  nazwisko: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (normalized.length < 2) {
      return 'Nazwisko musi mieć co najmniej 2 znaki.';
    }
    if (/\d/.test(normalized)) {
      return 'Nazwisko nie powinno zawierać cyfr.';
    }
    return null;
  },
  numer_telefonu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const digitsOnly = normalized.replace(/\D/g, '');
    if (digitsOnly.length < 9 || digitsOnly.length > 15) {
      return 'Numer telefonu powinien mieć od 9 do 15 cyfr.';
    }
    return null;
  },
  ulica: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length < 3) {
      return 'Ulica musi mieć co najmniej 3 znaki.';
    }
    return null;
  },
  szczegoly_okolicznosci: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (normalized.length < 20) {
      return 'Dodaj więcej szczegółów (min. 20 znaków).';
    }
    return null;
  },
};

const incidentFieldKeySet = new Set<IncidentFieldKey>(INCIDENT_FIELD_KEYS);

const isIncidentFieldKey = (field: keyof CreateDocumentInput): field is IncidentFieldKey =>
  incidentFieldKeySet.has(field as IncidentFieldKey);

// Debug helper: flip to true when we need to bypass validation while iterating on UI.
const letUserProceedWithEmptyFields = false;

const createInitialIncidentDraft = (): CreateDocumentInput => ({
  ...defaultDocumentData,
  id: undefined,
  pesel: '',
  nr_dowodu: '',
  imie: '',
  nazwisko: '',
  numer_telefonu: '',
  ulica: '',
  szczegoly_okolicznosci: '',
  witnesses: [],
});

export default function UserDashboard() {
  const { createDocument } = useDocuments();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);

  // Shared document draft keeps every field centralized for validation and submission.
  const [incidentDraft, setIncidentDraft] = useState<CreateDocumentInput>(createInitialIncidentDraft);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentStep = useMemo(() => steps[currentStepIndex] ?? steps[0], [currentStepIndex]);

  const fieldValueLookup: Record<IncidentFieldKey, string> = {
    pesel: incidentDraft.pesel ?? '',
    nr_dowodu: incidentDraft.nr_dowodu ?? '',
    imie: incidentDraft.imie ?? '',
    nazwisko: incidentDraft.nazwisko ?? '',
    numer_telefonu: incidentDraft.numer_telefonu ?? '',
    ulica: incidentDraft.ulica ?? '',
    szczegoly_okolicznosci: incidentDraft.szczegoly_okolicznosci ?? '',
  };

  const getFieldErrorMessage = (fieldName: IncidentFieldKey, rawValue: string) => {
    const validator = FIELD_VALIDATORS[fieldName];
    return validator ? validator(rawValue ?? '') : null;
  };

  const applyValidationResult = (fieldName: IncidentFieldKey, errorMessage: string | null) => {
    setValidationErrors((prev) => {
      if (errorMessage) {
        if (prev[fieldName] === errorMessage) {
          return prev;
        }
        return { ...prev, [fieldName]: errorMessage };
      }

      if (!(fieldName in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const runFieldValidation = (fieldName: IncidentFieldKey, rawValue: string) => {
    const errorMessage = getFieldErrorMessage(fieldName, rawValue);
    applyValidationResult(fieldName, errorMessage);
    return !errorMessage;
  };

  const isStepValid = (stepId: IncidentWizardStep['id']) => {
    const fields = STEP_FIELDS_BY_STEP[stepId] ?? [];
    return fields.every((fieldName) => {
      const value = fieldValueLookup[fieldName] ?? '';
      return !getFieldErrorMessage(fieldName, value);
    });
  };

  const validateStepFields = (stepId: IncidentWizardStep['id']) => {
    const fields = STEP_FIELDS_BY_STEP[stepId] ?? [];
    let isValid = true;

    fields.forEach((fieldName) => {
      const value = fieldValueLookup[fieldName] ?? '';
      const errorMessage = getFieldErrorMessage(fieldName, value);
      if (errorMessage) {
        isValid = false;
      }
      applyValidationResult(fieldName, errorMessage);
    });

    return isValid;
  };

  const updateDraftField = <Key extends keyof CreateDocumentInput>(field: Key) =>
    (value: CreateDocumentInput[Key]) => {
      setIncidentDraft((prev) => ({
        ...prev,
        [field]: value,
      }));

      if (isIncidentFieldKey(field)) {
        const nextValue = typeof value === 'string' ? value : value == null ? '' : String(value);
        runFieldValidation(field, nextValue);
      }

      let shouldResetError = false;
      setSubmitState((current) => {
        if (current === 'submitting') {
          return current;
        }

        if (current !== 'idle') {
          shouldResetError = true;
        }

        return 'idle';
      });

      if (shouldResetError) {
        setSubmitError(null);
      }
    };

  const handleInputChange = <Key extends keyof CreateDocumentInput>(field: Key) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      const nextValue = (field === 'nr_dowodu' ? rawValue.toUpperCase() : rawValue) as CreateDocumentInput[Key];
      updateDraftField(field)(nextValue);
    };

  const handleTextareaChange = <Key extends keyof CreateDocumentInput>(field: Key) =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateDraftField(field)(event.target.value as CreateDocumentInput[Key]);
    };

  const isCurrentStepValid = isStepValid(currentStep.id);
  const hasNextStep = currentStepIndex < steps.length - 1;
  const isLastStep = currentStepIndex === steps.length - 1;
  const isSubmitting = submitState === 'submitting';
  const hasSubmittedSuccessfully = submitState === 'success';
  const canAdvance = isLastStep
    ? !isSubmitting && !hasSubmittedSuccessfully
    : hasNextStep && (letUserProceedWithEmptyFields || isCurrentStepValid);

  const handleBack = () => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const handleValidationGate = () => {
    if (letUserProceedWithEmptyFields) {
      return true;
    }

    return validateStepFields(currentStep.id);
  };

  const handleSubmit = async () => {
    if (hasSubmittedSuccessfully || isSubmitting) {
      return;
    }

    setSubmitState('submitting');
    setSubmitError(null);

    try {
      const payload: CreateDocumentInput = {
        ...incidentDraft,
        witnesses: incidentDraft.witnesses ?? [],
        szczegoly_okolicznosci: (incidentDraft.szczegoly_okolicznosci ?? '').trim(),
      };

      await createDocument(payload);
      setSubmitState('success');
    } catch (error) {
      console.error(error);
      setSubmitState('error');
      setSubmitError('Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      void handleSubmit();
      return;
    }

    if (!handleValidationGate()) {
      return;
    }

    setCurrentStepIndex((index) => {
      const nextIndex = Math.min(steps.length - 1, index + 1);
      setFurthestStepIndex((previousHighest) => Math.max(previousHighest, nextIndex));
      return nextIndex;
    });
  };

  const handleStepSelect = (stepId: string) => {
    const targetIndex = steps.findIndex((step) => step.id === stepId);
    if (targetIndex === -1 || targetIndex === currentStepIndex || targetIndex > furthestStepIndex) {
      return;
    }

    if (!letUserProceedWithEmptyFields && targetIndex > currentStepIndex) {
      const currentValid = validateStepFields(currentStep.id);
      if (!currentValid) {
        return;
      }
    }

    setCurrentStepIndex(targetIndex);
    setFurthestStepIndex((previousHighest) => Math.max(previousHighest, targetIndex));
  };

  const renderAside = () => (
    <>
      <IncidentInfoCard title="Co się zmieni?">
        Tu pojawią się informacje kontekstowe zależne od etapu, np. checklista dokumentów do zebrania lub status
        autozapisu.
      </IncidentInfoCard>
      <IncidentInfoCard title="Wskazówki od mentorów">
        Dzięki integracji z zespołem ZUS możemy dołączać wskazówki dotyczące poprawnego wypełniania formularza.
      </IncidentInfoCard>
    </>
  );

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { href: '/', labelKey: 'home' },
              { href: '/dashboard/user', labelKey: 'report-incident' },
            ]}
          />
          <div>
            <h1 className="text-3xl font-semibold text-primary">Zgłoś zdarzenie</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Poniższa wersja prezentuje wczesny podgląd komponentów kreatora. Docelowo każdy krok zostanie
              połączony z pełnym schematem danych oraz walidacją.
            </p>
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Postęp zgłoszenia</p>
          <IncidentStepTracker
            steps={steps}
            currentStepId={currentStep.id}
            maxAccessibleStepIndex={furthestStepIndex}
            onStepSelect={handleStepSelect}
          />
        </div>

        <IncidentWizardLayout
          stepIndex={currentStepIndex}
          stepCount={steps.length}
          title={currentStep.title}
          description={currentStep.description}
          rightColumn={renderAside()}
        >
          <div className="space-y-10">
            {currentStep.id === 'identity' && (
              <IncidentWizardSection
                title="Tożsamość osoby poszkodowanej"
                description="Dane służą do jednoznacznego zidentyfikowania osoby w systemach ZUS."
              >
                <IncidentTextField
                  label="PESEL"
                  name="pesel"
                  value={incidentDraft.pesel ?? ''}
                  maxLength={11}
                  onChange={handleInputChange('pesel')}
                  error={validationErrors.pesel}
                  hint="11 cyfr, bez spacji. System później zweryfikuje poprawność numeru."
                />
                <IncidentTextField
                  label="Numer dokumentu tożsamości"
                  name="nr_dowodu"
                  value={incidentDraft.nr_dowodu ?? ''}
                  onChange={handleInputChange('nr_dowodu')}
                  error={validationErrors.nr_dowodu}
                  hint="Najczęściej dowód osobisty. Możesz podać paszport, jeśli przebywasz za granicą."
                />
                <IncidentTextField
                  label="Imię"
                  name="imie"
                  value={incidentDraft.imie ?? ''}
                  onChange={handleInputChange('imie')}
                  error={validationErrors.imie}
                />
                <IncidentTextField
                  label="Nazwisko"
                  name="nazwisko"
                  value={incidentDraft.nazwisko ?? ''}
                  onChange={handleInputChange('nazwisko')}
                  error={validationErrors.nazwisko}
                />
                <IncidentTextField
                  label="Telefon kontaktowy"
                  name="numer_telefonu"
                  value={incidentDraft.numer_telefonu ?? ''}
                  optional
                  onChange={handleInputChange('numer_telefonu')}
                  hint="Przyspiesza kontakt w razie dodatkowych pytań."
                />
              </IncidentWizardSection>
            )}

            {currentStep.id === 'accident' && (
              <IncidentWizardSection
                title="Opis zdarzenia"
                description="Szczegółowy opis pomaga ekspertom ZUS właściwie zakwalifikować zgłoszenie."
              >
                <IncidentTextField
                  component="textarea"
                  label="Co dokładnie się stało?"
                  name="szczegoly_okolicznosci"
                  value={incidentDraft.szczegoly_okolicznosci ?? ''}
                  onChange={handleTextareaChange('szczegoly_okolicznosci')}
                  error={validationErrors.szczegoly_okolicznosci}
                  hint="Uwzględnij czas, miejsce, wykonywane czynności i używane maszyny."
                  aiSuggestion={
                    <IncidentAiSuggestion>
                      Podaj fakty: <strong>gdzie</strong>, <strong>kiedy</strong>, <strong>jak</strong> i <strong>dlaczego</strong> doszło do zdarzenia. Jeśli byli świadkowie lub używaliście maszyn, zapisz ich nazwy i numery seryjne.
                    </IncidentAiSuggestion>
                  }
                />
              </IncidentWizardSection>
            )}

            {currentStep.id === 'witnesses' && (
              <IncidentWizardSection
                title="Świadkowie"
                description="Możesz dodać dowolną liczbę osób, które potwierdzą przebieg zdarzenia."
                actions={
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
                  >
                    Dodaj świadka
                  </button>
                }
              >
                <IncidentAiSuggestion title="Brak świadków?" variant="warning">
                  Jeśli nie było obserwatorów zdarzenia, zaznacz to w dalszej części formularza. System zaproponuje alternatywne dokumenty potwierdzające zgłoszenie.
                </IncidentAiSuggestion>
              </IncidentWizardSection>
            )}

            {currentStep.id === 'residence' && (
              <IncidentWizardSection
                title="Adres zamieszkania"
                description="Aktualny adres zamieszkania poszkodowanego. Jeżeli mieszkasz za granicą, w kolejnym kroku poprosimy o ostatni adres w Polsce."
              >
                <IncidentTextField
                  label="Ulica"
                  name="ulica"
                  value={incidentDraft.ulica ?? ''}
                  onChange={handleInputChange('ulica')}
                  optional
                  hint="Pola adresowe zostaną zasilone danymi z bazy Poczty Polskiej w kolejnej iteracji."
                />
              </IncidentWizardSection>
            )}

            {currentStep.id === 'review' && (
              <IncidentWizardSection
                title="Podsumowanie"
                description="Pokazujemy zebrane dane w formie do szybkiej weryfikacji."
              >
                {hasSubmittedSuccessfully ? (
                  <IncidentAiSuggestion title="Zgłoszenie wysłane">
                    Twój szkic został przesłany do systemu. Możesz wrócić do poprzednich kroków, by wprowadzić korekty lub zamknąć
                    kreator.
                  </IncidentAiSuggestion>
                ) : (
                  <IncidentAiSuggestion>
                    W finalnej wersji kreator zrenderuje tutaj listę wszystkich sekcji wraz z możliwością szybkiej edycji.
                    Zatwierdzając, utworzysz pojedynczy dokument na podstawie zgromadzonych danych.
                  </IncidentAiSuggestion>
                )}
                {submitError && (
                  <IncidentAiSuggestion title="Błąd zapisu" variant="warning">
                    {submitError}
                  </IncidentAiSuggestion>
                )}
              </IncidentWizardSection>
            )}
          </div>

          <IncidentWizardNavigation
            isSubmitting={isSubmitting}
            canGoBack={currentStepIndex > 0}
            canGoNext={canAdvance}
            onBack={handleBack}
            onNext={handleNext}
            nextLabel={currentStepIndex === steps.length - 1
              ? hasSubmittedSuccessfully
                ? 'Wysłano'
                : 'Wyślij zgłoszenie'
              : 'Dalej'}
          />
        </IncidentWizardLayout>
      </div>
    </div>
  );
}
