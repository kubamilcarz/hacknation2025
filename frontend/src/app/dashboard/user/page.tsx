'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIncidents } from '@/context/IncidentContext';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { type CreateIncidentInput, type IncidentPriority } from '@/types/incident';

const categories = [
  'Zasiłki',
  'Emerytury',
  'Składki',
  'Dokumentacja',
  'Techniczne',
  'Inne',
];

const priorities: { value: IncidentPriority; label: string }[] = [
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
  { value: 'critical', label: 'Krytyczny' },
];

type IncidentFormState = CreateIncidentInput;

const initialFormState: IncidentFormState = {
  title: '',
  description: '',
  category: categories[0],
  priority: 'medium',
  reporterName: '',
  reporterEmail: '',
  reporterPhone: '',
  pesel: '',
};

export default function UserDashboard() {
  const router = useRouter();
  const { createIncident } = useIncidents();

  const [formData, setFormData] = useState<IncidentFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const created = await createIncident(formData);
      setCaseNumber(created.caseNumber);
      setFormData(initialFormState);
    } catch (err) {
      setSubmissionError(
        err instanceof Error ? err.message : 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-4xl px-6">
        <div className="rounded-xl border border-subtle bg-surface p-8 shadow-card">
          <div className="mb-10 flex flex-col gap-4">
            <Breadcrumbs
              items={[
                { href: '/', labelKey: 'home' },
                { href: '/dashboard/user', labelKey: 'report-incident' },
              ]}
            />
            <div>
              <h1 className="text-3xl font-semibold text-primary">Zgłoś zdarzenie</h1>
              <p className="mt-2 text-sm text-muted">
                Przekaż nam szczegóły wypadku przy pracy. Twoje zgłoszenie zostanie zapisane i przekazane do zespołu
                ZUS. Na razie korzystamy z danych testowych – po wdrożeniu połączymy formularz z zapleczem ZUS.
              </p>
            </div>
          </div>

          {caseNumber && (
            <div className="mb-6 rounded-lg border border-(--color-accent-strong) bg-(--color-accent-soft) px-4 py-3 text-sm text-accent">
              Zgłoszenie przyjęte. Tymczasowy numer sprawy: <span className="font-semibold">{caseNumber}</span>. Kopię wyślemy na
              adres e-mail po podłączeniu systemu produkcyjnego.
            </div>
          )}

          {submissionError && (
            <div className="mb-6 rounded-lg border border-error bg-error-soft px-4 py-3 text-sm text-error">
              {submissionError}
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <section className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-primary">Opis zdarzenia</h2>
                <p className="text-sm text-muted">
                  Opisz wypadek własnymi słowami. System podpowie zespołowi ZUS, jakie dokumenty należy sprawdzić.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium text-secondary">
                    Tytuł zgłoszenia *
                  </label>
                  <input
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                    placeholder="Krótki tytuł, np. 'Upadek z rusztowania'"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium text-secondary">
                    Szczegółowy opis *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={6}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full rounded-md border border-subtle bg-input px-4 py-3 text-sm text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                    placeholder="Opisz dokładnie okoliczności wypadku, podaj miejsce, datę oraz osoby, które były świadkami."
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-primary">Klasyfikacja sprawy</h2>
                <p className="text-sm text-muted">
                  Te informacje pomagają pracownikom ZUS dobrać właściwą procedurę i priorytet obsługi.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium text-secondary">
                    Kategoria *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="priority" className="text-sm font-medium text-secondary">
                    Priorytet *
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    required
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                  >
                    {priorities.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-primary">Dane kontaktowe</h2>
                <p className="text-sm text-muted">
                  Dzięki tym danym będziemy mogli skontaktować się w sprawie dodatkowych dokumentów lub decyzji.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="reporterName" className="text-sm font-medium text-secondary">
                    Imię i nazwisko *
                  </label>
                  <input
                    id="reporterName"
                    name="reporterName"
                    required
                    value={formData.reporterName}
                    onChange={handleChange}
                    className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="reporterEmail" className="text-sm font-medium text-secondary">
                    Email *
                  </label>
                  <input
                    id="reporterEmail"
                    name="reporterEmail"
                    type="email"
                    required
                    value={formData.reporterEmail}
                    onChange={handleChange}
                    className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="reporterPhone" className="text-sm font-medium text-secondary">
                    Telefon kontaktowy
                  </label>
                  <input
                    id="reporterPhone"
                    name="reporterPhone"
                    value={formData.reporterPhone}
                    onChange={handleChange}
                    placeholder="+48 123 456 789"
                    className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="pesel" className="text-sm font-medium text-secondary">
                    PESEL
                  </label>
                  <input
                    id="pesel"
                    name="pesel"
                    value={formData.pesel}
                    maxLength={11}
                    onChange={handleChange}
                    placeholder="12345678901"
                    className="w-full rounded-md border border-subtle bg-input px-4 py-2 text-sm text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-subtle pt-6 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="order-2 inline-flex items-center justify-center rounded-md border border-subtle bg-surface px-5 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 sm:order-1"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="order-1 inline-flex items-center justify-center rounded-md bg-(--color-accent) px-6 py-2 text-sm font-semibold text-(--color-accent-text) transition hover:bg-(--color-accent-strong) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:order-2"
              >
                {isSubmitting ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
