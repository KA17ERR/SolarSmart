import { buildAssistantFallback } from "@/lib/ai/fallback";
import { isAssistantReply, type AssistantReply, type AssistantRequest } from "@/lib/assistant/contract";

export interface AssessmentAssistantService {
  answer(request: AssistantRequest, signal?: AbortSignal): Promise<AssistantReply>;
}

/** Same-origin request only. Provider access and secrets are confined to the server route. */
export class LocalFirstAssessmentAssistant implements AssessmentAssistantService {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async answer(request: AssistantRequest, signal?: AbortSignal): Promise<AssistantReply> {
    try {
      const response = await this.fetcher("/api/assistant", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(request), signal: signal ?? AbortSignal.timeout(12_000), cache: "no-store",
      });
      if (response.status === 429) return buildAssistantFallback(request, "The assistant request limit was reached; deterministic local guidance is shown.");
      if (!response.ok) return buildAssistantFallback(request, "The assistant service is unavailable; deterministic local guidance is shown.");
      const payload: unknown = await response.json();
      if (isAssistantReply(payload)) return payload;
      return buildAssistantFallback(request, "The assistant response could not be validated; deterministic local guidance is shown.");
    } catch {
      return buildAssistantFallback(request, "The assistant request failed or timed out; deterministic local guidance is shown.");
    }
  }
}

export const assessmentAssistantService: AssessmentAssistantService = new LocalFirstAssessmentAssistant();
