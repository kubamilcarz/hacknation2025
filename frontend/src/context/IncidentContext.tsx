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
import { incidentService } from "@/lib/services/incidentService";
import type {
  IncidentListOptions,
  IncidentListResponse,
} from "@/lib/services/incidentService";
import {
  type CreateIncidentInput,
  type Incident,
  type UpdateIncidentInput,
} from "@/types/incident";

interface IncidentContextValue {
  incidents: Incident[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  loadIncidents: (options?: IncidentListOptions) => Promise<IncidentListResponse | null>;
  refresh: () => Promise<void>;
  createIncident: (payload: CreateIncidentInput) => Promise<Incident>;
  updateIncident: (id: string, payload: UpdateIncidentInput) => Promise<Incident>;
  getIncidentById: (id: string) => Incident | undefined;
}

const IncidentContext = createContext<IncidentContextValue | null>(null);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastOptionsRef = useRef<IncidentListOptions | undefined>(undefined);

  const loadIncidents = useCallback(async (options?: IncidentListOptions) => {
    setIsLoading(true);
    setError(null);
    const mergedOptions = {
      pageSize,
      ...lastOptionsRef.current,
      ...options,
    } satisfies IncidentListOptions;

    try {
      const response = await incidentService.list(mergedOptions);
      lastOptionsRef.current = {
        ...mergedOptions,
        page: response.page,
        pageSize: response.pageSize,
      } satisfies IncidentListOptions;
      setIncidents(response.items);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setPage(response.page);
      setPageSize(response.pageSize);
      return response;
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać zgłoszeń.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const createIncident = useCallback(async (payload: CreateIncidentInput) => {
    try {
      const created = await incidentService.create(payload);
      await loadIncidents({ page: 1 });
      return created;
    } catch (err) {
      console.error(err);
      throw new Error("Nie udało się utworzyć zgłoszenia.");
    }
  }, [loadIncidents]);

  const updateIncident = useCallback(async (id: string, payload: UpdateIncidentInput) => {
    try {
      const updated = await incidentService.update(id, payload);
      await loadIncidents();
      return updated;
    } catch (err) {
      console.error(err);
      throw new Error("Nie udało się zaktualizować zgłoszenia.");
    }
  }, [loadIncidents]);

  const getIncidentById = useCallback(
    (id: string) => incidents.find((incident) => incident.id === id),
    [incidents]
  );

  const value = useMemo<IncidentContextValue>(
    () => ({
      incidents,
      totalCount,
      totalPages,
      page,
      pageSize,
      isLoading,
      error,
      loadIncidents,
      refresh: async () => {
        await loadIncidents();
      },
      createIncident,
      updateIncident,
      getIncidentById,
    }),
    [
      incidents,
      totalCount,
      totalPages,
      page,
      pageSize,
      isLoading,
      error,
      loadIncidents,
      createIncident,
      updateIncident,
      getIncidentById,
    ]
  );

  return <IncidentContext.Provider value={value}>{children}</IncidentContext.Provider>;
}

export function useIncidents() {
  const context = useContext(IncidentContext);
  if (!context) {
    throw new Error("useIncidents must be used within an IncidentProvider");
  }

  return context;
}
