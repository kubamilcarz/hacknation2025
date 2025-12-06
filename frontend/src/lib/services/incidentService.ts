import { mockIncidents } from "../mock-data";
import {
  type CreateIncidentInput,
  type Incident,
  type UpdateIncidentInput,
} from "@/types/incident";

export interface IncidentService {
  list(): Promise<Incident[]>;
  getById(id: string): Promise<Incident | null>;
  create(payload: CreateIncidentInput): Promise<Incident>;
  update(id: string, payload: UpdateIncidentInput): Promise<Incident>;
}

const NETWORK_DELAY_MS = 350;

const delay = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

const cloneIncident = (incident: Incident): Incident => ({
  ...incident,
  createdAt: new Date(incident.createdAt),
  updatedAt: new Date(incident.updatedAt),
});

class MockIncidentService implements IncidentService {
  private incidents: Incident[];

  constructor(seed: Incident[]) {
    this.incidents = seed.map(cloneIncident);
  }

  async list() {
    await delay();
    return this.incidents
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(cloneIncident);
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