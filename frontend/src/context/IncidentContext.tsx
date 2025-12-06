"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { incidentService } from "@/lib/services/incidentService";
import {
  type CreateIncidentInput,
  type Incident,
  type UpdateIncidentInput,
} from "@/types/incident";

interface IncidentContextValue {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createIncident: (payload: CreateIncidentInput) => Promise<Incident>;
  updateIncident: (id: string, payload: UpdateIncidentInput) => Promise<Incident>;
  getIncidentById: (id: string) => Incident | undefined;
}

const IncidentContext = createContext<IncidentContextValue | null>(null);

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await incidentService.list();
      setIncidents(data);
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać zgłoszeń.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
  }, [loadIncidents]);

  const createIncident = useCallback(async (payload: CreateIncidentInput) => {
    try {
      const created = await incidentService.create(payload);
      setIncidents((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      console.error(err);
      throw new Error("Nie udało się utworzyć zgłoszenia.");
    }
  }, []);

  const updateIncident = useCallback(async (id: string, payload: UpdateIncidentInput) => {
    try {
      const updated = await incidentService.update(id, payload);
      setIncidents((prev) =>
        prev.map((incident) => (incident.id === id ? updated : incident))
      );
      return updated;
    } catch (err) {
      console.error(err);
      throw new Error("Nie udało się zaktualizować zgłoszenia.");
    }
  }, []);

  const getIncidentById = useCallback(
    (id: string) => incidents.find((incident) => incident.id === id),
    [incidents]
  );

  const value = useMemo<IncidentContextValue>(
    () => ({
      incidents,
      isLoading,
      error,
      refresh: loadIncidents,
      createIncident,
      updateIncident,
      getIncidentById,
    }),
    [incidents, isLoading, error, loadIncidents, createIncident, updateIncident, getIncidentById]
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
