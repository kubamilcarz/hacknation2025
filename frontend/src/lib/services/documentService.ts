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

const PDF_TABLE_COLUMNS: Array<ExportColumn & { lengthHint?: number }> = [
  { label: "ID", accessor: (document) => String(document.id ?? "—"), lengthHint: 6 },
  { label: "Data wypadku", accessor: (document) => formatPdfIncidentDate(document), lengthHint: 18 },
  {
    label: "Poszkodowany",
    accessor: (document) => normalizeCellValue(`${document.imie} ${document.nazwisko}`.trim()) || "—",
    lengthHint: 20,
  },
  { label: "PESEL", accessor: (document) => document.pesel || "—", lengthHint: 14 },
  { label: "Miejsce wypadku", accessor: (document) => document.miejsce_wypadku || "—", lengthHint: 28 },
  { label: "Rodzaj urazu", accessor: (document) => document.rodzaj_urazow || "—", lengthHint: 28 },
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
  const headers = PDF_TABLE_COLUMNS.map((column) => column.label);
  const rows = items.map((document) => PDF_TABLE_COLUMNS.map((column) => column.accessor(document)));

  const effectiveRows =
    rows.length > 0
      ? rows
      : [
          PDF_TABLE_COLUMNS.map((_, columnIndex) =>
            columnIndex === 0 ? "Brak dokumentów spełniających bieżące kryteria." : ""
          ),
        ];

  const columnLengthHints = PDF_TABLE_COLUMNS.map((column) => column.lengthHint ?? 0);
  const pdfBlob = createTablePdfBlob(headers, effectiveRows, { columnLengthHints, maxLinesPerCell: 3 });
  downloadBlob(pdfBlob, "pdf");
}

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

const sharedTextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

type CreateTablePdfOptions = {
  columnLengthHints?: number[];
  maxLinesPerCell?: number;
};

type PreparedPdfRow = {
  cells: string[][];
  height: number;
  rowIndex: number;
};

function createTablePdfBlob(headers: string[], rows: string[][], options: CreateTablePdfOptions = {}) {
  const PDF_PAGE_WIDTH = 612;
  const PDF_PAGE_HEIGHT = 792;
  const PAGE_MARGIN = 40;
  const HEADER_HEIGHT = 28;
  const FOOTER_HEIGHT = 32;
  const HEADER_FONT_SIZE = 11;
  const ROW_FONT_SIZE = 10;
  const ROW_LINE_HEIGHT = ROW_FONT_SIZE + 4;
  const CELL_PADDING = 6;
  const MAX_LINES_PER_CELL = Math.max(1, options.maxLinesPerCell ?? 2);
  const tableWidth = PDF_PAGE_WIDTH - PAGE_MARGIN * 2;
  const generatedAt = new Date().toISOString().slice(0, 10);
  const columnLengthHints = options.columnLengthHints ?? [];

  const columnWeights = headers.map((header, columnIndex) => {
    const longestValue = rows.reduce((acc, row) => Math.max(acc, row[columnIndex]?.length ?? 0), header.length);
    const lengthHint = columnLengthHints[columnIndex] ?? 0;
    return Math.max(6, longestValue, lengthHint);
  });
  const totalWeight = columnWeights.reduce((sum, weight) => sum + weight, 0);
  const columnWidths = columnWeights.map((weight) => (weight / totalWeight) * tableWidth);

  const preparedRows: PreparedPdfRow[] = rows.map((row, rowIndex) => {
    const cellLines = row.map((cell, columnIndex) =>
      wrapCellText(cell, columnWidths[columnIndex], ROW_FONT_SIZE, CELL_PADDING, MAX_LINES_PER_CELL)
    );
    const maxCellLines = cellLines.reduce((acc, cellLine) => Math.max(acc, cellLine.length), 1);
    const rowHeight = ROW_LINE_HEIGHT * maxCellLines + CELL_PADDING * 2;
    return { cells: cellLines, height: rowHeight, rowIndex };
  });

  const availableHeight = PDF_PAGE_HEIGHT - PAGE_MARGIN * 2 - FOOTER_HEIGHT - HEADER_HEIGHT;
  const pages = paginatePreparedRows(preparedRows, availableHeight);
  const totalPages = Math.max(1, pages.length);

  const pageStreams = pages.map((pageRows, pageIndex) =>
    buildTablePageStream({
      headers,
      rows: pageRows,
      columnWidths,
      columnCount: headers.length,
      pageIndex,
      totalPages,
      dimensions: { width: PDF_PAGE_WIDTH, height: PDF_PAGE_HEIGHT },
      layout: {
        margin: PAGE_MARGIN,
        headerHeight: HEADER_HEIGHT,
        footerHeight: FOOTER_HEIGHT,
        headerFontSize: HEADER_FONT_SIZE,
        rowFontSize: ROW_FONT_SIZE,
        cellPadding: CELL_PADDING,
        rowLineHeight: ROW_LINE_HEIGHT,
      },
      generatedAt,
    })
  );

  const pageCount = Math.max(1, pageStreams.length);
  const fontObjectId = 3 + 2 * pageCount;

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  const pageReferences = Array.from({ length: pageCount }, (_, index) => `${3 + index} 0 R`).join(" ");
  objects.push(`2 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [${pageReferences}] >>\nendobj`);

  pageStreams.forEach((_, index) => {
    const contentId = 3 + pageCount + index;
    const pageObject = [
      `${3 + index} 0 obj`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}]`,
      `/Contents ${contentId} 0 R`,
      `/Resources << /Font << /F1 ${fontObjectId} 0 R >> >>`,
      ">>",
      "endobj",
    ].join("\n");
    objects.push(pageObject);
  });

  pageStreams.forEach((stream, index) => {
    const contentLength = getPdfByteLength(stream);
    const contentObject = [
      `${3 + pageCount + index} 0 obj`,
      `<< /Length ${contentLength} >>`,
      "stream",
      stream,
      "endstream",
      "endobj",
    ].join("\n");
    objects.push(contentObject);
  });

  objects.push(`${fontObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  return finalizePdf(objects);
}

function paginatePreparedRows(rows: PreparedPdfRow[], availableHeight: number) {
  if (rows.length === 0) {
    return [[]];
  }

  const safeAvailableHeight = Math.max(1, availableHeight);
  const pages: PreparedPdfRow[][] = [];
  let currentPage: PreparedPdfRow[] = [];
  let remainingHeight = safeAvailableHeight;

  for (const row of rows) {
    if (row.height > remainingHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      remainingHeight = safeAvailableHeight;
    }

    if (row.height > safeAvailableHeight && currentPage.length === 0) {
      currentPage.push(row);
      pages.push(currentPage);
      currentPage = [];
      remainingHeight = safeAvailableHeight;
      continue;
    }

    currentPage.push(row);
    remainingHeight -= row.height;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
}

function buildTablePageStream({
  headers,
  rows,
  columnWidths,
  columnCount,
  pageIndex,
  totalPages,
  dimensions,
  layout,
  generatedAt,
}: {
  headers: string[];
  rows: PreparedPdfRow[];
  columnWidths: number[];
  columnCount: number;
  pageIndex: number;
  totalPages: number;
  dimensions: { width: number; height: number };
  layout: {
    margin: number;
    headerHeight: number;
    footerHeight: number;
    headerFontSize: number;
    rowFontSize: number;
    rowLineHeight: number;
    cellPadding: number;
  };
  generatedAt: string;
}) {
  const { height } = dimensions;
  const {
    margin,
    headerHeight,
    footerHeight,
    headerFontSize,
    rowFontSize,
    rowLineHeight,
    cellPadding,
  } = layout;

  const commands: string[] = [];
  const tableStartX = margin;
  const tableTopY = height - margin;
  const tableWidth = columnWidths.reduce((sum, columnWidth) => sum + columnWidth, 0);
  const rowsHeight = rows.reduce((sum, row) => sum + row.height, 0);
  const tableHeight = headerHeight + rowsHeight;
  const tableBottomY = tableTopY - tableHeight;
  const columnOffsets = columnWidths.map((_, index) =>
    columnWidths.slice(0, index).reduce((acc, columnWidth) => acc + columnWidth, tableStartX)
  );
  const footerY = margin - footerHeight / 2 + 4;
  const headerTextY = tableTopY - headerHeight / 2 + headerFontSize / 3;

  // Header background
  commands.push("0.92 0.95 1 rg");
  commands.push(`${tableStartX} ${tableTopY - headerHeight} ${tableWidth} ${headerHeight} re`);
  commands.push("f");

  // Zebra rows
  let currentRowTop = tableTopY - headerHeight;
  rows.forEach((row) => {
    const rowBottom = currentRowTop - row.height;
    if (row.rowIndex % 2 === 0) {
      commands.push("0.98 0.98 0.99 rg");
      commands.push(`${tableStartX} ${rowBottom} ${tableWidth} ${row.height} re`);
      commands.push("f");
    }
    currentRowTop = rowBottom;
  });

  // Table grid
  commands.push("0.78 0.81 0.87 RG");
  commands.push("0.5 w");
  const horizontalLines = [tableTopY, tableTopY - headerHeight];
  currentRowTop = tableTopY - headerHeight;
  rows.forEach((row) => {
    const rowBottom = currentRowTop - row.height;
    horizontalLines.push(rowBottom);
    currentRowTop = rowBottom;
  });
  horizontalLines.forEach((y) => {
    commands.push(`${tableStartX} ${y} m`);
    commands.push(`${tableStartX + tableWidth} ${y} l`);
    commands.push("S");
  });

  const verticalLines: number[] = [];
  for (let i = 0; i <= columnCount; i += 1) {
    if (i === 0) {
      verticalLines.push(tableStartX);
    } else {
      verticalLines.push(columnOffsets[i - 1] + columnWidths[i - 1]);
    }
  }

  verticalLines.forEach((x) => {
    commands.push(`${x} ${tableTopY} m`);
    commands.push(`${x} ${tableBottomY} l`);
    commands.push("S");
  });

  // Header text
  commands.push("0.16 0.19 0.3 rg");
  commands.push("BT");
  commands.push("/F1 11 Tf");
  headers.forEach((header, columnIndex) => {
    const textX = columnOffsets[columnIndex] + cellPadding;
    commands.push(`1 0 0 1 ${textX} ${headerTextY.toFixed(2)} Tm`);
    commands.push(`(${escapePdfText(truncateTextToWidth(header, columnWidths[columnIndex], headerFontSize, cellPadding))}) Tj`);
  });
  commands.push("ET");

  // Row text
  commands.push("0 0 0 rg");
  commands.push("BT");
  commands.push("/F1 10 Tf");
  currentRowTop = tableTopY - headerHeight;
  rows.forEach((row) => {
    const rowBottom = currentRowTop - row.height;
    const firstLineBaseline = currentRowTop - cellPadding - rowFontSize * 0.2;
    row.cells.forEach((cellLines, columnIndex) => {
      const textX = columnOffsets[columnIndex] + cellPadding;
      cellLines.forEach((line, lineIndex) => {
        const lineY = firstLineBaseline - rowLineHeight * lineIndex;
        commands.push(`1 0 0 1 ${textX} ${lineY.toFixed(2)} Tm`);
        commands.push(`(${escapePdfText(line)}) Tj`);
      });
    });
    currentRowTop = rowBottom;
  });
  commands.push("ET");

  // Footer
  commands.push("0.36 0.4 0.46 rg");
  commands.push("BT");
  commands.push("/F1 9 Tf");
  commands.push(`1 0 0 1 ${tableStartX} ${footerY} Tm`);
  commands.push(`(${escapePdfText(`Raport zgłoszeń ZANT - ${generatedAt}`)}) Tj`);
  commands.push("ET");
  commands.push("BT");
  commands.push("/F1 9 Tf");
  const footerRightX = tableStartX + tableWidth - 120;
  commands.push(`1 0 0 1 ${footerRightX} ${footerY} Tm`);
  commands.push(`(${escapePdfText(`Strona ${pageIndex + 1}/${totalPages}`)}) Tj`);
  commands.push("ET");

  return commands.join("\n");
}

function truncateTextToWidth(value: string, columnWidth: number, fontSize: number, padding: number) {
  const maxWidth = Math.max(0, columnWidth - padding * 2);
  const averageCharWidth = fontSize * 0.55;
  const maxChars = maxWidth > 0 ? Math.max(1, Math.floor(maxWidth / averageCharWidth)) : 1;
  const normalized = normalizeCellValue(value);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
}

function wrapCellText(
  value: string,
  columnWidth: number,
  fontSize: number,
  padding: number,
  maxLines: number
) {
  const normalized = normalizeCellValue(value);
  const maxWidth = Math.max(0, columnWidth - padding * 2);
  const averageCharWidth = fontSize * 0.55;
  const maxCharsPerLine = maxWidth > 0 ? Math.max(1, Math.floor(maxWidth / averageCharWidth)) : 1;
  const words = normalized ? normalized.split(/\s+/) : [""];
  const lines: string[] = [];
  let currentLine = "";

  const commitLine = (line: string) => {
    lines.push(line);
  };

  words.forEach((word, wordIndex) => {
    let remainingWord = word;

    while (remainingWord.length > 0) {
      const separator = currentLine.length > 0 ? " " : "";
      const candidate = `${currentLine}${separator}${remainingWord}`.trim();

      if (candidate.length <= maxCharsPerLine) {
        currentLine = candidate;
        remainingWord = "";
      } else if (currentLine.length === 0) {
        commitLine(remainingWord.slice(0, maxCharsPerLine));
        remainingWord = remainingWord.slice(maxCharsPerLine);
      } else {
        commitLine(currentLine);
        currentLine = "";
      }
    }

    if (wordIndex === words.length - 1 && currentLine.length > 0) {
      commitLine(currentLine);
      currentLine = "";
    }
  });

  if (lines.length === 0) {
    lines.push("");
  }

  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    truncated[maxLines - 1] = truncateLineWithEllipsis(truncated[maxLines - 1], maxCharsPerLine);
    return truncated;
  }

  return lines;
}

function truncateLineWithEllipsis(line: string, maxChars: number) {
  if (line.length <= maxChars) {
    return line;
  }

  if (maxChars <= 3) {
    return ".".repeat(Math.max(1, maxChars));
  }

  return `${line.slice(0, Math.max(0, maxChars - 3))}...`;
}

function finalizePdf(objects: string[]) {
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

function getPdfByteLength(value: string) {
  return sharedTextEncoder ? sharedTextEncoder.encode(value).length : value.length;
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
