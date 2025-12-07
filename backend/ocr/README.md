# PDF OCR (Polish)

This small tool extracts text from scanned PDF files using Tesseract OCR and saves results for later use.

Requirements
- Python dependencies: listed in `backend/requirements.txt` (install with `pip install -r backend/requirements.txt`).
- System dependencies:
  - Tesseract OCR (make sure `tesseract` is on PATH). Install on macOS with `brew install tesseract`.
  - Poppler (for `pdf2image`): `brew install poppler` on macOS.
  - To support Polish language, ensure the `pol` language data is installed for Tesseract. On macOS with Homebrew you can install additional languages or download tessdata.

Usage

Run the script directly:

```bash
python backend/ocr/ocr_pdf.py /path/to/scanned.pdf --outdir ./backend/ocr_output --lang pol
```

Example (macOS / zsh)

You can use the provided example runner `backend/ocr/run_example.sh`:

```bash
./backend/ocr/run_example.sh /path/to/scanned.pdf
```

This script will also attempt to install Python dependencies listed in `backend/requirements.txt`.

Outputs
- A folder is created under `./backend/ocr_output/` with a timestamped name derived from the PDF filename.
- Inside are:
  - `*.txt` per-page text files
  - `{basename}.txt` full concatenated text
  - `{basename}.json` metadata with page counts and file references

Notes and troubleshooting
- If `pdf2image` fails, ensure `poppler` is installed and available.
- If Tesseract returns garbage, try preprocessing images (deskew, increase DPI) or test with a known-good scanned page.
- For high accuracy in Polish, confirm the `pol` tessdata is installed and available to Tesseract.

Quick checklist before running

- Install system deps (macOS):

```bash
brew install poppler tesseract
```

- Ensure `pol` tessdata is installed (Homebrew or download tessdata and place in Tesseract's tessdata folder).
- Install Python deps:

```bash
python3 -m pip install -r backend/requirements.txt
```

Integration ideas
- Save the `{basename}.json` metadata and full text into your application's database for later search and processing.
- Expose a simple HTTP endpoint in the backend that accepts PDF uploads and runs the `ocr_pdf` function asynchronously.
