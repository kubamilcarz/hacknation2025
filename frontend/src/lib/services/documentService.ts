import type { CreateDocumentDto, DocumentDetailDto, DocumentListResponseDto } from "@/lib/dtos/documentDtos";
import { mapDocumentDetailDtoToDocument, mapDocumentListItemDtoToDocument, mapPartialDocumentToCreateDto } from "@/lib/mappers/documentMapper";
import type { Document } from "@/types/document";
import type { jsPDF } from "jspdf";

export type DocumentExportFormat = "csv" | "excel" | "json" | "pdf";

const EXPORT_FILE_PREFIX = "dokumenty-wypadkowe";
const DOCUMENTS_ENDPOINT = "/api/documents/";
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type ExportColumn = { label: string; accessor: (document: Document) => string };

const EXPORT_COLUMNS: ExportColumn[] = [
  { label: "ID", accessor: (document) => String(document.id ?? "-") },
  { label: "Imię", accessor: (document) => document.imie },
  { label: "Nazwisko", accessor: (document) => document.nazwisko },
  { label: "PESEL", accessor: (document) => document.pesel },
  { label: "Data wypadku", accessor: (document) => document.data_wypadku },
  { label: "Godzina wypadku", accessor: (document) => document.godzina_wypadku },
  { label: "Miejsce wypadku", accessor: (document) => document.miejsce_wypadku },
  { label: "Rodzaj urazów", accessor: (document) => document.rodzaj_urazow },
  { label: "Czy udzielono pomocy", accessor: (document) => (document.czy_udzielona_pomoc ? "Tak" : "Nie") },
];

const PDF_FONT_NAME = "Inter";
const PDF_FONT_BASE_PATH = "/fonts";

type PdfFontVariant = { file: string; style: "normal" | "bold" };

const PDF_FONT_VARIANTS: PdfFontVariant[] = [
  { file: "Inter-Regular.ttf", style: "normal" },
  { file: "Inter-Bold.ttf", style: "bold" },
];

const PDF_TABLE_COLUMNS: Array<ExportColumn & { lengthHint?: number }> = [
  { label: "ID", accessor: (document) => String(document.id ?? "Brak danych"), lengthHint: 6 },
  { label: "Data wypadku", accessor: (document) => formatPdfIncidentDate(document), lengthHint: 18 },
  {
    label: "Poszkodowany",
    accessor: (document) => normalizeCellValue(`${document.imie} ${document.nazwisko}`.trim()) || "Brak danych",
    lengthHint: 20,
  },
  { label: "PESEL", accessor: (document) => document.pesel || "Brak danych", lengthHint: 14 },
  { label: "Miejsce wypadku", accessor: (document) => document.miejsce_wypadku || "Brak danych", lengthHint: 28 },
  { label: "Rodzaj urazu", accessor: (document) => document.rodzaj_urazow || "Brak danych", lengthHint: 28 },
];

type AutoTableModule = typeof import("jspdf-autotable");

function formatPdfIncidentDate(document: Document) {
  if (!document.data_wypadku && !document.godzina_wypadku) {
    return "Brak danych";
  }

  const date = document.data_wypadku ?? "";
  const time = (document.godzina_wypadku ?? "").slice(0, 5);
  return time ? `${date} ${time}`.trim() : date;
}

function normalizeCellValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

let pdfFontRegistrationPromise: Promise<Record<string, string>> | null = null;

async function ensurePdfFont(doc: jsPDF) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const fontList = typeof doc.getFontList === "function" ? doc.getFontList() : null;
    const registeredStyles = fontList?.[PDF_FONT_NAME];
    const hasNormal = Array.isArray(registeredStyles) && registeredStyles.includes("normal");
    const hasBold = Array.isArray(registeredStyles) && registeredStyles.includes("bold");
    if (hasNormal && hasBold) {
      doc.setFont(PDF_FONT_NAME, "normal");
      return;
    }

    const fontData = await loadPdfFonts();
    let fontRegistered = false;

    for (const variant of PDF_FONT_VARIANTS) {
      if ((variant.style === "normal" && hasNormal) || (variant.style === "bold" && hasBold)) {
        continue;
      }

      const fontBase64 = fontData[variant.file];
      if (!fontBase64) {
        continue;
      }

      try {
        doc.addFileToVFS(variant.file, fontBase64);
        const fontWeight = variant.style === "bold" ? "bold" : "normal";
        doc.addFont(variant.file, PDF_FONT_NAME, fontWeight);
        fontRegistered = true;
      } catch (error) {
        console.warn(`Failed to register font ${variant.file}:`, error);
      }
    }

    if (fontRegistered || hasNormal) {
      doc.setFont(PDF_FONT_NAME, "normal");
    } else {
      doc.setFont("helvetica", "normal");
    }
  } catch (error) {
    console.error("Error ensuring PDF font:", error);
    doc.setFont("helvetica", "normal");
  }
}

async function loadPdfFonts(): Promise<Record<string, string>> {
  if (!pdfFontRegistrationPromise) {
    pdfFontRegistrationPromise = (async () => {
      const entries = await Promise.all(
        PDF_FONT_VARIANTS.map(async (variant) => {
          const response = await fetch(`${PDF_FONT_BASE_PATH}/${variant.file}`);
          if (!response.ok) {
            throw new Error(`Font download failed: ${variant.file}`);
          }

          const buffer = await response.arrayBuffer();
          return [variant.file, arrayBufferToBase64(buffer)] as const;
        })
      );

      return Object.fromEntries(entries);
    })().catch((error) => {
      console.error("Nie udało się pobrać czcionek PDF", error);
      pdfFontRegistrationPromise = null;
      return {} as Record<string, string>;
    });
  }

  return pdfFontRegistrationPromise;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export type DocumentListSortField =
  | "id"
  | "imie"
  | "nazwisko"
  | "pesel"
  | "data_wypadku"
  | "miejsce_wypadku";

export interface DocumentListOptions {
  page?: number;
  pageSize?: number;
  search?: string | null;
  sort?: DocumentListSortField | null;
  direction?: "asc" | "desc" | null;
  helpProvided?: boolean | null;
  machineInvolved?: boolean | null;
}

export interface DocumentListResponse {
  items: Document[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export type CreateDocumentInput = Partial<Document>;

export interface DocumentService {
  list(options?: DocumentListOptions): Promise<DocumentListResponse>;
  getById(id: number): Promise<Document | null>;
  create(payload: CreateDocumentInput): Promise<Document>;
  downloadAttachment(id: number, format: "docx" | "pdf"): Promise<void>;
  setExportFormat(format: DocumentExportFormat): void;
}

interface DocumentApi {
  list(options?: DocumentListOptions): Promise<DocumentListResponseDto>;
  getById(id: number): Promise<DocumentDetailDto | null>;
  create(payload: CreateDocumentDto): Promise<DocumentDetailDto>;
  downloadAttachment(id: number, format: "docx" | "pdf"): Promise<void>;
}

class DefaultDocumentService implements DocumentService {
  private pendingExportFormat: DocumentExportFormat | null = null;

  constructor(private readonly api: DocumentApi) {}

  setExportFormat(format: DocumentExportFormat) {
    this.pendingExportFormat = format;
  }

  async list(options?: DocumentListOptions): Promise<DocumentListResponse> {
    const responseDto = await this.api.list(options);
    const documents = responseDto.items.map(mapDocumentListItemDtoToDocument);

    const exportFormat = this.consumePendingExportFormat();
    if (exportFormat) {
      this.handleExport(exportFormat, documents);
    }

    return {
      items: exportFormat ? [] : documents,
      totalCount: responseDto.totalCount,
      totalPages: responseDto.totalPages,
      page: responseDto.page,
      pageSize: responseDto.pageSize,
    } satisfies DocumentListResponse;
  }

  async getById(id: number): Promise<Document | null> {
    const dto = await this.api.getById(id);
    return dto ? mapDocumentDetailDtoToDocument(dto) : null;
  }

  async create(payload: CreateDocumentInput): Promise<Document> {
    const dtoPayload = mapPartialDocumentToCreateDto(payload);
    const createdDto = await this.api.create(dtoPayload);
    return mapDocumentDetailDtoToDocument(createdDto);
  }

  async downloadAttachment(id: number, format: "docx" | "pdf") {
    await this.api.downloadAttachment(id, format);
  }

  private consumePendingExportFormat() {
    const format = this.pendingExportFormat;
    this.pendingExportFormat = null;
    return format;
  }

  private handleExport(format: DocumentExportFormat, documents: Document[]) {
    switch (format) {
      case "csv":
        downloadCsv(documents);
        break;
      case "excel":
        downloadExcel(documents);
        break;
      case "json":
        downloadJson(documents);
        break;
      case "pdf":
        downloadPdf(documents);
        break;
      default:
        console.warn("Nieobsługiwany format eksportu dokumentów:", format);
        break;
    }
  }
}

type HttpDocumentApiOptions = {
  baseUrl?: string;
};

class HttpDocumentApi implements DocumentApi {
  private readonly baseUrl: string;
  private readonly documentsUrl: string;

  constructor(options: HttpDocumentApiOptions = {}) {
    const normalizedBase = (options.baseUrl ?? DEFAULT_BACKEND_URL).trim();
    this.baseUrl = normalizedBase.length > 0 ? normalizedBase : DEFAULT_BACKEND_URL;
    this.documentsUrl = buildEndpoint(this.baseUrl, DOCUMENTS_ENDPOINT);
  }

  async list(options?: DocumentListOptions): Promise<DocumentListResponseDto> {
    const params = new URLSearchParams();
    params.set("action", "list");
    if (options?.search) {
      params.set("search", options.search);
    }
    if (typeof options?.page === "number" && Number.isFinite(options.page)) {
      params.set("page", String(Math.max(1, Math.floor(options.page))));
    }
    if (typeof options?.pageSize === "number" && Number.isFinite(options.pageSize)) {
      params.set("pageSize", String(Math.max(1, Math.floor(options.pageSize))));
    }
    if (options?.sort) {
      params.set("sort", options.sort);
    }
    if (options?.direction) {
      params.set("direction", options.direction);
    }
    if (typeof options?.helpProvided === "boolean") {
      params.set("helpProvided", options.helpProvided ? "true" : "false");
    }
    if (typeof options?.machineInvolved === "boolean") {
      params.set("machineInvolved", options.machineInvolved ? "true" : "false");
    }

    try {
      const response = await fetch(`${this.documentsUrl}?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn("API list documents not available yet (status %s). Returning empty list.", response.status);
        return createEmptyListResponse(options);
      }

      const payload = (await response.json().catch(() => null)) as Partial<DocumentListResponseDto> | null;
      if (!payload || !Array.isArray(payload.items)) {
        return createEmptyListResponse(options);
      }

      return {
        items: payload.items ?? [],
        totalCount: payload.totalCount ?? payload.items.length ?? 0,
        totalPages: payload.totalPages ?? 1,
        page: payload.page ?? options?.page ?? 1,
        pageSize: payload.pageSize ?? options?.pageSize ?? 10,
      } satisfies DocumentListResponseDto;
    } catch (error) {
      console.error("Nie udało się pobrać listy zgłoszeń z backendu", error);
      return createEmptyListResponse(options);
    }
  }

  async getById(id: number): Promise<DocumentDetailDto | null> {
    const params = new URLSearchParams();
    params.set("action", "detail");
    params.set("id", String(id));

    try {
      const response = await fetch(`${this.documentsUrl}?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json().catch(() => null)) as DocumentDetailDto | null;
      return payload ?? null;
    } catch (error) {
      console.error("Nie udało się pobrać szczegółów zgłoszenia", error);
      return null;
    }
  }

  async create(payload: CreateDocumentDto): Promise<DocumentDetailDto> {
    const { witnesses, ...documentPayload } = payload;
    if (Array.isArray(witnesses) && witnesses.length > 0) {
      console.warn("Backend create endpoint nie obsługuje jeszcze zapisu świadków. Dane zostaną pominięte.");
    }
    let response: Response;

    try {
      response = await fetch(this.documentsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "create", ...documentPayload }),
      });
    } catch (error) {
      console.error("Nie udało się wysłać zgłoszenia do backendu", error);
      throw new Error("Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.");
    }

    if (!response.ok) {
      const details = await safeReadError(response);
      if (details) {
        throw new Error(`Nie udało się zapisać zgłoszenia. ${details}`);
      }
      throw new Error(`Nie udało się zapisać zgłoszenia (kod ${response.status}).`);
    }

    const json = (await response.json().catch(() => null)) as DocumentDetailDto | null;
    if (!json || typeof json !== "object") {
      throw new Error("Serwer zwrócił nieoczekiwaną odpowiedź podczas zapisywania zgłoszenia.");
    }

    return json;
  }

  async downloadAttachment(id: number, format: "docx" | "pdf"): Promise<void> {
    void id;
    void format;
    throw new Error("Pobieranie dokumentów nie jest jeszcze dostępne w trybie API.");
  }
}
function buildEndpoint(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!trimmedBase) {
    return normalizedPath;
  }

  return `${trimmedBase}${normalizedPath}`;
}

function createEmptyListResponse(options?: DocumentListOptions): DocumentListResponseDto {
  const pageSizeCandidate = options?.pageSize;
  const pageSize = typeof pageSizeCandidate === "number" && pageSizeCandidate > 0 ? pageSizeCandidate : 10;
  return {
    items: [],
    totalCount: 0,
    totalPages: 1,
    page: 1,
    pageSize,
  } satisfies DocumentListResponseDto;
}

async function safeReadError(response: Response): Promise<string | null> {
  try {
    const text = (await response.text()).trim();
    if (!text) {
      return null;
    }

    try {
      const parsed = JSON.parse(text) as unknown;
      if (typeof parsed === "string") {
        return parsed;
      }

      if (Array.isArray(parsed)) {
        const flattened = parsed
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter((entry) => entry.length > 0);
        return flattened.length > 0 ? flattened.join(" ") : text;
      }

      if (parsed && typeof parsed === "object") {
        const detail = (parsed as { detail?: unknown }).detail;
        if (typeof detail === "string" && detail.trim().length > 0) {
          return detail.trim();
        }

        const values = Object.values(parsed as Record<string, unknown>)
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value.length > 0);
        if (values.length > 0) {
          return values.join(" ");
        }
      }
    } catch (error) {
      void error; // Ignorujemy błędy parsowania JSON i używamy surowego tekstu.
    }

    return text;
  } catch (error) {
    console.error("Nie udało się odczytać treści błędu z odpowiedzi backendu", error);
    return null;
  }
}

function downloadCsv(items: Document[]) {
  const header = EXPORT_COLUMNS.map((column) => column.label);
  const rows = items.map((document) =>
    EXPORT_COLUMNS.map((column) => {
      const rawValue = column.accessor(document);
      const normalized = rawValue == null ? "" : String(rawValue);
      return `"${normalized.replace(/"/g, '""')}"`;
    })
  );

  const csv = [header.map((label) => `"${label.replace(/"/g, '""')}"`), ...rows]
    .map((row) => row.join(";"))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "csv");
}

function downloadExcel(items: Document[]) {
  if (typeof window === "undefined") {
    return;
  }

  const header = EXPORT_COLUMNS.map((column) => column.label);
  const rows = items.map((document) =>
    EXPORT_COLUMNS.map((column) => {
      const value = column.accessor(document);
      return value ?? "";
    })
  );

  const data = [header, ...rows];

  void (async () => {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    const columnWidths = header.map((_, columnIndex) => {
      const maxLength = data.reduce((length, currentRow) => {
        const cell = currentRow[columnIndex];
        const cellLength = cell == null ? 0 : String(cell).length;
        return Math.max(length, cellLength);
      }, 0);
      return { wch: Math.min(Math.max(maxLength + 2, 12), 50) };
    });

    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Zgłoszenia");

    const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, "xlsx");
  })();
}

function downloadJson(items: Document[]) {
  const payload = items.map((document) => {
    const result: Record<string, string | number | boolean | null> = {};
    EXPORT_COLUMNS.forEach((column) => {
      result[column.label] = column.accessor(document);
    });
    return result;
  });

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, "json");
}

function downloadPdf(items: Document[]) {
  if (typeof window === "undefined") {
    return;
  }

  const headers = PDF_TABLE_COLUMNS.map((column) => column.label);
  const rows =
    items.length > 0
      ? items.map((document) => PDF_TABLE_COLUMNS.map((column) => column.accessor(document)))
      : [
          PDF_TABLE_COLUMNS.map((_, columnIndex) =>
            columnIndex === 0 ? "Brak dokumentów spełniających bieżące kryteria." : ""
          ),
        ];

  void (async () => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const autoTable = (autoTableModule as AutoTableModule).default;
    if (!autoTable) {
      return;
    }
    const margin = { top: 48, bottom: 40, left: 48, right: 48 };
    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    await ensurePdfFont(doc);
    const availableWidth = doc.internal.pageSize.getWidth() - margin.left - margin.right;
    const totalLengthHint = PDF_TABLE_COLUMNS.reduce((sum, column) => sum + (column.lengthHint ?? 20), 0);
    const columnStyles = PDF_TABLE_COLUMNS.reduce<Record<number, { cellWidth: number; overflow: "linebreak" }>>(
      (acc, column, index) => {
        const relative = (column.lengthHint ?? 20) / totalLengthHint;
        const width = Math.max(relative * availableWidth, 72);
        acc[index] = { cellWidth: width, overflow: "linebreak" };
        return acc;
      },
      {}
    );
    doc.setFontSize(11);

    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: {
        font: PDF_FONT_NAME,
        fontSize: 11,
        textColor: [28, 35, 51],
        cellPadding: { top: 6, right: 12, bottom: 6, left: 12 },
        lineColor: [216, 223, 235],
        lineWidth: 0.4,
      },
      headStyles: {
        fillColor: [16, 61, 122],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left",
      },
      bodyStyles: { valign: "middle" },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles,
      tableWidth: availableWidth,
      margin,
    });

    doc.save(`${EXPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.pdf`);
  })();
}

type DownloadDocumentSummaryOptions = {
  fileName?: string;
};

export async function downloadDocumentSummary(
  document: Document,
  format: "pdf" = "pdf",
  options: DownloadDocumentSummaryOptions = {}
): Promise<void> {
  if (format !== "pdf") {
    throw new Error("Obsługujemy obecnie tylko pobieranie plików PDF.");
  }

  const targetFileName = buildSummaryFileName(options.fileName);
  const payload = mapPartialDocumentToCreateDto(document);
  const requestBody: Record<string, unknown> = {
    action: "generate-pdf",
    ...payload,
  };

  if (typeof document.id === "number") {
    requestBody.id = document.id;
  }

  let response: Response;
  try {
    response = await fetch(buildEndpoint(DEFAULT_BACKEND_URL, DOCUMENTS_ENDPOINT), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/pdf",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error("Nie udało się połączyć z backendem podczas pobierania PDF", error);
    throw new Error("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
  }

  if (!response.ok) {
    const details = await safeReadError(response);
    const message = details
      ? `Nie udało się przygotować PDF. ${details}`
      : `Nie udało się przygotować PDF (kod ${response.status}).`;
    throw new Error(message);
  }

  const pdfBlob = await response.blob();
  downloadBlobWithName(pdfBlob, targetFileName);
}


function downloadBlob(blob: Blob, extension: string) {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${EXPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.${extension}`;
  anchor.style.display = "none";
  document.body?.appendChild(anchor);
  anchor.click();
  anchor.parentNode?.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function downloadBlobWithName(blob: Blob, fileName: string) {
  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body?.appendChild(anchor);
  anchor.click();
  anchor.parentNode?.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildSummaryFileName(explicitName?: string) {
  const extension = "pdf";
  if (explicitName) {
    return ensureFileExtension(explicitName, extension);
  }

  const today = new Date().toISOString().slice(0, 10);
  return `zgloszenie-${today}.${extension}`;
}

function ensureFileExtension(fileName: string, extension: string) {
  const normalized = fileName.trim();
  if (normalized.toLowerCase().endsWith(`.${extension}`)) {
    return normalized;
  }

  const withoutExtension = normalized.replace(/\.[^/.]+$/, "");
  return `${withoutExtension}.${extension}`;
}

const documentService: DocumentService = new DefaultDocumentService(
  new HttpDocumentApi({ baseUrl: DEFAULT_BACKEND_URL })
);

export { documentService, downloadDocumentSummary };
