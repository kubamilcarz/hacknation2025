export type AiFeedbackMode = "mock" | "api";

export interface AiFeedbackRequest {
	fieldId: string;
	text: string;
	locale?: string;
	metadata?: Record<string, unknown>;
}

export interface AiFeedbackResponse {
	message: string;
	metadata?: Record<string, unknown>;
}

export interface AiFeedbackService {
	getFeedback(request: AiFeedbackRequest): Promise<AiFeedbackResponse>;
}

const DEFAULT_ENDPOINT = "/api/ai-feedback";
const DEFAULT_MODE: AiFeedbackMode =
	typeof process !== "undefined" && process.env.NEXT_PUBLIC_AI_FEEDBACK_MODE === "api"
		? "api"
		: "mock";

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
	constructor(private readonly endpoint: string = DEFAULT_ENDPOINT) {}

	async getFeedback(request: AiFeedbackRequest): Promise<AiFeedbackResponse> {
		const response = await fetch(this.endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
			cache: "no-store",
		});

		if (!response.ok) {
			throw new Error("Serwer nie zwrócił podpowiedzi (błąd AI). Spróbuj ponownie później.");
		}

		const payload = (await response.json()) as Partial<AiFeedbackResponse> | null;
		if (!payload || typeof payload.message !== "string") {
			throw new Error("Otrzymano niepełną odpowiedź z usługi AI.");
		}

		return {
			message: payload.message,
			metadata: payload.metadata ?? undefined,
		} satisfies AiFeedbackResponse;
	}
}

interface CreateAiFeedbackServiceOptions {
	endpoint?: string;
	mockLatencyMs?: number;
}

export function createAiFeedbackService(
	mode: AiFeedbackMode = DEFAULT_MODE,
	options: CreateAiFeedbackServiceOptions = {},
): AiFeedbackService {
	if (mode === "api") {
		return new ApiAiFeedbackService(options.endpoint ?? DEFAULT_ENDPOINT);
	}

	return new MockAiFeedbackService(options.mockLatencyMs ?? 1200);
}

export const defaultAiFeedbackService = createAiFeedbackService(DEFAULT_MODE);