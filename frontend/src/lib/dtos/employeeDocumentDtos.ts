export type EmployeeDocumentAnalysisStatusDto = "processing" | "completed" | "failed";

export interface EmployeeDocumentListItemDto {
  id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_url: string;
  uploaded_at: string;
  incident_description: string;
  analysis_status: EmployeeDocumentAnalysisStatusDto;
  description_source: "ai" | "manual";
  assessment: {
    suddenness: EmployeeDocumentAssessmentEntryDto;
    external_cause: EmployeeDocumentAssessmentEntryDto;
    injury: EmployeeDocumentAssessmentEntryDto;
    work_relation: EmployeeDocumentAssessmentEntryDto;
  };
}

export interface EmployeeDocumentAssessmentEntryDto {
  status: "met" | "partial" | "unmet";
  summary: string;
  recommendation?: string;
}

export type EmployeeDocumentDetailDto = EmployeeDocumentListItemDto;

export interface EmployeeDocumentListResponseDto {
  items: EmployeeDocumentListItemDto[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface CreateEmployeeDocumentDto {
  file_name: string;
  file_size: number;
  file_type: string;
  storage_url: string;
  uploaded_at: string;
  incident_description: string;
  analysis_status: EmployeeDocumentAnalysisStatusDto;
  description_source: "ai" | "manual";
  assessment: {
    suddenness: EmployeeDocumentAssessmentEntryDto;
    external_cause: EmployeeDocumentAssessmentEntryDto;
    injury: EmployeeDocumentAssessmentEntryDto;
    work_relation: EmployeeDocumentAssessmentEntryDto;
  };
}
