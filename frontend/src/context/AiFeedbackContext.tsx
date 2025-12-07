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
	const [state, setState] = useState<AiFeedbackState>(IDLE_STATE);
	const debounceHandle = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);
	const normalizedText = rawText?.trim() ?? '';

	const clearPendingTimeout = useCallback(() => {
		if (debounceHandle.current) {
			clearTimeout(debounceHandle.current);
			debounceHandle.current = null;
		}
	}, []);

	const triggerRequest = useCallback(() => {
		const currentRequestId = requestIdRef.current + 1;
		requestIdRef.current = currentRequestId;

		setState((prev) => ({
			status: 'loading',
			message: prev.status === 'success' ? prev.message : null,
			error: null,
		}));

		service
			.getFeedback({ fieldId, text: normalizedText, metadata, context: contextPayload })
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
	}, [contextPayload, fieldId, metadata, normalizedText, service]);

	useEffect(() => {
		clearPendingTimeout();

		if (!normalizedText) {
			startTransition(() => {
				setState(IDLE_STATE);
			});
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
		}, debounceMs);

		return () => {
			clearPendingTimeout();
		};
	}, [normalizedText, debounceMs, triggerRequest, clearPendingTimeout]);

	const refresh = () => {
		clearPendingTimeout();
		if (!normalizedText) {
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

