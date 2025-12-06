from PyPDF2 import PdfReader, PdfWriter
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
        self.reader = PdfReader(str(template_path))

        # Copy template pages to writer
        for page in self.reader.pages:
            self.writer.add_page(page)

        # Update form fields
        self.writer.update_page_form_field_values(
            self.writer.pages[0], field_data
        )

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
