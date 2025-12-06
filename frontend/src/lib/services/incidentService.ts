import { mockIncidents } from "../mock-data";
import {
  type CreateIncidentInput,
  type Incident,
  type IncidentStatus,
  type UpdateIncidentInput,
} from "@/types/incident";

export type IncidentExportFormat = "csv" | "excel" | "json" | "pdf";

const INCIDENT_PRIORITY_LABELS: Record<Incident["priority"], string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
  critical: "Krytyczny",
};

const INCIDENT_STATUS_LABELS: Record<Incident["status"], string> = {
  pending: "Oczekuje",
  "in-progress": "W realizacji",
  resolved: "Zamknięte",
  rejected: "Odrzucone",
};

const EXPORT_FILE_PREFIX = "lista-zgloszen";

function formatDateForExport(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type ExportColumn = {
  label: string;
  accessor: (incident: Incident) => string;
};

const EXPORT_COLUMNS: ExportColumn[] = [
  {
    label: "Numer sprawy",
    accessor: (incident) => incident.caseNumber,
  },
  {
    label: "Tytuł",
    accessor: (incident) => incident.title,
  },
  {
    label: "Zgłaszający",
    accessor: (incident) => incident.reporterName,
  },
  {
    label: "Kategoria",
    accessor: (incident) => incident.category,
  },
  {
    label: "Priorytet",
    accessor: (incident) => INCIDENT_PRIORITY_LABELS[incident.priority],
  },
  {
    label: "Status",
    accessor: (incident) => INCIDENT_STATUS_LABELS[incident.status],
  },
  {
    label: "Data zgłoszenia",
    accessor: (incident) => formatDateForExport(incident.createdAt),
  },
];

export interface IncidentService {
  list(options?: IncidentListOptions): Promise<IncidentListResponse>;
  getById(id: string): Promise<Incident | null>;
  create(payload: CreateIncidentInput): Promise<Incident>;
  update(id: string, payload: UpdateIncidentInput): Promise<Incident>;
  setExportFormat(format: IncidentExportFormat): void;
}

export type IncidentListSortField =
  | "createdAt"
  | "updatedAt"
  | "caseNumber"
  | "title"
  | "category"
  | "reporterName"
  | "reporterEmail"
  | "priority"
  | "status";

export interface IncidentListOptions {
  page?: number;
  pageSize?: number;
  search?: string | null;
  status?: IncidentStatus | "all" | null;
  sort?: IncidentListSortField | null;
  direction?: "asc" | "desc" | null;
}

export interface IncidentListResponse {
  items: Incident[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

const NETWORK_DELAY_MS = 350;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

const cloneIncident = (incident: Incident): Incident => ({
  ...incident,
  createdAt: new Date(incident.createdAt),
  updatedAt: new Date(incident.updatedAt),
});

const PRIORITY_RANK: Record<Incident["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const STATUS_RANK: Record<Incident["status"], number> = {
  pending: 1,
  "in-progress": 2,
  resolved: 3,
  rejected: 4,
};

class MockIncidentService implements IncidentService {
  private incidents: Incident[];
  private pendingExportFormat: IncidentExportFormat | null = null;

  constructor(seed: Incident[]) {
    this.incidents = seed.map(cloneIncident);
  }

  setExportFormat(format: IncidentExportFormat) {
    this.pendingExportFormat = format;
  }

  private consumeExportFormat(): IncidentExportFormat | null {
    const format = this.pendingExportFormat;
    this.pendingExportFormat = null;
    return format;
  }

  async list(options?: IncidentListOptions): Promise<IncidentListResponse> {
    await delay();
    const sortField: IncidentListSortField = options?.sort && this.isSortableField(options.sort)
      ? options.sort
      : "createdAt";
    const sortDirection: "asc" | "desc" = options?.direction === "asc" || options?.direction === "desc"
      ? options.direction
      : this.getDefaultDirection(sortField);

    const normalizedPageSize = this.normalizePositiveInteger(options?.pageSize, 10);
    const searchTerm = options?.search?.trim().toLowerCase() ?? "";
    const statusFilter = options?.status === "all" ? null : options?.status;

    const filtered = this.incidents.filter((incident) => {
      if (statusFilter && incident.status !== statusFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const haystack = [
        incident.title,
        incident.reporterName,
        incident.reporterEmail,
        incident.caseNumber,
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
      .map(cloneIncident);
    const result: IncidentListResponse = {
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

    const exportItems = sorted.map(cloneIncident);

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
    const found = this.incidents.find((incident) => incident.id === id);
    return found ? cloneIncident(found) : null;
  }

  async create(payload: CreateIncidentInput) {
    await delay();
    const now = new Date();
    const newIncident: Incident = {
      id: this.generateId(),
      caseNumber: this.generateCaseNumber(now),
      title: payload.title,
      description: payload.description,
      category: payload.category,
      priority: payload.priority,
      status: "pending",
      reporterName: payload.reporterName,
      reporterEmail: payload.reporterEmail,
      reporterPhone: payload.reporterPhone,
      pesel: payload.pesel,
      createdAt: now,
      updatedAt: now,
    };

    this.incidents = [newIncident, ...this.incidents];
    return cloneIncident(newIncident);
  }

  async update(id: string, payload: UpdateIncidentInput) {
    await delay();
    const targetIndex = this.incidents.findIndex((incident) => incident.id === id);
    if (targetIndex === -1) {
      throw new Error("Incident not found");
    }

    const updatedIncident: Incident = {
      ...this.incidents[targetIndex],
      ...payload,
      updatedAt: new Date(),
    };

    this.incidents[targetIndex] = updatedIncident;
    return cloneIncident(updatedIncident);
  }

  private generateId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private generateCaseNumber(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
    return `${year}/${month}/${sequence}`;
  }

  private isSortableField(value: string): value is IncidentListSortField {
    return [
      "createdAt",
      "updatedAt",
      "caseNumber",
      "title",
      "category",
      "reporterName",
      "reporterEmail",
      "priority",
      "status",
    ].includes(value as IncidentListSortField);
  }

  private getDefaultDirection(field: IncidentListSortField): "asc" | "desc" {
    switch (field) {
      case "createdAt":
      case "updatedAt":
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

  private getComparableValue(incident: Incident, field: IncidentListSortField) {
    switch (field) {
      case "createdAt":
        return incident.createdAt;
      case "updatedAt":
        return incident.updatedAt;
      case "caseNumber":
        return incident.caseNumber;
      case "title":
        return incident.title;
      case "category":
        return incident.category;
      case "reporterName":
        return incident.reporterName;
      case "reporterEmail":
        return incident.reporterEmail;
      case "priority":
        return PRIORITY_RANK[incident.priority];
      case "status":
        return STATUS_RANK[incident.status];
      default:
        return incident.createdAt;
    }
  }
}

function downloadExcel(items: Incident[]) {
  const headerRow = EXPORT_COLUMNS
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join("");

  const bodyRows = items
    .map((incident) => {
      const cells = EXPORT_COLUMNS
        .map((column) => `<td>${escapeHtml(column.accessor(incident))}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8" /></head><body><table border="1"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  downloadBlob(blob, "xls");
}

function downloadJson(items: Incident[]) {
  const payload = items.map((incident) => ({
    numerSprawy: incident.caseNumber,
    tytul: incident.title,
    zglaszajacy: incident.reporterName,
    kategoria: incident.category,
    priorytet: INCIDENT_PRIORITY_LABELS[incident.priority],
    status: INCIDENT_STATUS_LABELS[incident.status],
    dataZgloszenia: formatDateForExport(incident.createdAt),
  }));

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  downloadBlob(blob, "json");
}

function downloadPdf(items: Incident[]) {
  const MAX_COLUMN_WIDTH = 40;

  const headerCells = EXPORT_COLUMNS.map((column) => normalizeCellValue(column.label));
  const dataRows = items.map((incident) =>
    EXPORT_COLUMNS.map((column) => truncateValue(column.accessor(incident), MAX_COLUMN_WIDTH))
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

const incidentService: IncidentService = (() => {
  if (useMock) {
    return new MockIncidentService(mockIncidents);
  }

  // Placeholder for future real API implementation
  return new MockIncidentService(mockIncidents);
})();

export { incidentService };