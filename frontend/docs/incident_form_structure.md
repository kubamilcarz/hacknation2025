# Incident Submission Flow Blueprint

This document outlines the recommended multi-step wizard for collecting all data required by the backend `Document` model (and related `Witness` records). The goal is to organize the extensive dataset into focused screens that feel manageable to end users while ensuring every required field is captured.

## Guiding Principles

- **Progressive Disclosure:** Only show the fields relevant to the current context. Split the long form into logical phases to avoid overwhelming the user.
- **Contextual Grouping:** Group fields by the real-world concept they belong to (personal identity, residence history, accident details, etc.).
- **Reusability:** Design each step as a modular React component that can be rearranged or reused as needed.
- **Validation Staging:** Perform lightweight validation per step. Run full schema validation before final submission.
- **Assistive Copy:** Provide short helper texts in each section explaining why the information is required.
- **AI Assistance:** For any free-text description (accident details, contextual notes) surface contextual AI hints beside the field, helping users supply precise information aligned with ZUS requirements.

## Proposed Wizard Steps

Each step corresponds to a cohesive data segment from the `Document` model. A dedicated component will manage the inputs, local validation, and feed the data into a shared wizard state store (likely via context or a form library such as React Hook Form or Zustand).

| Step | Title | Purpose | Fields |
| --- | --- | --- | --- |
| 1 | `IdentityDetailsStep` | Capture personal identification data for the injured party. | `pesel`, `nr_dowodu`, `imie`, `nazwisko`, `data_urodzenia`, `miejsce_urodzenia`, `numer_telefonu` |
| 2 | `ResidenceStep` | Current place of residence. | `ulica`, `nr_domu`, `nr_lokalu`, `miejscowosc`, `kod_pocztowy`, `nazwa_panstwa` |
| 3 | `PolandResidenceHistoryStep` | Last Polish residence (if living abroad). | `ulica_ostatniego_zamieszkania`, `nr_domu_ostatniego_zamieszkania`, `nr_lokalu_ostatniego_zamieszkania`, `miejscowosc_ostatniego_zamieszkania`, `kod_pocztowy_ostatniego_zamieszkania` |
| 4 | `CorrespondenceAddressStep` | Preferred mailing address. | `typ_korespondencji`, `ulica_korespondencji`, `nr_domu_korespondencji`, `nr_lokalu_korespondencji`, `miejscowosc_korespondencji`, `kod_pocztowy_korespondencji`, `nazwa_panstwa_korespondencji` |
| 5 | `BusinessAddressStep` | Address of business activity. | `ulica_dzialalnosci`, `nr_domu_dzialalnosci`, `nr_lokalu_dzialalnosci`, `miejscowosc_dzialalnosci`, `kod_pocztowy_dzialalnosci`, `nr_telefonu_dzialalnosci` |
| 6 | `ChildCareAddressStep` | Address where childcare is provided (if applicable). | `ulica_opieki`, `nr_domu_opieki`, `nr_lokalu_opieki`, `miejscowosc_opieki`, `kod_pocztowy_opieki`, `nr_telefonu_opieki` |
| 7 | `ReporterIdentityStep` | Person reporting the accident. | `imie_zglaszajacego`, `nazwisko_zglaszajacego`, `pesel_zglaszajacego`, `nr_dowodu_zglaszajacego`, `data_urodzenia_zglaszajacego`, `nr_telefonu_zglaszajacego` |
| 8 | `ReporterResidenceStep` | Reporter’s residence. | `ulica_zglaszajacego`, `nr_domu_zglaszajacego`, `nr_lokalu_zglaszajacego`, `miejscowosc_zglaszajacego`, `kod_pocztowy_zglaszajacego` |
| 9 | `ReporterPolandResidenceStep` | Reporter’s last residence in Poland. | `ulica_zglaszajacego_ostatniego_zamieszkania`, `nr_domu_zglaszajacego_ostatniego_zamieszkania`, `nr_lokalu_zglaszajacego_ostatniego_zamieszkania`, `miejscowosc_zglaszajacego_ostatniego_zamieszkania`, `kod_pocztowy_zglaszajacego_ostatniego_zamieszkania` |
| 10 | `ReporterCorrespondenceStep` | Reporter’s correspondence address. | `typ_korespondencji_zglaszajacego`, `ulica_korespondencji_zglaszajacego`, `nr_domu_korespondencji_zglaszajacego`, `nr_lokalu_korespondencji_zglaszajacego`, `miejscowosc_korespondencji_zglaszajacego`, `kod_pocztowy_korespondencji_zglaszajacego`, `nazwa_panstwa_korespondencji_zglaszajacego` |
| 11 | `AccidentDetailsStep` | Core accident data. | `data_wypadku`, `godzina_wypadku`, `miejsce_wypadku`, `planowana_godzina_rozpoczecia_pracy`, `planowana_godzina_zakonczenia_pracy`, `rodzaj_urazow`, `szczegoly_okolicznosci`, `czy_udzielona_pomoc`, `miejsce_udzielenia_pomocy`, `organ_postepowania`, `czy_wypadek_podczas_uzywania_maszyny`, `opis_maszyn`, `czy_maszyna_posiada_atest`, `czy_maszyna_w_ewidencji` |
| 12 | `WitnessesStep` | Optional witness entries. | `Witness[]` – dynamic list capturing `imie`, `nazwisko`, `ulica`, `nr_domu`, `nr_lokalu`, `miejscowosc`, `kod_pocztowy`, `nazwa_panstwa` |
| 13 | `ReviewAndSubmitStep` | Summary of all collected information with an option to edit previous steps. | Derived from aggregated wizard state. |

## Wizard Data Structure

A shared state object should mirror the backend structure while maintaining TypeScript safety. Below is a suggested blueprint:

```ts
export type WizardState = {
  document: Document;
  witnesses: Witness[];
  currentStep: WizardStepId;
};

export type WizardStepId =
  | "identity"
  | "residence"
  | "polandResidence"
  | "correspondence"
  | "business"
  | "childCare"
  | "reporterIdentity"
  | "reporterResidence"
  | "reporterPolandResidence"
  | "reporterCorrespondence"
  | "accident"
  | "witnesses"
  | "review";
```

## Suggested Step Manager Class

The wizard can be orchestrated via a dedicated class (or hook) that centralizes step navigation, validation hooks, and persistence logic.

```ts
export class IncidentWizardController {
  private steps: WizardStepDescriptor[];
  private state: WizardState;
  private onStateChange?: (state: WizardState) => void;

  constructor(initialState: WizardState, steps: WizardStepDescriptor[], onStateChange?: (state: WizardState) => void) {
    this.steps = steps;
    this.state = initialState;
    this.onStateChange = onStateChange;
  }

  get currentStep(): WizardStepDescriptor {
    return this.steps.find((step) => step.id === this.state.currentStep) ?? this.steps[0];
  }

  updateStepData<T extends WizardStepId>(stepId: T, updater: (state: WizardState) => WizardState) {
    this.state = updater(this.state);
    this.onStateChange?.(this.state);
  }

  goToNextStep() {
    const currentIndex = this.steps.findIndex((step) => step.id === this.state.currentStep);
    if (currentIndex < this.steps.length - 1) {
      this.setStepByIndex(currentIndex + 1);
    }
  }

  goToPreviousStep() {
    const currentIndex = this.steps.findIndex((step) => step.id === this.state.currentStep);
    if (currentIndex > 0) {
      this.setStepByIndex(currentIndex - 1);
    }
  }

  goToStep(stepId: WizardStepId) {
    if (this.steps.some((step) => step.id === stepId)) {
      this.state = {
        ...this.state,
        currentStep: stepId,
      };
      this.onStateChange?.(this.state);
    }
  }

  private setStepByIndex(index: number) {
    const target = this.steps[index];
    if (target) {
      this.state = {
        ...this.state,
        currentStep: target.id,
      };
      this.onStateChange?.(this.state);
    }
  }
}

export type WizardStepDescriptor = {
  id: WizardStepId;
  title: string;
  description?: string;
  isOptional?: boolean;
  validate?: (state: WizardState) => Promise<ValidationResult> | ValidationResult;
};

export type ValidationResult = {
  isValid: boolean;
  errors?: Record<string, string>;
};
```

This controller can be instantiated inside a React context provider, enabling components to subscribe to state changes and issue navigation commands without prop drilling.

## Progress Tracking Component

To visualize the user’s progress through the wizard, implement a `StepTracker` component that reads from the same step configuration.

```tsx
import type { WizardStepDescriptor, WizardStepId } from "@/types/incidentWizard";

interface StepTrackerProps {
  steps: WizardStepDescriptor[];
  currentStepId: WizardStepId;
}

export function StepTracker({ steps, currentStepId }: StepTrackerProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <nav aria-label="Postęp zgłoszenia" className="flex flex-col gap-4">
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const isCompleted = index < currentIndex;

          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={[
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                  isActive
                    ? "border-(--color-accent) bg-(--color-accent) text-(--color-accent-text)"
                    : isCompleted
                      ? "border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent)"
                      : "border-subtle bg-surface text-muted",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <div>
                <p className={`text-sm font-medium ${isActive ? "text-primary" : "text-secondary"}`}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="mt-1 text-xs text-muted">{step.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="h-1 w-full overflow-hidden rounded-full bg-(--color-border)">
        <div
          className="h-full bg-(--color-accent) transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </nav>
  );
}
```

### Usage Notes

- The step tracker is read-only; navigation should be triggered via the wizard controller.
- Optional steps can include indicators (e.g., an icon) to communicate non-mandatory sections.
- Integrate with accessibility best practices (ARIA labels, focus management when changing steps).

## Next Implementation Tasks

1. **Type Definitions:** Extract `WizardState`, `WizardStepDescriptor`, and related types into `src/types/incidentWizard.ts` for reuse.
2. **Context Provider:** Create a `IncidentWizardProvider` that owns the controller instance and exposes React hooks (`useWizardState`, `useWizardNavigation`).
3. **Step Components:** Scaffold one component per step listed above, each receiving a slice of state and returning form fields.
4. **Validation Layer:** Define step-level validation using Zod or Yup schemas aligned with backend requirements (e.g., check PESEL length, postal code formats).
5. **Persistence:** Consider auto-saving drafts (localStorage or backend) after each completed step to avoid data loss.
6. **Integration:** Replace the existing user dashboard form with the wizard once the UI is ready and tested.
7. **AI Suggestion Hooks:** Define a client for the chat AI endpoint and standardize how suggestion prompts are triggered for relevant fields (e.g., `szczegoly_okolicznosci`, `rodzaj_urazow`).
```