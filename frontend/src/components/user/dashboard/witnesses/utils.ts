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
      return 'Dodaj imię świadka, żebyśmy wiedzieli, z kim się skontaktować.';
    }
    if (normalized.length < 2) {
      return 'Wpisz imię świadka w pełnej formie (minimum 2 znaki).';
    }
    if (/\d/.test(normalized)) {
      return 'W imieniu świadka nie używamy cyfr.';
    }
    return null;
  },
  nazwisko: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return 'Dodaj nazwisko świadka, aby ułatwić kontakt.';
    }
    if (normalized.length < 2) {
      return 'Wpisz nazwisko świadka w pełnej formie (minimum 2 znaki).';
    }
    if (/\d/.test(normalized)) {
      return 'W nazwisku świadka nie używamy cyfr.';
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
  nr_domu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 10) {
      return 'Numer domu jest dość długi – skróć go do 10 znaków.';
    }
    return null;
  },
  nr_lokalu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 10) {
      return 'Numer lokalu jest dość długi – skróć go do 10 znaków.';
    }
    return null;
  },
  miejscowosc: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length < 2) {
      return 'Nazwa miejscowości powinna mieć co najmniej 2 znaki.';
    }
    return null;
  },
  kod_pocztowy: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (!/^\d{2}-?\d{3}$/.test(normalized)) {
      return 'Podaj kod pocztowy w formacie 12-345 – możesz wpisać go z myślnikiem lub bez.';
    }
    return null;
  },
  nazwa_panstwa: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length < 3) {
      return 'Nazwa państwa powinna mieć co najmniej 3 znaki.';
    }
    return null;
  },
};
