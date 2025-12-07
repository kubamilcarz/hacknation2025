#!/usr/bin/env bash
# Example run script for OCR tool (macOS / zsh)

set -euo pipefail

# Install python requirements (optional if already installed)
python3 -m pip install -r backend/requirements.txt

# Ensure poppler and tesseract are installed on macOS using Homebrew:
# brew install poppler tesseract

# Run OCR on a sample PDF (replace with your file)
INPUT_PDF="$1"
OUT_DIR="./backend/ocr_output"

if [ -z "$INPUT_PDF" ]; then
  echo "Usage: ./backend/ocr/run_example.sh /path/to/scanned.pdf"
  exit 1
fi

python3 backend/ocr/ocr_pdf.py "$INPUT_PDF" --outdir "$OUT_DIR" --lang pol

echo "Done. Check the output directory: $OUT_DIR"
