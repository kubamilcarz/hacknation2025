import type { Witness } from '@/types/document';

export const WITNESS_EDITABLE_FIELDS = ['imie', 'nazwisko', 'ulica', 'nr_domu', 'nr_lokalu', 'miejscowosc', 'kod_pocztowy', 'nazwa_panstwa'] as const;
export type WitnessEditableField = (typeof WITNESS_EDITABLE_FIELDS)[number];

export const createEmptyWitness = (): Witness => ({
  imie: '',
  nazwisko: '',
  ulica: '',
  nr_domu: '',
  nr_lokalu: '',
  miejscowosc: '',
  kod_pocztowy: '',
  nazwa_panstwa: '',
  document: null,
});

export const witnessFieldKey = (index: number, field: WitnessEditableField) => `witnesses.${index}.${field}`;

export const WITNESS_FIELD_VALIDATORS: Partial<Record<WitnessEditableField, (value: string) => string | null>> = {
  imie: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return 'Imię świadka jest wymagane.';
    }
    if (normalized.length < 2) {
      return 'Imię świadka musi mieć co najmniej 2 znaki.';
    }
    if (/\d/.test(normalized)) {
      return 'Imię świadka nie powinno zawierać cyfr.';
    }
    return null;
  },
  nazwisko: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return 'Nazwisko świadka jest wymagane.';
    }
    if (normalized.length < 2) {
      return 'Nazwisko świadka musi mieć co najmniej 2 znaki.';
    }
    if (/\d/.test(normalized)) {
      return 'Nazwisko świadka nie powinno zawierać cyfr.';
    }
    return null;
  },
  ulica: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length < 3) {
      return 'Nazwa ulicy musi mieć co najmniej 3 znaki.';
    }
    return null;
  },
  nr_domu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 10) {
      return 'Numer domu jest zbyt długi.';
    }
    return null;
  },
  nr_lokalu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 10) {
      return 'Numer lokalu jest zbyt długi.';
    }
    return null;
  },
  miejscowosc: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length < 2) {
      return 'Nazwa miejscowości jest za krótka.';
    }
    return null;
  },
  kod_pocztowy: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (!/^\d{2}-?\d{3}$/.test(normalized)) {
      return 'Podaj kod pocztowy w formacie 12-345.';
    }
    return null;
  },
  nazwa_panstwa: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length < 3) {
      return 'Nazwa państwa jest za krótka.';
    }
    return null;
  },
};
