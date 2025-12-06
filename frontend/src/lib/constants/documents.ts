import { type DocumentPriority, type DocumentStatus } from "@/types/case-document";

export const DOCUMENT_STATUS_VALUES: DocumentStatus[] = ["pending", "in-progress", "resolved", "rejected"];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Oczekujące",
  "in-progress": "W trakcie",
  resolved: "Rozwiązane",
  rejected: "Odrzucone",
};

export const DOCUMENT_PRIORITY_LABELS: Record<DocumentPriority, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
  critical: "Krytyczny",
};

export const DOCUMENT_PRIORITY_RANK: Record<DocumentPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const DOCUMENT_STATUS_RANK: Record<DocumentStatus, number> = {
  pending: 1,
  "in-progress": 2,
  resolved: 3,
  rejected: 4,
};
