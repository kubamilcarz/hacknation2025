import { IncidentWizardSection } from '@/components/user/IncidentWizardSection';
import { IncidentTextField } from '@/components/user/IncidentTextField';
import { useIncidentReport } from '@/context/IncidentReportContext';

export function ResidenceStepSection() {
  const { incidentDraft, validationErrors, handleInputChange } = useIncidentReport();

  return (
    <IncidentWizardSection>
      <IncidentTextField
        label="Ulica"
        name="ulica"
        value={incidentDraft.ulica ?? ''}
        onChange={handleInputChange('ulica')}
        optional
        error={validationErrors.ulica}
        hint="Jeżeli adres nie zawiera nazwy ulicy, pozostaw pole puste."
        autoComplete="address-line1"
      />
      <IncidentTextField
        label="Numer budynku"
        name="nr_domu"
        value={incidentDraft.nr_domu ?? ''}
        onChange={handleInputChange('nr_domu')}
        error={validationErrors.nr_domu}
        hint="Wpisz numer budynku, np. 12A lub 4/6."
        autoComplete="address-line2"
      />
      <IncidentTextField
        label="Numer lokalu"
        name="nr_lokalu"
        value={incidentDraft.nr_lokalu ?? ''}
        onChange={handleInputChange('nr_lokalu')}
        error={validationErrors.nr_lokalu}
        optional
        hint="Jeżeli adres nie zawiera numeru lokalu, pozostaw pole puste."
        autoComplete="address-line2"
      />
      <IncidentTextField
        label="Miejscowość"
        name="miejscowosc"
        value={incidentDraft.miejscowosc ?? ''}
        onChange={handleInputChange('miejscowosc')}
        error={validationErrors.miejscowosc}
        hint="Podaj miejscowość, w której mieszkasz lub odbierasz korespondencję."
        autoComplete="address-level2"
      />
      <IncidentTextField
        label="Kod pocztowy"
        name="kod_pocztowy"
        value={incidentDraft.kod_pocztowy ?? ''}
        onChange={handleInputChange('kod_pocztowy')}
        error={validationErrors.kod_pocztowy}
        hint="Użyj formatu 00-000."
        autoComplete="postal-code"
      />
      <IncidentTextField
        label="Państwo"
        name="nazwa_panstwa"
        value={incidentDraft.nazwa_panstwa ?? ''}
        onChange={handleInputChange('nazwa_panstwa')}
        error={validationErrors.nazwa_panstwa}
        optional
        hint="Domyślnie Polska. Zmień, jeżeli mieszkasz za granicą."
        autoComplete="country-name"
      />
    </IncidentWizardSection>
  );
}
