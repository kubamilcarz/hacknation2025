import { useRef, type ChangeEvent } from 'react';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { useIncidentReport } from '@/context/IncidentReportContext';
import { formatFileSize } from '@/lib/utils/formatFileSize';

export function AccidentStepSection() {
  const {
    incidentDraft,
    validationErrors,
    handleTextareaChange,
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

  const medicalDocumentsError = validationErrors['accident.medicalDocuments'];

  return (
    <IncidentWizardSection>
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
          <div className="h-full">
            <IncidentAiSuggestion>
              <div className="space-y-2">
                <p>
                  Odpowiedz kolejno na pytania: <strong>kiedy</strong> (data i godzina), <strong>gdzie</strong> (miejsce), <strong>co robiłeś</strong> oraz <strong>co doprowadziło</strong> do urazu. Wspomnij też o sprzęcie i świadkach, jeśli byli.
                </p>
                <p className="text-xs text-muted">
                  Przykład: &quot;12 marca około 10:30 na budowie przy ul. Zielonej montowałem barierki. Podczas przenoszenia elementu poślizgnąłem się na mokrej podłodze i skręciłem nadgarstek.&quot;
                </p>
              </div>
            </IncidentAiSuggestion>
          </div>
        </div>
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
