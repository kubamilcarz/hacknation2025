"use client";

import type { ReactNode } from "react";

export interface IncidentWizardStep {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
  info?: {
    label: string;
    content: ReactNode;
  };
}

interface IncidentStepTrackerProps {
  steps: IncidentWizardStep[];
  currentStepId: string;
  maxAccessibleStepIndex?: number;
  onStepSelect?: (stepId: string) => void;
}

export function IncidentStepTracker({ steps, currentStepId, maxAccessibleStepIndex, onStepSelect }: IncidentStepTrackerProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const highestReachableIndex = Math.min(steps.length - 1, maxAccessibleStepIndex ?? safeCurrentIndex);
  const lastReachableIndex = Math.max(safeCurrentIndex, highestReachableIndex);

  return (
    <nav aria-label="Postęp zgłoszenia" className="w-full select-none">
      <ol className="flex flex-wrap items-center gap-3 select-none">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const isCompleted = index < safeCurrentIndex;
          const isReachable = index <= lastReachableIndex;
          const isClickable = Boolean(onStepSelect) && isReachable && index !== safeCurrentIndex;
          const tabIndexValue = isClickable || isActive ? 0 : -1;
          const isAriaDisabled = !isClickable && !isActive;

          const handleStepClick = () => {
            if (!isClickable) {
              return;
            }

            onStepSelect?.(step.id);
          };

          return (
            <li key={step.id} className="flex items-center gap-2 text-sm font-medium">
              <button
                type="button"
                tabIndex={tabIndexValue}
                aria-current={isActive ? "step" : undefined}
                aria-disabled={isAriaDisabled ? true : undefined}
                onClick={handleStepClick}
                className={[
                  "flex items-center gap-2 rounded-md border-none bg-transparent px-1 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 select-none",
                  isClickable ? "cursor-pointer hover:text-primary" : "cursor-default",
                ].join(" ")}
              >
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
              </button>
              {index < steps.length - 1 && <span className="text-muted">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
