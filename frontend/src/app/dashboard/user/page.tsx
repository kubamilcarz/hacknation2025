'use client';

import { useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { IncidentWizardLayout } from '@/components/user/IncidentWizardLayout';
import { IncidentStepTracker } from '@/components/user/IncidentStepTracker';
import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { IncidentAiSuggestion } from '@/components/user/IncidentAiSuggestion';
import { IncidentWizardNavigation } from '@/components/user/IncidentWizardNavigation';
import { IncidentInfoCard } from '@/components/user/IncidentInfoCard';
import type { IncidentWizardStep } from '@/components/user/IncidentStepTracker';

const steps: IncidentWizardStep[] = [
  {
    id: 'identity',
    title: 'Dane poszkodowanego',
    description: 'Imię, nazwisko oraz numery identyfikacyjne osoby, która uległa wypadkowi.',
  },
  {
    id: 'residence',
    title: 'Adres zamieszkania',
    description: 'Aktualne miejsce zamieszkania oraz dane korespondencyjne.',
  },
  {
    id: 'accident',
    title: 'Opis zdarzenia',
    description: 'Kluczowe fakty o wypadku: data, miejsce i okoliczności.',
  },
  {
    id: 'witnesses',
    title: 'Świadkowie',
    description: 'Dane kontaktowe osób, które widziały zdarzenie.',
    isOptional: true,
  },
  {
    id: 'review',
    title: 'Podsumowanie',
    description: 'Sprawdź zebrane informacje przed wysłaniem.',
  },
];

export default function UserDashboard() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [identityData, setIdentityData] = useState({
    pesel: '',
    nr_dowodu: '',
    imie: '',
    nazwisko: '',
    numer_telefonu: '',
  });
  const [accidentNarrative, setAccidentNarrative] = useState('');
  const [residenceData, setResidenceData] = useState({
    ulica: '',
  });

  const currentStep = useMemo(() => steps[currentStepIndex] ?? steps[0], [currentStepIndex]);

  const handleBack = () => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const handleNext = () => {
    setCurrentStepIndex((index) => Math.min(steps.length - 1, index + 1));
  };

  const renderAside = () => (
    <>
      <IncidentInfoCard title="Co się zmieni?">
        Tu pojawią się informacje kontekstowe zależne od etapu, np. checklista dokumentów do zebrania lub status
        autozapisu.
      </IncidentInfoCard>
      <IncidentInfoCard title="Wskazówki od mentorów">
        Dzięki integracji z zespołem ZUS możemy dołączać wskazówki dotyczące poprawnego wypełniania formularza.
      </IncidentInfoCard>
    </>
  );

  return (
    <div className="min-h-screen bg-app py-8">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { href: '/', labelKey: 'home' },
              { href: '/dashboard/user', labelKey: 'report-incident' },
            ]}
          />
          <div>
            <h1 className="text-3xl font-semibold text-primary">Zgłoś zdarzenie</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Poniższa wersja prezentuje wczesny podgląd komponentów kreatora. Docelowo każdy krok zostanie
              połączony z pełnym schematem danych oraz walidacją.
            </p>
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Postęp zgłoszenia</p>
          <IncidentStepTracker steps={steps} currentStepId={currentStep.id} />
        </div>

        <IncidentWizardLayout
          stepIndex={currentStepIndex}
          stepCount={steps.length}
          title={currentStep.title}
          description={currentStep.description}
          rightColumn={renderAside()}
        >
          <div className="space-y-10">
            {currentStep.id === 'identity' && (
              <IncidentWizardSection
                title="Tożsamość osoby poszkodowanej"
                description="Dane służą do jednoznacznego zidentyfikowania osoby w systemach ZUS."
              >
                <IncidentTextField
                  label="PESEL"
                  name="pesel"
                  value={identityData.pesel}
                  maxLength={11}
                  onChange={(event) => setIdentityData((prev) => ({ ...prev, pesel: event.target.value }))}
                  hint="11 cyfr, bez spacji. System później zweryfikuje poprawność numeru."
                />
                <IncidentTextField
                  label="Numer dokumentu tożsamości"
                  name="nr_dowodu"
                  value={identityData.nr_dowodu}
                  onChange={(event) => setIdentityData((prev) => ({ ...prev, nr_dowodu: event.target.value.toUpperCase() }))}
                  hint="Najczęściej dowód osobisty. Możesz podać paszport, jeśli przebywasz za granicą."
                />
                <IncidentTextField
                  label="Imię"
                  name="imie"
                  value={identityData.imie}
                  onChange={(event) => setIdentityData((prev) => ({ ...prev, imie: event.target.value }))}
                />
                <IncidentTextField
                  label="Nazwisko"
                  name="nazwisko"
                  value={identityData.nazwisko}
                  onChange={(event) => setIdentityData((prev) => ({ ...prev, nazwisko: event.target.value }))}
                />
                <IncidentTextField
                  label="Telefon kontaktowy"
                  name="numer_telefonu"
                  value={identityData.numer_telefonu}
                  optional
                  onChange={(event) => setIdentityData((prev) => ({ ...prev, numer_telefonu: event.target.value }))}
                  hint="Przyspiesza kontakt w razie dodatkowych pytań."
                />
              </IncidentWizardSection>
            )}

            {currentStep.id === 'accident' && (
              <IncidentWizardSection
                title="Opis zdarzenia"
                description="Szczegółowy opis pomaga ekspertom ZUS właściwie zakwalifikować zgłoszenie."
              >
                <IncidentTextField
                  component="textarea"
                  label="Co dokładnie się stało?"
                  name="szczegoly_okolicznosci"
                  value={accidentNarrative}
                  onChange={(event) => setAccidentNarrative(event.target.value)}
                  hint="Uwzględnij czas, miejsce, wykonywane czynności i używane maszyny."
                  aiSuggestion={
                    <IncidentAiSuggestion>
                      Podaj fakty: <strong>gdzie</strong>, <strong>kiedy</strong>, <strong>jak</strong> i <strong>dlaczego</strong> doszło do zdarzenia. Jeśli byli świadkowie lub używaliście maszyn, zapisz ich nazwy i numery seryjne.
                    </IncidentAiSuggestion>
                  }
                />
              </IncidentWizardSection>
            )}

            {currentStep.id === 'witnesses' && (
              <IncidentWizardSection
                title="Świadkowie"
                description="Możesz dodać dowolną liczbę osób, które potwierdzą przebieg zdarzenia."
                actions={
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-subtle px-4 py-2 text-sm font-semibold text-secondary transition hover:border-(--color-border-strong) hover:text-foreground"
                  >
                    Dodaj świadka
                  </button>
                }
              >
                <IncidentAiSuggestion title="Brak świadków?" variant="warning">
                  Jeśli nie było obserwatorów zdarzenia, zaznacz to w dalszej części formularza. System zaproponuje alternatywne dokumenty potwierdzające zgłoszenie.
                </IncidentAiSuggestion>
              </IncidentWizardSection>
            )}

            {currentStep.id === 'residence' && (
              <IncidentWizardSection
                title="Adres zamieszkania"
                description="Aktualny adres zamieszkania poszkodowanego. Jeżeli mieszkasz za granicą, w kolejnym kroku poprosimy o ostatni adres w Polsce."
              >
                <IncidentTextField
                  label="Ulica"
                  name="ulica"
                  value={residenceData.ulica}
                  onChange={(event) => setResidenceData((prev) => ({ ...prev, ulica: event.target.value }))}
                  optional
                  hint="Pola adresowe zostaną zasilone danymi z bazy Poczty Polskiej w kolejnej iteracji."
                />
              </IncidentWizardSection>
            )}

            {currentStep.id === 'review' && (
              <IncidentWizardSection
                title="Podsumowanie"
                description="Pokazujemy zebrane dane w formie do szybkiej weryfikacji."
              >
                <IncidentAiSuggestion>
                  W finalnej wersji kreator zrenderuje tutaj listę wszystkich sekcji wraz z możliwością szybkiej edycji.
                </IncidentAiSuggestion>
              </IncidentWizardSection>
            )}
          </div>

          <IncidentWizardNavigation
            canGoBack={currentStepIndex > 0}
            canGoNext={currentStepIndex < steps.length - 1}
            onBack={handleBack}
            onNext={handleNext}
            nextLabel={currentStepIndex === steps.length - 1 ? 'Zakończ podgląd' : 'Dalej'}
          />
        </IncidentWizardLayout>
      </div>
    </div>
  );
}
