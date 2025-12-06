import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { InfoTooltip } from '@/components/user/InfoTooltip';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function AccidentStepSection() {
  const { incidentDraft, validationErrors, handleTextareaChange } = useIncidentReport();

  return (
    <IncidentWizardSection
      actions={
        <InfoTooltip label="Na co zwraca uwagę ZUS?">
          <div className="space-y-2">
            <p>
              Przy ocenie zgłoszenia eksperci sprawdzają, czy w opisie pojawiają się następujące elementy. Potraktuj je jako listę kontrolną:
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Nagłość zdarzenia – krótki, nieplanowany przebieg.</li>
              <li>Przyczyna zewnętrzna – wpływ osoby, sprzętu lub warunków otoczenia.</li>
              <li>Uraz – co dokładnie ucierpiało.</li>
              <li>Związek z wykonywaną pracą – co robiłeś, gdy to się stało.</li>
            </ul>
            <p className="text-xs text-muted">
              Nie potrzebujesz długiego opisu – krótka wzmianka przy każdym punkcie ułatwi szybką decyzję.
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
        hint="Zacznij od czasu i miejsca, dopisz wykonywane czynności oraz co spowodowało zdarzenie. Możesz pisać zdaniami lub w punktach."
        aiSuggestion={
          <IncidentAiSuggestion>
            <div className="space-y-2">
              <p>
                Odpowiedz kolejno na pytania: <strong>kiedy</strong> (data i godzina), <strong>gdzie</strong> (miejsce), <strong>co robiłeś</strong> oraz <strong>co doprowadziło</strong> do urazu. Wspomnij też o sprzęcie i świadkach, jeśli byli.
              </p>
              <p className="text-xs text-muted">
                Przykład: "12 marca około 10:30 na budowie przy ul. Zielonej montowałem barierki. Podczas przenoszenia elementu poślizgnąłem się na mokrej podłodze i skręciłem nadgarstek."
              </p>
            </div>
          </IncidentAiSuggestion>
        }
      />
    </IncidentWizardSection>
  );
}
