import type { EmployeeDocumentService } from "@/lib/services/employeeDocumentService";
import { employeeDocumentService, formatFileSize, formatStatus } from "@/lib/services/employeeDocumentService";
import type { EmployeeDocument } from "@/types/employeeDocument";

export interface DocumentDetailMetadataCard {
  label: string;
  value: string;
}

export interface DocumentPreviewHandle {
  url: string;
  release: () => void;
}

export const DOCUMENT_DETAIL_ASSESSMENT_SECTIONS = [
  { key: "suddenness", label: "Nagłość", helper: "Czy zdarzenie nastąpiło w krótkim czasie." },
  { key: "externalCause", label: "Przyczyna zewnętrzna", helper: "Czy wystąpił czynnik spoza organizmu." },
  { key: "injury", label: "Uraz", helper: "Czy doszło do uszkodzenia ciała lub zdrowia." },
  { key: "workRelation", label: "Związek z pracą", helper: "Czy zdarzenie pozostaje w związku z obowiązkami." },
] as const;

export type DocumentDetailAssessmentSection = (typeof DOCUMENT_DETAIL_ASSESSMENT_SECTIONS)[number];
export type DocumentDetailAssessmentKey = DocumentDetailAssessmentSection["key"];

type AssessmentStatus = EmployeeDocument["assessment"]["suddenness"]["status"];

type DocumentDetailServiceDependencies = Pick<EmployeeDocumentService, "getById" | "getOriginalFile">;

const DESCRIPTION_SOURCE_LABEL: Record<EmployeeDocument["descriptionSource"], string> = {
  ai: "Opis wygenerowany przez AI",
  manual: "Opis dodany ręcznie",
};

const ASSESSMENT_STATUS_LABEL: Record<AssessmentStatus, string> = {
  met: "Spełniona",
  partial: "Niepełna",
  unmet: "Niespełniona",
};

class DocumentDetailService {
  constructor(private readonly documents: DocumentDetailServiceDependencies) {}

  async fetchDocument(documentId: number): Promise<EmployeeDocument | null> {
    if (Number.isNaN(documentId)) {
      return null;
    }
    return this.documents.getById(documentId);
  }

  async createPreview(documentId: number): Promise<DocumentPreviewHandle> {
    const blob = await this.documents.getOriginalFile(documentId);
    const url = URL.createObjectURL(blob);
    let released = false;

    return {
      url,
      release: () => {
        if (!released) {
          URL.revokeObjectURL(url);
          released = true;
        }
      },
    } satisfies DocumentPreviewHandle;
  }

  buildMetadataCards(document: EmployeeDocument | null | undefined): DocumentDetailMetadataCard[] {
    if (!document) {
      return [];
    }

    return [
      { label: "ID dokumentu", value: document.id != null ? `#${document.id}` : "Brak danych" },
      { label: "Rozmiar pliku", value: formatFileSize(document.fileSize) },
      { label: "Status analizy", value: formatStatus(document.analysisStatus) },
      { label: "Źródło opisu", value: this.getDescriptionSourceLabel(document.descriptionSource) },
    ];
  }

  getAssessmentEntry(document: EmployeeDocument | null | undefined, key: DocumentDetailAssessmentKey) {
    if (!document) {
      return null;
    }

    return document.assessment[key] ?? null;
  }

  getAssessmentSections() {
    return DOCUMENT_DETAIL_ASSESSMENT_SECTIONS;
  }

  getAssessmentStatusLabel(status: AssessmentStatus) {
    return ASSESSMENT_STATUS_LABEL[status];
  }

  getAssessmentStatusClasses(status: AssessmentStatus) {
    switch (status) {
      case "met":
        return "bg-(--color-success-soft) text-(--color-success) border-(--color-success)";
      case "partial":
        return "bg-(--color-warning-soft) text-(--color-warning) border-(--color-warning)";
      case "unmet":
      default:
        return "bg-(--color-error-soft) text-(--color-error) border-(--color-error)";
    }
  }

  getAssessmentCardOutline(status: AssessmentStatus) {
    switch (status) {
      case "met":
        return "border-(--color-success-softest) bg-(--color-success-softest)";
      case "partial":
        return "border-(--color-warning-softest) bg-(--color-warning-softest)";
      case "unmet":
      default:
        return "border-(--color-error-softest) bg-(--color-error-softest)";
    }
  }

  getStatusBadgeClasses(status: EmployeeDocument["analysisStatus"]) {
    switch (status) {
      case "completed":
        return "border-(--color-success) bg-(--color-success-soft) text-(--color-success)";
      case "processing":
        return "border-(--color-accent) bg-(--color-accent-soft) text-(--color-accent-text)";
      case "failed":
        return "border-(--color-error) bg-(--color-error-soft) text-(--color-error)";
      default:
        return "border-subtle bg-surface text-secondary";
    }
  }

  getDescriptionSourceLabel(source: EmployeeDocument["descriptionSource"] | undefined) {
    if (!source) {
      return "Brak danych";
    }
    return DESCRIPTION_SOURCE_LABEL[source] ?? "Brak danych";
  }

  formatUploadDate(iso: string | null | undefined) {
    if (!iso) {
      return "Brak danych";
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString("pl-PL", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }
}

export const documentDetailService = new DocumentDetailService(employeeDocumentService);
