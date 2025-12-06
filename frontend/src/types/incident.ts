export type IncidentStatus = 'pending' | 'in-progress' | 'resolved' | 'rejected';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  category: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  pesel?: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  notes?: string;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  category: string;
  priority: IncidentPriority;
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  pesel?: string;
}

export type UpdateIncidentInput = Partial<Pick<Incident, "status" | "assignedTo" | "notes">>;
