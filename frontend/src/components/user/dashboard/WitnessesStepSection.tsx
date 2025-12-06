import { useRef, type ChangeEvent } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import {
  WITNESS_EDITABLE_FIELDS,
  type WitnessEditableField,
  witnessFieldKey,
} from '@/components/user/dashboard/witnesses/utils';
import { useIncidentReport } from '@/context/IncidentReportContext';
import { formatFileSize } from '@/lib/utils/formatFileSize';

export function WitnessesStepSection() {
  const {
    witnesses,
    activeWitnessIndex,
    validationErrors,
    handleAddWitness,
    handleRemoveWitness,
    handleToggleWitnessEdit,
    handleWitnessInputChange,
    witnessStatements,
    handleWitnessStatementUpload,
    handleWitnessStatementRemove,
  } = useIncidentReport();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilePickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleWitnessStatementUpload(event.target.files);
    event.target.value = '';
  };

  const handlePreviewStatement = (file: File) => {
    if (typeof window === 'undefined') {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const newWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');

    if (!newWindow) {
      // If the browser blocked the popup, release the object URL immediately.
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const revoke = () => URL.revokeObjectURL(objectUrl);
    newWindow.addEventListener('beforeunload', revoke, { once: true });
    setTimeout(revoke, 60_000);
  };

  return (
    <IncidentWizardSection
      actions={
        <button
          type="button"
          onClick={handleAddWitness}
          className="inline-flex items-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
        >
          Dodaj świadka
        </button>
      }
    >
      {witnesses.length === 0 && (
        <div className="md:col-span-1 lg:max-w-xl">
          <IncidentAiSuggestion title="Brak świadków?">
            Jeśli nikt nie widział zdarzenia, pozostaw listę pustą i przejdź dalej, zgłoszenie nadal będzie kompletne.
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
                  onClick={() => handleToggleWitnessEdit(index)}
                  className="inline-flex items-center rounded-md border border-subtle px-3 py-2 text-xs font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
                >
                  {isActive ? 'Zamknij' : 'Edytuj'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveWitness(index)}
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
                    onChange={handleWitnessInputChange(index, field)}
                    error={validationErrors[witnessFieldKey(index, field)]}
                    optional={!isWitnessFieldRequired(field)}
                    hint={getWitnessHint(field)}
                    type={getWitnessInputType(field)}
                    autoComplete={getWitnessAutoComplete(field)}
                    maxLength={field === 'numer_telefonu' ? 20 : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {witnesses.length > 0 && (
        <div className="md:col-span-1 lg:max-w-xl">
          <div className="rounded-xl border border-subtle bg-surface p-4 shadow-sm space-y-4">
            <div className="mb-3 space-y-1">
              <p className="text-sm font-semibold text-primary">Oświadczenie świadka</p>
              <p className="text-xs text-muted">
                Jeśli posiadasz pisemne oświadczenie świadka, możesz je dołączyć już teraz lub pozostawić ten krok na później.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
            >
              Załącz oświadczenie
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFilePickerChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {witnessStatements.length > 0 && (
              <div className="space-y-3">
                <ul className="space-y-2 text-sm text-secondary">
                  {witnessStatements.map((statement) => (
                    <li
                      key={statement.id}
                      className="flex flex-col gap-3 rounded-lg border border-dashed border-subtle px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-primary">{statement.name}</p>
                        <p className="text-xs text-muted">{formatFileSize(statement.size)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handlePreviewStatement(statement.file)}
                          className="inline-flex items-center justify-center rounded-md border border-subtle px-3 py-1 text-xs font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
                        >
                          Otwórz
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWitnessStatementRemove(statement.id)}
                          className="inline-flex items-center justify-center rounded-md border border-subtle px-3 py-1 text-xs font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
                        >
                          Usuń
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">
                  Pliki pozostają tylko na Twoim urządzeniu. Pamiętaj, aby dołączyć je do zgłoszenia wysyłanego do ZUS.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </IncidentWizardSection>
  );
}

const getWitnessLabel = (field: WitnessEditableField) => {
  switch (field) {
    case 'imie':
      return 'Imię';
    case 'nazwisko':
      return 'Nazwisko';
    case 'numer_telefonu':
      return 'Telefon kontaktowy';
    case 'adres_email':
      return 'Adres e-mail';
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


  const getWitnessHint = (field: WitnessEditableField) => {
    switch (field) {
      case 'kod_pocztowy':
        return 'Wpisz w formacie 12-345.';
      case 'numer_telefonu':
        return 'Dodaj numer, pod który ZUS może zadzwonić w razie pytań.';
      case 'adres_email':
        return 'Adres e-mail pomoże skrócić czas kontaktu, jeśli świadek go posiada.';
      default:
        return undefined;
    }
  };

  const getWitnessInputType = (field: WitnessEditableField) => {
    if (field === 'adres_email') {
      return 'email';
    }
    if (field === 'numer_telefonu') {
      return 'tel';
    }
    return undefined;
  };

  const getWitnessAutoComplete = (field: WitnessEditableField) => {
    switch (field) {
      case 'adres_email':
        return 'email';
      case 'numer_telefonu':
        return 'tel';
      default:
        return undefined;
    }
  };
const isWitnessFieldRequired = (field: WitnessEditableField) => field === 'imie' || field === 'nazwisko';
