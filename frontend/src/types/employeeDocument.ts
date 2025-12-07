export type EmployeeDocumentAnalysisStatus = "processing" | "completed" | "failed";

export type EmployeeDocumentAssessmentStatus = "met" | "partial" | "unmet";

export interface EmployeeDocumentAssessmentEntry {
  status: EmployeeDocumentAssessmentStatus;
  summary: string;
  recommendation?: string;
}

export interface EmployeeDocumentAssessment {
  suddenness: EmployeeDocumentAssessmentEntry;
  externalCause: EmployeeDocumentAssessmentEntry;
  injury: EmployeeDocumentAssessmentEntry;
  workRelation: EmployeeDocumentAssessmentEntry;
}

export interface EmployeeDocument {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageUrl: string;
  uploadedAt: string;
  incidentDescription: string;
  analysisStatus: EmployeeDocumentAnalysisStatus;
  descriptionSource: "ai" | "manual";
  assessment: EmployeeDocumentAssessment;
}
