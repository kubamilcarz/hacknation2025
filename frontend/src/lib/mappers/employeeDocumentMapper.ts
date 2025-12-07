import type {
  CreateEmployeeDocumentDto,
  EmployeeDocumentDetailDto,
  EmployeeDocumentListItemDto,
} from "@/lib/dtos/employeeDocumentDtos";
import type { EmployeeDocument } from "@/types/employeeDocument";

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
  };
}
