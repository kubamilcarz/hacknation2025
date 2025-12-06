from __future__ import annotations

from typing import Dict, Any

from api.models import Document


def _fmt(value: Any) -> str:
    if value is None:
        return ""
    # Dates/Times from Django models stringify nicely to ISO (YYYY-MM-DD / HH:MM:SS)
    # Keep it simple unless a specific format is required.
    return str(value)


def map_document_to_pdf_fields(document: Document) -> Dict[str, str]:
    """Map a Document instance to PDF AcroForm field names.

    Only known and reasonably certain mappings are provided. Unknown or
    not-applicable fields are omitted (left for the template defaults).
    """
    data: Dict[str, str] = {}

    # Osoba poszkodowana (basic identity)
    data["PESEL[0]"] = _fmt(document.pesel)
    data["Rodzajseriainumerdokumentu[0]"] = _fmt(document.nr_dowodu)
    data["Imię[0]"] = _fmt(document.imie)
    data["Nazwisko[0]"] = _fmt(document.nazwisko)
    data["Dataurodzenia[0]"] = _fmt(document.data_urodzenia)
    data["Miejsceurodzenia[0]"] = _fmt(document.miejsce_urodzenia)
    data["Numertelefonu[0]"] = _fmt(document.numer_telefonu)

    # Adres zamieszkania (główny)
    data["Ulica[0]"] = _fmt(document.ulica)
    data["Numerdomu[0]"] = _fmt(document.nr_domu)
    data["Numerlokalu[0]"] = _fmt(document.nr_lokalu)
    data["Kodpocztowy[0]"] = _fmt(document.kod_pocztowy)
    data["Poczta[0]"] = _fmt(document.miejscowosc)
    data["Nazwapaństwa[0]"] = _fmt(document.nazwa_panstwa)

    # Adres ostatniego zamieszkania w Polsce → grupa "2"
    data["Ulica2[0]"] = _fmt(document.ulica_ostatniego_zamieszkania)
    data["Numerdomu2[0]"] = _fmt(document.nr_domu_ostatniego_zamieszkania)
    data["Numerlokalu2[0]"] = _fmt(document.nr_lokalu_ostatniego_zamieszkania)
    data["Kodpocztowy2[0]"] = _fmt(document.kod_pocztowy_ostatniego_zamieszkania)
    data["Poczta2[0]"] = _fmt(document.miejscowosc_ostatniego_zamieszkania)

    # Adres do korespondencji → grupa "2A"
    data["Ulica2A[0]"] = _fmt(document.ulica_korespondencji)
    data["Numerdomu2A[0]"] = _fmt(document.nr_domu_korespondencji)
    data["Numerlokalu2A[0]"] = _fmt(document.nr_lokalu_korespondencji)
    data["Kodpocztowy2A[0]"] = _fmt(document.kod_pocztowy_korespondencji)
    data["Poczta2A[0]"] = _fmt(document.miejscowosc_korespondencji)
    data["Nazwapaństwa2[0]"] = _fmt(document.nazwa_panstwa_korespondencji)

    # Adres miejsca prowadzenia działalności → grupa "3"
    data["Ulica3[0]"] = _fmt(document.ulica_dzialalnosci)
    data["Numerdomu3[0]"] = _fmt(document.nr_domu_dzialalnosci)
    data["Numerlokalu3[0]"] = _fmt(document.nr_lokalu_dzialalnosci)
    data["Kodpocztowy3[0]"] = _fmt(document.kod_pocztowy_dzialalnosci)
    data["Poczta3[0]"] = _fmt(document.miejscowosc_dzialalnosci)
    data["Numertelefonu3[0]"] = _fmt(document.nr_telefonu_dzialalnosci)

    # Dane zgłaszającego (osoba zgłaszająca wypadek) → indeks [1]
    data["Imię[1]"] = _fmt(document.imie_zglaszajacego)
    data["Nazwisko[1]"] = _fmt(document.nazwisko_zglaszajacego)
    data["PESEL[1]"] = _fmt(document.pesel_zglaszajacego)
    data["Rodzajseriainumerdokumentu[1]"] = _fmt(document.nr_dowodu_zglaszajacego)
    data["Numertelefonu2[0]"] = _fmt(document.nr_telefonu_zglaszajacego)

    # Adres zgłaszającego → indeksy [1]
    data["Ulica[1]"] = _fmt(document.ulica_zglaszajacego)
    data["Numerdomu[1]"] = _fmt(document.nr_domu_zglaszajacego)
    data["Numerlokalu[1]"] = _fmt(document.nr_lokalu_zglaszajacego)
    data["Kodpocztowy[1]"] = _fmt(document.kod_pocztowy_zglaszajacego)
    data["Poczta[1]"] = _fmt(document.miejscowosc_zglaszajacego)

    # Adres zgłaszającego – ostatnie zamieszkanie w PL → grupa "2" indeks [1]
    data["Ulica2[1]"] = _fmt(document.ulica_zglaszajacego_ostatniego_zamieszkania)
    data["Numerdomu2[1]"] = _fmt(document.nr_domu_zglaszajacego_ostatniego_zamieszkania)
    data["Numerlokalu2[1]"] = _fmt(document.nr_lokalu_zglaszajacego_ostatniego_zamieszkania)
    data["Kodpocztowy2[1]"] = _fmt(document.kod_pocztowy_zglaszajacego_ostatniego_zamieszkania)
    data["Poczta2[1]"] = _fmt(document.miejscowosc_zglaszajacego_ostatniego_zamieszkania)

    # Informacje o wypadku
    data["Datawyp[0]"] = _fmt(document.data_wypadku)
    data["Godzina[0]"] = _fmt(document.godzina_wypadku)
    data["Miejscewyp[0]"] = _fmt(document.miejsce_wypadku)
    data["Godzina3A[0]"] = _fmt(document.planowana_godzina_rozpoczecia_pracy)
    data["Godzina3B[0]"] = _fmt(document.planowana_godzina_zakonczenia_pracy)

    # Opisy/teksty – przypisania orientacyjne
    data["Tekst7[0]"] = _fmt(document.rodzaj_urazow)
    data["Tekst8[0]"] = _fmt(document.szczegoly_okolicznosci)
    data["Tekst6[0]"] = _fmt(document.organ_postepowania)
    data["Tekst5[0]"] = _fmt(document.miejsce_udzielenia_pomocy)
    data["Tekst4[0]"] = _fmt(document.opis_maszyn)

    # Booleans: without precise checkbox mapping, use human-readable strings if needed
    # Uncomment and adjust if the template expects specific checkbox fields.
    # data["Inne1[0]"] = "Tak" if document.czy_udzielona_pomoc else "Nie"
    # data["Inne2[0]"] = "Tak" if document.czy_wypadek_podczas_uzywania_maszyny else "Nie"
    # data["Inne3[0]"] = "Tak" if document.czy_maszyna_posiada_atest else "Nie"
    # data["Inne4[0]"] = "Tak" if document.czy_maszyna_w_ewidencji else "Nie"

    # Remove keys that ended up as empty strings to avoid overwriting template defaults
    cleaned = {k: v for k, v in data.items() if v not in (None, "")}
    return cleaned
