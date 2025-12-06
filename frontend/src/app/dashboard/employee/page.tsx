'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidents } from '@/context/IncidentContext';
import { type IncidentPriority, type IncidentStatus } from '@/types/incident';

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

export default function EmployeeDashboard() {
  const router = useRouter();
  const { incidents, isLoading } = useIncidents();
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
      const query = searchTerm.trim().toLowerCase();
      if (!query) {
        return matchesStatus;
      }

      const searchable = [
        incident.id,
        incident.caseNumber,
        incident.title,
        incident.reporterName,
        incident.reporterEmail,
        incident.category,
      ]
        .filter(Boolean)
        .map((value) => value.toString().toLowerCase());

      const matchesQuery = searchable.some((value) => value.includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [incidents, filterStatus, searchTerm]);

  const getStatusBadge = (status: IncidentStatus) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';
    const styles: Record<IncidentStatus, string> = {
      pending: 'bg-(--color-warning-soft) text-(--color-warning)',
      'in-progress': 'bg-(--color-info-soft) text-(--color-info)',
      resolved: 'bg-(--color-success-soft) text-(--color-success)',
      rejected: 'bg-(--color-error-soft) text-(--color-error)',
    };

    return <span className={`${base} ${styles[status]}`}>{statusLabels[status]}</span>;
  };

  const getPriorityBadge = (priority: IncidentPriority) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium';
    const styles: Record<IncidentPriority, string> = {
      low: 'bg-(--color-support-soft) text-(--color-support)',
      medium: 'bg-(--color-info-soft) text-(--color-info)',
      high: 'bg-(--color-warning-soft) text-(--color-warning)',
      critical: 'bg-(--color-error-soft) text-(--color-error)',
    };

    return <span className={`${base} ${styles[priority]}`}>{priorityLabels[priority]}</span>;
  };

  const formatDate = (input: Date) =>
    new Date(input).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
          <div className="mb-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-secondary transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
            >
              <span aria-hidden="true">←</span> Powrót do strony głównej
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-primary">Panel pracownika ZUS</h1>
              <p className="mt-2 text-sm text-muted">
                Przegląd zgłoszeń z wirtualnego asystenta. Obecnie korzystamy z danych testowych – po integracji
                z backendem lista zostanie zsynchronizowana z systemami ZUS.
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-4 border border-subtle bg-surface-subdued p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full gap-3 sm:w-2/3">
              <input
                type="search"
                placeholder="Szukaj po tytule, nazwisku, e-mailu lub numerze sprawy"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="flex-1 rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex w-full items-center gap-3 sm:w-auto">
              <label htmlFor="status" className="text-sm font-medium text-secondary">
                Status
              </label>
              <select
                id="status"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as IncidentStatus | 'all')}
                className="rounded-md border border-subtle bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
              >
                <option value="all">Wszystkie</option>
                <option value="pending">Oczekujące</option>
                <option value="in-progress">W trakcie</option>
                <option value="resolved">Rozwiązane</option>
                <option value="rejected">Odrzucone</option>
              </select>
            </div>
          </div>

          <div className="mb-4 text-sm text-muted">
            {isLoading ? 'Ładowanie danych…' : `Wyświetlono ${filteredIncidents.length} z ${incidents.length} zgłoszeń`}
          </div>

          <div className="overflow-hidden rounded-lg border border-subtle">
            <table className="w-full divide-y divide-subtle text-sm">
              <thead className="bg-surface-subdued text-xs font-medium uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Numer sprawy</th>
                  <th className="px-4 py-3 text-left">Tytuł</th>
                  <th className="px-4 py-3 text-left">Zgłaszający</th>
                  <th className="px-4 py-3 text-left">Kategoria</th>
                  <th className="px-4 py-3 text-left">Priorytet</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle bg-surface">
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="transition hover:bg-surface-subdued">
                    <td className="px-4 py-3 font-semibold text-secondary">{incident.caseNumber}</td>
                    <td className="px-4 py-3 text-primary">{incident.title}</td>
                    <td className="px-4 py-3 text-secondary">{incident.reporterName}</td>
                    <td className="px-4 py-3 text-secondary">{incident.category}</td>
                    <td className="px-4 py-3">{getPriorityBadge(incident.priority)}</td>
                    <td className="px-4 py-3">{getStatusBadge(incident.status)}</td>
                    <td className="px-4 py-3 text-secondary">{formatDate(incident.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/employee/${incident.id}`)}
                        className="text-sm font-semibold text-(--color-accent) transition hover:text-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                      >
                        Szczegóły →
                      </button>
                    </td>
                  </tr>
                ))}

                {!isLoading && filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                      Brak zgłoszeń spełniających kryteria wyszukiwania.
                    </td>
                  </tr>
                )}

                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                      Trwa ładowanie danych testowych…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
