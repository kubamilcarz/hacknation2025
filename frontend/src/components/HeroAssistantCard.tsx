import { FC } from 'react';

interface HeroAssistantCardProps {
  onStart: () => void;
}

const features = [
  'Przyjazny kreator krok po kroku',
  'Walidacja danych i PESEL',
  'Generowanie kompletnego zgłoszenia',
];

const HeroAssistantCard: FC<HeroAssistantCardProps> = ({ onStart }) => {
  return (
    <div className="w-full max-w-md rounded-md border border-emerald-200 bg-emerald-50 p-6 shadow-md">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-600 text-white">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Moduł obywatelski</p>
          <h2 className="text-xl font-bold text-gray-900">Wirtualny Asystent Zgłoszeń</h2>
        </div>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-gray-700">
        Przeprowadza obywatela przez zgłoszenie wypadku przy pracy, podpowiadając brakujące elementy wymagane przez
        wzorce ZUS.
      </p>
      <ul className="space-y-3 text-sm text-gray-700">
        {features.map((feature) => (
          <li key={feature} className="flex items-start">
            <svg className="mr-3 mt-1 h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onStart}
        className="mt-6 w-full rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        Rozpocznij zgłoszenie
      </button>
    </div>
  );
};

export default HeroAssistantCard;
