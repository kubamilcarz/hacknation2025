import { useRef, type ChangeEvent } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { Spinner } from '@/components/Spinner';
import { useAiFeedback } from '@/context/AiFeedbackContext';
import { useIncidentReport } from '@/context/IncidentReportContext';
import { formatFileSize } from '@/lib/utils/formatFileSize';

type AiFeedbackHookResult = ReturnType<typeof useAiFeedback>;

export function AccidentStepSection() {
  const {
    incidentDraft,
    validationErrors,
    handleInputChange,
    handleTextareaChange,
    handleBooleanChange,
    medicalDocuments,
    additionalAttachments,
    legalNoticeAttachments,
    handleMedicalDocumentUpload,
    handleMedicalDocumentRemove,
    handleAdditionalAttachmentUpload,
    handleAdditionalAttachmentRemove,
    handleLegalNoticeAttachmentUpload,
    handleLegalNoticeAttachmentRemove,
  } = useIncidentReport();

  const medicalInputRef = useRef<HTMLInputElement | null>(null);
  const additionalInputRef = useRef<HTMLInputElement | null>(null);
  const legalInputRef = useRef<HTMLInputElement | null>(null);

  type AttachmentItem = {
    id: string;
    name: string;
    size: number;
    file: File;
    uploadedAt: number;
  };

  const handleFilesChange =
    (uploadHandler: (files: FileList | File[] | null) => void) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        uploadHandler(event.target.files);
        event.target.value = '';
      };

  const previewAttachment = (file: File) => {
    if (typeof window === 'undefined') {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const newWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');

    if (!newWindow) {
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const revoke = () => URL.revokeObjectURL(objectUrl);
    newWindow.addEventListener('beforeunload', revoke, { once: true });
    setTimeout(revoke, 60_000);
  };

  const renderAttachmentList = (attachments: AttachmentItem[], onRemove: (id: string) => void) => {
    if (attachments.length === 0) {
      return null;
    }

    return (
      <ul className="space-y-2 text-sm text-secondary">
        {attachments.map((attachment) => (
          <li
            key={attachment.id}
            className="flex flex-col gap-3 rounded-lg border border-dashed border-subtle px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-primary">{attachment.name}</p>
              <p className="text-xs text-muted">{formatFileSize(attachment.size)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => previewAttachment(attachment.file)}
                className="inline-flex items-center justify-center rounded-md border border-subtle px-3 py-1 text-xs font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
              >
                Otwórz
              </button>
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                className="inline-flex items-center justify-center rounded-md border border-subtle px-3 py-1 text-xs font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
              >
                Usuń
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderBooleanGroup = (
    name: string,
    value: boolean | null,
    onChange: (nextValue: boolean | null) => void,
    options: Array<{ label: string; value: boolean | null }>,
  ) => (
    <div className="flex flex-col gap-2 sm:flex-row">
      {options.map((option) => {
        const optionId = `${name}-${option.value === null ? 'nie-dotyczy' : option.value ? 'tak' : 'nie'}`;
        const isChecked = value === option.value;
        return (
          <label
            key={optionId}
            htmlFor={optionId}
            className={`flex flex-1 cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm font-semibold transition ${
              isChecked
                ? 'border-(--color-accent) bg-(--color-accent-soft) text-foreground'
                : 'border-subtle bg-surface text-secondary hover:border-(--color-border-strong)'
            }`}
          >
            <span>{option.label}</span>
            <input
              id={optionId}
              type="radio"
              name={name}
              value={option.value === null ? 'null' : option.value ? 'true' : 'false'}
              className="sr-only"
              checked={isChecked}
              onChange={() => onChange(option.value)}
            />
          </label>
        );
      })}
    </div>
  );

  const medicalDocumentsError = validationErrors['accident.medicalDocuments'];
  const medicalHelpProvided = incidentDraft.czy_udzielona_pomoc ?? false;
  const machineInvolved = incidentDraft.czy_wypadek_podczas_uzywania_maszyny ?? false;
  const machineHasCertificate = incidentDraft.czy_maszyna_posiada_atest ?? null;
  const machineRegistered = incidentDraft.czy_maszyna_w_ewidencji ?? null;

  const accidentDetailsFeedback = useAiFeedback('szczegoly_okolicznosci', incidentDraft.szczegoly_okolicznosci ?? '');
  const locationFeedback = useAiFeedback('miejsce_wypadku', incidentDraft.miejsce_wypadku ?? '');
  const injuriesFeedback = useAiFeedback('rodzaj_urazow', incidentDraft.rodzaj_urazow ?? '');
  const medicalHelpPlaceFeedback = useAiFeedback(
    'miejsce_udzielenia_pomocy',
    medicalHelpProvided ? incidentDraft.miejsce_udzielenia_pomocy ?? '' : '',
  );
  const authorityFeedback = useAiFeedback('organ_postepowania', incidentDraft.organ_postepowania ?? '');
  const machineDescriptionFeedback = useAiFeedback('opis_maszyn', machineInvolved ? incidentDraft.opis_maszyn ?? '' : '');

  const renderAiFeedbackMessage = (feedback: AiFeedbackHookResult, fallbackHint: React.ReactNode) => {
    if (feedback.isIdle) {
      return fallbackHint;
    }

    if (feedback.isError) {
      return (
        <div className="rounded-md border border-dashed border-(--color-error) bg-(--color-error-soft) px-3 py-2 text-xs text-(--color-error)">
          <div className="flex items-center justify-between gap-3">
            <span>{feedback.error}</span>
            <button
              type="button"
              onClick={feedback.refresh}
              className="text-xs font-semibold text-(--color-error) underline underline-offset-2"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      );
    }

    if (feedback.isLoading) {
      return (
        <div className="rounded-md border border-dashed border-subtle bg-surface px-3 py-2 text-xs text-secondary">
          <span className="flex items-center gap-2">
            <Spinner size={14} />
            Generuję podpowiedź…
          </span>
        </div>
      );
    }

    if (feedback.isDebouncing) {
      return (
        <div className="rounded-md border border-dashed border-subtle bg-surface px-3 py-2 text-xs text-muted">
          Analizuję wpis…
        </div>
      );
    }

    if (feedback.message) {
      return (
        <div className="rounded-md border border-dashed border-subtle bg-(--color-accent-soft) px-3 py-2 text-xs text-secondary">
          {feedback.message}
        </div>
      );
    }

    return fallbackHint;
  };

  return (
    <IncidentWizardSection>
      <div className="md:col-span-2 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <IncidentTextField
            label="Data wypadku"
            name="data_wypadku"
            type="date"
            value={incidentDraft.data_wypadku ?? ''}
            onChange={handleInputChange('data_wypadku')}
            error={validationErrors.data_wypadku}
          />
          <IncidentTextField
            label="Godzina wypadku"
            name="godzina_wypadku"
            type="time"
            value={incidentDraft.godzina_wypadku ?? ''}
            onChange={handleInputChange('godzina_wypadku')}
            error={validationErrors.godzina_wypadku}
          />
          <IncidentTextField
            label="Planowana godzina rozpoczęcia pracy"
            name="planowana_godzina_rozpoczecia_pracy"
            type="time"
            value={incidentDraft.planowana_godzina_rozpoczecia_pracy ?? ''}
            onChange={handleInputChange('planowana_godzina_rozpoczecia_pracy')}
            error={validationErrors.planowana_godzina_rozpoczecia_pracy}
            optional
          />
          <IncidentTextField
            label="Planowana godzina zakończenia pracy"
            name="planowana_godzina_zakonczenia_pracy"
            type="time"
            value={incidentDraft.planowana_godzina_zakonczenia_pracy ?? ''}
            onChange={handleInputChange('planowana_godzina_zakonczenia_pracy')}
            error={validationErrors.planowana_godzina_zakonczenia_pracy}
            optional
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <IncidentTextField
            label="Miejsce wypadku"
            name="miejsce_wypadku"
            value={incidentDraft.miejsce_wypadku ?? ''}
            onChange={handleInputChange('miejsce_wypadku')}
            error={validationErrors.miejsce_wypadku}
            hint="Opisz gdzie doszło do zdarzenia (np. adres, stanowisko pracy, hala)."
          />
          <div className="md:mt-7">
            <IncidentAiSuggestion>
              <div className="space-y-2">
                {renderAiFeedbackMessage(
                  locationFeedback,
                  <>
                    <p>Wymień dokładne miejsce: budynek, piętro, stanowisko lub strefę. Dodaj warunki otoczenia (np. śliska podłoga, rusztowanie).</p>
                    <p className="text-xs text-muted">Przykład: „Hala A, stanowisko pakowania nr 4, przy taśmie transportowej”.</p>
                  </>,
                )}
              </div>
            </IncidentAiSuggestion>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <IncidentTextField
            component="textarea"
            label="Rodzaj doznanych urazów"
            name="rodzaj_urazow"
            rows={4}
            value={incidentDraft.rodzaj_urazow ?? ''}
            onChange={handleTextareaChange('rodzaj_urazow')}
            error={validationErrors.rodzaj_urazow}
            hint="Wypisz urazy lub dolegliwości (np. skręcenie nadgarstka, skaleczenie dłoni)."
          />
          <div className="md:mt-7">
            <IncidentAiSuggestion>
              <div className="space-y-2">
                {renderAiFeedbackMessage(
                  injuriesFeedback,
                  <>
                    <p>Opisz urazy według części ciała oraz stopnia obrażeń. Wspomnij o objawach (ból, obrzęk, utrata przytomności).</p>
                    <p className="text-xs text-muted">Przykład: „Stłuczenie barku prawej ręki, otarcia dłoni, ból przy podnoszeniu”.</p>
                  </>,
                )}
              </div>
            </IncidentAiSuggestion>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 space-y-3">
        <label
          htmlFor="szczegoly_okolicznosci-input"
          className="flex items-baseline justify-between text-sm font-medium text-secondary"
        >
          <span>Co dokładnie się stało?</span>
        </label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <IncidentTextField
            component="textarea"
            label="Co dokładnie się stało?"
            name="szczegoly_okolicznosci"
            value={incidentDraft.szczegoly_okolicznosci ?? ''}
            onChange={handleTextareaChange('szczegoly_okolicznosci')}
            error={validationErrors.szczegoly_okolicznosci}
            hint="Zacznij od czasu i miejsca, dopisz wykonywane czynności oraz co spowodowało zdarzenie. Możesz pisać zdaniami lub w punktach."
            hideLabel
          />
          <div className="h-full md:mt-2">
            <IncidentAiSuggestion>
              <div className="space-y-2">
                {renderAiFeedbackMessage(
                  accidentDetailsFeedback,
                  <>
                    <p>
                      Odpowiedz kolejno na pytania: <strong>kiedy</strong> (data i godzina), <strong>gdzie</strong> (miejsce), <strong>co robiłeś</strong> oraz <strong>co doprowadziło</strong> do urazu. Wspomnij też o sprzęcie i świadkach, jeśli byli.
                    </p>
                    <p className="text-xs text-muted">
                      Przykład: &quot;12 marca około 10:30 na budowie przy ul. Zielonej montowałem barierki. Podczas przenoszenia elementu poślizgnąłem się na mokrej podłodze i skręciłem nadgarstek.&quot;
                    </p>
                  </>,
                )}
              </div>
            </IncidentAiSuggestion>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 space-y-4 rounded-xl border border-subtle bg-surface p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">Czy udzielono pierwszej pomocy medycznej?</p>
          <p className="text-xs text-muted">Zaznacz, czy na miejscu zdarzenia poszkodowany otrzymał pomoc.</p>
        </div>
        {renderBooleanGroup('czy-udzielona-pomoc', medicalHelpProvided, handleBooleanChange('czy_udzielona_pomoc'), [
          { label: 'Tak', value: true },
          { label: 'Nie', value: false },
        ])}
        {medicalHelpProvided && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <IncidentTextField
              label="Gdzie udzielono pomocy?"
              name="miejsce_udzielenia_pomocy"
              value={incidentDraft.miejsce_udzielenia_pomocy ?? ''}
              onChange={handleInputChange('miejsce_udzielenia_pomocy')}
              error={validationErrors.miejsce_udzielenia_pomocy}
              hint="Podaj nazwę placówki lub osoby udzielającej pomocy."
            />
            <div className="md:mt-7">
              <IncidentAiSuggestion>
                <div className="space-y-2">
                  {renderAiFeedbackMessage(
                    medicalHelpPlaceFeedback,
                    <>
                      <p>Wskaż punkt medyczny, karetkę lub osobę, która pomogła, oraz zakres udzielonej pomocy (np. opatrunek, leki przeciwbólowe).</p>
                      <p className="text-xs text-muted">Przykład: „SOR Szpitala Wojewódzkiego w Krakowie, opatrunek i stabilizacja nadgarstka”.</p>
                    </>,
                  )}
                </div>
              </IncidentAiSuggestion>
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <IncidentTextField
            component="textarea"
            label="Organ prowadzący postępowanie"
            name="organ_postepowania"
            value={incidentDraft.organ_postepowania ?? ''}
            onChange={handleTextareaChange('organ_postepowania')}
            error={validationErrors.organ_postepowania}
            optional
            hint="Wpisz instytucję (np. policja, PIP), jeśli prowadziła postępowanie."
          />
          <div className="md:mt-7">
            <IncidentAiSuggestion>
              <div className="space-y-2">
                {renderAiFeedbackMessage(
                  authorityFeedback,
                  <>
                    <p>Podaj nazwę jednostki, numer sprawy lub dane kontaktowe inspektora, jeśli je masz. Wspomnij o statusie działań.</p>
                    <p className="text-xs text-muted">Przykład: „Komenda Policji Kraków-Podgórze, notatka służbowa nr 12/2025, brak decyzji”.</p>
                  </>,
                )}
              </div>
            </IncidentAiSuggestion>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 space-y-4 rounded-xl border border-subtle bg-surface p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">Czy zdarzenie dotyczyło maszyny lub urządzenia?</p>
          <p className="text-xs text-muted">Powiedz, czy brałeś udział w pracy na urządzeniu lub z jego użyciem.</p>
        </div>
        {renderBooleanGroup('czy-wypadek-podczas-maszyny', machineInvolved, handleBooleanChange('czy_wypadek_podczas_uzywania_maszyny'), [
          { label: 'Tak', value: true },
          { label: 'Nie', value: false },
        ])}
        {machineInvolved && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <IncidentTextField
                component="textarea"
                label="Jaka maszyna lub urządzenie brały udział?"
                name="opis_maszyn"
                value={incidentDraft.opis_maszyn ?? ''}
                onChange={handleTextareaChange('opis_maszyn')}
                error={validationErrors.opis_maszyn}
                hint="Opisz maszynę, jej stan lub sposób użytkowania."
              />
              <div className="md:mt-7">
                <IncidentAiSuggestion>
                  <div className="space-y-2">
                    {renderAiFeedbackMessage(
                      machineDescriptionFeedback,
                      <>
                        <p>Wymień typ, model, numer seryjny i opisz, jak maszyna była przygotowana. Dodaj informację o zabezpieczeniach lub usterkach.</p>
                        <p className="text-xs text-muted">Przykład: „Podnośnik nożycowy JLG 3246ES, przegląd 02.2025, poślizg przy opuszczaniu platformy”.</p>
                      </>,
                    )}
                  </div>
                </IncidentAiSuggestion>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-secondary">Czy urządzenie posiada atest / deklarację zgodności?</p>
              {renderBooleanGroup('czy-maszyna-atest', machineHasCertificate, handleBooleanChange('czy_maszyna_posiada_atest'), [
                { label: 'Tak', value: true },
                { label: 'Nie', value: false },
                { label: 'Nie dotyczy / nie wiem', value: null },
              ])}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-secondary">Czy urządzenie było wpisane do ewidencji środków trwałych?</p>
              {renderBooleanGroup('czy-maszyna-ewidencja', machineRegistered, handleBooleanChange('czy_maszyna_w_ewidencji'), [
                { label: 'Tak', value: true },
                { label: 'Nie', value: false },
                { label: 'Nie dotyczy / nie wiem', value: null },
              ])}
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-2 mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-subtle bg-surface p-4 shadow-sm space-y-4">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-primary">Dokumentacja medyczna</p>
                <span className="text-xs font-semibold text-(--color-error)">Wymagane</span>
              </div>
              <p className="text-xs text-muted">
                Dołącz wypisy ze szpitala, wyniki badań lub zaświadczenia lekarskie potwierdzające uraz.
              </p>
              {medicalDocumentsError && (
                <p className="text-xs font-medium text-(--color-error)">{medicalDocumentsError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => medicalInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
            >
              Dodaj dokumenty
            </button>
            <input
              ref={medicalInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFilesChange(handleMedicalDocumentUpload)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            {renderAttachmentList(medicalDocuments, handleMedicalDocumentRemove)}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-subtle bg-surface p-4 shadow-sm space-y-4">
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-primary">Dodatkowe pliki</p>
                  <span className="text-xs text-muted">Opcjonalne</span>
                </div>
                <p className="text-xs text-muted">
                  Dołącz zdjęcia miejsca zdarzenia, raporty BHP lub inne materiały, które pomagają opisać sytuację.
                </p>
              </div>
              <button
                type="button"
                onClick={() => additionalInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
              >
                Dodaj pliki
              </button>
              <input
                ref={additionalInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFilesChange(handleAdditionalAttachmentUpload)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {renderAttachmentList(additionalAttachments, handleAdditionalAttachmentRemove)}
            </div>

            <div className="rounded-xl border border-subtle bg-surface p-4 shadow-sm space-y-4">
              <div className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-primary">Pismo w sprawie postępowania</p>
                  <span className="text-xs text-muted">Opcjonalne</span>
                </div>
                <p className="text-xs text-muted">
                  Jeśli otrzymałeś oficjalne pismo (np. z PIP lub prokuratury), zrób zdjęcie lub skan i dołącz je, aby przyspieszyć analizę.
                </p>
              </div>
              <button
                type="button"
                onClick={() => legalInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
              >
                Dodaj pismo
              </button>
              <input
                ref={legalInputRef}
                type="file"
                className="hidden"
                onChange={handleFilesChange(handleLegalNoticeAttachmentUpload)}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {renderAttachmentList(legalNoticeAttachments, handleLegalNoticeAttachmentRemove)}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted">
          Przesłane pliki pozostają na Twoim urządzeniu. Dołącz je później do zgłoszenia wysyłanego do ZUS.
        </p>
      </div>
    </IncidentWizardSection>
  );
}
