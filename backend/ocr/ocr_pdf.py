"""
OCR utility for scanned PDF files (Polish language support).

Usage examples:
  python ocr_pdf.py /path/to/input.pdf --outdir ./backend/ocr_output

Requirements:
  - Tesseract OCR installed and `tesseract` available on PATH.
    For Polish language set up tessdata and install the 'pol' language pack.
  - poppler-utils installed (for `pdf2image` convert_from_path):
    e.g. on macOS: `brew install poppler tesseract` and `brew install tesseract-lang` for languages

This script converts PDF pages to images and runs Tesseract OCR to extract text.
It saves per-document and per-page text output into the specified output directory.
"""
import argparse
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
import logging

from pdf2image import convert_from_path
from PIL import Image
import pytesseract
from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def ocr_pdf(input_path: str, outdir: str = "./backend/ocr_output", lang: str = "pol"):
    input_path = Path(input_path)
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    base_name = f"{input_path.stem}_{timestamp}"
    doc_output_dir = outdir / base_name
    doc_output_dir.mkdir(parents=True, exist_ok=True)

    logging.info(f"Converting PDF to images: {input_path}")
    # convert_from_path will use poppler; allow tempfile directory for intermediate images
    with tempfile.TemporaryDirectory() as tmpdir:
        images = convert_from_path(str(input_path), output_folder=tmpdir, fmt="jpeg")

        all_text = []
        pages_meta = []

        logging.info(f"Running OCR on {len(images)} pages (lang={lang})")
        for i, img in enumerate(tqdm(images, desc="OCR pages"), start=1):
            text = pytesseract.image_to_string(img, lang=lang)
            page_file = doc_output_dir / f"page_{i:03}.txt"
            page_file.write_text(text, encoding="utf-8")
            pages_meta.append({"page": i, "text_file": str(page_file.name), "chars": len(text)})
            all_text.append(text)

        full_text = "\n\n".join(all_text)
        full_text_file = doc_output_dir / f"{base_name}.txt"
        full_text_file.write_text(full_text, encoding="utf-8")

        meta = {
            "source_pdf": str(input_path.name),
            "created_at": timestamp,
            "pages": len(images),
            "lang": lang,
            "full_text_file": str(full_text_file.name),
            "pages_meta": pages_meta,
        }
        meta_file = doc_output_dir / f"{base_name}.json"
        meta_file.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    logging.info(f"Saved OCR output to {doc_output_dir}")
    return doc_output_dir


def main():
    parser = argparse.ArgumentParser(description="OCR scanned PDF and save text (Polish support)")
    parser.add_argument("input", help="Path to input PDF file")
    parser.add_argument("--outdir", default="./backend/ocr_output", help="Directory to save OCR output")
    parser.add_argument("--lang", default="pol", help="Tesseract language (default: pol)")

    args = parser.parse_args()

    outdir = ocr_pdf(args.input, args.outdir, args.lang)
    print(f"OCR complete. Output directory: {outdir}")


if __name__ == "__main__":
    main()
