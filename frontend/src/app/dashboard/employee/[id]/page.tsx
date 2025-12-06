'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import { documentService } from '@/lib/services/documentService';
import { type CaseDocument, type DocumentPriority, type DocumentStatus } from '@/types/case-document';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const statusLabels: Record<DocumentStatus, string> = {
  pending: 'Oczekujące',
  'in-progress': 'W trakcie',
  resolved: 'Rozwiązane',
  rejected: 'Odrzucone',
};

const priorityLabels: Record<DocumentPriority, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  critical: 'Krytyczny',
};

interface DocumentDetailPageProps {
  params: { id: string };
}

export default function DocumentDetail({ params }: DocumentDetailPageProps) {
  const router = useRouter();
  const { isLoading, updateDocument, getDocumentById } = useDocuments();

  const documentFromStore = useMemo(() => getDocumentById(params.id), [getDocumentById, params.id]);

  const [documentData, setDocumentData] = useState<CaseDocument | null>(documentFromStore ?? null);
  const [status, setStatus] = useState<DocumentStatus>('pending');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentFromStore) {
      setDocumentData(documentFromStore);
      setStatus(documentFromStore.status);
      setAssignedTo(documentFromStore.assignedTo ?? '');
      setNotes(documentFromStore.notes ?? '');
      setError(null);
    }
  }, [documentFromStore]);

  useEffect(() => {
    if (documentFromStore || isLoading) {
      return;
    }

    let isCancelled = false;

    const fetchDocument = async () => {
      try {
        const remote = await documentService.getById(params.id);
        if (isCancelled) {
          return;
        }

        if (remote) {
          setDocumentData(remote);
          setStatus(remote.status);
          setAssignedTo(remote.assignedTo ?? '');
          setNotes(remote.notes ?? '');
          setError(null);
          return;
        }

        setError('Nie znaleziono dokumentu.');
      } catch {
        if (!isCancelled) {
          setError('Nie udało się pobrać dokumentu.');
        }
      }
    };

    void fetchDocument();

    return () => {
      isCancelled = true;
    };
  }, [documentFromStore, isLoading, params.id]);

  const breadcrumbItems = useMemo(() => {
    if (documentData) {
      return [
        { href: '/dashboard/employee', labelKey: 'panel' },
        { label: `Dokument ${documentData.caseNumber}` },
      ];
    }

    return [
      { href: '/dashboard/employee', labelKey: 'panel' },
      { label: 'Dokument' },
    ];
  }, [documentData]);

  const handleSave = async () => {
    if (!documentData) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateDocument(documentData.documentId, { status, assignedTo, notes });
      setDocumentData(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać zmian.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (value: DocumentStatus) => {
    const base = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium';
    const palette: Record<DocumentStatus, string> = {
      pending: 'bg-(--color-warning-soft) text-(--color-warning)',
      'in-progress': 'bg-(--color-info-soft) text-(--color-info)',
      resolved: 'bg-(--color-success-soft) text-(--color-success)',
      rejected: 'bg-(--color-error-soft) text-(--color-error)',
    };
    return <span className={`${base} ${palette[value]}`}>{statusLabels[value]}</span>;
  };

  const getPriorityBadge = (value: DocumentPriority) => {
    const base = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium';
    const palette: Record<DocumentPriority, string> = {
      low: 'bg-(--color-support-soft) text-(--color-support)',
      medium: 'bg-(--color-info-soft) text-(--color-info)',
      high: 'bg-(--color-warning-soft) text-(--color-warning)',
      critical: 'bg-(--color-error-soft) text-(--color-error)',
    };
    return <span className={`${base} ${palette[value]}`}>{priorityLabels[value]}</span>;
  };

  const formatDate = (input: Date) =>
    new Date(input).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
          <div className="mb-8 flex flex-col gap-4">
            <Breadcrumbs items={breadcrumbItems} />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-semibold text-primary">
                {documentData ? `Dokument ${documentData.caseNumber}` : 'Dokument'}
              </h1>
              {documentData && getStatusBadge(documentData.status)}
            </div>
          </div>

          {saved && (
            <div className="mb-6 rounded-lg border border-(--color-accent-strong) bg-(--color-accent-soft) px-4 py-3 text-sm text-accent">
              Zapisano zmiany.
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-error bg-error-soft px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {(!documentData && isLoading) && (
            <div className="rounded-lg border border-subtle bg-surface-subdued px-4 py-6 text-sm text-muted">
              Ładowanie dokumentu…
            </div>
          )}

          {documentData && (
            <div className="space-y-8">
              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Informacje podstawowe</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Numer sprawy</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.caseNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Poszkodowany</p>
                    <p className="mt-1 text-base font-medium text-primary">{`${documentData.imie} ${documentData.nazwisko}`.trim()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">PESEL</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.pesel ?? 'Brak danych'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Data i godzina wypadku</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {formatDate(new Date(documentData.data_wypadku))} • {documentData.godzina_wypadku}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Miejsce wypadku</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.miejsce_wypadku}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Priorytet</p>
                    <div className="mt-2">{getPriorityBadge(documentData.priority)}</div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Wypadek przy maszynie</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {documentData.czy_wypadek_podczas_uzywania_maszyny ? 'Tak' : 'Nie'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Opis zdarzenia</h2>
                <div className="mt-4 space-y-3 text-sm text-secondary">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Rodzaj urazu</p>
                    <p className="mt-1 whitespace-pre-wrap text-base font-medium text-primary">
                      {documentData.rodzaj_urazow}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Okoliczności</p>
                    <p className="mt-1 whitespace-pre-wrap leading-relaxed text-secondary">
                      {documentData.szczegoly_okolicznosci}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Dane zgłaszającego</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Imię i nazwisko</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {`${documentData.imie_zglaszajacego ?? ''} ${documentData.nazwisko_zglaszajacego ?? ''}`.trim() || 'Brak danych'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Telefon</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.nr_telefonu_zglaszajacego ?? 'Brak danych'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">PESEL zgłaszającego</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.pesel_zglaszajacego ?? 'Brak danych'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Adres</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {[documentData.ulica_zglaszajacego, documentData.nr_domu_zglaszajacego, documentData.nr_lokalu_zglaszajacego]
                        .filter(Boolean)
                        .join(' ')}
                      , {documentData.kod_pocztowy_zglaszajacego ?? ''} {documentData.miejscowosc_zglaszajacego ?? ''}
                    </p>
                  </div>
                </div>
              </section>

              {documentData.witnesses && documentData.witnesses.length > 0 && (
                <section className="border-b border-subtle pb-6">
                  <h2 className="text-lg font-semibold text-primary">Świadkowie</h2>
                  <div className="mt-4 space-y-4">
                    {documentData.witnesses.map((witness, index) => (
                      <div key={`${witness.imie}-${witness.nazwisko}-${index}`} className="rounded-lg border border-subtle p-4">
                        <p className="text-base font-medium text-primary">{`${witness.imie} ${witness.nazwisko}`}</p>
                        <p className="text-sm text-secondary">
                          {[witness.ulica, witness.nr_domu, witness.nr_lokalu].filter(Boolean).join(' ')}, {witness.kod_pocztowy} {witness.miejscowosc}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Obsługa sprawy</h2>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="status" className="text-sm font-medium text-secondary">
                      Status sprawy
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as DocumentStatus)}
                      className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                    >
                      <option value="pending">Oczekujące</option>
                      <option value="in-progress">W trakcie</option>
                      <option value="resolved">Rozwiązane</option>
                      <option value="rejected">Odrzucone</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="assignedTo" className="text-sm font-medium text-secondary">
                      Przypisane do
                    </label>
                    <input
                      id="assignedTo"
                      value={assignedTo}
                      onChange={(event) => setAssignedTo(event.target.value)}
                      placeholder="Imię i nazwisko analityka"
                      className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium text-secondary">
                      Notatki wewnętrzne
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={6}
                      className="w-full rounded-md border border-subtle bg-input px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                      placeholder="Dodaj ważne ustalenia, np. wymagane dokumenty lub kontakt telefoniczny."
                    />
                  </div>
                </div>
              </section>

              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Historia zmian</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-(--color-accent)"></span>
                    <div>
                      <p className="text-sm font-medium text-primary">Dokument utworzony</p>
                      <p className="text-xs text-muted">{formatDate(documentData.createdAt)}</p>
                    </div>
                  </div>
                  {documentData.updatedAt.getTime() !== documentData.createdAt.getTime() && (
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-(--color-accent)"></span>
                      <div>
                        <p className="text-sm font-medium text-primary">Ostatnia aktualizacja</p>
                        <p className="text-xs text-muted">{formatDate(documentData.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/employee')}
                  className="order-2 inline-flex items-center justify-center rounded-md border border-subtle bg-surface px-5 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 sm:order-1"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="order-1 inline-flex items-center justify-center rounded-md bg-(--color-accent) px-6 py-2 text-sm font-semibold text-(--color-accent-text) transition hover:bg-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:order-2"
                >
                  {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
