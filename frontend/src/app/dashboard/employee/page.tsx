'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockIncidents } from '@/lib/mock-data';
import { Incident, IncidentStatus } from '@/types/incident';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [incidents] = useState<Incident[]>(mockIncidents);
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIncidents = incidents.filter(incident => {
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          incident.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          incident.id.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Powrót do strony głównej
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Panel Pracownika ZUS</h1>
            <p className="text-gray-600 mt-2">Zarządzanie zgłoszeniami obywateli</p>
          </div>

          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Szukaj po tytule, nazwisku lub numerze..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as IncidentStatus | 'all')}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Wszystkie statusy</option>
                <option value="pending">Oczekujące</option>
                <option value="in-progress">W trakcie</option>
                <option value="resolved">Rozwiązane</option>
                <option value="rejected">Odrzucone</option>
              </select>
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Wyświetlono {filteredIncidents.length} z {incidents.length} zgłoszeń
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nr
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tytuł
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zgłaszający
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priorytet
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{incident.id}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {incident.title}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {incident.reporterName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {incident.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {getPriorityBadge(incident.priority)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(incident.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(incident.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/dashboard/employee/${incident.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Szczegóły →
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Brak zgłoszeń spełniających kryteria wyszukiwania
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
