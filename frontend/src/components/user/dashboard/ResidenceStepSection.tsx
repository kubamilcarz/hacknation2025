import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function ResidenceStepSection() {
  const { incidentDraft, handleInputChange } = useIncidentReport();

  return (
    <IncidentWizardSection
      title="Adres zamieszkania"
      description="Podaj aktualny adres poszkodowanego. Jeśli mieszkasz za granicą, wpisz ostatni adres w Polsce."
    >
      <IncidentTextField
        label="Ulica"
        name="ulica"
        value={incidentDraft.ulica ?? ''}
        onChange={handleInputChange('ulica')}
        optional
        hint="Jeśli adres nie ma numeru, pozostaw pole puste."
      />
    </IncidentWizardSection>
  );
}
