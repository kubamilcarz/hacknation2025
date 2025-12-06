import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function ResidenceStepSection() {
  const { incidentDraft, handleInputChange } = useIncidentReport();

  return (
    <IncidentWizardSection
      title="Adres korespondencyjny"
      description="Podaj adres, pod który możemy wysłać korespondencję. Jeśli mieszkasz za granicą, zostaw ostatni adres w Polsce."
    >
      <IncidentTextField
        label="Ulica"
        name="ulica"
        value={incidentDraft.ulica ?? ''}
        onChange={handleInputChange('ulica')}
        optional
        hint="Jeśli na adresie brakuje numeru — nic się nie dzieje, zostaw pole puste."
      />
    </IncidentWizardSection>
  );
}
