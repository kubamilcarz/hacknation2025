'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import type { IncidentWizardStep } from '@/components/user/IncidentStepTracker';
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

const STEPS: IncidentWizardStep[] = [
  {
    id: 'identity',
    title: 'Twoje dane',
    description: 'Uzupełnij podstawowe informacje o sobie. W razie czego zawsze możesz do nich wrócić.',
  },
  {
    id: 'residence',
    title: 'Adres zamieszkania',
    description: 'Podaj adres, pod który możemy kierować korespondencję.',
  },
  {
    id: 'accident',
    title: 'Opis zdarzenia',
    description: 'Opisz własnymi słowami, kiedy i gdzie doszło do zdarzenia.',
  },
  {
    id: 'witnesses',
    title: 'Świadkowie',
    description: 'Dodaj osoby, które mogą potwierdzić zdarzenie (jeśli takie są).',
    isOptional: true,
  },
  {
    id: 'review',
    title: 'Podsumowanie',
    description: 'Rzuć okiem na całość przed wysłaniem.',
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

const REQUIRED_FIELD_MESSAGE = 'Dodaj tę informację, abyśmy mogli przygotować kompletne zgłoszenie.';

const FIELD_VALIDATORS: Record<IncidentFieldKey, (value: string) => string | null> = {
  pesel: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (!/^\d{11}$/.test(normalized)) {
      return 'PESEL powinien zawierać 11 cyfr – sprawdź, czy żadna się nie zgubiła.';
    }
    return null;
  },
  nr_dowodu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (!/^[A-Z]{3}\d{6}$/.test(normalized)) {
      return 'Podaj numer dokumentu w formacie ABC123456 (trzy litery i sześć cyfr).';
    }
    return null;
  },
  imie: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (normalized.length < 2) {
      return 'Wpisz pełne imię (minimum 2 znaki).';
    }
    if (/\d/.test(normalized)) {
      return 'W imieniu nie używamy cyfr.';
    }
    return null;
  },
  nazwisko: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (normalized.length < 2) {
      return 'Wpisz pełne nazwisko (minimum 2 znaki).';
    }
    if (/\d/.test(normalized)) {
      return 'W nazwisku nie używamy cyfr.';
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
      return 'Numer telefonu powinien mieć od 9 do 15 cyfr – wpisz go tak, jak najłatwiej się z Tobą skontaktować.';
    }
    return null;
  },
  ulica: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length < 3) {
      return 'Nazwa ulicy powinna mieć co najmniej 3 znaki.';
    }
    return null;
  },
  szczegoly_okolicznosci: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return REQUIRED_FIELD_MESSAGE;
    }
    if (normalized.length < 20) {
      return 'Opisz zdarzenie w kilku zdaniach (minimum 20 znaków).';
    }
    return null;
  },
};

const incidentFieldKeySet = new Set<IncidentFieldKey>(INCIDENT_FIELD_KEYS);

const isIncidentFieldKey = (field: keyof CreateDocumentInput): field is IncidentFieldKey =>
  incidentFieldKeySet.has(field as IncidentFieldKey);

const letUserProceedWithEmptyFields = true;

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

type InputChangeHandler = (field: keyof CreateDocumentInput) => (event: ChangeEvent<HTMLInputElement>) => void;
type TextareaChangeHandler = (field: keyof CreateDocumentInput) => (event: ChangeEvent<HTMLTextAreaElement>) => void;
type WitnessInputChangeHandler = (index: number, field: WitnessEditableField) => (event: ChangeEvent<HTMLInputElement>) => void;

type IncidentReportContextValue = {
  steps: IncidentWizardStep[];
  currentStep: IncidentWizardStep;
  currentStepIndex: number;
  furthestStepIndex: number;
  incidentDraft: CreateDocumentInput;
  validationErrors: Record<string, string>;
  submitState: 'idle' | 'submitting' | 'success' | 'error';
  submitError: string | null;
  submittedDocumentId: number | null;
  activeWitnessIndex: number | null;
  downloadState: 'idle' | 'docx' | 'pdf';
  witnesses: CreateDocumentInput['witnesses'];
  isSubmitting: boolean;
  hasSubmittedSuccessfully: boolean;
  hasNextStep: boolean;
  isLastStep: boolean;
  canAdvance: boolean;
  handleBack: () => void;
  handleNext: () => void;
  handleStepSelect: (stepId: IncidentWizardStep['id']) => void;
  handleInputChange: InputChangeHandler;
  handleTextareaChange: TextareaChangeHandler;
  handleAddWitness: () => void;
  handleRemoveWitness: (index: number) => void;
  handleToggleWitnessEdit: (index: number) => void;
  handleWitnessInputChange: WitnessInputChangeHandler;
  handleDownload: (format: 'docx' | 'pdf') => Promise<void>;
};

const IncidentReportContext = createContext<IncidentReportContextValue | undefined>(undefined);

const getFieldErrorMessage = (fieldName: IncidentFieldKey, rawValue: string) => {
  const validator = FIELD_VALIDATORS[fieldName];
  return validator ? validator(rawValue ?? '') : null;
};

const getWitnessFieldErrorMessage = (fieldName: WitnessEditableField, rawValue: string) => {
  const validator = WITNESS_FIELD_VALIDATORS[fieldName];
  return validator ? validator(rawValue ?? '') : null;
};

export function IncidentReportProvider({ children }: { children: ReactNode }) {
  const { createDocument, downloadDocumentFile } = useDocuments();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [incidentDraft, setIncidentDraft] = useState<CreateDocumentInput>(createInitialIncidentDraft);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedDocumentId, setSubmittedDocumentId] = useState<number | null>(null);
  const [activeWitnessIndex, setActiveWitnessIndex] = useState<number | null>(null);
  const [downloadState, setDownloadState] = useState<'idle' | 'docx' | 'pdf'>('idle');

  const currentStep = STEPS[currentStepIndex] ?? STEPS[0];
  const witnesses = incidentDraft.witnesses ?? [];

  const fieldValueLookup: Record<IncidentFieldKey, string> = useMemo(() => ({
    pesel: incidentDraft.pesel ?? '',
    nr_dowodu: incidentDraft.nr_dowodu ?? '',
    imie: incidentDraft.imie ?? '',
    nazwisko: incidentDraft.nazwisko ?? '',
    numer_telefonu: incidentDraft.numer_telefonu ?? '',
    ulica: incidentDraft.ulica ?? '',
    szczegoly_okolicznosci: incidentDraft.szczegoly_okolicznosci ?? '',
  }), [incidentDraft]);

  const applyValidationResult = useCallback((fieldName: string, errorMessage: string | null) => {
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
  }, []);

  const runFieldValidation = useCallback((fieldName: IncidentFieldKey, rawValue: string) => {
    const errorMessage = getFieldErrorMessage(fieldName, rawValue);
    applyValidationResult(fieldName, errorMessage);
    return !errorMessage;
  }, [applyValidationResult]);

  const validateStepFields = useCallback((stepId: IncidentWizardStep['id']) => {
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
  }, [applyValidationResult, fieldValueLookup]);

  const isStepValid = useCallback((stepId: IncidentWizardStep['id']) => {
    const fields = STEP_FIELDS_BY_STEP[stepId] ?? [];
    return fields.every((fieldName) => {
      const value = fieldValueLookup[fieldName] ?? '';
      return !getFieldErrorMessage(fieldName, value);
    });
  }, [fieldValueLookup]);

  const updateDraftField = useCallback(<Key extends keyof CreateDocumentInput>(field: Key) => (value: CreateDocumentInput[Key]) => {
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
      setSubmittedDocumentId(null);
    }
  }, [runFieldValidation]);

  const handleInputChange: InputChangeHandler = useCallback((field) => (event) => {
    const rawValue = event.target.value;
    const nextValue = field === 'nr_dowodu' ? rawValue.toUpperCase() : rawValue;
    updateDraftField(field)(nextValue as CreateDocumentInput[typeof field]);
  }, [updateDraftField]);

  const handleTextareaChange: TextareaChangeHandler = useCallback((field) => (event) => {
    updateDraftField(field)(event.target.value as CreateDocumentInput[typeof field]);
  }, [updateDraftField]);

  const setWitnessFieldValue = useCallback((index: number, field: WitnessEditableField, nextValue: string) => {
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
  }, [applyValidationResult]);

  const handleWitnessInputChange: WitnessInputChangeHandler = useCallback((index, field) => (event) => {
    setWitnessFieldValue(index, field, event.target.value);
  }, [setWitnessFieldValue]);

  const handleAddWitness = useCallback(() => {
    const newIndex = witnesses.length;
    setIncidentDraft((prev) => ({
      ...prev,
      witnesses: [...(prev.witnesses ?? []), createEmptyWitness()],
    }));
    setActiveWitnessIndex(newIndex);
  }, [witnesses.length]);

  const handleRemoveWitness = useCallback((index: number) => {
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

          const rawValue = typeof witness[field] === 'string'
            ? (witness[field] as string)
            : witness[field] == null
              ? ''
              : String(witness[field]);

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
  }, [witnesses]);

  const handleToggleWitnessEdit = useCallback((index: number) => {
    setActiveWitnessIndex((current) => (current === index ? null : index));
  }, []);

  const handleValidationGate = useCallback(() => {
    if (letUserProceedWithEmptyFields) {
      return true;
    }

    return validateStepFields(currentStep.id);
  }, [currentStep.id, validateStepFields]);

  const handleSubmit = useCallback(async () => {
    if (submitState === 'success' || submitState === 'submitting') {
      return;
    }

    setSubmitState('submitting');
    setSubmitError(null);
    setDownloadState('idle');
    setSubmittedDocumentId(null);

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

      const createdDocument = await createDocument(payload);
      setSubmittedDocumentId(createdDocument.id ?? null);
      setSubmitState('success');
    } catch (error) {
      console.error(error);
      setSubmitState('error');
      setSubmitError('Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
    }
  }, [createDocument, incidentDraft, submitState]);

  const handleDownload = useCallback(async (format: 'docx' | 'pdf') => {
    if (submittedDocumentId == null) {
      setSubmitError('Brakuje numeru zgłoszenia. Wyślij dokument ponownie.');
      return;
    }

    setDownloadState(format);
    try {
      await downloadDocumentFile(submittedDocumentId, format);
    } catch (error) {
      console.error(error);
      setSubmitError('Nie udało się pobrać pliku. Spróbuj ponownie.');
    } finally {
      setDownloadState('idle');
    }
  }, [downloadDocumentFile, submittedDocumentId]);

  const hasNextStep = currentStepIndex < STEPS.length - 1;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const isSubmitting = submitState === 'submitting';
  const hasSubmittedSuccessfully = submitState === 'success';

  const handleNext = useCallback(() => {
    if (isLastStep) {
      void handleSubmit();
      return;
    }

    if (!handleValidationGate()) {
      return;
    }

    setCurrentStepIndex((index) => {
      const nextIndex = Math.min(STEPS.length - 1, index + 1);
      setFurthestStepIndex((previousHighest) => Math.max(previousHighest, nextIndex));
      return nextIndex;
    });
  }, [handleSubmit, handleValidationGate, isLastStep]);

  const handleBack = useCallback(() => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const handleStepSelect = useCallback((stepId: IncidentWizardStep['id']) => {
    const targetIndex = STEPS.findIndex((step) => step.id === stepId);
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
  }, [currentStep.id, currentStepIndex, furthestStepIndex, validateStepFields]);

  const canAdvance = isLastStep
    ? !isSubmitting && !hasSubmittedSuccessfully
    : hasNextStep && (letUserProceedWithEmptyFields || isStepValid(currentStep.id));

  const value: IncidentReportContextValue = {
    steps: STEPS,
    currentStep,
    currentStepIndex,
    furthestStepIndex,
    incidentDraft,
    validationErrors,
    submitState,
    submitError,
    submittedDocumentId,
    activeWitnessIndex,
    downloadState,
    witnesses,
    isSubmitting,
    hasSubmittedSuccessfully,
    hasNextStep,
    isLastStep,
    canAdvance,
    handleBack,
    handleNext,
    handleStepSelect,
    handleInputChange,
    handleTextareaChange,
    handleAddWitness,
    handleRemoveWitness,
    handleToggleWitnessEdit,
    handleWitnessInputChange,
    handleDownload,
  };

  return (
    <IncidentReportContext.Provider value={value}>
      {children}
    </IncidentReportContext.Provider>
  );
}

export function useIncidentReport() {
  const context = useContext(IncidentReportContext);
  if (!context) {
    throw new Error('useIncidentReport must be used within IncidentReportProvider');
  }
  return context;
}
