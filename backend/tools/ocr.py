"""
OCR helpers using Tesseract.

Image OCR:
- `ocr_img(images, lang="pol")` → list of {name, text} for each image input.

PDF OCR (multi‑page scans):
- `ocr_pdf(pdf, lang="pol", dpi=300)` → dict with per‑page texts and combined text.

Requirements:
- Tesseract installed and available on PATH (and language data, e.g. pol/eng).
- Python packages: Pillow, pytesseract, PyMuPDF (fitz).
"""
from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from typing import Iterable, Any

from PIL import Image
import pytesseract
from pytesseract import TesseractNotFoundError
import fitz  #


def _open_image(obj: Any) -> tuple[Image.Image, str]:
    """Open various input types as a PIL Image and return (image, name).

    Supported types:
    - Django InMemoryUploadedFile / TemporaryUploadedFile (has .name and .read())
    - pathlib.Path or str path
    - bytes or file-like object with .read()
    - Already a PIL Image
    """
    if isinstance(obj, Image.Image):
        return obj, getattr(obj, "filename", "image")

    # Django UploadedFile or any object with .read()
    if hasattr(obj, "read") and callable(obj.read):
        name = getattr(obj, "name", "upload")
        data = obj.read()
        img = Image.open(BytesIO(data))
        return img, Path(str(name)).name

    # Path-like or string path
    if isinstance(obj, (str, Path)):
        p = Path(obj)
        img = Image.open(p)
        return img, p.name

    # raw bytes
    if isinstance(obj, (bytes, bytearray)):
        img = Image.open(BytesIO(obj))
        return img, "image"

    raise TypeError(f"Unsupported image input type: {type(obj)!r}")


def ocr_img(images: Iterable[Any], lang: str = "pol") -> list[dict]:
    """Run OCR on many images and return per-image texts.

    Args:
        images: Iterable of image inputs (see _open_image).
        lang: Tesseract language code, default 'pol'. For English use 'eng', or combine: 'pol+eng'.

    Returns: List of dicts: [{"name": <filename>, "text": <recognized_text>}]
    """
    # Ensure Tesseract is configured and available before processing
    ensure_tesseract_available(lang)

    results: list[dict] = []
    for obj in images:
        img, name = _open_image(obj)
        try:
            text = pytesseract.image_to_string(img, lang=lang)
        finally:
            try:
                img.close()
            except Exception:
                pass
        results.append({"name": name, "text": text})
    return results


def _read_pdf_bytes(obj: Any) -> tuple[bytes, str]:
    """Read a PDF input (UploadedFile/path/bytes/file-like) to bytes and name.

    Returns (data, name). Raises TypeError for unsupported input.
    """
    # Django UploadedFile or any object with .read()
    # Ensure we read from the beginning even if the stream was consumed earlier
    if hasattr(obj, "read") and callable(obj.read):
        name = getattr(obj, "name", "upload.pdf")
        try:
            if hasattr(obj, "seek") and callable(obj.seek):
                obj.seek(0)
        except Exception:
            # If seeking fails, proceed to read whatever is available
            pass
        data = obj.read()
        return data, Path(str(name)).name

    if isinstance(obj, (str, Path)):
        p = Path(obj)
        return p.read_bytes(), p.name

    if isinstance(obj, (bytes, bytearray)):
        return bytes(obj), "upload.pdf"

    raise TypeError(f"Unsupported PDF input type: {type(obj)!r}")


def _pixmap_to_pil(pix: fitz.Pixmap) -> Image.Image:
    """Convert PyMuPDF Pixmap to a PIL Image."""
    if pix.samples is None:
        # Should not happen for rendered pages
        raise ValueError("Pixmap has no samples")
    mode = "RGB"
    if pix.alpha:
        mode = "RGBA"
    img = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
    return img


def ocr_pdf(pdf: Any, lang: str = "pol", dpi: int = 300) -> str:
    """OCR a multi‑page scanned PDF and return recognized text.

    Args:
        pdf: PDF input (Django UploadedFile, file path, bytes, or file‑like).
        lang: Tesseract language code, e.g. 'pol', 'eng', or 'pol+eng'.
        dpi: Rendering DPI for rasterization; 300 is a good default for OCR.

    Returns:
        {
          "name": <filename>,
          "pages": [
             {"index": 0, "text": "..."},
             {"index": 1, "text": "..."},
             ...
          ],
          "text": "<combined text>"
        }
    """
    # Ensure Tesseract is configured and available before processing
    ensure_tesseract_available(lang)

    data, name = _read_pdf_bytes(pdf)

    # Open via PyMuPDF from memory to handle UploadedFile/bytes
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        # Matrix for desired DPI: zoom = dpi / 72
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pages: list[dict] = []
        all_text_parts: list[str] = []

        page_count = getattr(doc, "page_count", None)
        if page_count is None:
            # Fallback for very old PyMuPDF, though modern versions have page_count
            page_count = len(doc)

        if page_count == 0:
            # Explicit, helpful error instead of silently returning nothing
            raise ValueError("PDF has no pages (page_count == 0)")

        for i in range(page_count):
            page = doc.load_page(i)
            # Render page to pixmap (RGB)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            try:
                img = _pixmap_to_pil(pix)
                try:
                    text = pytesseract.image_to_string(img, lang=lang)
                finally:
                    try:
                        img.close()
                    except Exception:
                        pass
            finally:
                # PyMuPDF Pixmap auto-frees when out of scope, but be explicit
                del pix

            pages.append({"index": i, "text": text})
            all_text_parts.append(text)

        combined = "\n\n".join(all_text_parts)
        return combined
    finally:
        doc.close()


def _configure_tesseract_from_env() -> None:
    """Configure pytesseract to use a custom tesseract binary if provided.

    Honors env var TESSERACT_CMD, e.g. "/usr/bin/tesseract" or "C:\\Program Files\\Tesseract-OCR\\tesseract.exe".
    """
    cmd = os.getenv("TESSERACT_CMD")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd


def ensure_tesseract_available(lang: str | None = None) -> None:
    """Validate that the Tesseract binary (and optionally language data) is available.

    - Reads env var TESSERACT_CMD and configures pytesseract if set.
    - Calls pytesseract to get version to ensure binary is callable.
    - If `lang` is provided, verifies that each requested language has traineddata installed.

    Raises:
        TesseractNotFoundError: if the tesseract binary is not found or not executable.
        ValueError: if requested language data is missing.
    """
    _configure_tesseract_from_env()

    # Ensure the binary is callable
    try:
        _ = pytesseract.get_tesseract_version()
    except TesseractNotFoundError:
        raise

    # Optionally validate language availability
    if lang:
        try:
            available = set(pytesseract.get_languages(config=""))
        except Exception:
            # If listing languages fails, skip language validation
            return

        requested = {part.strip() for part in str(lang).split("+") if part.strip()}
        missing = [l for l in requested if l not in available]
        if missing:
            raise ValueError(
                "Missing Tesseract language data: "
                + ", ".join(missing)
                + ". Install the corresponding *.traineddata files (e.g., via your package manager or https://tesseract-ocr.github.io/tessdoc/Data-Files)."
            )
