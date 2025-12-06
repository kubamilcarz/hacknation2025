import type { ChangeEvent } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import type { CreateDocumentInput } from '@/lib/services/documentService';

type InputChangeHandler = <Key extends keyof CreateDocumentInput>(field: Key) => (event: ChangeEvent<HTMLInputElement>) => void;

type ResidenceStepSectionProps = {
  draft: CreateDocumentInput;
  onInputChange: InputChangeHandler;
};

export function ResidenceStepSection({ draft, onInputChange }: ResidenceStepSectionProps) {
  return (
    <IncidentWizardSection
      title="Adres zamieszkania"
      description="Aktualny adres zamieszkania poszkodowanego. Jeżeli mieszkasz za granicą, w kolejnym kroku poprosimy o ostatni adres w Polsce."
    >
      <IncidentTextField
        label="Ulica"
        name="ulica"
        value={draft.ulica ?? ''}
        onChange={onInputChange('ulica')}
        optional
        hint="Pola adresowe zostaną zasilone danymi z bazy Poczty Polskiej w kolejnej iteracji."
      />
    </IncidentWizardSection>
  );
}
