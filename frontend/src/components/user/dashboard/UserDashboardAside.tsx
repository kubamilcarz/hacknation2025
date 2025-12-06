import { IncidentInfoCard } from '@/components/user/IncidentInfoCard';

export function UserDashboardAside() {
  return (
    <>
      <IncidentInfoCard title="Co się zmieni?">
        Tu pojawią się informacje kontekstowe zależne od etapu, np. checklista dokumentów do zebrania lub status autozapisu.
      </IncidentInfoCard>
      <IncidentInfoCard title="Wskazówki od mentorów">
        Dzięki integracji z zespołem ZUS możemy dołączać wskazówki dotyczące poprawnego wypełniania formularza.
      </IncidentInfoCard>
    </>
  );
}
