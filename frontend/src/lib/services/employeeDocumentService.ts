import { mockEmployeeDocumentSeed } from "@/lib/mock-employee-documents";
import type { EmployeeDocumentSeed } from "@/lib/mock-employee-documents";
import type {
  CreateEmployeeDocumentDto,
  EmployeeDocumentDetailDto,
  EmployeeDocumentListItemDto,
  EmployeeDocumentListResponseDto,
} from "@/lib/dtos/employeeDocumentDtos";
import {
  mapEmployeeDocumentDetailDtoToDomain,
  mapEmployeeDocumentListItemDtoToDomain,
  mapEmployeeDocumentToDetailDto,
} from "@/lib/mappers/employeeDocumentMapper";
import type { EmployeeDocument } from "@/types/employeeDocument";

export type EmployeeDocumentExportFormat = "csv" | "excel" | "json" | "pdf";

type ExportColumn = {
  label: string;
  accessor: (document: EmployeeDocument) => string;
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { label: "ID", accessor: (document) => String(document.id) },
  { label: "Nazwa pliku", accessor: (document) => document.fileName },
  { label: "Rozmiar", accessor: (document) => formatFileSize(document.fileSize) },
  { label: "Data przesłania", accessor: (document) => formatDate(document.uploadedAt) },
  { label: "Status analizy", accessor: (document) => formatStatus(document.analysisStatus) },
  { label: "Opis zdarzenia", accessor: (document) => document.incidentDescription },
];

const PDF_TABLE_COLUMNS: Array<ExportColumn & { lengthHint?: number }> = [
  { label: "ID", accessor: (document) => String(document.id), lengthHint: 6 },
  { label: "Nazwa pliku", accessor: (document) => document.fileName, lengthHint: 22 },
  { label: "Data przesłania", accessor: (document) => formatDate(document.uploadedAt), lengthHint: 18 },
  { label: "Status analizy", accessor: (document) => formatStatus(document.analysisStatus), lengthHint: 18 },
  { label: "Opis zdarzenia", accessor: (document) => document.incidentDescription, lengthHint: 36 },
];

const EXPORT_FILE_PREFIX = "dokumenty-pracownicze";
const NETWORK_DELAY_MS = 400;
const PDF_FONT_NAME = "Inter";
const PDF_FONT_BASE_PATH = "/fonts";

type PdfFontVariant = { file: string; style: "normal" | "bold" };

const PDF_FONT_VARIANTS: PdfFontVariant[] = [
  { file: "Inter-Regular.ttf", style: "normal" },
  { file: "Inter-Bold.ttf", style: "bold" },
];

let pdfFontRegistrationPromise: Promise<Record<string, string>> | null = null;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

export type EmployeeDocumentListSortField = "uploaded_at" | "file_name" | "analysis_status";

export interface EmployeeDocumentListOptions {
  page?: number;
  pageSize?: number;
  search?: string | null;
  sort?: EmployeeDocumentListSortField | null;
  direction?: "asc" | "desc" | null;
  status?: EmployeeDocument["analysisStatus"] | null;
}

export interface EmployeeDocumentListResponse {
  items: EmployeeDocument[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface EmployeeDocumentService {
  list(options?: EmployeeDocumentListOptions): Promise<EmployeeDocumentListResponse>;
  getById(id: number): Promise<EmployeeDocument | null>;
  upload(file: File): Promise<EmployeeDocument>;
  downloadOriginal(id: number): Promise<void>;
  setExportFormat(format: EmployeeDocumentExportFormat): void;
}

interface EmployeeDocumentApi {
  list(options?: EmployeeDocumentListOptions): Promise<EmployeeDocumentListResponseDto>;
  getById(id: number): Promise<EmployeeDocumentDetailDto | null>;
  upload(payload: CreateEmployeeDocumentDto, fileData: Blob): Promise<EmployeeDocumentDetailDto>;
  downloadOriginal(id: number): Promise<Blob>;
  setExportFormat(format: EmployeeDocumentExportFormat): void;
}

class DefaultEmployeeDocumentService implements EmployeeDocumentService {
  constructor(private readonly api: EmployeeDocumentApi) {}

  setExportFormat(format: EmployeeDocumentExportFormat) {
    this.api.setExportFormat(format);
  }

  async list(options?: EmployeeDocumentListOptions): Promise<EmployeeDocumentListResponse> {
    const dto = await this.api.list(options);
    return {
      items: dto.items.map(mapEmployeeDocumentListItemDtoToDomain),
      totalCount: dto.totalCount,
      totalPages: dto.totalPages,
      page: dto.page,
      pageSize: dto.pageSize,
    };
  }

  async getById(id: number): Promise<EmployeeDocument | null> {
    const dto = await this.api.getById(id);
    return dto ? mapEmployeeDocumentDetailDtoToDomain(dto) : null;
  }

  async upload(file: File): Promise<EmployeeDocument> {
    const payload = await buildCreatePayloadFromFile(file);
    const dto = await this.api.upload(payload, file);
    return mapEmployeeDocumentDetailDtoToDomain(dto);
  }

  async downloadOriginal(id: number): Promise<void> {
    const blob = await this.api.downloadOriginal(id);
    downloadBlobWithName(blob, await this.resolveFileName(id));
  }

  private async resolveFileName(id: number): Promise<string> {
    const document = await this.getById(id);
    return document?.fileName ?? `dokument-${id}.pdf`;
  }
}

class MockEmployeeDocumentApi implements EmployeeDocumentApi {
  private documents: EmployeeDocumentDetailDto[];
  private nextId: number;
  private fileStorage = new Map<number, Blob>();
  private pendingExportFormat: EmployeeDocumentExportFormat | null = null;

  constructor(seed: EmployeeDocumentSeed[]) {
    this.documents = seed.map((document) => mapEmployeeDocumentToDetailDto(document));
    seed.forEach((document) => {
      this.fileStorage.set(document.id, createMockPdfBlob(document.mockContent));
    });
    this.nextId = this.calculateNextId();
  }

  setExportFormat(format: EmployeeDocumentExportFormat) {
    this.pendingExportFormat = format;
  }

  private consumeExportFormat() {
    const format = this.pendingExportFormat;
    this.pendingExportFormat = null;
    return format;
  }

  async list(options?: EmployeeDocumentListOptions): Promise<EmployeeDocumentListResponseDto> {
    await delay();
    const sortField: EmployeeDocumentListSortField = options?.sort ?? "uploaded_at";
    const direction: "asc" | "desc" = options?.direction === "asc" || options?.direction === "desc"
      ? options.direction
      : sortField === "uploaded_at"
        ? "desc"
        : "asc";

    const normalizedPageSize = this.normalizePositiveInteger(options?.pageSize, 10);
    const normalizedPage = this.normalizePositiveInteger(options?.page, 1);
    const searchTerm = options?.search?.trim().toLowerCase() ?? "";
    const statusFilter = options?.status ?? null;

    const filtered = this.documents.filter((document) => {
      if (statusFilter && document.analysis_status !== statusFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return (
        document.file_name.toLowerCase().includes(searchTerm) ||
        document.incident_description.toLowerCase().includes(searchTerm)
      );
    });

    const sorted = filtered.slice().sort((first, second) => {
      const firstValue = this.getComparableValue(first, sortField);
      const secondValue = this.getComparableValue(second, sortField);

      if (firstValue === secondValue) {
        return 0;
      }

      if (firstValue == null) {
        return direction === "asc" ? -1 : 1;
      }

      if (secondValue == null) {
        return direction === "asc" ? 1 : -1;
      }

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return direction === "asc" ? firstValue - secondValue : secondValue - firstValue;
      }

      return direction === "asc"
        ? firstValue.toString().localeCompare(secondValue.toString(), "pl")
        : secondValue.toString().localeCompare(firstValue.toString(), "pl");
    });

    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
    const safePage = Math.min(normalizedPage, totalPages);
    const startIndex = (safePage - 1) * normalizedPageSize;
    const paged = sorted
      .slice(startIndex, startIndex + normalizedPageSize)
      .map((document) => ({ ...document }));

    const response: EmployeeDocumentListResponseDto = {
      items: paged,
      totalCount,
      totalPages,
      page: safePage,
      pageSize: normalizedPageSize,
    };

    const format = this.consumeExportFormat();
    if (format) {
      this.handleExport(format, sorted.map(mapEmployeeDocumentDetailDtoToDomain));
      return { ...response, items: [] };
    }

    return response;
  }

  async getById(id: number): Promise<EmployeeDocumentDetailDto | null> {
    await delay();
    const document = this.documents.find((entry) => entry.id === id);
    return document ? { ...document } : null;
  }

  async upload(payload: CreateEmployeeDocumentDto, fileData: Blob): Promise<EmployeeDocumentDetailDto> {
    await delay();
    const id = this.generateId();
    const dto: EmployeeDocumentDetailDto = {
      ...payload,
      id,
      storage_url: `mock-storage://${id}`,
    };
    this.documents = [{ ...dto }, ...this.documents];
    this.fileStorage.set(id, fileData.slice(0, fileData.size, fileData.type));
    return { ...dto };
  }

  async downloadOriginal(id: number): Promise<Blob> {
    await delay();
    const blob = this.fileStorage.get(id);
    if (!blob) {
      throw new Error("Nie znaleziono pliku źródłowego.");
    }
    return blob;
  }

  private handleExport(format: EmployeeDocumentExportFormat, documents: EmployeeDocument[]) {
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
        break;
    }
  }

  private getComparableValue(document: EmployeeDocumentListItemDto, field: EmployeeDocumentListSortField) {
    switch (field) {
      case "file_name":
        return document.file_name;
      case "analysis_status":
        return document.analysis_status;
      case "uploaded_at":
      default:
        return document.uploaded_at;
    }
  }

  private normalizePositiveInteger(value: number | string | null | undefined, fallback: number) {
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return Math.max(1, parsed);
      }
      return fallback;
    }

    if (typeof value !== "number" || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(1, Math.floor(value));
  }

  private calculateNextId() {
    return (this.documents.reduce((acc, document) => Math.max(acc, document.id ?? 0), 0) || 0) + 1;
  }

  private generateId() {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }
}

export const employeeDocumentService: EmployeeDocumentService = new DefaultEmployeeDocumentService(
  new MockEmployeeDocumentApi(mockEmployeeDocumentSeed)
);

async function ensurePdfFont(doc: import("jspdf").jsPDF) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const registeredStyles = doc.getFontList?.()[PDF_FONT_NAME] ?? [];
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
      doc.addFileToVFS(variant.file, fontBase64);
      doc.addFont(variant.file, PDF_FONT_NAME, variant.style === "bold" ? "bold" : "normal");
      fontRegistered = true;
    }

    if (fontRegistered || hasNormal) {
      doc.setFont(PDF_FONT_NAME, "normal");
    } else {
      doc.setFont("helvetica", "normal");
    }
  } catch (error) {
    console.error("Nie udało się zarejestrować czcionki PDF", error);
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
            throw new Error(`Nie można pobrać czcionki ${variant.file}`);
          }
          const buffer = await response.arrayBuffer();
          return [variant.file, arrayBufferToBase64(buffer)] as const;
        })
      );
      return Object.fromEntries(entries);
    })().catch((error) => {
      console.error("Błąd podczas pobierania czcionek PDF", error);
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
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function createMockPdfBlob(content: string) {
  const header = "Mock PDF – dane zapisane w trakcie hackathonu.\n";
  return new Blob([header + content], { type: "application/pdf" });
}

async function buildCreatePayloadFromFile(file: File): Promise<CreateEmployeeDocumentDto> {
  const now = new Date().toISOString();
  const description = await mockAnalyzePdf(file);
  return {
    file_name: file.name || `dokument-${now}.pdf`,
    file_size: file.size,
    file_type: file.type || "application/pdf",
    storage_url: "pending",
    uploaded_at: now,
    incident_description: description,
    analysis_status: "completed",
    description_source: "ai",
  };
}

async function mockAnalyzePdf(file: File): Promise<string> {
  await delay();
  const baseName = (file.name || "dokument").replace(/\.pdf$/i, "");
  const scenarios = [
    "AI wykryła brak zabezpieczenia strefy pracy.",
    "W logach maszyny znaleziono ostrzeżenie o przeciążeniu.",
    "Opis sugeruje niekompletne środki ochrony indywidualnej.",
    "System wskazał konieczność konsultacji z inspektorem BHP.",
  ];
  const index = Math.abs(hashString(baseName + file.size)) % scenarios.length;
  return `${baseName}: ${scenarios[index]}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function downloadCsv(items: EmployeeDocument[]) {
  const header = EXPORT_COLUMNS.map((column) => column.label);
  const rows = items.map((document) => EXPORT_COLUMNS.map((column) => column.accessor(document)));
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "csv");
}

function downloadJson(items: EmployeeDocument[]) {
  const payload = items.map((document) => {
    const result: Record<string, string> = {};
    EXPORT_COLUMNS.forEach((column) => {
      result[column.label] = column.accessor(document);
    });
    return result;
  });
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" }), "json");
}

function downloadExcel(items: EmployeeDocument[]) {
  if (typeof window === "undefined") {
    return;
  }
  void (async () => {
    const XLSX = await import("xlsx");
    const header = EXPORT_COLUMNS.map((column) => column.label);
    const rows = items.map((document) => EXPORT_COLUMNS.map((column) => column.accessor(document)));
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    worksheet["!cols"] = header.map(() => ({ wch: 32 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dokumenty");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "xlsx");
  })();
}

function downloadPdf(items: EmployeeDocument[]) {
  if (typeof window === "undefined") {
    return;
  }
  void (async () => {
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default;
    if (!autoTable) {
      return;
    }
    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
    await ensurePdfFont(doc);
    const headers = PDF_TABLE_COLUMNS.map((column) => column.label);
    const rows =
      items.length > 0
        ? items.map((document) => PDF_TABLE_COLUMNS.map((column) => column.accessor(document)))
        : [
            PDF_TABLE_COLUMNS.map((_, index) => (index === 0 ? "Brak dokumentów w bieżącym widoku." : "")),
          ];
    const margin = { top: 48, bottom: 40, left: 48, right: 48 };
    const availableWidth = doc.internal.pageSize.getWidth() - margin.left - margin.right;
    const totalHint = PDF_TABLE_COLUMNS.reduce((sum, column) => sum + (column.lengthHint ?? 20), 0);
    const columnStyles = PDF_TABLE_COLUMNS.reduce<Record<number, { cellWidth: number; overflow: "linebreak" }>>(
      (acc, column, index) => {
        const width = ((column.lengthHint ?? 20) / totalHint) * availableWidth;
        acc[index] = { cellWidth: Math.max(width, 80), overflow: "linebreak" };
        return acc;
      },
      {}
    );
    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: { font: PDF_FONT_NAME, fontSize: 11, cellPadding: 6 },
      headStyles: { fillColor: [16, 61, 122], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      margin,
      columnStyles,
      tableWidth: availableWidth,
    });
    doc.save(`${EXPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.pdf`);
  })();
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
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function formatDate(input: string) {
  if (!input) {
    return "Brak danych";
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toLocaleString("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(value: number) {
  if (!value || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const normalized = value / 1024 ** exponent;
  return `${normalized.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatStatus(status: EmployeeDocument["analysisStatus"]) {
  switch (status) {
    case "completed":
      return "Zakończona";
    case "processing":
      return "Analiza w toku";
    case "failed":
      return "Wymaga uzupełnienia";
    default:
      return "Nieznany";
  }
}
