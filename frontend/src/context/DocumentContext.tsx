"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  employeeDocumentService,
  type EmployeeDocumentListOptions,
  type EmployeeDocumentListResponse,
} from "@/lib/services/employeeDocumentService";
import type { EmployeeDocument } from "@/types/employeeDocument";

interface DocumentContextValue {
  documents: EmployeeDocument[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  loadDocuments: (options?: EmployeeDocumentListOptions) => Promise<EmployeeDocumentListResponse | null>;
  refresh: () => Promise<void>;
  uploadDocument: (file: File) => Promise<EmployeeDocument>;
  downloadOriginalDocument: (id: number) => Promise<void>;
  downloadAnonymizedDocument: (id: number) => Promise<void>;
  downloadAccidentCard: (id: number) => Promise<void>;
  getDocumentById: (id: number) => EmployeeDocument | undefined;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastOptionsRef = useRef<EmployeeDocumentListOptions | undefined>(undefined);
  const activeRequestIdRef = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadDocuments = useCallback(async (options?: EmployeeDocumentListOptions) => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    setIsLoading(true);
    setError(null);
    const mergedOptions = {
      pageSize,
      ...lastOptionsRef.current,
      ...options,
    } satisfies EmployeeDocumentListOptions;

    try {
      const response = await employeeDocumentService.list(mergedOptions);
      if (activeRequestIdRef.current !== requestId) {
        return null;
      }

      lastOptionsRef.current = {
        ...mergedOptions,
        page: response.page,
        pageSize: response.pageSize,
      } satisfies EmployeeDocumentListOptions;
      setDocuments(response.items);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setPage(response.page);
      setPageSize(response.pageSize);
      setHasLoaded(true);
      return response;
    } catch (err) {
      console.error(err);
      if (activeRequestIdRef.current === requestId) {
        setError("Nie udało się pobrać dokumentów.");
      }
      return null;
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [pageSize]);

  useEffect(() => {
    const shouldSkipInitialLoad =
      typeof window !== "undefined" && window.location.search.length > 1;

    if (shouldSkipInitialLoad) {
      return;
    }

    void loadDocuments();
  }, [loadDocuments]);

  const uploadDocument = useCallback(async (file: File) => {
    try {
      const created = await employeeDocumentService.upload(file);
      await loadDocuments({ page: 1 });
      return created;
    } catch (err) {
      console.error(err);
      throw new Error("Nie udało się wgrać dokumentu.");
    }
  }, [loadDocuments]);

  const downloadOriginalDocument = useCallback(async (id: number) => {
    await employeeDocumentService.downloadOriginal(id);
  }, []);

  const downloadAnonymizedDocument = useCallback(async (id: number) => {
    await employeeDocumentService.downloadAnonymized(id);
  }, []);

  const downloadAccidentCard = useCallback(async (id: number) => {
    await employeeDocumentService.downloadAccidentCard(id);
  }, []);

  const getDocumentById = useCallback(
    (id: number) => documents.find((document) => document.id === id),
    [documents]
  );

  const value = useMemo<DocumentContextValue>(
    () => ({
      documents,
      totalCount,
      totalPages,
      page,
      pageSize,
      isLoading,
      hasLoaded,
      error,
      loadDocuments,
      refresh: async () => {
        await loadDocuments();
      },
      uploadDocument,
      downloadOriginalDocument,
      downloadAnonymizedDocument,
      downloadAccidentCard,
      getDocumentById,
    }),
    [
      documents,
      totalCount,
      totalPages,
      page,
      pageSize,
      isLoading,
      hasLoaded,
      error,
      loadDocuments,
      uploadDocument,
      downloadOriginalDocument,
      downloadAnonymizedDocument,
      downloadAccidentCard,
      getDocumentById,
    ]
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }

  return context;
}
