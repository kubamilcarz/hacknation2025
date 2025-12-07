"use client";

interface IncidentWizardNavigationProps {
  isSubmitting?: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
}

export function IncidentWizardNavigation({
  isSubmitting = false,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  nextLabel = "Dalej",
  backLabel = "Wstecz",
}: IncidentWizardNavigationProps) {
  return (
    <div className="mt-8 flex flex-col gap-3 border-t border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-muted">
        {isSubmitting ? "Zapisywanie…" : "Możesz przerwać i wrócić do zgłoszenia w dowolnym momencie."}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isSubmitting}
          className={`inline-flex items-center justify-center rounded-md border border-subtle px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 ${
            !canGoBack || isSubmitting
              ? "cursor-not-allowed text-muted"
              : "bg-surface text-secondary hover:border-(--color-border-strong) hover:text-foreground"
          }`}
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className={`inline-flex items-center justify-center rounded-md px-6 py-2 text-sm font-semibold text-(--color-accent-text) transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2 ${
            !canGoNext || isSubmitting
              ? "bg-(--color-border) text-muted"
              : "bg-(--color-accent) hover:bg-(--color-accent-strong)"
          }`}
        >
          {isSubmitting ? "Zapisywanie…" : nextLabel}
        </button>
      </div>
    </div>
  );
}
