import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function ResidenceStepSection() {
  const { incidentDraft, handleInputChange } = useIncidentReport();

  return (
    <IncidentWizardSection>
      <IncidentTextField
        label="Ulica"
        name="ulica"
        value={incidentDraft.ulica ?? ''}
        onChange={handleInputChange('ulica')}
        optional
        hint="Jeżeli w adresie brakuje numeru, pozostaw pole puste."
      />
    </IncidentWizardSection>
  );
}
