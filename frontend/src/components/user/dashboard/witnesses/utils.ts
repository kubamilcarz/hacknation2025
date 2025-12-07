import type { Witness } from '@/types/document';

export const WITNESS_EDITABLE_FIELDS = [
  'imie',
  'nazwisko',
  'numer_telefonu',
  'adres_email',
  'ulica',
  'nr_domu',
  'nr_lokalu',
  'miejscowosc',
  'kod_pocztowy',
  'nazwa_panstwa',
] as const;
export type WitnessEditableField = (typeof WITNESS_EDITABLE_FIELDS)[number];

export const createEmptyWitness = (): Witness => ({
  imie: '',
  nazwisko: '',
  numer_telefonu: '',
  adres_email: '',
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
      return 'Podaj imię świadka, aby wskazać osobę do kontaktu.';
    }
    if (normalized.length < 2) {
      return 'Wpisz imię świadka w pełnej formie (co najmniej 2 znaki).';
    }
    if (/\d/.test(normalized)) {
      return 'Imię świadka nie może zawierać cyfr.';
    }
    return null;
  },
  nazwisko: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return 'Podaj nazwisko świadka, aby ułatwić kontakt.';
    }
    if (normalized.length < 2) {
      return 'Wpisz nazwisko świadka w pełnej formie (co najmniej 2 znaki).';
    }
    if (/\d/.test(normalized)) {
      return 'Nazwisko świadka nie może zawierać cyfr.';
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
      return 'Numer telefonu świadka powinien mieć od 9 do 15 cyfr. Popraw wpis lub pozostaw pole puste.';
    }

    return null;
  },
  adres_email: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalized)) {
      return 'Adres e-mail świadka wygląda na nieprawidłowy. Popraw wpis lub pozostaw pole puste.';
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
      return 'Numer domu jest zbyt długi, skróć go do 10 znaków.';
    }
    return null;
  },
  nr_lokalu: (value) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 10) {
      return 'Numer lokalu jest zbyt długi, skróć go do 10 znaków.';
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
      return 'Podaj kod pocztowy w formacie 12-345, możesz wpisać go z myślnikiem lub bez.';
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
