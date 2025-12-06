import type { Document } from "./document";

export type DocumentStatus = "pending" | "in-progress" | "resolved" | "rejected";

export type DocumentPriority = "low" | "medium" | "high" | "critical";

export interface CaseDocument extends Document {
  documentId: string;
  caseNumber: string;
  title: string;
  description: string;
  category: string;
  priority: DocumentPriority;
  status: DocumentStatus;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  notes?: string;
}

export interface CreateDocumentInput {
  title: string;
  description: string;
  category: string;
  priority: DocumentPriority;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  pesel?: string;
}

export type UpdateDocumentInput = Partial<Pick<CaseDocument, "status" | "assignedTo" | "notes">>;
