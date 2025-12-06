'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { IncidentWizardLayout } from '@/components/user/IncidentWizardLayout';
import { IncidentStepTracker } from '@/components/user/IncidentStepTracker';
import { IncidentWizardNavigation } from '@/components/user/IncidentWizardNavigation';
import type { IncidentWizardStep } from '@/components/user/IncidentStepTracker';
import { IdentityStepSection } from '@/components/user/dashboard/IdentityStepSection';
import { AccidentStepSection } from '@/components/user/dashboard/AccidentStepSection';
import { WitnessesStepSection } from '@/components/user/dashboard/WitnessesStepSection';
import { ResidenceStepSection } from '@/components/user/dashboard/ResidenceStepSection';
import { ReviewStepSection } from '@/components/user/dashboard/ReviewStepSection';
import { UserDashboardAside } from '@/components/user/dashboard/UserDashboardAside';
import {
  WITNESS_EDITABLE_FIELDS,
  WITNESS_FIELD_VALIDATORS,
  createEmptyWitness,
  type WitnessEditableField,
  witnessFieldKey,
} from '@/components/user/dashboard/witnesses/utils';
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
  const [activeWitnessIndex, setActiveWitnessIndex] = useState<number | null>(null);

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

  const getWitnessFieldErrorMessage = (fieldName: WitnessEditableField, rawValue: string) => {
    const validator = WITNESS_FIELD_VALIDATORS[fieldName];
    return validator ? validator(rawValue ?? '') : null;
  };

  const applyValidationResult = (fieldName: string, errorMessage: string | null) => {
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

  const witnesses = incidentDraft.witnesses ?? [];

  const setWitnessFieldValue = (index: number, field: WitnessEditableField, nextValue: string) => {
    setIncidentDraft((prev) => {
      const previousWitnesses = prev.witnesses ?? [];
      const nextWitnesses = previousWitnesses.map((witness, witnessIndex) => {
        if (witnessIndex !== index) {
          return witness;
        }

        return {
          ...witness,
          [field]: nextValue,
        };
      });

      return {
        ...prev,
        witnesses: nextWitnesses,
      };
    });

    const errorMessage = getWitnessFieldErrorMessage(field, nextValue);
    applyValidationResult(witnessFieldKey(index, field), errorMessage);
  };

  const handleWitnessInputChange = (index: number, field: WitnessEditableField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setWitnessFieldValue(index, field, event.target.value);
    };

  const handleAddWitness = () => {
    const newIndex = witnesses.length;
    setIncidentDraft((prev) => ({
      ...prev,
      witnesses: [...(prev.witnesses ?? []), createEmptyWitness()],
    }));
    setActiveWitnessIndex(newIndex);
  };

  const handleRemoveWitness = (index: number) => {
    const nextWitnesses = witnesses.filter((_, witnessIndex) => witnessIndex !== index);
    setIncidentDraft((prev) => ({
      ...prev,
      witnesses: nextWitnesses,
    }));

    setActiveWitnessIndex((current) => {
      if (current == null) {
        return current;
      }

      if (current === index) {
        return null;
      }

      return current > index ? current - 1 : current;
    });

    setValidationErrors((prev) => {
      const next: Record<string, string> = {};

      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith('witnesses.')) {
          next[key] = value;
        }
      });

      nextWitnesses.forEach((witness, witnessIndex) => {
        WITNESS_EDITABLE_FIELDS.forEach((field) => {
          const validator = WITNESS_FIELD_VALIDATORS[field];
          if (!validator) {
            return;
          }

          const rawValue = typeof witness[field] === 'string' ? (witness[field] as string) : witness[field] == null ? '' : String(witness[field]);
          if (!rawValue && (field === 'imie' || field === 'nazwisko')) {
            const errorMessage = validator(rawValue);
            if (errorMessage) {
              next[witnessFieldKey(witnessIndex, field)] = errorMessage;
            }
            return;
          }

          if (!rawValue) {
            return;
          }

          const errorMessage = validator(rawValue);
          if (errorMessage) {
            next[witnessFieldKey(witnessIndex, field)] = errorMessage;
          }
        });
      });

      return next;
    });
  };

  const handleToggleWitnessEdit = (index: number) => {
    setActiveWitnessIndex((current) => (current === index ? null : index));
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
      const sanitizedWitnesses = (incidentDraft.witnesses ?? [])
        .map((witness) => ({
          ...witness,
          imie: (witness.imie ?? '').trim(),
          nazwisko: (witness.nazwisko ?? '').trim(),
          ulica: (witness.ulica ?? '').trim(),
          nr_domu: (witness.nr_domu ?? '').trim(),
          nr_lokalu: (witness.nr_lokalu ?? '').trim(),
          miejscowosc: (witness.miejscowosc ?? '').trim(),
          kod_pocztowy: (witness.kod_pocztowy ?? '').trim(),
          nazwa_panstwa: (witness.nazwa_panstwa ?? '').trim(),
        }))
        .filter((witness) => witness.imie.length > 0 || witness.nazwisko.length > 0);

      const payload: CreateDocumentInput = {
        ...incidentDraft,
        witnesses: sanitizedWitnesses,
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
          rightColumn={<UserDashboardAside />}
        >
          <div className="space-y-10">
            {currentStep.id === 'identity' && (
              <IdentityStepSection
                draft={incidentDraft}
                validationErrors={validationErrors}
                onInputChange={handleInputChange}
              />
            )}

            {currentStep.id === 'accident' && (
              <AccidentStepSection
                draft={incidentDraft}
                validationErrors={validationErrors}
                onTextareaChange={handleTextareaChange}
              />
            )}

            {currentStep.id === 'witnesses' && (
              <WitnessesStepSection
                witnesses={witnesses}
                activeWitnessIndex={activeWitnessIndex}
                validationErrors={validationErrors}
                onAddWitness={handleAddWitness}
                onRemoveWitness={handleRemoveWitness}
                onToggleWitnessEdit={handleToggleWitnessEdit}
                onWitnessInputChange={handleWitnessInputChange}
              />
            )}

            {currentStep.id === 'residence' && (
              <ResidenceStepSection draft={incidentDraft} onInputChange={handleInputChange} />
            )}

            {currentStep.id === 'review' && (
              <ReviewStepSection
                hasSubmittedSuccessfully={hasSubmittedSuccessfully}
                submitError={submitError}
              />
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
