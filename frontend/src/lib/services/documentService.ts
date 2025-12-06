import { defaultDocumentData, mockDocuments } from "../mock-documents";
import type { Document } from "@/types/document";

export type DocumentExportFormat = "csv" | "excel" | "json" | "pdf";

const EXPORT_FILE_PREFIX = "dokumenty-wypadkowe";
const NETWORK_DELAY_MS = 350;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

const cloneDocument = (input: Document): Document => ({
  ...input,
  witnesses: input.witnesses?.map((witness) => ({ ...witness })) ?? [],
});

const EXPORT_COLUMNS: Array<{ label: string; accessor: (document: Document) => string }> = [
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
  setExportFormat(format: DocumentExportFormat): void;
}

class MockDocumentService implements DocumentService {
  private documents: Document[];
  private pendingExportFormat: DocumentExportFormat | null = null;
  private nextId: number;

  constructor(seed: Document[]) {
    this.documents = seed.map(cloneDocument);
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

  async list(options?: DocumentListOptions): Promise<DocumentListResponse> {
    await delay();

    const sortField: DocumentListSortField = options?.sort && this.isSortableField(options.sort)
      ? options.sort
      : "data_wypadku";
    const direction: "asc" | "desc" = options?.direction === "asc" || options?.direction === "desc"
      ? options.direction
      : sortField === "data_wypadku"
        ? "desc"
        : "asc";

    const normalizedPageSize = this.normalizePositiveInteger(options?.pageSize, 10);
    const normalizedPage = this.normalizePositiveInteger(options?.page, 1);
    const searchTerm = options?.search?.trim().toLowerCase() ?? "";

    const filtered = this.documents.filter((document) => {
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
    const paged = sorted.slice(startIndex, startIndex + normalizedPageSize).map(cloneDocument);

    const response: DocumentListResponse = {
      items: paged,
      totalCount,
      totalPages,
      page: safePage,
      pageSize: normalizedPageSize,
    };

    const format = this.consumeExportFormat();
    if (!format || (format === "csv" && typeof document === "undefined")) {
      return response;
    }

    this.handleExport(format, sorted);
    return { ...response, items: [] };
  }

  async getById(id: number) {
    await delay();
    const found = this.documents.find((document) => document.id === id);
    return found ? cloneDocument(found) : null;
  }

  async create(payload: CreateDocumentInput) {
    await delay();
    const newId = this.generateId();
    const newDocument: Document = {
      ...defaultDocumentData,
      ...payload,
      id: newId,
      witnesses: payload.witnesses?.map((witness) => ({ ...witness, document: newId })) ?? [],
    };

    this.documents = [newDocument, ...this.documents];
    return cloneDocument(newDocument);
  }

  private handleExport(format: DocumentExportFormat, documents: Document[]) {
    switch (format) {
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

  private isSortableField(field: string): field is DocumentListSortField {
    return ["id", "imie", "nazwisko", "pesel", "data_wypadku", "miejsce_wypadku"].includes(field as DocumentListSortField);
  }

  private getComparableValue(document: Document, field: DocumentListSortField) {
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

  private normalizePositiveInteger(value: number | null | undefined, fallback: number) {
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

function downloadExcel(items: Document[]) {
  const headerRow = EXPORT_COLUMNS.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const bodyRows = items
    .map((document) => {
      const cells = EXPORT_COLUMNS.map((column) => `<td>${escapeHtml(column.accessor(document))}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8" /></head><body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, "xls");
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
  const MAX_COLUMN_WIDTH = 40;

  const headerCells = EXPORT_COLUMNS.map((column) => normalizeCellValue(column.label));
  const dataRows = items.map((document) =>
    EXPORT_COLUMNS.map((column) => truncateValue(column.accessor(document), MAX_COLUMN_WIDTH))
  );

  const columnWidths = headerCells.map((header, columnIndex) => {
    const maxWidth = dataRows.reduce((acc, row) => Math.max(acc, row[columnIndex]?.length ?? 0), header.length);
    return Math.min(MAX_COLUMN_WIDTH, Math.max(4, maxWidth));
  });

  const formattedHeader = headerCells
    .map((cell, index) => truncateValue(cell, columnWidths[index]).padEnd(columnWidths[index]))
    .join(" | ");

  const separatorLine = columnWidths.map((width) => "-".repeat(width)).join("-+-");

  const formattedRows = dataRows.map((row) =>
    row
      .map((cell, index) => truncateValue(cell, columnWidths[index]).padEnd(columnWidths[index]))
      .join(" | ")
  );

  const lines = [formattedHeader, separatorLine, ...formattedRows];
  const pdfBlob = createPdfBlob(lines);
  downloadBlob(pdfBlob, "pdf");
}

function truncateValue(value: string, maxLength: number) {
  const cleaned = normalizeCellValue(value);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(0, maxLength - 3))}...`;
}

function normalizeCellValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return normalizeCellValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapePdfText(value: string) {
  return normalizeCellValue(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createPdfBlob(lines: string[]) {
  const textLines = lines.length > 0 ? lines : ["Brak danych do wyświetlenia."];
  const commands = textLines
    .map((line, index) => {
      const prefix = index === 0 ? "" : "0 -14 Td\n";
      return `${prefix}(${escapePdfText(line)}) Tj`;
    })
    .join("\n");

  const textStream = `BT\n/F1 10 Tf\n1 0 0 1 40 780 Tm\n${commands}\nET`;
  const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
  const contentLength = encoder ? encoder.encode(textStream).length : textStream.length;

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${textStream}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
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

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const documentService: DocumentService = (() => {
  if (useMock) {
    return new MockDocumentService(mockDocuments);
  }

  return new MockDocumentService(mockDocuments);
})();

export { documentService };
