'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import { documentService } from '@/lib/services/documentService';
import type { Document } from '@/types/document';
import { Breadcrumbs } from '@/components/Breadcrumbs';

interface DocumentDetailPageProps {
  params: { id: string };
}

export default function DocumentDetail({ params }: DocumentDetailPageProps) {
  const router = useRouter();
  const documentId = Number.parseInt(params.id, 10);
  const { isLoading, getDocumentById } = useDocuments();

  const documentFromStore = useMemo(
    () => (Number.isNaN(documentId) ? undefined : getDocumentById(documentId)),
    [documentId, getDocumentById],
  );

  const [remoteDocument, setRemoteDocument] = useState<Document | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(
    Number.isNaN(documentId) ? 'Nieprawidłowy identyfikator dokumentu.' : null,
  );

  const documentData = documentFromStore ?? remoteDocument;
  const error = documentFromStore ? null : remoteError;

  useEffect(() => {
    if (documentFromStore || isLoading || Number.isNaN(documentId)) {
      return;
    }

    let isCancelled = false;

    const fetchDocument = async () => {
      try {
        const remote = await documentService.getById(documentId);
        if (isCancelled) {
          return;
        }

        if (remote) {
          setRemoteDocument(remote);
          setRemoteError(null);
        } else {
          setRemoteError('Nie znaleziono dokumentu.');
        }
      } catch {
        if (!isCancelled) {
          setRemoteError('Nie udało się pobrać dokumentu.');
        }
      }
    };

    void fetchDocument();

    return () => {
      isCancelled = true;
    };
  }, [documentFromStore, documentId, isLoading]);

  const breadcrumbItems = useMemo(() => {
    if (documentData) {
      return [
        { href: '/dashboard/employee', labelKey: 'panel' },
        { label: `Dokument #${documentData.id ?? '—'}` },
      ];
    }

    return [
      { href: '/dashboard/employee', labelKey: 'panel' },
      { label: 'Dokument' },
    ];
  }, [documentData]);

  const formatDate = (isoDate: string, fallback?: string) => {
    if (!isoDate) {
      return fallback ?? 'Brak danych';
    }
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return fallback ?? isoDate;
    }
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatBoolean = (value: boolean | null | undefined) => (value ? 'Tak' : 'Nie');

  const renderAddress = (
    ulica?: string | null,
    nr_domu?: string | null,
    nr_lokalu?: string | null,
    kod?: string | null,
    miejscowosc?: string | null,
  ) => {
    const street = [ulica, nr_domu, nr_lokalu].filter(Boolean).join(' ').trim();
    if (!street && !kod && !miejscowosc) {
      return 'Brak danych';
    }
    return `${street || ''}${street ? ', ' : ''}${kod ?? ''} ${miejscowosc ?? ''}`.trim();
  };

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-5xl px-6">
        <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
          <div className="mb-8 flex flex-col gap-4">
            <Breadcrumbs items={breadcrumbItems} />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-3xl font-semibold text-primary">
                {documentData ? `Dokument #${documentData.id ?? '—'}` : 'Dokument'}
              </h1>
              <button
                type="button"
                onClick={() => router.push('/dashboard/employee')}
                className="inline-flex items-center justify-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-stronger) hover:text-foreground"
              >
                Wróć do listy
              </button>
            </div>
          </div>

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
                <h2 className="text-lg font-semibold text-primary">Informacje o poszkodowanym</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Imię i nazwisko</p>
                    <p className="mt-1 text-base font-medium text-primary">{`${documentData.imie} ${documentData.nazwisko}`.trim()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">PESEL</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.pesel}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Data urodzenia</p>
                    <p className="mt-1 text-base font-medium text-primary">{formatDate(documentData.data_urodzenia)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Miejsce urodzenia</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.miejsce_urodzenia}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Telefon</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.numer_telefonu ?? 'Brak danych'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Adres zamieszkania</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {renderAddress(documentData.ulica, documentData.nr_domu, documentData.nr_lokalu, documentData.kod_pocztowy, documentData.miejscowosc)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Informacje o zdarzeniu</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Data i godzina wypadku</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {formatDate(documentData.data_wypadku)} • {documentData.godzina_wypadku}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Miejsce wypadku</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.miejsce_wypadku}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Planowany czas pracy</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {documentData.planowana_godzina_rozpoczecia_pracy ?? '—'} – {documentData.planowana_godzina_zakonczenia_pracy ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Organ postępowania</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.organ_postepowania ?? 'Brak informacji'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Rodzaj urazów</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.rodzaj_urazow}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Szczegóły okoliczności</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">
                      {documentData.szczegoly_okolicznosci}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Czy udzielono pomocy</p>
                    <p className="mt-1 text-base font-medium text-primary">{formatBoolean(documentData.czy_udzielona_pomoc)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Miejsce udzielenia pomocy</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.miejsce_udzielenia_pomocy ?? 'Brak danych'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Czy używano maszyn</p>
                    <p className="mt-1 text-base font-medium text-primary">{formatBoolean(documentData.czy_wypadek_podczas_uzywania_maszyny)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Opis maszyn</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.opis_maszyn ?? 'Brak danych'}</p>
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
                    <p className="text-xs uppercase tracking-wide text-muted">PESEL zgłaszającego</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.pesel_zglaszajacego ?? 'Brak danych'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Telefon zgłaszającego</p>
                    <p className="mt-1 text-base font-medium text-primary">{documentData.nr_telefonu_zglaszajacego ?? 'Brak danych'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Adres zgłaszającego</p>
                    <p className="mt-1 text-base font-medium text-primary">
                      {renderAddress(
                        documentData.ulica_zglaszajacego,
                        documentData.nr_domu_zglaszajacego,
                        documentData.nr_lokalu_zglaszajacego,
                        documentData.kod_pocztowy_zglaszajacego,
                        documentData.miejscowosc_zglaszajacego,
                      )}
                    </p>
                  </div>
                </div>
              </section>

              {documentData.witnesses && documentData.witnesses.length > 0 && (
                <section className="border-b border-subtle pb-6">
                  <h2 className="text-lg font-semibold text-primary">Świadkowie</h2>
                  <div className="mt-4 space-y-3">
                    {documentData.witnesses.map((witness, index) => (
                      <div key={`${documentData.id}-witness-${index}`} className="rounded border border-subtle bg-surface px-4 py-3">
                        <p className="text-base font-semibold text-primary">{`${witness.imie} ${witness.nazwisko}`}</p>
                        <p className="text-sm text-secondary">
                          {[witness.ulica, witness.nr_domu, witness.nr_lokalu].filter(Boolean).join(' ')},{' '}
                          {witness.kod_pocztowy} {witness.miejscowosc}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
