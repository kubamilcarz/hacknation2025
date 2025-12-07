import type {
  CreateEmployeeDocumentDto,
  EmployeeDocumentDetailDto,
  EmployeeDocumentListItemDto,
  EmployeeDocumentAssessmentEntryDto,
} from "@/lib/dtos/employeeDocumentDtos";
import type { EmployeeDocument, EmployeeDocumentAssessmentEntry } from "@/types/employeeDocument";

export function mapEmployeeDocumentDetailDtoToDomain(dto: EmployeeDocumentDetailDto): EmployeeDocument {
  return {
    id: dto.id,
    fileName: dto.file_name,
    fileSize: dto.file_size,
    fileType: dto.file_type,
    storageUrl: dto.storage_url,
    uploadedAt: dto.uploaded_at,
    incidentDescription: dto.incident_description,
    analysisStatus: dto.analysis_status,
    descriptionSource: dto.description_source,
    assessment: mapAssessmentDtoToDomain(dto.assessment),
  };
}

export function mapEmployeeDocumentListItemDtoToDomain(dto: EmployeeDocumentListItemDto): EmployeeDocument {
  return mapEmployeeDocumentDetailDtoToDomain(dto);
}

export function mapEmployeeDocumentToDetailDto(document: EmployeeDocument): EmployeeDocumentDetailDto {
  return {
    id: document.id,
    file_name: document.fileName,
    file_size: document.fileSize,
    file_type: document.fileType,
    storage_url: document.storageUrl,
    uploaded_at: document.uploadedAt,
    incident_description: document.incidentDescription,
    analysis_status: document.analysisStatus,
    description_source: document.descriptionSource,
    assessment: mapAssessmentDomainToDto(document.assessment),
  };
}

export function mapCreateEmployeeDocumentDtoToDomain(dto: CreateEmployeeDocumentDto, id: number): EmployeeDocument {
  return {
    id,
    fileName: dto.file_name,
    fileSize: dto.file_size,
    fileType: dto.file_type,
    storageUrl: dto.storage_url,
    uploadedAt: dto.uploaded_at,
    incidentDescription: dto.incident_description,
    analysisStatus: dto.analysis_status,
    descriptionSource: dto.description_source,
    assessment: mapAssessmentDtoToDomain(dto.assessment),
  };
}

function mapAssessmentDtoToDomain(dto: EmployeeDocumentDetailDto["assessment"]): EmployeeDocument["assessment"] {
  return {
    suddenness: mapAssessmentEntryDto(dto.suddenness),
    externalCause: mapAssessmentEntryDto(dto.external_cause),
    injury: mapAssessmentEntryDto(dto.injury),
    workRelation: mapAssessmentEntryDto(dto.work_relation),
  };
}

function mapAssessmentEntryDto(entry: EmployeeDocumentAssessmentEntryDto): EmployeeDocumentAssessmentEntry {
  return {
    status: entry.status,
    summary: entry.summary,
    recommendation: entry.recommendation,
  };
}

function mapAssessmentDomainToDto(assessment: EmployeeDocument["assessment"]): EmployeeDocumentDetailDto["assessment"] {
  return {
    suddenness: mapAssessmentEntryToDto(assessment.suddenness),
    external_cause: mapAssessmentEntryToDto(assessment.externalCause),
    injury: mapAssessmentEntryToDto(assessment.injury),
    work_relation: mapAssessmentEntryToDto(assessment.workRelation),
  };
}

function mapAssessmentEntryToDto(entry: EmployeeDocumentAssessmentEntry): EmployeeDocumentAssessmentEntryDto {
  return {
    status: entry.status,
    summary: entry.summary,
    recommendation: entry.recommendation,
  };
}
