import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { InfoTooltip } from '@/components/user/InfoTooltip';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function AccidentStepSection() {
  const { incidentDraft, validationErrors, handleTextareaChange } = useIncidentReport();

  return (
    <IncidentWizardSection
      title="Opis zdarzenia"
      description="Opisz przebieg wypadku."
      actions={
        <InfoTooltip label="Dlaczego o to pytamy?">
          <div className="space-y-2">
            <p>
              Aby uznać zdarzenie za wypadek przy pracy, specjaliści ZUS sprawdzają, czy wystąpiły wszystkie poniższe
              elementy.
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Nagłość zdarzenia – krótki, nieoczekiwany przebieg.</li>
              <li>Przyczyna zewnętrzna – wpływ osoby, maszyny lub warunków środowiska.</li>
              <li>Uraz lub śmierć – powstanie szkody na zdrowiu.</li>
              <li>Związek z pracą – zdarzenie podczas wykonywania obowiązków.</li>
            </ul>
            <p className="text-xs text-muted">
              Opisz w formularzu fakty potwierdzające każde z kryteriów, aby przyspieszyć decyzję.
            </p>
          </div>
        </InfoTooltip>
      }
    >
      <IncidentTextField
        component="textarea"
        label="Co dokładnie się stało?"
        name="szczegoly_okolicznosci"
        value={incidentDraft.szczegoly_okolicznosci ?? ''}
        onChange={handleTextareaChange('szczegoly_okolicznosci')}
        error={validationErrors.szczegoly_okolicznosci}
        hint="Wpisz czas, miejsce i wykonywane czynności."
        aiSuggestion={
          <IncidentAiSuggestion>
            Napisz krótko: <strong>gdzie</strong>, <strong>kiedy</strong>, <strong>co robiłeś</strong> i <strong>co spowodowało</strong> zdarzenie. Dodaj świadków i użyty sprzęt.
          </IncidentAiSuggestion>
        }
      />
    </IncidentWizardSection>
  );
}
