export type AiFeedbackMode = "mock" | "api";

export interface AiFeedbackRequest {
	fieldId: string;
	text: string;
	locale?: string;
	metadata?: Record<string, unknown>;
	context?: AiFeedbackContextPayload;
}

export interface AiFeedbackResponse {
	message: string;
	metadata?: Record<string, unknown>;
}

export interface AiFeedbackService {
	getFeedback(request: AiFeedbackRequest): Promise<AiFeedbackResponse>;
}

export interface AiFeedbackContextPayload {
	documentData?: unknown;
	history?: string;
}

const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const DEFAULT_ENDPOINT = buildEndpoint(DEFAULT_BACKEND_URL, "/api/user-recommendation/");
const DEFAULT_MODE: AiFeedbackMode =
	typeof process !== "undefined" && process.env.NEXT_PUBLIC_AI_FEEDBACK_MODE === "api"
		? "api"
		: "mock";

type BackendRequestMapper = (request: AiFeedbackRequest) => unknown;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MockAiFeedbackService implements AiFeedbackService {
	constructor(private readonly latencyMs: number = 1200) {}

	async getFeedback(request: AiFeedbackRequest): Promise<AiFeedbackResponse> {
		const trimmed = request.text.trim();
		await delay(this.latencyMs + Math.random() * 400);

		if (!trimmed) {
			return {
				message: "Dodaj kilka szczegółów, abyśmy mogli przygotować lepszą podpowiedź.",
			} satisfies AiFeedbackResponse;
		}

		const sentenceCount = Math.max(1, Math.ceil(trimmed.split(/[.!?]\s/).length));
		const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

		const suggestions: string[] = [];
		if (wordCount < 12) {
			suggestions.push("Dopisz jeszcze kilka informacji, np. kto był obecny i jakie warunki panowały.");
		}
		if (!/[\d]{2}:?[\d]{2}/.test(trimmed) && /czas|godz/i.test(request.fieldId)) {
			suggestions.push("Wspomnij orientacyjną godzinę lub przedział czasu.");
		}
		if (sentenceCount < 2) {
			suggestions.push("Rozbij opis na 2–3 krótkie zdania, aby był bardziej czytelny.");
		}

		if (suggestions.length === 0) {
			suggestions.push("Opis wygląda solidnie. Dodaj tylko szczegół potwierdzający przebieg zdarzenia, jeśli go pamiętasz.");
		}

		return {
			message: suggestions.join(" "),
		} satisfies AiFeedbackResponse;
	}
}

class ApiAiFeedbackService implements AiFeedbackService {
	constructor(
		private readonly endpoint: string = DEFAULT_ENDPOINT,
		private readonly requestMapper: BackendRequestMapper = buildBackendAiRequest,
	) {}

	async getFeedback(request: AiFeedbackRequest): Promise<AiFeedbackResponse> {
		const backendPayload = this.requestMapper(request);
		let response: Response;

		try {
			response = await fetch(this.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(backendPayload),
				cache: "no-store",
			});
		} catch (error) {
			console.error("Nie udało się skontaktować z usługą rekomendacji AI", error);
			throw new Error("Nie udało się połączyć z usługą rekomendacji. Spróbuj ponownie później.");
		}

		if (!response.ok) {
			const details = await safeReadBackendError(response);
			throw new Error(details ?? "Serwer rekomendacji zwrócił błąd. Spróbuj ponownie później.");
		}

		const rawBody = await response.text();
		const parsedPrimary = safeParseJson(rawBody);
		const parsed = typeof parsedPrimary === "string" ? safeParseJson(parsedPrimary) : parsedPrimary;
		const message = extractAiFeedbackMessage(parsed) ?? rawBody?.trim() ?? "";
		if (!message) {
			throw new Error("Otrzymano pustą odpowiedź z usługi rekomendacji.");
		}

		const metadata = buildAiFeedbackMetadata(parsed);
		return {
			message,
			metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
		} satisfies AiFeedbackResponse;
	}
}

interface CreateAiFeedbackServiceOptions {
	endpoint?: string;
	mockLatencyMs?: number;
	backendBaseUrl?: string;
	requestMapper?: BackendRequestMapper;
}

export function createAiFeedbackService(
	mode: AiFeedbackMode = DEFAULT_MODE,
	options: CreateAiFeedbackServiceOptions = {},
): AiFeedbackService {
	if (mode === "api") {
		const baseUrl = options.backendBaseUrl ?? DEFAULT_BACKEND_URL;
		const endpoint = options.endpoint ?? buildEndpoint(baseUrl, "/api/user-recommendation/");
		const mapper = options.requestMapper ?? buildBackendAiRequest;
		return new ApiAiFeedbackService(endpoint, mapper);
	}

	return new MockAiFeedbackService(options.mockLatencyMs ?? 1200);
}

export const defaultAiFeedbackService = createAiFeedbackService(DEFAULT_MODE);

function buildBackendAiRequest(request: AiFeedbackRequest) {
	const documentData = resolveDocumentData(request);
	const history = typeof request.context?.history === "string" ? request.context?.history.trim() : "";
	const normalizedData = documentData && isPlainObject(documentData) ? { ...documentData } : {};
	if (request.fieldId && typeof request.text === "string") {
		(normalizedData as Record<string, unknown>)[request.fieldId] = request.text;
	}

	return {
		data: normalizedData,
		field_name: request.fieldId,
		history,
	};
}

function resolveDocumentData(request: AiFeedbackRequest) {
	const metadataDocument = request.metadata && isPlainObject(request.metadata)
		? (request.metadata.documentData ?? request.metadata.document ?? request.metadata.data)
		: undefined;
	if (metadataDocument) {
		return metadataDocument;
	}
	if (request.context?.documentData) {
		return request.context.documentData;
	}
	return undefined;
}

function extractAiFeedbackMessage(payload: unknown): string | null {
	if (typeof payload === "string") {
		return payload.trim() || null;
	}

	if (!isPlainObject(payload)) {
		return null;
	}

	const messageCandidates = [payload.message, payload.wiadomosc, payload.info];
	for (const candidate of messageCandidates) {
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return candidate.trim();
		}
	}

	return null;
}

function buildAiFeedbackMetadata(payload: unknown): Record<string, unknown> {
	if (!isPlainObject(payload)) {
		return {};
	}

	const fieldValue = typeof payload.wartosc_pola === "string" ? payload.wartosc_pola.trim() : undefined;
	const metadata: Record<string, unknown> = {};
	if (fieldValue) {
		metadata.fieldValue = fieldValue;
	}
	metadata.raw = payload;
	return metadata;
}

function safeParseJson(value: string | null | undefined) {
	if (!value) {
		return null;
	}
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

async function safeReadBackendError(response: Response) {
	try {
		const text = (await response.text()).trim();
		if (!text) {
			return null;
		}
		const parsed = safeParseJson(text);
		if (typeof parsed === "string" && parsed.trim()) {
			return parsed.trim();
		}
		if (isPlainObject(parsed)) {
			const detail = parsed.detail;
			if (typeof detail === "string" && detail.trim()) {
				return detail.trim();
			}
		}
		return text;
	} catch (error) {
		console.error("Nie udało się odczytać treści błędu AI", error);
		return null;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildEndpoint(baseUrl: string, path: string) {
	const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return trimmedBase ? `${trimmedBase}${normalizedPath}` : normalizedPath;
}