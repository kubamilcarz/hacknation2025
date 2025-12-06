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
import { documentService } from "@/lib/services/documentService";
import type {
  DocumentListOptions,
  DocumentListResponse,
} from "@/lib/services/documentService";
import {
  type CaseDocument,
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from "@/types/case-document";

interface DocumentContextValue {
  documents: CaseDocument[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  loadDocuments: (options?: DocumentListOptions) => Promise<DocumentListResponse | null>;
  refresh: () => Promise<void>;
  createDocument: (payload: CreateDocumentInput) => Promise<CaseDocument>;
  updateDocument: (id: string, payload: UpdateDocumentInput) => Promise<CaseDocument>;
  getDocumentById: (id: string) => CaseDocument | undefined;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastOptionsRef = useRef<DocumentListOptions | undefined>(undefined);
  const activeRequestIdRef = useRef(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadDocuments = useCallback(async (options?: DocumentListOptions) => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    setIsLoading(true);
    setError(null);
    const mergedOptions = {
      pageSize,
      ...lastOptionsRef.current,
      ...options,
    } satisfies DocumentListOptions;

    try {
      const response = await documentService.list(mergedOptions);
      if (activeRequestIdRef.current !== requestId) {
        return null;
      }

      lastOptionsRef.current = {
        ...mergedOptions,
        page: response.page,
        pageSize: response.pageSize,
      } satisfies DocumentListOptions;
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

  const createDocument = useCallback(async (payload: CreateDocumentInput) => {
    try {
      const created = await documentService.create(payload);
      await loadDocuments({ page: 1 });
      return created;
    } catch (err) {
      console.error(err);
      throw new Error("Nie udało się utworzyć dokumentu.");
    }
  }, [loadDocuments]);

  const updateDocument = useCallback(async (id: string, payload: UpdateDocumentInput) => {
    try {
      const updated = await documentService.update(id, payload);
      await loadDocuments();
      return updated;
    } catch (err) {
      console.error(err);
      throw new Error("Nie udało się zaktualizować dokumentu.");
    }
  }, [loadDocuments]);

  const getDocumentById = useCallback(
    (id: string) => documents.find((document) => document.documentId === id),
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
      createDocument,
      updateDocument,
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
      createDocument,
      updateDocument,
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
