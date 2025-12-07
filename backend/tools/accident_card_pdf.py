from collections.abc import Mapping
from io import BytesIO
from typing import Any, Optional

import fitz

ACCIDENT_CARD_TEMPLATE = """DANE IDENTYFIKACYJNE PŁATNIKA SKŁADEK
Imię i nazwisko lub nazwa: {payer_name}
Adres siedziby: {payer_address}
NIP: {payer_nip}
REGON: {payer_regon}
PESEL: {payer_pesel}
Dokument tożsamości (dowód osobisty lub paszport): {payer_identity_document}
Rodzaj dokumentu: {payer_document_type}
Seria i numer: {payer_document_series}

DANE IDENTYFIKACYJNE POSZKODOWANEGO
Imię i nazwisko: {victim_name}
PESEL: {victim_pesel}
Dokument tożsamości (dowód osobisty lub paszport): {victim_identity_document}
Rodzaj dokumentu: {victim_document_type}
Seria i numer: {victim_document_series}
Data i miejsce urodzenia: {victim_birth_details}
Adres zamieszkania: {victim_address}

Tytuł ubezpieczenia wypadkowego: {insurance_title}
(wymienić numer pozycji i pełny tytuł ubezpieczenia zgodnie z art. 3 ust. 3 ustawy z 30.10.2002 r. o ubezpieczeniu społecznym z tytułu wypadków przy pracy i chorób zawodowych, Dz.U. 2019 poz. 1205 z późn. zm.)
{insurance_title_additional}

Rodzaj wykonywanej działalności: {activity_type}

INFORMACJE O WYPADKU
Data zgłoszenia oraz imię i nazwisko osoby zgłaszającej wypadek: {report_details}
Informacje dotyczące okoliczności, przyczyn, czasu i miejsca wypadku:
{accident_info}

Data wypadku: {accident_date}
Skutek wypadku:
{accident_effect}

ŚWIADKOWIE
a) Imię i nazwisko: {witness_name}
Adres zamieszkania: {witness_address}

USTALENIA DOTYCZĄCE WYPADKU
Wypadek jest / nie jest wypadkiem przy pracy określonym w art. 3 ustawy z dnia 30 października 2002 r. o ubezpieczeniu społecznym z tytułu wypadków przy pracy i chorób zawodowych
{work_accident_decision}
(uzasadnić w przypadku nieuznania)
{work_accident_justification}

Stwierdzono, że wyłączną przyczyną wypadku było udowodnione naruszenie przez poszkodowanego przepisów bhp:
{bhp_violation_decision}
(podać dowody w przypadku stwierdzenia)
{bhp_violation_evidence}

Stwierdzono, że poszkodowany, będąc w stanie nietrzeźwości lub pod wpływem substancji odurzających, przyczynił się do wypadku:
{intoxication_decision}
(podać dowody, przy odmowie badania opisać ten fakt)
{intoxication_evidence}

POZOSTAŁE INFORMACJE
Poszkodowanego (lub członka rodziny) zapoznano z treścią karty oraz pouczono o prawie zgłaszania uwag i zastrzeżeń.
Imię i nazwisko poszkodowanego / członka rodziny: {acknowledged_person}
Kartę sporządzono dnia: {card_created_date}
Podpis sporządzającego: {card_created_signature}

ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH
a) Nazwa podmiotu zobowiązanego do sporządzenia karty: {zus_entity_name}
b) Imię i nazwisko osoby sporządzającej: {zus_officer_name}
Podpis: {zus_officer_signature}

Przeszkody lub trudności uniemożliwiające sporządzenie karty w terminie 14 dni
{obstacles}

Kartę odebrano w dniu {card_received_date}

Załączniki
{attachments}
"""

PLACEHOLDER_KEYS = (
    "payer_name",
    "payer_address",
    "payer_nip",
    "payer_regon",
    "payer_pesel",
    "payer_identity_document",
    "payer_document_type",
    "payer_document_series",
    "victim_name",
    "victim_pesel",
    "victim_identity_document",
    "victim_document_type",
    "victim_document_series",
    "victim_birth_details",
    "victim_address",
    "insurance_title",
    "insurance_title_additional",
    "activity_type",
    "report_details",
    "accident_info",
    "accident_date",
    "accident_effect",
    "witness_name",
    "witness_address",
    "work_accident_decision",
    "work_accident_justification",
    "bhp_violation_decision",
    "bhp_violation_evidence",
    "intoxication_decision",
    "intoxication_evidence",
    "acknowledged_person",
    "card_created_date",
    "card_created_signature",
    "zus_entity_name",
    "zus_officer_name",
    "zus_officer_signature",
    "obstacles",
    "card_received_date",
    "attachments",
)

DEFAULT_VALUES = {key: "-" for key in PLACEHOLDER_KEYS}
DEFAULT_VALUES.update(
    {
        "activity_type": (
            "wykonywanie zwykłych czynności związanych z prowadzeniem działalności "
            "pozarolniczej w rozumieniu przepisów o systemie ubezpieczeń społecznych."
        ),
        "insurance_title_additional": "",
    }
)


def _format_value(value: Any) -> str:
    if value is None:
        return "-"

    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else "-"

    if isinstance(value, (list, tuple, set)):
        formatted_items = [item for item in (_format_value(v) for v in value) if item != "-"]
        if not formatted_items:
            return "-"
        return "\n".join(f"- {item}" for item in formatted_items)

    if isinstance(value, Mapping):
        lines = []
        for key, mapped_value in value.items():
            formatted = _format_value(mapped_value)
            if formatted == "-":
                continue
            lines.append(f"{key}: {formatted}")
        if not lines:
            return "-"
        return "\n".join(lines)

    return str(value)


def _prepare_values(data: Optional[Mapping[str, Any]]) -> dict[str, str]:
    values = {key: DEFAULT_VALUES.get(key, "-") for key in PLACEHOLDER_KEYS}
    if not data:
        return values

    for key in PLACEHOLDER_KEYS:
        incoming_value = data.get(key) if isinstance(data, Mapping) else None
        if incoming_value is None:
            continue
        formatted = _format_value(incoming_value)
        values[key] = formatted
    return values


def render_accident_card_pdf(data: Optional[Mapping[str, Any]]) -> BytesIO:
    """Render the accident card PDF using the predefined textual template."""
    prepared_values = _prepare_values(data)
    card_text = ACCIDENT_CARD_TEMPLATE.format(**prepared_values)

    document = fitz.open()
    page = document.new_page()
    text_rect = fitz.Rect(40, 40, page.rect.width - 40, page.rect.height - 40)

    remaining = page.insert_textbox(
        text_rect,
        card_text,
        fontsize=11,
        fontname="helv",
        align=0,
    )

    while remaining > 0:
        rendered_length = len(card_text) - remaining
        card_text = card_text[rendered_length:]
        page = document.new_page()
        text_rect = fitz.Rect(40, 40, page.rect.width - 40, page.rect.height - 40)
        remaining = page.insert_textbox(
            text_rect,
            card_text,
            fontsize=11,
            fontname="helv",
            align=0,
        )
        if remaining == len(card_text):
            document.close()
            raise ValueError("Unable to render accident card PDF content on a new page.")

    output = BytesIO()
    document.save(stream=output, clean=True)
    document.close()
    output.seek(0)
    return output
