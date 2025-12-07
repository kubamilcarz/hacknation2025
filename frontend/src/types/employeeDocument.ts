export type EmployeeDocumentAnalysisStatus = "processing" | "completed" | "failed";

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
}
