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
      description="Podaj aktualny adres poszkodowanego. Jeśli mieszkasz za granicą, wpisz ostatni adres w Polsce."
    >
      <IncidentTextField
        label="Ulica"
        name="ulica"
        value={draft.ulica ?? ''}
        onChange={onInputChange('ulica')}
        optional
        hint="Jeśli adres nie ma numeru, pozostaw pole puste."
      />
    </IncidentWizardSection>
  );
}
