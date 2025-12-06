import os
from PyPDF2 import PdfReader


class PDFReader:
    @staticmethod
    def extract_text(file_path: str) -> str:
        """
        Extract text from a PDF file.

        Args:
            file_path (str): Path to the PDF file

        Returns:
            str: Extracted text from the PDF

        Raises:
            FileNotFoundError: If the PDF file is not found
            Exception: For other PDF processing errors
        """
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"PDF file not found at: {file_path}")

            reader = PdfReader(file_path)
            text = ""

            for page in reader.pages:
                text += page.extract_text()

            return text

        except FileNotFoundError as e:
            raise e
        except Exception as e:
            raise Exception(f"Error processing PDF file: {str(e)}")
