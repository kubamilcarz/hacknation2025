# ZANT – ZUS Accident Notification Tool

ZANT is an AI-assisted workflow that helps Polish entrepreneurs zgłosić wypadek przy pracy and equips ZUS staff with decision support tooling. The platform guides citizens through compliant accident submissions, analyses uploaded documentation with OCR and LLMs, and gives caseworkers concise recommendations plus ready-to-send artefacts.

---

## Table of Contents

- [ZANT – ZUS Accident Notification Tool](#zant--zus-accident-notification-tool)
  - [Table of Contents](#table-of-contents)
  - [Key Outcomes](#key-outcomes)
  - [Solution Overview](#solution-overview)
  - [System Architecture](#system-architecture)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
    - [Backend (Django)](#backend-django)
    - [Frontend (Next.js 16)](#frontend-nextjs-16)
  - [Using the Platform](#using-the-platform)
    - [Citizen wizard (`/dashboard/user`)](#citizen-wizard-dashboarduser)
    - [Caseworker dashboard (`/dashboard/employee`)](#caseworker-dashboard-dashboardemployee)
    - [Sample data \& demos](#sample-data--demos)
  - [REST API Surface](#rest-api-surface)
  - [AI, OCR and Document Automation](#ai-ocr-and-document-automation)
  - [Project Structure](#project-structure)
  - [Quality Gates](#quality-gates)
  - [Deployment Notes](#deployment-notes)
  - [Roadmap Ideas](#roadmap-ideas)

---

## Key Outcomes

- **Citizen assistant** – conversational wizard that validates ZUS accident forms, highlights missing data, and generates submission-ready PDFs.
- **Caseworker cockpit** – employee dashboard for triaging incidents, searching structured records, exporting reports, and producing anonymised dossiers.
- **Automation pipeline** – OCR and LLM services reconstruct accident context from scanned PDFs, then render recommendations and accident cards.

## Solution Overview

| Persona | What they get | Highlights |
| --- | --- | --- |
| Obywatel prowadzący JDG | Dyskretny kreator zgłoszenia wypadku | Kroki wizardu (tożsamość, zdarzenie, świadkowie, adresy, podsumowanie), podpowiedzi AI, walidacja kompletności, eksport formularza PDF |
| Pracownik ZUS | Jedno miejsce do oceny spraw | Lista wniosków z filtrami, podgląd szczegółów, rekomendacje AI, generowanie karty wypadku, pobieranie wersji anonimizowanej |
| System | Gotowe artefakty | Anonimizacja dokumentów, analiza OCR skanów, wypełnianie pól formularzy na podstawie historii, eksport CSV/Excel/PDF/JSON |

## System Architecture

```
┌────────────┐        ┌────────────────┐        ┌─────────────────────┐
│  Frontend  │ <----> │ Django Backend │ <----> │ OpenAI + Tesseract  │
│ Next.js 16 │  REST  │  REST + OCR    │  OCR   │  LLM + OCR runtime  │
└────────────┘        └────────────────┘        └─────────────────────┘
     │                         │                          │
     │ React contexts          │ Django models            │ PDF tooling (PyMuPDF)
     │ SWR-style services      │ REST endpoints           │ Tesseract (pol)
     └─> Citizen wizard        └─> CRUD + AI proxies      └─> PDF fill & anon
```

- **Frontend**: Next.js App Router, React 19, Tailwind 4 utility tokens, client-side contexts for incident reporting and AI feedback, dynamic exports using `html2canvas`/`jspdf`.
- **Backend**: Django REST Framework, SQLite for persistence, Tesseract-powered OCR, dynamic PDF generation/anonymisation, OpenAI GPT-5.1 chat workflows.
- **AI layer**: `ChatGPTClient` orchestrates prompts for citizen guidance, caseworker scoring, and templated replies; pluggable via `OPENAI_API_KEY`.

## Prerequisites

Install once on your workstation:

- **Python** 3.11+ (virtual env recommended)
- **Node.js** 18.18+ (Next.js 16 requirement) and npm 9+
- **Tesseract OCR** with Polish language data (`pol`) and optional `eng`
  - macOS: `brew install tesseract tesseract-lang`
  - Ubuntu/Debian: `sudo apt-get install tesseract-ocr tesseract-ocr-pol`
- **Poppler** (`brew install poppler` on macOS) for the standalone OCR scripts
- **OpenAI API key** with access to GPT-5.1 or compatible models

## Quick Start

### Backend (Django)

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cp backend/.env.template backend/.env  # create backend/.env if the template is missing
python backend/manage.py migrate
python backend/manage.py runserver 0.0.0.0:8000
```

Required keys in `backend/.env`:

- `OPENAI_API_KEY=sk-...`
- `DJANGO_SECRET_KEY=change-me`
- `TESSERACT_CMD=/path/to/tesseract` (only when the binary is not on PATH)

### Frontend (Next.js 16)

```bash
cd frontend
npm install
cp .env.example .env.local  # or create frontend/.env.local manually
npm run dev
```

Set at least:

- `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`
- `NEXT_PUBLIC_AI_FEEDBACK_MODE=api` (switch to `mock` for offline demos)

With both processes running, visit `http://localhost:3000` for the citizen flow and `/dashboard/employee` for the caseworker view.

## Using the Platform

### Citizen wizard (`/dashboard/user`)

1. Start a report and progress through identity, accident details, witnesses, address, and review steps.
2. AI feedback reveals missing facts in each free-text field (typing triggers hints after debounce).
3. On completion, download the filled ZUS notification PDF; optionally request an anonymised copy for sharing.

### Caseworker dashboard (`/dashboard/employee`)

- **Search & filters**: full-text search, status filters (`processing`, `completed`, `failed`), column sorting, pagination.
- **Document actions**: upload new PDFs for OCR+LLM analysis, download original/anonymised versions, export lists (CSV, Excel, JSON, PDF), open detail views.
- **AI recommendations**: review automatically generated scoring of statutory conditions, completeness scores, follow-up questions, and ready-to-send responses.
- **Accident card**: one-click generation of the official ZUS accident card (PDF) using data captured in the system.

### Sample data & demos

- Use `backend/ocr/create_sample_pdf.py` to craft mock accident descriptions for demos.
- The JSON payload in `backend/api/fixtures/documents.json` illustrates the fields required for form generation.
- `backend/ocr/run_example.sh /path/to/file.pdf` runs OCR locally and stores outputs under `backend/ocr_output/`.

## REST API Surface

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health/` | Simple heartbeat |
| `POST` | `/api/documents/` (`action=create`) | Create document from JSON payload |
| `POST` | `/api/documents/` (`action=list`) | Paginated listing (search, filter, sort) |
| `POST` | `/api/documents/` (`action=detail`) | Retrieve document by `id` |
| `POST` | `/api/documents/` (`action=generate-pdf`) | Fill and return official PDF |
| `POST` | `/api/documents/` (`action=generate-pdf-anonymized`) | Fill + redact PDF |
| `GET` | `/api/documents/<id>/anonymized/` | Download anonymised PDF for stored record |
| `POST` | `/api/user-recommendation/` | Citizen AI guidance for a form field |
| `POST` | `/api/zus-recommendation/` | Upload PDF → OCR → caseworker recommendation |
| `POST` | `/api/suggested-response/` | Draft polite reply for claimant |
| `POST` | `/api/accident-card/pdf/` | Build accident card from structured payload |

_All endpoints return JSON unless noted. PDF responses stream binary content with appropriate headers._

## AI, OCR and Document Automation

- **OCR**: `tools/ocr.py` wraps Tesseract; ensure the binary is installed and `pol` tessdata is present. Optional `TESSERACT_CMD` config supports custom paths.
- **LLM prompts**: `tools/chatgpt.py` centralises prompts for citizen assistance, completeness scoring, follow-up questions, and human-friendly responses.
- **PDF tooling**: `tools/pdf_writer.py` fills template PDFs; `tools/pdf_anonymizer.py` redacts personal data; `tools/accident_card_pdf.py` renders textual cards via PyMuPDF.
- **Mock vs live AI**: frontend defaults to a deterministic mock for faster demos; switch to live backend for real OpenAI calls.

## Project Structure

```
backend/
  api/               # Django app with models, serializers, views
  backend/           # Django project settings
  tools/             # PDF, OCR, AI helpers shared across views
  ocr/               # Standalone OCR CLI utilities
frontend/
  src/app/           # Next.js App Router routes (citizen & employee portals)
  src/components/    # UI building blocks and feature components
  src/context/       # React contexts (incident reporting, AI feedback)
  src/lib/           # DTOs, services, mappers, utilities
.readme-assets/      # Slides, branding, supporting materials (if any)
```

## Quality Gates

- **Lint frontend**: `npm run lint`
- **Type-check**: `tsc --noEmit`
- **Backend checks**: add Django tests under `backend/api/tests/` then run `python backend/manage.py test`
- **OCR health**: `python backend/ocr/ocr_pdf.py sample.pdf --lang pol`

Consider integrating GitHub Actions for automated linting and unit tests.

## Deployment Notes

- Replace SQLite with PostgreSQL for multi-user environments; update `DATABASE_URL` and install `psycopg`.
- Deploy Django behind Gunicorn/Uvicorn with reverse proxy (NGINX) and configure CORS for the production domains.
- Host Next.js on Vercel or any Node-capable platform; set `NEXT_PUBLIC_BACKEND_URL` to the deployed API.
- Store OpenAI secrets in a secure vault; restrict outbound traffic if running in ZUS internal network.
- Bundle Tesseract into Docker images or ensure availability on the target infrastructure (e.g., apt packages, brew).

## Roadmap Ideas

1. **Workflow state machine** – model case lifecycle (new, in analysis, awaiting docs, approved, rejected).
2. **Document ingestion queue** – async processing for large batches with Celery + Redis.
3. **Multilingual support** – add English/Ukrainian guidance for foreign entrepreneurs.
4. **Role-based access** – SSO integration for ZUS workers, JWT for citizens, audit logging.
5. **Analytics** – dashboards for bottleneck analysis, recurring risk factors, SLA tracking.
6. **Automated attachments** – extract attachments list via OCR and prompt detection.