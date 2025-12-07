import type {
  CreateEmployeeDocumentDto,
  EmployeeDocumentDetailDto,
  EmployeeDocumentListItemDto,
  EmployeeDocumentListResponseDto,
} from "@/lib/dtos/employeeDocumentDtos";
import {
  mapEmployeeDocumentDetailDtoToDomain,
  mapEmployeeDocumentListItemDtoToDomain,
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
const PDF_FONT_NAME = "Inter";
const PDF_FONT_BASE_PATH = "/fonts";
const PDF_EXPORT_TARGET_SELECTOR = "[data-export-pdf-target='employee-documents-table']";

type ExportStyleProperty = Extract<keyof CSSStyleDeclaration, string>;

type StyleOverride = {
  selector: string;
  includeRoot?: boolean;
  styles: Partial<Record<ExportStyleProperty, string>>;
};

const PDF_EXPORT_STYLE_OVERRIDES: StyleOverride[] = [
  {
    selector: "[data-export-pdf-relax-overflow]",
    styles: {
      overflow: "visible",
      overflowX: "visible",
      overflowY: "visible",
      maxHeight: "none",
    },
  },
  {
    selector: "[data-export-pdf-relax-width]",
    styles: {
      width: "max-content",
      minWidth: "0",
      maxWidth: "none",
    },
  },
];

type PdfFontVariant = { file: string; style: "normal" | "bold" };

const PDF_FONT_VARIANTS: PdfFontVariant[] = [
  { file: "Inter-Regular.ttf", style: "normal" },
  { file: "Inter-Bold.ttf", style: "bold" },
];

let pdfFontRegistrationPromise: Promise<Record<string, string>> | null = null;

const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const PDF_UPLOAD_ENDPOINT = "/api/zus-recommendation/";

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
  downloadAnonymized(id: number): Promise<void>;
  getOriginalFile(id: number): Promise<Blob>;
  getAnonymizedFile(id: number): Promise<Blob>;
  setExportFormat(format: EmployeeDocumentExportFormat): void;
}

interface EmployeeDocumentApi {
  list(options?: EmployeeDocumentListOptions): Promise<EmployeeDocumentListResponseDto>;
  getById(id: number): Promise<EmployeeDocumentDetailDto | null>;
  upload(payload: CreateEmployeeDocumentDto, fileData: Blob): Promise<EmployeeDocumentDetailDto>;
  downloadOriginal(id: number): Promise<Blob>;
  downloadAnonymized(id: number): Promise<Blob>;
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

  async downloadAnonymized(id: number): Promise<void> {
    const blob = await this.api.downloadAnonymized(id);
    const base = await this.resolveFileName(id);
    const anonymizedName = base.toLowerCase().endsWith(".pdf")
      ? `${base.slice(0, -4)}-anon.pdf`
      : `${base}-anon.pdf`;
    downloadBlobWithName(blob, anonymizedName);
  }

  async getOriginalFile(id: number): Promise<Blob> {
    return this.api.downloadOriginal(id);
  }

  async getAnonymizedFile(id: number): Promise<Blob> {
    return this.api.downloadAnonymized(id);
  }

  private async resolveFileName(id: number): Promise<string> {
    const document = await this.getById(id);
    return document?.fileName ?? `dokument-${id}.pdf`;
  }
}

class HttpEmployeeDocumentApi implements EmployeeDocumentApi {
  private documents: EmployeeDocumentDetailDto[] = [];
  private nextId = 1;
  private fileStorage = new Map<number, Blob>();
  private pendingExportFormat: EmployeeDocumentExportFormat | null = null;
  private readonly uploadUrl: string;

  constructor(baseUrl: string = DEFAULT_BACKEND_URL) {
    const normalized = baseUrl.trim();
    const effective = normalized.length > 0 ? normalized : DEFAULT_BACKEND_URL;
    this.uploadUrl = buildEndpoint(effective, PDF_UPLOAD_ENDPOINT);
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
    const document = this.documents.find((entry) => entry.id === id);
    return document ? { ...document } : null;
  }

  async upload(payload: CreateEmployeeDocumentDto, fileData: Blob): Promise<EmployeeDocumentDetailDto> {
    const description = await analyzePdfWithBackend(fileData, this.uploadUrl);
    const id = this.generateId();

    const dto: EmployeeDocumentDetailDto = {
      ...payload,
      id,
      storage_url: `local-upload://${id}`,
      analysis_status: description.status,
      incident_description: description.text,
      description_source: description.source,
    };

    this.documents = [{ ...dto }, ...this.documents];
    this.fileStorage.set(id, fileData.slice(0, fileData.size, fileData.type));
    return { ...dto };
  }

  async downloadOriginal(id: number): Promise<Blob> {
    const blob = this.fileStorage.get(id);
    if (!blob) {
      throw new Error("Nie znaleziono pliku źródłowego (przechowywanego lokalnie).");
    }
    return blob;
  }

  async downloadAnonymized(id: number): Promise<Blob> {
    const dto = this.documents.find((document) => document.id === id);
    if (!dto) {
      throw new Error("Nie znaleziono dokumentu do anonimizacji.");
    }
    const domainDocument = mapEmployeeDocumentDetailDtoToDomain(dto);
    return createAnonymizedPdf(domainDocument);
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

  private generateId() {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }
}

export const employeeDocumentService: EmployeeDocumentService = new DefaultEmployeeDocumentService(
  new HttpEmployeeDocumentApi(DEFAULT_BACKEND_URL)
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

async function buildCreatePayloadFromFile(file: File): Promise<CreateEmployeeDocumentDto> {
  const now = new Date().toISOString();
  const defaultRecommendation =
    "System analizuje dokument. W razie potrzeby poproś klienta o doprecyzowanie opisanej przesłanki.";
  const defaultAssessmentEntry = (summary: string) => ({
    status: "partial" as const,
    summary,
    recommendation: defaultRecommendation,
  });

  return {
    file_name: file.name || `dokument-${now}.pdf`,
    file_size: file.size,
    file_type: file.type || "application/pdf",
    storage_url: "pending",
    uploaded_at: now,
    incident_description: "Analiza dokumentu została zainicjowana na serwerze.",
    analysis_status: "processing",
    description_source: "ai",
    assessment: {
      suddenness: defaultAssessmentEntry("Nagłość zostanie potwierdzona po pełnej analizie logów."),
      external_cause: defaultAssessmentEntry("System sprawdza wskazane czynniki zewnętrzne."),
      injury: defaultAssessmentEntry("Wymagane potwierdzenie urazu na podstawie dalszych danych."),
      work_relation: defaultAssessmentEntry("Analiza zależności ze stanowiskiem pracy w toku."),
    },
  };
}

type PdfAnalysisResult = {
  text: string;
  status: EmployeeDocumentDetailDto["analysis_status"];
  source: "ai" | "manual";
};

async function analyzePdfWithBackend(fileData: Blob, uploadUrl: string): Promise<PdfAnalysisResult> {
  const fallback: PdfAnalysisResult = {
    text: "Nie udało się odczytać opisu z przesłanego pliku. Uzupełnij dane ręcznie.",
    status: "failed",
    source: "manual",
  };

  const formData = new FormData();
  const fileName = typeof (fileData as File).name === "string" && (fileData as File).name.trim().length > 0
    ? (fileData as File).name
    : "dokument.pdf";
  formData.append("pdf", fileData, fileName);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = (await response.text().catch(() => "")).trim();
      console.warn(
        "Backend upload-pdf endpoint zwrócił kod %s. Treść odpowiedzi: %s",
        response.status,
        errorText
      );
      return {
        ...fallback,
        text: errorText.length > 0 ? errorText : fallback.text,
      };
    }

    const description = (await response.text().catch(() => "")).trim();
    return {
      text: description.length > 0 ? description : fallback.text,
      status: "completed",
      source: "ai",
    } satisfies PdfAnalysisResult;
  } catch (error) {
    console.error("Nie udało się przetworzyć PDF na backendzie", error);
    return fallback;
  }
}

function buildEndpoint(baseUrl: string, path: string) {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return trimmedBase ? `${trimmedBase}${normalizedPath}` : normalizedPath;
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
    const exportRoot = document.querySelector<HTMLElement>(PDF_EXPORT_TARGET_SELECTOR);
    if (exportRoot) {
      try {
        const [{ jsPDF }, html2canvasModule] = await Promise.all([import("jspdf"), import("html2canvas")]);
        const html2canvas = html2canvasModule.default ?? html2canvasModule;
        const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        const revertStyles = applyPdfSnapshotOverrides(exportRoot);
        try {
          const backgroundColor = getComputedStyle(document.body).backgroundColor || "#ffffff";
          const snapshotWidth = Math.max(exportRoot.scrollWidth, exportRoot.offsetWidth, 1);
          const snapshotHeight = Math.max(exportRoot.scrollHeight, exportRoot.offsetHeight, 1);
          const canvas = await html2canvas(exportRoot, {
            backgroundColor,
            scale,
            useCORS: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: snapshotWidth,
            windowHeight: snapshotHeight,
            width: snapshotWidth,
            height: snapshotHeight,
          });
          const imageData = canvas.toDataURL("image/png", 0.95);
          const contentWidthPt = pxToPt(canvas.width);
          const contentHeightPt = pxToPt(canvas.height);
          const marginPt = 24;
          const pageWidthPt = contentWidthPt + marginPt * 2;
          const pageHeightPt = contentHeightPt + marginPt * 2;
          const doc = new jsPDF({
            orientation: contentWidthPt >= contentHeightPt ? "landscape" : "portrait",
            unit: "pt",
            format: [pageWidthPt, pageHeightPt],
          });
          doc.addImage(imageData, "PNG", marginPt, marginPt, contentWidthPt, contentHeightPt, undefined, "FAST");
          doc.save(`${EXPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.pdf`);
          return;
        } finally {
          revertStyles();
        }
      } catch (snapshotError) {
        console.error("Snapshot PDF export failed, falling back to table export.", snapshotError);
      }
    } else {
      console.warn("PDF export target not found, using table fallback.");
    }

    await downloadPdfTableFallback(items);
  })();
}

function applyPdfSnapshotOverrides(root: HTMLElement) {
  if (!root) {
    return () => undefined;
  }

  type AppliedStyle = { element: HTMLElement; property: ExportStyleProperty; previous: string };
  const applied: AppliedStyle[] = [];

  for (const override of PDF_EXPORT_STYLE_OVERRIDES) {
    const matchedElements: HTMLElement[] = [];
    if (override.includeRoot && root.matches(override.selector)) {
      matchedElements.push(root);
    }
    matchedElements.push(...Array.from(root.querySelectorAll<HTMLElement>(override.selector)));

    for (const element of matchedElements) {
      const styleEntries = Object.entries(override.styles ?? {}) as Array<[ExportStyleProperty, string | undefined]>;
      for (const [property, value] of styleEntries) {
        if (value == null) {
          continue;
        }
        const style = element.style as Record<string, string>;
        const previous = style[property] ?? "";
        if (previous === value) {
          continue;
        }
        applied.push({ element, property, previous });
        style[property] = value;
      }
    }
  }

  return () => {
    for (let index = applied.length - 1; index >= 0; index -= 1) {
      const { element, property, previous } = applied[index];
      (element.style as Record<string, string>)[property] = previous;
    }
  };
}

async function downloadPdfTableFallback(items: EmployeeDocument[]) {
  try {
    const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default;
    if (!autoTable) {
      throw new Error("jspdf-autotable module is not available");
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
    const margin = { top: 48, bottom: 40, left: 48, right: 48 } as const;
    const availableWidth = doc.internal.pageSize.getWidth() - margin.left - margin.right;
    const totalHint = PDF_TABLE_COLUMNS.reduce((sum, column) => sum + (column.lengthHint ?? 20), 0);
    const columnStyles = PDF_TABLE_COLUMNS.reduce<Record<number, { cellWidth: number; overflow: "linebreak" }>>(
      (accumulator, column, index) => {
        const width = ((column.lengthHint ?? 20) / totalHint) * availableWidth;
        accumulator[index] = { cellWidth: Math.max(width, 80), overflow: "linebreak" };
        return accumulator;
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
  } catch (fallbackError) {
    console.error("Table-based PDF export failed.", fallbackError);
  }
}

function pxToPt(value: number) {
  return (value * 72) / 96;
}

async function createAnonymizedPdf(document: EmployeeDocument): Promise<Blob> {
  if (typeof window === "undefined") {
    return new Blob();
  }

  const [{ jsPDF }] = await Promise.all([import("jspdf")]);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt" });
  await ensurePdfFont(doc);

  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setFontSize(14);
  doc.setTextColor(16, 61, 122);
  doc.text("Zanonimizowany opis zdarzenia", margin, margin);

  doc.setFontSize(11);
  doc.setTextColor(28, 35, 51);
  const issuedAt = formatDate(document.uploadedAt);
  doc.text(`Data przesłania: ${issuedAt}`, margin, margin + 24);
  doc.text(`ID dokumentu: ${document.id ?? "Brak"}`, margin, margin + 40);

  const description = document.incidentDescription || "Brak szczegółowego opisu.";
  const lines = doc.splitTextToSize(description, width);
  doc.text("\nOpis zdarzenia:", margin, margin + 68);
  doc.text(lines, margin, margin + 92);

  doc.setFontSize(10);
  doc.setTextColor(120, 128, 146);
  doc.text("Plik wygenerowany automatycznie na potrzeby anonimizacji.", margin, doc.internal.pageSize.getHeight() - margin);

  return doc.output("blob");
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
