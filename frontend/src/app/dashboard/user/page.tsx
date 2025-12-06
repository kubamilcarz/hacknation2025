'use client';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import Footer from '@/components/Footer';
import { IncidentWizardLayout } from '@/components/user/IncidentWizardLayout';
import { IncidentStepTracker } from '@/components/user/IncidentStepTracker';
import { IncidentWizardNavigation } from '@/components/user/IncidentWizardNavigation';
import { AccidentStepSection } from '@/components/user/dashboard/AccidentStepSection';
import { IdentityStepSection } from '@/components/user/dashboard/IdentityStepSection';
import { ResidenceStepSection } from '@/components/user/dashboard/ResidenceStepSection';
import { ReviewStepSection } from '@/components/user/dashboard/ReviewStepSection';
import { WitnessesStepSection } from '@/components/user/dashboard/WitnessesStepSection';
import { IncidentReportProvider, useIncidentReport } from '@/context/IncidentReportContext';

function UserDashboardContent() {
  const {
    steps,
    currentStep,
    currentStepIndex,
    furthestStepIndex,
    handleStepSelect,
    handleBack,
    handleNext,
    isSubmitting,
    canAdvance,
    hasSubmittedSuccessfully,
  } = useIncidentReport();

  const nextLabel = currentStepIndex === steps.length - 1
    ? hasSubmittedSuccessfully
      ? 'Gotowe'
      : 'Przygotuj formularz'
    : 'Dalej';

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
            <h1 className="text-3xl font-semibold text-primary">Zgłoś zdarzenie w swojej działalności</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              Kreator prowadzi przedsiębiorców przez kolejne kroki zgłoszenia i wskazuje wymagane informacje. Brakujące pola można uzupełnić w dowolnym momencie.
            </p>
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Postęp zgłoszenia</p>
          <IncidentStepTracker
            steps={steps}
            currentStepId={currentStep.id}
            maxAccessibleStepIndex={furthestStepIndex}
            onStepSelect={handleStepSelect}
          />
        </div>

        <IncidentWizardLayout
          stepIndex={currentStepIndex}
          stepCount={steps.length}
          title={currentStep.title}
          description={currentStep.description}
          info={currentStep.info}
        >
          <div className="space-y-10">
            {currentStep.id === 'identity' && <IdentityStepSection />}

            {currentStep.id === 'accident' && <AccidentStepSection />}

            {currentStep.id === 'witnesses' && <WitnessesStepSection />}

            {currentStep.id === 'residence' && <ResidenceStepSection />}

            {currentStep.id === 'review' && <ReviewStepSection />}
          </div>

          <IncidentWizardNavigation
            isSubmitting={isSubmitting}
            canGoBack={currentStepIndex > 0}
            canGoNext={canAdvance}
            onBack={handleBack}
            onNext={handleNext}
            nextLabel={nextLabel}
          />
        </IncidentWizardLayout>
        <Footer />
      </div>
    </div>
  );
}

export default function UserDashboard() {
  return (
    <IncidentReportProvider>
      <UserDashboardContent />
    </IncidentReportProvider>
  );
}
