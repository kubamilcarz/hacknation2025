'use client';

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AiFeedbackContextPayload, AiFeedbackService } from '@/lib/services/aiFeedbackService';
import { createAiFeedbackService } from '@/lib/services/aiFeedbackService';

type AiFeedbackStatus = 'idle' | 'debouncing' | 'loading' | 'success' | 'error';

type AiFeedbackState = {
	status: AiFeedbackStatus;
	message: string | null;
	error: string | null;
};

const IDLE_STATE: AiFeedbackState = {
	status: 'idle',
	message: null,
	error: null,
};

interface AiFeedbackContextValue {
	service: AiFeedbackService;
	debounceMs: number;
}

const AiFeedbackContext = createContext<AiFeedbackContextValue | undefined>(undefined);

interface AiFeedbackProviderProps {
	children: ReactNode;
	service?: AiFeedbackService;
	debounceMs?: number;
}

export function AiFeedbackProvider({ children, service, debounceMs = 3000 }: AiFeedbackProviderProps) {
	const serviceInstance = useMemo(() => service ?? createAiFeedbackService(), [service]);
	const contextValue = useMemo<AiFeedbackContextValue>(
		() => ({ service: serviceInstance, debounceMs }),
		[serviceInstance, debounceMs],
	);

	return <AiFeedbackContext.Provider value={contextValue}>{children}</AiFeedbackContext.Provider>;
}

type UseAiFeedbackReturn = AiFeedbackState & {
	isIdle: boolean;
	isLoading: boolean;
	isError: boolean;
	isDebouncing: boolean;
	refresh: () => void;
};

interface UseAiFeedbackOptions {
	metadata?: Record<string, unknown>;
	context?: AiFeedbackContextPayload;
	debounceMs?: number;
}

export function useAiFeedback(
	fieldId: string,
	rawText: string | null | undefined,
	options?: UseAiFeedbackOptions,
): UseAiFeedbackReturn {
	const context = useContext(AiFeedbackContext);
	if (!context) {
		throw new Error('useAiFeedback must be used within AiFeedbackProvider');
	}

	const { service, debounceMs } = context;
	const metadata = options?.metadata;
	const contextPayload = options?.context;
	const customDebounceMs = options?.debounceMs;
	const [state, setState] = useState<AiFeedbackState>(IDLE_STATE);
	const debounceHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);
	const latestPayloadRef = useRef({ fieldId, metadata, contextPayload, normalizedText: '' });
	const previousTextRef = useRef<string | null>(null);
	const normalizedText = rawText?.trim() ?? '';
	const effectiveDebounceMs = useMemo(() => {
		if (typeof customDebounceMs === 'number') {
			return customDebounceMs;
		}
		return debounceMs;
	}, [customDebounceMs, debounceMs]);

	const clearPendingTimeout = useCallback(() => {
		if (debounceHandle.current) {
			clearTimeout(debounceHandle.current);
			debounceHandle.current = null;
		}
	}, []);

	useEffect(() => {
		latestPayloadRef.current = {
			fieldId,
			metadata,
			contextPayload,
			normalizedText,
		};
	}, [fieldId, metadata, contextPayload, normalizedText]);

	const triggerRequest = useCallback(() => {
		const { fieldId: activeField, metadata: activeMetadata, contextPayload: activeContext, normalizedText: text } =
			latestPayloadRef.current;
		if (!text) {
			setState(IDLE_STATE);
			return;
		}

		const currentRequestId = requestIdRef.current + 1;
		requestIdRef.current = currentRequestId;

		setState((prev) => ({
			status: 'loading',
			message: prev.status === 'success' ? prev.message : null,
			error: null,
		}));

		service
			.getFeedback({ fieldId: activeField, text, metadata: activeMetadata, context: activeContext })
			.then((response) => {
				if (requestIdRef.current !== currentRequestId) {
					return;
				}

				setState({ status: 'success', message: response.message, error: null });
			})
			.catch((error: unknown) => {
				if (requestIdRef.current !== currentRequestId) {
					return;
				}

				const message = error instanceof Error ? error.message : 'Nie udało się pobrać podpowiedzi.';
				setState({ status: 'error', message: null, error: message });
			});
	}, [service]);

	useEffect(() => {
		if (previousTextRef.current === normalizedText) {
			return () => {
				clearPendingTimeout();
			};
		}
		previousTextRef.current = normalizedText;

		clearPendingTimeout();

		if (!normalizedText) {
			startTransition(() => {
				setState(IDLE_STATE);
			});
			return () => {
				clearPendingTimeout();
			};
		}

		const delay = Math.max(0, effectiveDebounceMs ?? 0);
		if (delay === 0) {
			debounceHandle.current = setTimeout(() => {
				triggerRequest();
			}, 0);
			return () => {
				clearPendingTimeout();
			};
		}

		startTransition(() => {
			setState((prev) => ({
				status: 'debouncing',
				message: prev.message,
				error: null,
			}));
		});

		debounceHandle.current = setTimeout(() => {
			triggerRequest();
		}, delay);

		return () => {
			clearPendingTimeout();
		};
	}, [normalizedText, triggerRequest, clearPendingTimeout, effectiveDebounceMs]);

	const refresh = () => {
		clearPendingTimeout();
		const { normalizedText: text } = latestPayloadRef.current;
		if (!text) {
			setState(IDLE_STATE);
			return;
		}
		triggerRequest();
	};

	return {
		...state,
		isIdle: state.status === 'idle',
		isLoading: state.status === 'loading',
		isError: state.status === 'error',
		isDebouncing: state.status === 'debouncing',
		refresh,
	} satisfies UseAiFeedbackReturn;
}

