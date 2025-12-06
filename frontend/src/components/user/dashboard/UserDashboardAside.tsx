import { IncidentInfoCard } from '@/components/user/IncidentInfoCard';

export function UserDashboardAside() {
  return (
    <>
      <IncidentInfoCard title="Dlaczego to ważne?">
        Każda wprowadzona informacja trafia bezpośrednio do zespołu analizującego zgłoszenie i pomaga szybciej podjąć decyzję.
      </IncidentInfoCard>
      <IncidentInfoCard title="Masz pytania?">
        Jeśli potrzebujesz wsparcia przy uzupełnianiu formularza, skontaktuj się z infolinią ZUS lub swoim opiekunem sprawy.
      </IncidentInfoCard>
    </>
  );
}
