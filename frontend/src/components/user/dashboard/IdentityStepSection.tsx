import type { ChangeEvent } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import type { CreateDocumentInput } from '@/lib/services/documentService';

type InputChangeHandler = <Key extends keyof CreateDocumentInput>(field: Key) => (event: ChangeEvent<HTMLInputElement>) => void;

type IdentityStepSectionProps = {
  draft: CreateDocumentInput;
  validationErrors: Record<string, string>;
  onInputChange: InputChangeHandler;
};

export function IdentityStepSection({ draft, validationErrors, onInputChange }: IdentityStepSectionProps) {
  return (
    <IncidentWizardSection
      title="Tożsamość osoby poszkodowanej"
      description="Wpisz dane osoby poszkodowanej."
    >
      <IncidentTextField
        label="PESEL"
        name="pesel"
        value={draft.pesel ?? ''}
        maxLength={11}
        onChange={onInputChange('pesel')}
        error={validationErrors.pesel}
        hint="Wpisz 11 cyfr bez spacji."
      />
      <IncidentTextField
        label="Numer dokumentu tożsamości"
        name="nr_dowodu"
        value={draft.nr_dowodu ?? ''}
        onChange={onInputChange('nr_dowodu')}
        error={validationErrors.nr_dowodu}
        hint="Przepisz numer, np. ABC123456."
      />
      <IncidentTextField
        label="Imię"
        name="imie"
        value={draft.imie ?? ''}
        onChange={onInputChange('imie')}
        error={validationErrors.imie}
      />
      <IncidentTextField
        label="Nazwisko"
        name="nazwisko"
        value={draft.nazwisko ?? ''}
        onChange={onInputChange('nazwisko')}
        error={validationErrors.nazwisko}
      />
      <IncidentTextField
        label="Telefon kontaktowy"
        name="numer_telefonu"
        value={draft.numer_telefonu ?? ''}
        optional
        onChange={onInputChange('numer_telefonu')}
        hint="Ułatwia szybki kontakt."
      />
    </IncidentWizardSection>
  );
}
