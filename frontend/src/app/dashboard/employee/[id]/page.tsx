'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidents } from '@/context/IncidentContext';
import { incidentService } from '@/lib/services/incidentService';
import { type Incident, type IncidentPriority, type IncidentStatus } from '@/types/incident';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const statusLabels: Record<IncidentStatus, string> = {
  pending: 'Oczekujące',
  'in-progress': 'W trakcie',
  resolved: 'Rozwiązane',
  rejected: 'Odrzucone',
};

const priorityLabels: Record<IncidentPriority, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  critical: 'Krytyczny',
};

interface IncidentDetailPageProps {
  params: { id: string };
}

export default function IncidentDetail({ params }: IncidentDetailPageProps) {
  const router = useRouter();
  const { isLoading, updateIncident, getIncidentById } = useIncidents();

  const incidentFromStore = useMemo(() => getIncidentById(params.id), [getIncidentById, params.id]);

  const [incident, setIncident] = useState<Incident | null>(incidentFromStore ?? null);
  const [status, setStatus] = useState<IncidentStatus>('pending');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (incidentFromStore) {
      setIncident(incidentFromStore);
      setStatus(incidentFromStore.status);
      setAssignedTo(incidentFromStore.assignedTo ?? '');
      setNotes(incidentFromStore.notes ?? '');
      setError(null);
    }
  }, [incidentFromStore]);

  useEffect(() => {
    if (incidentFromStore || isLoading) {
      return;
    }

    let isCancelled = false;

    const fetchIncident = async () => {
      try {
        const remote = await incidentService.getById(params.id);
        if (isCancelled) {
          return;
        }

        if (remote) {
          setIncident(remote);
          setStatus(remote.status);
          setAssignedTo(remote.assignedTo ?? '');
          setNotes(remote.notes ?? '');
          setError(null);
          return;
        }

        setError('Nie znaleziono zgłoszenia.');
      } catch {
        if (!isCancelled) {
          setError('Nie udało się pobrać zgłoszenia.');
        }
      }
    };

    void fetchIncident();

    return () => {
      isCancelled = true;
    };
  }, [incidentFromStore, isLoading, params.id]);

  const breadcrumbItems = useMemo(() => {
    if (incident) {
      return [
        { href: '/dashboard/employee', labelKey: 'panel' },
        { label: `Zgłoszenie ${incident.caseNumber}` },
      ];
    }

    return [
      { href: '/dashboard/employee', labelKey: 'panel' },
      { labelKey: 'report' },
    ];
  }, [incident]);

  const handleSave = async () => {
    if (!incident) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateIncident(incident.id, { status, assignedTo, notes });
      setIncident(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać zmian.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (value: IncidentStatus) => {
    const base = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium';
    const palette: Record<IncidentStatus, string> = {
      pending: 'bg-(--color-warning-soft) text-(--color-warning)',
      'in-progress': 'bg-(--color-info-soft) text-(--color-info)',
      resolved: 'bg-(--color-success-soft) text-(--color-success)',
      rejected: 'bg-(--color-error-soft) text-(--color-error)',
    };
    return <span className={`${base} ${palette[value]}`}>{statusLabels[value]}</span>;
  };

  const getPriorityBadge = (value: IncidentPriority) => {
    const base = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium';
    const palette: Record<IncidentPriority, string> = {
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
                {incident ? `Zgłoszenie ${incident.caseNumber}` : 'Zgłoszenie'}
              </h1>
              {incident && getStatusBadge(incident.status)}
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

          {(!incident && isLoading) && (
            <div className="rounded-lg border border-subtle bg-surface-subdued px-4 py-6 text-sm text-muted">
              Ładowanie szczegółów zgłoszenia…
            </div>
          )}

          {incident && (
            <div className="space-y-8">
              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Informacje podstawowe</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Numer sprawy</p>
                    <p className="mt-1 text-base font-medium text-primary">{incident.caseNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Tytuł</p>
                    <p className="mt-1 text-base font-medium text-primary">{incident.title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Kategoria</p>
                    <p className="mt-1 text-base font-medium text-primary">{incident.category}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Priorytet</p>
                    <div className="mt-2">{getPriorityBadge(incident.priority)}</div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Data utworzenia</p>
                    <p className="mt-1 text-base font-medium text-primary">{formatDate(incident.createdAt)}</p>
                  </div>
                </div>
              </section>

              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Opis zdarzenia</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-secondary">
                  {incident.description}
                </p>
              </section>

              <section className="border-b border-subtle pb-6">
                <h2 className="text-lg font-semibold text-primary">Dane zgłaszającego</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Imię i nazwisko</p>
                    <p className="mt-1 text-base font-medium text-primary">{incident.reporterName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">Email</p>
                    <p className="mt-1 text-base font-medium text-primary">{incident.reporterEmail}</p>
                  </div>
                  {incident.reporterPhone && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">Telefon</p>
                      <p className="mt-1 text-base font-medium text-primary">{incident.reporterPhone}</p>
                    </div>
                  )}
                  {incident.pesel && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">PESEL</p>
                      <p className="mt-1 text-base font-medium text-primary">{incident.pesel}</p>
                    </div>
                  )}
                </div>
              </section>

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
                      onChange={(event) => setStatus(event.target.value as IncidentStatus)}
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
                      placeholder="Imię i nazwisko pracownika"
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
                      placeholder="Dodaj ważne ustalenia, np. oczekiwane dokumenty lub kontakt telefoniczny."
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
                      <p className="text-sm font-medium text-primary">Zgłoszenie utworzone</p>
                      <p className="text-xs text-muted">{formatDate(incident.createdAt)}</p>
                    </div>
                  </div>
                  {incident.updatedAt.getTime() !== incident.createdAt.getTime() && (
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-(--color-accent)"></span>
                      <div>
                        <p className="text-sm font-medium text-primary">Ostatnia aktualizacja</p>
                        <p className="text-xs text-muted">{formatDate(incident.updatedAt)}</p>
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
