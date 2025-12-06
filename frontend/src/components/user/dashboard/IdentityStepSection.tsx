import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function IdentityStepSection() {
  const { incidentDraft, validationErrors, handleInputChange } = useIncidentReport();

  return (
    <IncidentWizardSection
      title="Tożsamość osoby poszkodowanej"
      description="Wpisz dane osoby poszkodowanej."
    >
      <IncidentTextField
        label="PESEL"
        name="pesel"
        value={incidentDraft.pesel ?? ''}
        maxLength={11}
        onChange={handleInputChange('pesel')}
        error={validationErrors.pesel}
        hint="Wpisz 11 cyfr bez spacji."
      />
      <IncidentTextField
        label="Numer dokumentu tożsamości"
        name="nr_dowodu"
        value={incidentDraft.nr_dowodu ?? ''}
        onChange={handleInputChange('nr_dowodu')}
        error={validationErrors.nr_dowodu}
        hint="Przepisz numer, np. ABC123456."
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
        hint="Ułatwia szybki kontakt."
      />
    </IncidentWizardSection>
  );
}
