"use client";

import { useMemo } from 'react';
import { AiFeedbackProvider } from '@/context/AiFeedbackContext';
import { createAiFeedbackService, type AiFeedbackMode } from '@/lib/services/aiFeedbackService';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const mode = (process.env.NEXT_PUBLIC_AI_FEEDBACK_MODE as AiFeedbackMode | undefined) ?? 'mock';
  const service = useMemo(
    () =>
      createAiFeedbackService(mode, {
        endpoint: buildEndpoint(process.env.NEXT_PUBLIC_BACKEND_URL, '/api/suggested-response/'),
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
