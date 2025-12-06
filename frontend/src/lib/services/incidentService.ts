import { mockIncidents } from "../mock-data";
import {
  type CreateIncidentInput,
  type Incident,
  type IncidentStatus,
  type UpdateIncidentInput,
} from "@/types/incident";

export interface IncidentService {
  list(options?: IncidentListOptions): Promise<IncidentListResponse>;
  getById(id: string): Promise<Incident | null>;
  create(payload: CreateIncidentInput): Promise<Incident>;
  update(id: string, payload: UpdateIncidentInput): Promise<Incident>;
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

  constructor(seed: Incident[]) {
    this.incidents = seed.map(cloneIncident);
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

    return {
      items: pagedItems,
      totalCount,
      totalPages,
      page: safePage,
      pageSize: normalizedPageSize,
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

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const incidentService: IncidentService = (() => {
  if (useMock) {
    return new MockIncidentService(mockIncidents);
  }

  // Placeholder for future real API implementation
  return new MockIncidentService(mockIncidents);
})();

export { incidentService };