from PyPDF2 import PdfReader, PdfWriter
from PyPDF2.generic import NameObject, BooleanObject
from io import BytesIO
from pathlib import Path
from typing import Dict, Union


class PDFWriter:
    def __init__(self):
        self.reader = None
        self.writer = PdfWriter()

    def fill_template(self, template_path: Union[str, Path], field_data: Dict[str, str]) -> BytesIO:
        """
        Fill PDF template with provided field data

        Args:
            template_path: Path to PDF template file
            field_data: Dictionary with field names and values to fill

        Returns:
            BytesIO object containing filled PDF
        """
        # Reset writer per call to avoid accumulating pages between invocations
        self.writer = PdfWriter()
        self.reader = PdfReader(str(template_path))

        # Copy template pages to writer
        for page in self.reader.pages:
            self.writer.add_page(page)

        # Update form fields on ALL pages (some forms distribute fields across pages)
        for page in self.writer.pages:
            self.writer.update_page_form_field_values(page, field_data)

        # Hint viewers to regenerate appearances, improving visibility of filled values
        try:
            if "/AcroForm" in self.writer._root_object:
                acro_form = self.writer._root_object[NameObject("/AcroForm")]
                acro_form[NameObject("/NeedAppearances")] = BooleanObject(True)
        except Exception:
            # Best-effort; if setting appearance fails, continue with filled fields
            pass

        # Save to BytesIO
        output = BytesIO()
        self.writer.write(output)
        output.seek(0)

        return output

    @staticmethod
    def get_form_fields() -> Dict[str, str]:
        """Get dictionary of form fields from PDF template"""
        with open("tools/ewyp.pdf", "rb") as f:
            reader = PdfReader(f)
            return reader.get_form_text_fields()
