'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockIncidents } from '@/lib/mock-data';
import { Incident, IncidentStatus } from '@/types/incident';

export default function IncidentDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [status, setStatus] = useState<IncidentStatus>('pending');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const foundIncident = mockIncidents.find(inc => inc.id === params.id);
    if (foundIncident) {
      setIncident(foundIncident);
      setStatus(foundIncident.status);
      setAssignedTo(foundIncident.assignedTo || '');
      setNotes(foundIncident.notes || '');
    }
  }, [params.id]);

  const handleSave = () => {
    // In a real app, this would update via API
    console.log('Saving changes:', { status, assignedTo, notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!incident) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600">Ładowanie...</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: IncidentStatus) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    const labels = {
      pending: 'Oczekujące',
      'in-progress': 'W trakcie',
      resolved: 'Rozwiązane',
      rejected: 'Odrzucone',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };

    const labels = {
      low: 'Niski',
      medium: 'Średni',
      high: 'Wysoki',
      critical: 'Krytyczny',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[priority as keyof typeof styles]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/employee')}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Powrót do listy zgłoszeń
            </button>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">Zgłoszenie #{incident.id}</h1>
              {getStatusBadge(incident.status)}
            </div>
          </div>

          {saved && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              Zmiany zostały zapisane pomyślnie.
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informacje podstawowe</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tytuł</p>
                  <p className="text-lg font-medium text-gray-900">{incident.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kategoria</p>
                  <p className="text-lg font-medium text-gray-900">{incident.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Priorytet</p>
                  <div className="mt-1">{getPriorityBadge(incident.priority)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data utworzenia</p>
                  <p className="text-lg font-medium text-gray-900">{formatDate(incident.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Opis problemu</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* Reporter Info */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Dane zgłaszającego</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Imię i nazwisko</p>
                  <p className="text-lg font-medium text-gray-900">{incident.reporterName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-medium text-gray-900">{incident.reporterEmail}</p>
                </div>
                {incident.reporterPhone && (
                  <div>
                    <p className="text-sm text-gray-600">Telefon</p>
                    <p className="text-lg font-medium text-gray-900">{incident.reporterPhone}</p>
                  </div>
                )}
                {incident.pesel && (
                  <div>
                    <p className="text-sm text-gray-600">PESEL</p>
                    <p className="text-lg font-medium text-gray-900">{incident.pesel}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Management Section */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Zarządzanie sprawą</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status sprawy
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">Oczekujące</option>
                    <option value="in-progress">W trakcie</option>
                    <option value="resolved">Rozwiązane</option>
                    <option value="rejected">Odrzucone</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-2">
                    Przypisane do
                  </label>
                  <input
                    type="text"
                    id="assignedTo"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Imię i nazwisko pracownika"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notatki wewnętrzne
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dodaj notatki dotyczące obsługi sprawy..."
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Historia</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm text-gray-900">Zgłoszenie utworzone</p>
                    <p className="text-xs text-gray-500">{formatDate(incident.createdAt)}</p>
                  </div>
                </div>
                {incident.updatedAt.getTime() !== incident.createdAt.getTime() && (
                  <div className="flex items-start space-x-3">
                    <div className="shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm text-gray-900">Ostatnia aktualizacja</p>
                      <p className="text-xs text-gray-500">{formatDate(incident.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                onClick={() => router.push('/dashboard/employee')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
