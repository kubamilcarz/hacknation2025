"use client";

export interface IncidentWizardStep {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
}

interface IncidentStepTrackerProps {
  steps: IncidentWizardStep[];
  currentStepId: string;
}

export function IncidentStepTracker({ steps, currentStepId }: IncidentStepTrackerProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <nav aria-label="Postęp zgłoszenia" className="w-full">
      <ol className="flex flex-wrap items-center gap-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const isCompleted = index < currentIndex;

          return (
            <li key={step.id} className="flex items-center gap-2 text-sm font-medium">
              <span
                className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                  isActive
                    ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-text)"
                    : isCompleted
                      ? "border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)"
                      : "border-subtle bg-surface text-muted",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className={isActive ? "text-primary" : "text-secondary"}>{step.title}</span>
              {index < steps.length - 1 && <span className="text-muted">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
