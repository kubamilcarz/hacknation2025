import type { ChangeEvent } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import type { Witness } from '@/types/document';
import { WITNESS_EDITABLE_FIELDS, type WitnessEditableField, witnessFieldKey } from '@/components/user/dashboard/witnesses/utils';

type WitnessInputChangeHandler = (index: number, field: WitnessEditableField) => (event: ChangeEvent<HTMLInputElement>) => void;

type WitnessesStepSectionProps = {
  witnesses: Witness[];
  activeWitnessIndex: number | null;
  validationErrors: Record<string, string>;
  onAddWitness: () => void;
  onRemoveWitness: (index: number) => void;
  onToggleWitnessEdit: (index: number) => void;
  onWitnessInputChange: WitnessInputChangeHandler;
};

export function WitnessesStepSection({
  witnesses,
  activeWitnessIndex,
  validationErrors,
  onAddWitness,
  onRemoveWitness,
  onToggleWitnessEdit,
  onWitnessInputChange,
}: WitnessesStepSectionProps) {
  return (
    <IncidentWizardSection
      title="Świadkowie"
      description="Dodaj osoby, które mogą potwierdzić zdarzenie."
      actions={
        <button
          type="button"
          onClick={onAddWitness}
          className="inline-flex items-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
        >
          Dodaj świadka
        </button>
      }
    >
      {witnesses.length === 0 && (
        <div className="md:col-span-2">
          <IncidentAiSuggestion title="Brak świadków?" variant="warning">
            Jeśli nikt nie widział wypadku, zaznacz to później w formularzu. To standardowa informacja.
          </IncidentAiSuggestion>
        </div>
      )}

      {witnesses.map((witness, index) => {
        const isActive = activeWitnessIndex === index;
        const displayName = [witness.imie, witness.nazwisko].filter(Boolean).join(' ') || `Świadek ${index + 1}`;

        return (
          <div key={`witness-${index}`} className="md:col-span-2 rounded-xl border border-subtle bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">Świadek {index + 1}</p>
                <p className="text-xs text-muted">{displayName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggleWitnessEdit(index)}
                  className="inline-flex items-center rounded-md border border-subtle px-3 py-2 text-xs font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
                >
                  {isActive ? 'Zamknij' : 'Edytuj'}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveWitness(index)}
                  className="inline-flex items-center rounded-md border border-subtle px-3 py-2 text-xs font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
                >
                  Usuń
                </button>
              </div>
            </div>

            {isActive && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {WITNESS_EDITABLE_FIELDS.map((field) => (
                  <IncidentTextField
                    key={field}
                    label={getWitnessLabel(field)}
                    name={`witnesses.${index}.${field}`}
                    value={(witness[field] as string) ?? ''}
                    onChange={onWitnessInputChange(index, field)}
                    error={validationErrors[witnessFieldKey(index, field)]}
                    optional={!isWitnessFieldRequired(field)}
                    hint={field === 'kod_pocztowy' ? 'Wpisz w formacie 12-345.' : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </IncidentWizardSection>
  );
}

const getWitnessLabel = (field: WitnessEditableField) => {
  switch (field) {
    case 'imie':
      return 'Imię';
    case 'nazwisko':
      return 'Nazwisko';
    case 'ulica':
      return 'Ulica';
    case 'nr_domu':
      return 'Numer domu';
    case 'nr_lokalu':
      return 'Numer lokalu';
    case 'miejscowosc':
      return 'Miejscowość';
    case 'kod_pocztowy':
      return 'Kod pocztowy';
    case 'nazwa_panstwa':
      return 'Państwo';
    default:
      return field;
  }
};

const isWitnessFieldRequired = (field: WitnessEditableField) => field === 'imie' || field === 'nazwisko';
