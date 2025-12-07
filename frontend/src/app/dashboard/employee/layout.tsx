"use client";

import { useMemo } from 'react';
import { AiFeedbackProvider } from '@/context/AiFeedbackContext';
import { createAiFeedbackService, type AiFeedbackMode, type AiFeedbackRequest } from '@/lib/services/aiFeedbackService';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const envMode =
    (process.env.NEXT_PUBLIC_EMPLOYEE_AI_FEEDBACK_MODE as AiFeedbackMode | undefined) ??
    (process.env.NEXT_PUBLIC_AI_FEEDBACK_MODE as AiFeedbackMode | undefined);
  const mode: AiFeedbackMode = envMode ?? 'api';
  const service = useMemo(
    () =>
      createAiFeedbackService(mode, {
        endpoint: buildEndpoint(process.env.NEXT_PUBLIC_BACKEND_URL, '/api/suggested-response/'),
        requestMapper: buildSuggestedResponsePayload,
      }),
    [mode],
  );

  return <AiFeedbackProvider service={service}>{children}</AiFeedbackProvider>;
}

function buildEndpoint(baseUrl: string | undefined, path: string) {
  const normalizedBase = (baseUrl ?? 'http://localhost:8000').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function buildSuggestedResponsePayload(request: AiFeedbackRequest) {
  const metadata = toRecord(request.metadata);
  const contextData = toRecord(request.context?.documentData);
  const documentFromMetadata = toRecord(metadata.document || metadata.documentData);

  const sectionLabel = firstString(
    metadata.sectionLabel,
    metadata.section,
    metadata.sectionKey,
    request.fieldId,
  );
  const statusLabel = firstString(
    metadata.assessmentStatusLabel,
    metadata.statusLabel,
    metadata.assessmentStatus,
  );
  const summary = firstString(metadata.assessmentSummary, metadata.summary);
  const incidentDescription = firstString(
    metadata.incidentDescription,
    readString(documentFromMetadata, 'incidentDescription'),
    readString(contextData, 'incidentDescription'),
  );
  const previousRecommendation = firstString(
    metadata.previousRecommendation,
    readString(documentFromMetadata, 'previousRecommendation'),
  );

  const payload: Record<string, unknown> = {
    sectionLabel: sectionLabel || request.fieldId || 'Przesłanka',
    statusLabel: statusLabel || 'Ocena nieznana',
    summary: summary || 'Brak podsumowania.',
  };

  if (incidentDescription) {
    payload.incidentDescription = incidentDescription;
  }
  if (previousRecommendation) {
    payload.previousRecommendation = previousRecommendation;
  }

  const contextPayload: Record<string, unknown> = {
    fieldId: request.fieldId,
    prompt: request.text,
  };

  if (metadata.sectionKey) {
    contextPayload.sectionKey = metadata.sectionKey;
  }
  if (metadata.assessmentStatus) {
    contextPayload.assessmentStatus = metadata.assessmentStatus;
  }
  if (Object.keys(metadata).length > 0) {
    contextPayload.metadata = metadata;
  }
  if (request.context?.history) {
    contextPayload.history = request.context.history;
  }
  if (request.context?.documentData) {
    contextPayload.documentData = request.context.documentData;
  }

  payload.context = contextPayload;

  return payload;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function firstString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return '';
}
