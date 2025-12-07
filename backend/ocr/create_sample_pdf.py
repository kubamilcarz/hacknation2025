"""
Create a sample image-based PDF that simulates a scanned document.

This script writes a one-page PDF with Polish text using Pillow.
Run it and then point the OCR script at the generated PDF.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).parent
PDF_PATH = OUT / "sample_scanned.pdf"


def create_sample_pdf(path: Path = PDF_PATH):
    # A4 at 200 DPI approximation
    width, height = 1654, 2339
    bg_color = (255, 255, 255)

    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Try to load a truetype font; fallback to default
    try:
        font = ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", 28)
    except Exception:
        try:
            font = ImageFont.truetype("/Library/Fonts/Arial.ttf", 28)
        except Exception:
            font = ImageFont.load_default()

    text = (
        "Przykładowy dokument zgłoszeniowy.\n"
        "To jest testowy skan zawierający polskie znaki: ąćęłńóśźż.\n\n"
        "Opis zdarzenia:\n"
        "W dniu 2025-12-06 pracownik wykonywał prace remontowe przy maszynie."
        " Doszło do urazu ręki podczas demontażu osłony."
    )

    margin = 60
    draw.multiline_text((margin, margin), text, fill=(0, 0, 0), font=font, spacing=6)

    # Save as PDF (image-based PDF)
    img.save(path, "PDF", resolution=200)
    print(f"Sample scanned PDF created at: {path}")
    return path


if __name__ == "__main__":
    create_sample_pdf()
