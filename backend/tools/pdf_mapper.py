from __future__ import annotations

from typing import Dict, Any, Union
from pathlib import Path
from datetime import datetime, date, time

from PyPDF2 import PdfReader

from api.models import Document


def _fmt(value: Any) -> str:
    if value is None:
        return ""
    # Dates/Times from Django models stringify nicely to ISO (YYYY-MM-DD / HH:MM:SS)
    # Keep it simple unless a specific format is required.
    return str(value)


def _fmt_date(value: Any) -> str:
    """Format dates for PDF as ddmmyyyy (no separators).

    Accepts date, datetime, or string. If string, try several common formats.
    Returns empty string for None/empty input, or the original string if parsing fails.
    """
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().strftime("%d%m%Y")
    if isinstance(value, date):
        return value.strftime("%d%m%Y")
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return ""
        for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%Y/%m/%d", "%d-%m-%Y", "%d%m%Y"):
            try:
                return datetime.strptime(s, fmt).date().strftime("%d%m%Y")
            except ValueError:
                continue
        # Could not parse — return as-is (better to see original than blank)
        return s
    # Fallback to string conversion
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
    data["Dataurodzenia[0]"] = _fmt_date(document.data_urodzenia)
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
    data["Datawyp[0]"] = _fmt_date(document.data_wypadku)
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


# ========================= Reverse mapping (PDF -> Document) =========================

# Inverse mapping: PDF field name -> Document model field
PDF_TO_DOCUMENT_FIELD: Dict[str, str] = {
    # Osoba poszkodowana
    "PESEL[0]": "pesel",
    "Rodzajseriainumerdokumentu[0]": "nr_dowodu",
    "Imię[0]": "imie",
    "Nazwisko[0]": "nazwisko",
    "Dataurodzenia[0]": "data_urodzenia",
    "Miejsceurodzenia[0]": "miejsce_urodzenia",
    "Numertelefonu[0]": "numer_telefonu",

    # Adres zamieszkania (główny)
    "Ulica[0]": "ulica",
    "Numerdomu[0]": "nr_domu",
    "Numerlokalu[0]": "nr_lokalu",
    "Kodpocztowy[0]": "kod_pocztowy",
    "Poczta[0]": "miejscowosc",
    "Nazwapaństwa[0]": "nazwa_panstwa",

    # Adres ostatniego zamieszkania w Polsce → grupa "2"
    "Ulica2[0]": "ulica_ostatniego_zamieszkania",
    "Numerdomu2[0]": "nr_domu_ostatniego_zamieszkania",
    "Numerlokalu2[0]": "nr_lokalu_ostatniego_zamieszkania",
    "Kodpocztowy2[0]": "kod_pocztowy_ostatniego_zamieszkania",
    "Poczta2[0]": "miejscowosc_ostatniego_zamieszkania",

    # Adres do korespondencji → grupa "2A"
    "Ulica2A[0]": "ulica_korespondencji",
    "Numerdomu2A[0]": "nr_domu_korespondencji",
    "Numerlokalu2A[0]": "nr_lokalu_korespondencji",
    "Kodpocztowy2A[0]": "kod_pocztowy_korespondencji",
    "Poczta2A[0]": "miejscowosc_korespondencji",
    "Nazwapaństwa2[0]": "nazwa_panstwa_korespondencji",

    # Adres miejsca prowadzenia działalności → grupa "3"
    "Ulica3[0]": "ulica_dzialalnosci",
    "Numerdomu3[0]": "nr_domu_dzialalnosci",
    "Numerlokalu3[0]": "nr_lokalu_dzialalnosci",
    "Kodpocztowy3[0]": "kod_pocztowy_dzialalnosci",
    "Poczta3[0]": "miejscowosc_dzialalnosci",
    "Numertelefonu3[0]": "nr_telefonu_dzialalnosci",

    # Dane zgłaszającego → indeks [1]
    "Imię[1]": "imie_zglaszajacego",
    "Nazwisko[1]": "nazwisko_zglaszajacego",
    "PESEL[1]": "pesel_zglaszajacego",
    "Rodzajseriainumerdokumentu[1]": "nr_dowodu_zglaszajacego",
    "Numertelefonu2[0]": "nr_telefonu_zglaszajacego",

    # Adres zgłaszającego → indeksy [1]
    "Ulica[1]": "ulica_zglaszajacego",
    "Numerdomu[1]": "nr_domu_zglaszajacego",
    "Numerlokalu[1]": "nr_lokalu_zglaszajacego",
    "Kodpocztowy[1]": "kod_pocztowy_zglaszajacego",
    "Poczta[1]": "miejscowosc_zglaszajacego",

    # Adres zgłaszającego – ostatnie zamieszkanie w PL → grupa "2" indeks [1]
    "Ulica2[1]": "ulica_zglaszajacego_ostatniego_zamieszkania",
    "Numerdomu2[1]": "nr_domu_zglaszajacego_ostatniego_zamieszkania",
    "Numerlokalu2[1]": "nr_lokalu_zglaszajacego_ostatniego_zamieszkania",
    "Kodpocztowy2[1]": "kod_pocztowy_zglaszajacego_ostatniego_zamieszkania",
    "Poczta2[1]": "miejscowosc_zglaszajacego_ostatniego_zamieszkania",

    # Informacje o wypadku
    "Datawyp[0]": "data_wypadku",
    "Godzina[0]": "godzina_wypadku",
    "Miejscewyp[0]": "miejsce_wypadku",
    "Godzina3A[0]": "planowana_godzina_rozpoczecia_pracy",
    "Godzina3B[0]": "planowana_godzina_zakonczenia_pracy",

    # Opisy/teksty
    "Tekst7[0]": "rodzaj_urazow",
    "Tekst8[0]": "szczegoly_okolicznosci",
    "Tekst6[0]": "organ_postepowania",
    "Tekst5[0]": "miejsce_udzielenia_pomocy",
    "Tekst4[0]": "opis_maszyn",
}


def _parse_date(val: str) -> date | None:
    if not val:
        return None
    s = val.strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%Y/%m/%d", "%d-%m-%Y", "%d%m%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _parse_time(val: str) -> time | None:
    if not val:
        return None
    s = val.strip()
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return None


def map_pdf_fields_to_document_data(fields: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a dict of PDF field values into a partial Document data dict.

    Args:
        fields: Mapping of PDF AcroForm field names to their string values.

    Returns:
        Dict[str, Any]: Keys matching the Document model field names. Empty strings
        are omitted. Date and time fields are parsed to date/time objects when possible.
    """
    out: Dict[str, Any] = {}

    for pdf_key, value in fields.items():
        if pdf_key not in PDF_TO_DOCUMENT_FIELD:
            continue
        model_field = PDF_TO_DOCUMENT_FIELD[pdf_key]
        if value is None:
            continue
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned == "":
                continue
        else:
            cleaned = str(value)

        # Decide parsing based on target field type name heuristics
        if model_field.startswith("data_") or model_field in {"data_urodzenia"}:
            parsed = _parse_date(cleaned)
            if parsed is not None:
                out[model_field] = parsed
            # if parsing fails, keep raw string to let DRF/Model validation decide
            else:
                out[model_field] = cleaned
        elif model_field.startswith("godzina_") or model_field.startswith("planowana_godzina_"):
            parsed_t = _parse_time(cleaned)
            if parsed_t is not None:
                out[model_field] = parsed_t
            else:
                out[model_field] = cleaned
        else:
            out[model_field] = cleaned

    return out


def extract_pdf_form_fields(pdf_path: Union[str, Path]) -> Dict[str, str]:
    """Read AcroForm text field values from a PDF file."""
    reader = PdfReader(str(pdf_path))
    # PyPDF2 returns names->values for text fields; if None, coerce to ""
    fields = reader.get_form_text_fields() or {}
    return {k: ("" if v is None else str(v)) for k, v in fields.items()}


def parse_pdf_to_document_data(pdf_path: Union[str, Path]) -> Dict[str, Any]:
    """Convenience helper: read a PDF and return a dict suitable for Document(**data).

    This extracts form fields via PyPDF2 and converts them to model field names,
    attempting to parse dates/times when possible.
    """
    fields = extract_pdf_form_fields(pdf_path)
    return map_pdf_fields_to_document_data(fields)
