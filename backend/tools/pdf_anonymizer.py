from __future__ import annotations

from io import BytesIO
from typing import Iterable, Sequence

import fitz  # type: ignore

from tools.pdf_mapper import PDF_TO_DOCUMENT_FIELD


# Fields from the Document model that should be masked in anonymized PDFs.
SENSITIVE_MODEL_FIELDS = {
    "pesel",
    "nr_dowodu",
    "imie",
    "nazwisko",
    "data_urodzenia",
    "miejsce_urodzenia",
    "numer_telefonu",
    "ulica",
    "nr_domu",
    "nr_lokalu",
    "miejscowosc",
    "kod_pocztowy",
    "nazwa_panstwa",
    "ulica_ostatniego_zamieszkania",
    "nr_domu_ostatniego_zamieszkania",
    "nr_lokalu_ostatniego_zamieszkania",
    "miejscowosc_ostatniego_zamieszkania",
    "kod_pocztowy_ostatniego_zamieszkania",
    "ulica_korespondencji",
    "nr_domu_korespondencji",
    "nr_lokalu_korespondencji",
    "miejscowosc_korespondencji",
    "kod_pocztowy_korespondencji",
    "nazwa_panstwa_korespondencji",
    "ulica_dzialalnosci",
    "nr_domu_dzialalnosci",
    "nr_lokalu_dzialalnosci",
    "miejscowosc_dzialalnosci",
    "kod_pocztowy_dzialalnosci",
    "nr_telefonu_dzialalnosci",
    "imie_zglaszajacego",
    "nazwisko_zglaszajacego",
    "pesel_zglaszajacego",
    "nr_dowodu_zglaszajacego",
    "data_urodzenia_zglaszajacego",
    "nr_telefonu_zglaszajacego",
    "ulica_zglaszajacego",
    "nr_domu_zglaszajacego",
    "nr_lokalu_zglaszajacego",
    "miejscowosc_zglaszajacego",
    "kod_pocztowy_zglaszajacego",
    "ulica_zglaszajacego_ostatniego_zamieszkania",
    "nr_domu_zglaszajacego_ostatniego_zamieszkania",
    "nr_lokalu_zglaszajacego_ostatniego_zamieszkania",
    "miejscowosc_zglaszajacego_ostatniego_zamieszkania",
    "kod_pocztowy_zglaszajacego_ostatniego_zamieszkania",
    "typ_korespondencji",
    "typ_korespondencji_zglaszajacego",
}


DEFAULT_REDACTED_FIELDS = {
    pdf_field for pdf_field, model_field in PDF_TO_DOCUMENT_FIELD.items() if model_field in SENSITIVE_MODEL_FIELDS
}
DEFAULT_REDACTED_FIELDS.update({"Imię2[0]", "Nazwisko2[0]"})


class PDFAnonymizer:
    """Utility that covers selected AcroForm fields with opaque rectangles."""

    def __init__(self, redacted_fields: Iterable[str] | None = None, padding: float = 1.5):
        self.redacted_fields = {name.strip() for name in (redacted_fields or DEFAULT_REDACTED_FIELDS)}
        self.padding = max(0.0, padding)

    def redact(self, pdf_input: BytesIO | bytes | bytearray | memoryview, fields: Sequence[str] | None = None) -> BytesIO:
        """Return a PDF copy where selected fields are hidden with opaque boxes."""
        data = self._ensure_bytes(pdf_input)
        doc = fitz.open(stream=data, filetype="pdf")
        target_fields = {name.strip() for name in (fields or self.redacted_fields)}

        try:
            for page in doc:
                widgets = page.widgets() or []
                for widget in widgets:
                    field_name = (widget.field_name or "").strip()
                    if not field_name or field_name not in target_fields:
                        continue

                    rect = widget.rect
                    if rect is None:
                        continue

                    expanded = self._expand_rect(rect)
                    self._cover_region(page, expanded)
                    self._sanitize_widget(page, widget)

            output = BytesIO()
            doc.save(output, garbage=4, deflate=True)
            output.seek(0)
            return output
        finally:
            doc.close()

    def _expand_rect(self, rect: fitz.Rect) -> fitz.Rect:
        padding = self.padding
        return fitz.Rect(
            rect.x0 - padding,
            rect.y0 - padding,
            rect.x1 + padding,
            rect.y1 + padding,
        )

    @staticmethod
    def _cover_region(page: fitz.Page, rect: fitz.Rect) -> None:
        shape = page.new_shape()
        shape.draw_rect(rect)
        shape.finish(color=(0, 0, 0), fill=(0, 0, 0))
        shape.commit()

    @staticmethod
    def _sanitize_widget(page: fitz.Page, widget: fitz.Widget) -> None:
        try:
            widget.field_value = ""
            widget.update()
        except Exception:
            pass

        remover = getattr(page, "delete_widget", None)
        if callable(remover):
            try:
                remover(widget)
            except Exception:
                return
            return

        remover = getattr(page, "delete_annot", None)
        if callable(remover):
            try:
                remover(widget)
            except Exception:
                return
            return

        hider = getattr(widget, "set_flags", None)
        if callable(hider):
            hidden_flags = 0
            for flag_name in ("ANNOTFLAG_INVISIBLE", "ANNOTFLAG_HIDDEN", "ANNOTFLAG_NOVIEW"):
                hidden_flags |= getattr(fitz, flag_name, 0)
            if hidden_flags:
                try:
                    hider(hidden_flags)
                    widget.update()
                except Exception:
                    return

    @staticmethod
    def _ensure_bytes(pdf_input: BytesIO | bytes | bytearray | memoryview) -> bytes:
        if isinstance(pdf_input, BytesIO):
            return pdf_input.getvalue()
        if isinstance(pdf_input, memoryview):
            return pdf_input.tobytes()
        if isinstance(pdf_input, (bytes, bytearray)):
            return bytes(pdf_input)
        raise TypeError("Unsupported PDF input type")
