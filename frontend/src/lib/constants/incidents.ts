import { type IncidentPriority, type IncidentStatus } from "@/types/incident";

export const INCIDENT_STATUS_VALUES: IncidentStatus[] = ["pending", "in-progress", "resolved", "rejected"];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  pending: "Oczekujące",
  "in-progress": "W trakcie",
  resolved: "Rozwiązane",
  rejected: "Odrzucone",
};

export const INCIDENT_PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
  critical: "Krytyczny",
};

export const INCIDENT_PRIORITY_RANK: Record<IncidentPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const INCIDENT_STATUS_RANK: Record<IncidentStatus, number> = {
  pending: 1,
  "in-progress": 2,
  resolved: 3,
  rejected: 4,
};
