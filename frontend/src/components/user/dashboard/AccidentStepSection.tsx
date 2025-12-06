import type { ChangeEvent } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { InfoTooltip } from '@/components/user/InfoTooltip';
import type { CreateDocumentInput } from '@/lib/services/documentService';

type TextareaChangeHandler = <Key extends keyof CreateDocumentInput>(field: Key) => (event: ChangeEvent<HTMLTextAreaElement>) => void;

type AccidentStepSectionProps = {
  draft: CreateDocumentInput;
  validationErrors: Record<string, string>;
  onTextareaChange: TextareaChangeHandler;
};

export function AccidentStepSection({ draft, validationErrors, onTextareaChange }: AccidentStepSectionProps) {
  return (
    <IncidentWizardSection
      title="Opis zdarzenia"
      description="Szczegółowy opis pomaga ekspertom ZUS właściwie zakwalifikować zgłoszenie."
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
        value={draft.szczegoly_okolicznosci ?? ''}
        onChange={onTextareaChange('szczegoly_okolicznosci')}
        error={validationErrors.szczegoly_okolicznosci}
        hint="Uwzględnij czas, miejsce, wykonywane czynności i używane maszyny."
        aiSuggestion={
          <IncidentAiSuggestion>
            Podaj fakty: <strong>gdzie</strong>, <strong>kiedy</strong>, <strong>jak</strong> i <strong>dlaczego</strong> doszło do zdarzenia. Jeśli byli świadkowie lub używaliście maszyn, zapisz ich nazwy i numery seryjne.
          </IncidentAiSuggestion>
        }
      />
    </IncidentWizardSection>
  );
}
