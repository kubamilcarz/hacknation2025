import { defaultDocumentData, mockDocuments } from "../mock-documents";
import type { CreateDocumentDto, DocumentDetailDto, DocumentListResponseDto } from "@/lib/dtos/documentDtos";
import { mapDocumentDetailDtoToDocument, mapDocumentListItemDtoToDocument, mapDocumentToDetailDto, mapPartialDocumentToCreateDto } from "@/lib/mappers/documentMapper";
import type { Document } from "@/types/document";

export type DocumentExportFormat = "csv" | "excel" | "json" | "pdf";

const EXPORT_FILE_PREFIX = "dokumenty-wypadkowe";
const NETWORK_DELAY_MS = 350;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

type ExportColumn = { label: string; accessor: (document: Document) => string };

const PDF_FONT_NAME = "Inter";
const PDF_FONT_BASE_PATH = "/fonts";

type PdfFontVariant = { file: string; style: "normal" | "bold" };

const PDF_FONT_VARIANTS: PdfFontVariant[] = [
  { file: "Inter-Regular.ttf", style: "normal" },
  { file: "Inter-Bold.ttf", style: "bold" },
];

let pdfFontRegistrationPromise: Promise<Record<string, string>> | null = null;

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

async function ensurePdfFont(doc: any) {
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
        // In jsPDF v3, the signature is: addFont(fileNameInVFS, fontName, fontStyle)
        // The fontStyle parameter should match the weight (normal/bold)
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
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
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
  setExportFormat(format: DocumentExportFormat): void;
}

class DefaultDocumentService implements DocumentService {
  constructor(private readonly api: DocumentApi) {}

  setExportFormat(format: DocumentExportFormat) {
    this.api.setExportFormat(format);
  }

  async list(options?: DocumentListOptions): Promise<DocumentListResponse> {
    const responseDto = await this.api.list(options);
    return {
      items: responseDto.items.map(mapDocumentListItemDtoToDocument),
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
}

class MockDocumentApi implements DocumentApi {
  private documents: DocumentDetailDto[];
  private pendingExportFormat: DocumentExportFormat | null = null;
  private nextId: number;

  constructor(seed: Document[]) {
    this.documents = seed.map((document) => this.cloneDto(mapDocumentToDetailDto(document)));
    this.nextId = this.calculateNextId();
  }

  setExportFormat(format: DocumentExportFormat) {
    this.pendingExportFormat = format;
  }

  private consumeExportFormat() {
    const format = this.pendingExportFormat;
    this.pendingExportFormat = null;
    return format;
  }

  async list(options?: DocumentListOptions): Promise<DocumentListResponseDto> {
    await delay();

    const sortField: DocumentListSortField = options?.sort && this.isSortableField(options.sort)
      ? options.sort
      : "data_wypadku";
    const direction: "asc" | "desc" = options?.direction === "asc" || options?.direction === "desc"
      ? options.direction
      : sortField === "data_wypadku"
        ? "desc"
        : "asc";

    const helpProvidedFilter =
      typeof options?.helpProvided === "boolean" ? options.helpProvided : null;
    const machineInvolvedFilter =
      typeof options?.machineInvolved === "boolean" ? options.machineInvolved : null;

    const normalizedPageSize = this.normalizePositiveInteger(options?.pageSize, 10);
    const normalizedPage = this.normalizePositiveInteger(options?.page, 1);
    const searchTerm = options?.search?.trim().toLowerCase() ?? "";

    const filtered = this.documents.filter((document) => {
      if (helpProvidedFilter !== null && document.czy_udzielona_pomoc !== helpProvidedFilter) {
        return false;
      }

      if (
        machineInvolvedFilter !== null &&
        document.czy_wypadek_podczas_uzywania_maszyny !== machineInvolvedFilter
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const haystack = [
        document.imie,
        document.nazwisko,
        document.pesel,
        document.miejsce_wypadku,
        document.rodzaj_urazow,
        document.szczegoly_okolicznosci,
        document.organ_postepowania ?? "",
      ];

      return haystack.some((value) => value.toLowerCase().includes(searchTerm));
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
    const paged = sorted.slice(startIndex, startIndex + normalizedPageSize).map((document) => this.cloneDto(document));

    const response: DocumentListResponseDto = {
      items: paged,
      totalCount,
      totalPages,
      page: safePage,
      pageSize: normalizedPageSize,
    } satisfies DocumentListResponseDto;

    const format = this.consumeExportFormat();
    if (!format || (format === "csv" && typeof document === "undefined")) {
      return response;
    }

    this.handleExport(format, sorted);
    return { ...response, items: [] } satisfies DocumentListResponseDto;
  }

  async getById(id: number): Promise<DocumentDetailDto | null> {
    await delay();
    const found = this.documents.find((document) => document.id === id);
    return found ? this.cloneDto(found) : null;
  }

  async create(payload: CreateDocumentDto): Promise<DocumentDetailDto> {
    await delay();
    const newId = this.generateId();
    const { witnesses: payloadWitnesses, ...restPayload } = payload;

    const base = mapDocumentToDetailDto(defaultDocumentData);
    const newDocument: DocumentDetailDto = {
      ...base,
      ...restPayload,
      id: newId,
      witnesses:
        payloadWitnesses && payloadWitnesses.length > 0
          ? payloadWitnesses.map((witness) => ({
              ...witness,
              documentId: witness.documentId ?? newId,
              id: witness.id,
            }))
          : undefined,
    };

    const storedDocument = this.cloneDto(newDocument);
    this.documents = [storedDocument, ...this.documents];
    return this.cloneDto(storedDocument);
  }

  async downloadAttachment(id: number, format: "docx" | "pdf"): Promise<void> {
    await delay();
    const found = this.documents.find((document) => document.id === id);
    if (!found) {
      throw new Error("Nie znaleziono zgłoszenia do pobrania.");
    }

    const domainDocument = mapDocumentDetailDtoToDocument(found);
    await downloadDocumentSummary(domainDocument, format, {
      fileName: `zgloszenie-${id}.${format === "pdf" ? "pdf" : "docx"}`,
    });
  }

  private handleExport(format: DocumentExportFormat, documents: DocumentDetailDto[]) {
    const domainDocuments = documents.map(mapDocumentDetailDtoToDocument);
    switch (format) {
      case "excel":
        downloadExcel(domainDocuments);
        break;
      case "json":
        downloadJson(domainDocuments);
        break;
      case "pdf":
        downloadPdf(domainDocuments);
        break;
      default:
        break;
    }
  }

  private isSortableField(field: string): field is DocumentListSortField {
    return ["id", "imie", "nazwisko", "pesel", "data_wypadku", "miejsce_wypadku"].includes(field as DocumentListSortField);
  }

  private getComparableValue(document: DocumentDetailDto, field: DocumentListSortField) {
    switch (field) {
      case "id":
        return document.id ?? null;
      case "imie":
        return document.imie;
      case "nazwisko":
        return document.nazwisko;
      case "pesel":
        return document.pesel;
      case "miejsce_wypadku":
        return document.miejsce_wypadku;
      case "data_wypadku":
        return document.data_wypadku;
      default:
        return null;
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

  private cloneDto(document: DocumentDetailDto): DocumentDetailDto {
    return {
      ...document,
      witnesses: document.witnesses?.map((witness) => ({ ...witness })),
    } satisfies DocumentDetailDto;
  }
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

async function createDocumentSummaryPdf(document: Document): Promise<Blob> {
  if (typeof window === "undefined") {
    return new Blob();
  }

  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const autoTable = (autoTableModule as AutoTableModule).default;
  if (!autoTable) {
    return new Blob();
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "pt" });
  await ensurePdfFont(doc);
  doc.setFontSize(11);
  const headers = ["Pole", "Wartość"];
  const rows = buildDocumentSummaryRows(document);

  autoTable(doc, {
    head: [headers],
    body: rows,
    styles: { font: PDF_FONT_NAME, fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: [16, 61, 122], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { top: 40, bottom: 40, left: 40, right: 40 },
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: "auto" },
    },
  });

  return doc.output("blob");
}

function createDocumentSummaryDocx(document: Document) {
  const rows = buildDocumentSummaryRows(document);
  const issuedAt = new Date().toLocaleString("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const sections = rows
    .map(([label, value]) => `<p><strong>${escapeHtmlBasic(label)}:</strong> ${escapeHtmlPreservingBreaks(value)}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8" /><title>Zawiadomienie o wypadku</title><style>body{font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1c2333;}h1{font-size:20px;margin-bottom:16px;}p{margin:8px 0;}strong{color:#103d7a;}</style></head><body><h1>Zawiadomienie o wypadku</h1><p>Wygenerowano: ${escapeHtmlBasic(issuedAt)}</p>${sections}</body></html>`;

  return new Blob([html], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8",
  });
}

type DownloadDocumentSummaryOptions = {
  fileName?: string;
};

export async function downloadDocumentSummary(
  document: Document,
  format: "docx" | "pdf",
  options: DownloadDocumentSummaryOptions = {}
): Promise<void> {
  const targetFileName = buildSummaryFileName(format, options.fileName);

  if (format === "pdf") {
    const pdfBlob = await createDocumentSummaryPdf(document);
    downloadBlobWithName(pdfBlob, targetFileName);
    return;
  }

  const docxBlob = createDocumentSummaryDocx(document);
  downloadBlobWithName(docxBlob, targetFileName);
}

function buildDocumentSummaryRows(document: Document): string[][] {
  const rows: Array<[string, string]> = [
    ["Numer zgłoszenia", formatSummaryValue(document.id != null ? document.id.toString() : null)],
    ["Imię i nazwisko", formatSummaryValue(`${document.imie ?? ""} ${document.nazwisko ?? ""}`)],
    ["PESEL", formatSummaryValue(document.pesel)],
    ["Numer dokumentu tożsamości", formatSummaryValue(document.nr_dowodu)],
    ["Adres zamieszkania", formatSummaryValue(formatSummaryAddress(document))],
    ["Telefon kontaktowy", formatSummaryValue(document.numer_telefonu)],
    [
      "Data i godzina wypadku",
      formatSummaryValue(formatSummaryDateTime(document.data_wypadku, document.godzina_wypadku)),
    ],
    ["Miejsce wypadku", formatSummaryValue(document.miejsce_wypadku)],
    ["Czy udzielono pierwszej pomocy", formatSummaryBoolean(document.czy_udzielona_pomoc)],
    ["Opis okoliczności", formatSummaryValue(document.szczegoly_okolicznosci)],
    ["Maszyny i urządzenia", formatSummaryValue(document.opis_maszyn)],
    ["Świadkowie", formatWitnessList(document)],
  ];

  return rows.map(([label, value]) => [label, value]);
}

function formatSummaryValue(value: string | number | null | undefined) {
  const normalized = normalizeSummaryValue(value);
  return normalized.length > 0 ? normalized : "Brak danych";
}

function normalizeSummaryValue(value: string | number | null | undefined) {
  if (value == null) {
    return "";
  }

  const asString = typeof value === "number" ? value.toString() : value;
  return asString.trim();
}

function formatSummaryDateTime(date: string | null | undefined, time: string | null | undefined) {
  const normalizedDate = normalizeSummaryValue(date);
  const normalizedTime = normalizeSummaryValue(time ? time.slice(0, 5) : time);
  return [normalizedDate, normalizedTime].filter(Boolean).join(" ");
}

function formatSummaryAddress(document: Document) {
  const street = normalizeSummaryValue(document.ulica);
  const house = normalizeSummaryValue(document.nr_domu);
  const flat = normalizeSummaryValue(document.nr_lokalu);
  const postal = normalizeSummaryValue(document.kod_pocztowy);
  const city = normalizeSummaryValue(document.miejscowosc);
  const country = normalizeSummaryValue(document.nazwa_panstwa);

  const parts: string[] = [];
  const streetLine: string[] = [];

  if (street) {
    streetLine.push(street);
  }

  if (house || flat) {
    const numberParts = [house, flat].filter(Boolean);
    if (numberParts.length > 0) {
      streetLine.push(numberParts.join("/"));
    }
  }

  if (streetLine.length > 0) {
    parts.push(streetLine.join(" "));
  }

  const locality: string[] = [];
  if (postal && city) {
    locality.push(`${postal} ${city}`);
  } else {
    if (postal) {
      locality.push(postal);
    }
    if (city) {
      locality.push(city);
    }
  }

  if (locality.length > 0) {
    parts.push(locality.join(" "));
  }

  if (country) {
    parts.push(country);
  }

  return parts.join(", ");
}

function formatSummaryBoolean(value: boolean | null | undefined) {
  if (value === true) {
    return "Tak";
  }
  if (value === false) {
    return "Nie";
  }
  return "Brak danych";
}

function formatWitnessList(document: Document) {
  const names = (document.witnesses ?? [])
    .map((witness) => normalizeSummaryValue(`${witness.imie ?? ""} ${witness.nazwisko ?? ""}`))
    .filter((name) => name.length > 0);

  return names.length > 0 ? names.join(", ") : "Brak świadków";
}

function escapeHtmlBasic(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlPreservingBreaks(value: string) {
  return escapeHtmlBasic(value).replace(/\r\n|\r|\n/g, "<br />");
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

function buildSummaryFileName(format: "docx" | "pdf", explicitName?: string) {
  const extension = format === "pdf" ? "pdf" : "docx";
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

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const documentService: DocumentService = (() => {
  const api: DocumentApi = useMock
    ? new MockDocumentApi(mockDocuments)
    : new MockDocumentApi(mockDocuments);

  return new DefaultDocumentService(api);
})();

export { documentService, downloadDocumentSummary };
