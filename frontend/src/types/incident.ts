export type IncidentStatus = 'pending' | 'in-progress' | 'resolved' | 'rejected';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
  id: string;
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
