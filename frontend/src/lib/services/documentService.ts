import { mockDocuments, defaultDocumentData } from "../mock-documents";
import {
  type CaseDocument,
  type CreateDocumentInput,
  type DocumentStatus,
  type UpdateDocumentInput,
} from "@/types/case-document";
import {
  DOCUMENT_PRIORITY_LABELS,
  DOCUMENT_PRIORITY_RANK,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_RANK,
} from "@/lib/constants/documents";

export type DocumentExportFormat = "csv" | "excel" | "json" | "pdf";

const EXPORT_FILE_PREFIX = "lista-dokumentow";

function formatDateForExport(date: Date | string) {
  const instance = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instance);
}

type ExportColumn = {
  label: string;
  accessor: (document: CaseDocument) => string;
};

const EXPORT_COLUMNS: ExportColumn[] = [
  { label: "Numer sprawy", accessor: (document) => document.caseNumber },
  { label: "Poszkodowany", accessor: (document) => `${document.imie} ${document.nazwisko}`.trim() },
  { label: "PESEL", accessor: (document) => document.pesel ?? "-" },
  { label: "Miejsce wypadku", accessor: (document) => document.miejsce_wypadku },
  { label: "Rodzaj urazu", accessor: (document) => document.rodzaj_urazow },
  { label: "Data wypadku", accessor: (document) => formatDateForExport(document.data_wypadku) },
  { label: "Status", accessor: (document) => DOCUMENT_STATUS_LABELS[document.status] },
  { label: "Priorytet", accessor: (document) => DOCUMENT_PRIORITY_LABELS[document.priority] },
];

export interface DocumentService {
  list(options?: DocumentListOptions): Promise<DocumentListResponse>;
  getById(id: string): Promise<CaseDocument | null>;
  create(payload: CreateDocumentInput): Promise<CaseDocument>;
  update(id: string, payload: UpdateDocumentInput): Promise<CaseDocument>;
  setExportFormat(format: DocumentExportFormat): void;
}

export type DocumentListSortField =
  | "createdAt"
  | "caseNumber"
  | "injuredName"
  | "reporterName"
  | "miejsce_wypadku"
  | "data_wypadku"
  | "priority"
  | "status";

export interface DocumentListOptions {
  page?: number;
  pageSize?: number;
  search?: string | null;
  status?: DocumentStatus | "all" | null;
  sort?: DocumentListSortField | null;
  direction?: "asc" | "desc" | null;
}

export interface DocumentListResponse {
  items: CaseDocument[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

const NETWORK_DELAY_MS = 350;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

const cloneDocument = (document: CaseDocument): CaseDocument => ({
  ...document,
  createdAt: new Date(document.createdAt),
  updatedAt: new Date(document.updatedAt),
  witnesses: document.witnesses?.map((witness) => ({ ...witness })) ?? [],
});

class MockDocumentService implements DocumentService {
  private documents: CaseDocument[];
  private pendingExportFormat: DocumentExportFormat | null = null;

  constructor(seed: CaseDocument[]) {
    this.documents = seed.map(cloneDocument);
  }

  setExportFormat(format: DocumentExportFormat) {
    this.pendingExportFormat = format;
  }

  private consumeExportFormat(): DocumentExportFormat | null {
    const format = this.pendingExportFormat;
    this.pendingExportFormat = null;
    return format;
  }

  async list(options?: DocumentListOptions): Promise<DocumentListResponse> {
    await delay();
    const sortField: DocumentListSortField = options?.sort && this.isSortableField(options.sort)
      ? options.sort
      : "createdAt";
    const sortDirection: "asc" | "desc" = options?.direction === "asc" || options?.direction === "desc"
      ? options.direction
      : this.getDefaultDirection(sortField);

    const normalizedPageSize = this.normalizePositiveInteger(options?.pageSize, 10);
    const searchTerm = options?.search?.trim().toLowerCase() ?? "";
    const statusFilter = options?.status === "all" ? null : options?.status;

    const filtered = this.documents.filter((document) => {
      if (statusFilter && document.status !== statusFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const haystack = [
        document.caseNumber,
        document.title,
        document.category,
        document.reporterName,
        document.reporterEmail,
        document.reporterPhone ?? "",
        document.imie,
        document.nazwisko,
        document.pesel ?? "",
        document.miejsce_wypadku,
        document.rodzaj_urazow,
        document.szczegoly_okolicznosci,
      ];

      return haystack.some((value) => value.toLowerCase().includes(searchTerm));
    });

    const sorted = filtered.slice().sort((a, b) => {
      const first = this.getComparableValue(a, sortField);
      const second = this.getComparableValue(b, sortField);

      if (first === second) {
        return 0;
      }

      if (first == null) {
        return sortDirection === "asc" ? -1 : 1;
      }

      if (second == null) {
        return sortDirection === "asc" ? 1 : -1;
      }

      if (typeof first === "number" && typeof second === "number") {
        return sortDirection === "asc" ? first - second : second - first;
      }

      const firstComparable = first instanceof Date ? first.getTime() : first;
      const secondComparable = second instanceof Date ? second.getTime() : second;

      if (typeof firstComparable === "number" && typeof secondComparable === "number") {
        return sortDirection === "asc"
          ? firstComparable - secondComparable
          : secondComparable - firstComparable;
      }

      return sortDirection === "asc"
        ? firstComparable.toString().localeCompare(secondComparable.toString(), "pl")
        : secondComparable.toString().localeCompare(firstComparable.toString(), "pl");
    });

    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
    const normalizedPage = this.normalizePositiveInteger(options?.page, 1);
    const safePage = Math.min(normalizedPage, totalPages);
    const startIndex = (safePage - 1) * normalizedPageSize;
    const pagedItems = sorted
      .slice(startIndex, startIndex + normalizedPageSize)
      .map(cloneDocument);
    const result: DocumentListResponse = {
      items: pagedItems,
      totalCount,
      totalPages,
      page: safePage,
      pageSize: normalizedPageSize,
    };

    const exportFormat = this.consumeExportFormat();

    if (!exportFormat) {
      return result;
    }

    if (exportFormat === "csv" || typeof document === "undefined") {
      return result;
    }

    const exportItems = sorted.map(cloneDocument);

    if (exportItems.length === 0) {
      return {
        ...result,
        items: [],
      };
    }

    switch (exportFormat) {
      case "excel":
        downloadExcel(exportItems);
        break;
      case "json":
        downloadJson(exportItems);
        break;
      case "pdf":
        downloadPdf(exportItems);
        break;
      default:
        break;
    }

    return {
      ...result,
      items: [],
    };
  }

  async getById(id: string) {
    await delay();
    const found = this.documents.find((document) => document.documentId === id);
    return found ? cloneDocument(found) : null;
  }

  async create(payload: CreateDocumentInput) {
    await delay();
    const now = new Date();
    const [firstName, ...rest] = payload.reporterName.trim().split(" ");
    const lastName = rest.join(" ") || firstName;
    const generatedId = this.generateId();

    const newDocument: CaseDocument = {
      ...defaultDocumentData,
      documentId: generatedId,
      caseNumber: this.generateCaseNumber(now),
      title: payload.title,
      description: payload.description,
      category: payload.category,
      priority: payload.priority,
      status: "pending",
      reporterName: payload.reporterName,
      reporterEmail: payload.reporterEmail,
      reporterPhone: payload.reporterPhone,
      createdAt: now,
      updatedAt: now,
      assignedTo: undefined,
      notes: undefined,
      pesel: payload.pesel ?? defaultDocumentData.pesel,
      nr_dowodu: `GEN${generatedId}`,
      imie: firstName,
      nazwisko: lastName,
      data_urodzenia: defaultDocumentData.data_urodzenia,
      miejsce_urodzenia: defaultDocumentData.miejsce_urodzenia,
      numer_telefonu: payload.reporterPhone ?? defaultDocumentData.numer_telefonu,
      ulica: defaultDocumentData.ulica,
      nr_domu: defaultDocumentData.nr_domu,
      nr_lokalu: defaultDocumentData.nr_lokalu,
      miejscowosc: defaultDocumentData.miejscowosc,
      kod_pocztowy: defaultDocumentData.kod_pocztowy,
      data_wypadku: now.toISOString().slice(0, 10),
      godzina_wypadku: now.toTimeString().slice(0, 5),
      miejsce_wypadku: payload.category,
      planowana_godzina_rozpoczecia_pracy: "08:00",
      planowana_godzina_zakonczenia_pracy: "16:00",
      rodzaj_urazow: payload.title,
      szczegoly_okolicznosci: payload.description,
      czy_udzielona_pomoc: false,
      miejsce_udzielenia_pomocy: null,
      organ_postepowania: null,
      czy_wypadek_podczas_uzywania_maszyny: false,
      opis_maszyn: null,
      czy_maszyna_posiada_atest: null,
      czy_maszyna_w_ewidencji: null,
      imie_zglaszajacego: firstName,
      nazwisko_zglaszajacego: lastName,
      pesel_zglaszajacego: payload.pesel ?? null,
      nr_dowodu_zglaszajacego: null,
      data_urodzenia_zglaszajacego: null,
      nr_telefonu_zglaszajacego: payload.reporterPhone ?? null,
      ulica_zglaszajacego: defaultDocumentData.ulica,
      nr_domu_zglaszajacego: defaultDocumentData.nr_domu,
      nr_lokalu_zglaszajacego: defaultDocumentData.nr_lokalu,
      miejscowosc_zglaszajacego: defaultDocumentData.miejscowosc,
      kod_pocztowy_zglaszajacego: defaultDocumentData.kod_pocztowy,
      ulica_zglaszajacego_ostatniego_zamieszkania: null,
      nr_domu_zglaszajacego_ostatniego_zamieszkania: null,
      nr_lokalu_zglaszajacego_ostatniego_zamieszkania: null,
      miejscowosc_zglaszajacego_ostatniego_zamieszkania: null,
      kod_pocztowy_zglaszajacego_ostatniego_zamieszkania: null,
      typ_korespondencji_zglaszajacego: null,
      ulica_korespondencji_zglaszajacego: null,
      nr_domu_korespondencji_zglaszajacego: null,
      nr_lokalu_korespondencji_zglaszajacego: null,
      miejscowosc_korespondencji_zglaszajacego: null,
      kod_pocztowy_korespondencji_zglaszajacego: null,
      nazwa_panstwa_korespondencji_zglaszajacego: null,
      witnesses: [],
    };

    this.documents = [newDocument, ...this.documents];
    return cloneDocument(newDocument);
  }

  async update(id: string, payload: UpdateDocumentInput) {
    await delay();
    const targetIndex = this.documents.findIndex((document) => document.documentId === id);
    if (targetIndex === -1) {
      throw new Error("Document not found");
    }

    const updatedDocument: CaseDocument = {
      ...this.documents[targetIndex],
      ...payload,
      updatedAt: new Date(),
    };

    this.documents[targetIndex] = updatedDocument;
    return cloneDocument(updatedDocument);
  }

  private generateId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private generateCaseNumber(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const sequence = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0");
    return `${year}/${month}/${sequence}`;
  }

  private isSortableField(value: string): value is DocumentListSortField {
    return [
      "createdAt",
      "caseNumber",
      "injuredName",
      "reporterName",
      "miejsce_wypadku",
      "data_wypadku",
      "priority",
      "status",
    ].includes(value as DocumentListSortField);
  }

  private getDefaultDirection(field: DocumentListSortField): "asc" | "desc" {
    switch (field) {
      case "createdAt":
      case "data_wypadku":
        return "desc";
      default:
        return "asc";
    }
  }

  private normalizePositiveInteger(value: number | null | undefined, fallback: number) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(1, Math.floor(value));
  }

  private getComparableValue(document: CaseDocument, field: DocumentListSortField) {
    switch (field) {
      case "createdAt":
        return document.createdAt;
      case "caseNumber":
        return document.caseNumber;
      case "injuredName":
        return `${document.imie} ${document.nazwisko}`.trim();
      case "reporterName":
        return document.reporterName;
      case "miejsce_wypadku":
        return document.miejsce_wypadku;
      case "data_wypadku":
        return new Date(document.data_wypadku);
      case "priority":
        return DOCUMENT_PRIORITY_RANK[document.priority];
      case "status":
        return DOCUMENT_STATUS_RANK[document.status];
      default:
        return document.createdAt;
    }
  }
}

function downloadExcel(items: CaseDocument[]) {
  const headerRow = EXPORT_COLUMNS
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join("");

  const bodyRows = items
    .map((document) => {
      const cells = EXPORT_COLUMNS
        .map((column) => `<td>${escapeHtml(column.accessor(document))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8" /></head><body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, "xls");
}

function downloadJson(items: CaseDocument[]) {
  const payload = items.map((document) => ({
    numerSprawy: document.caseNumber,
    poszkodowany: `${document.imie} ${document.nazwisko}`.trim(),
    miejsceWypadku: document.miejsce_wypadku,
    rodzajUrazu: document.rodzaj_urazow,
    status: DOCUMENT_STATUS_LABELS[document.status],
    priorytet: DOCUMENT_PRIORITY_LABELS[document.priority],
    dataWypadku: formatDateForExport(document.data_wypadku),
  }));

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  downloadBlob(blob, "json");
}

function downloadPdf(items: CaseDocument[]) {
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
