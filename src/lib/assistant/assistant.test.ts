import { describe, expect, it, vi } from "vitest";
import { calculateSolar, DEFAULT_INPUTS } from "@/lib/solar";
import { buildRecommendations } from "@/lib/recommendations";
import { buildAssistantFallback } from "@/lib/ai/fallback";
import { createAssistantRequest, isAssistantReply, isAssistantRequest } from "./contract";
import { LocalFirstAssessmentAssistant } from "@/lib/services/assessment-assistant";

function request(question = "Explain my assumptions") {
  const result = calculateSolar(DEFAULT_INPUTS);
  return createAssistantRequest({
    inputs: DEFAULT_INPUTS,
    result,
    question,
    scenarioName: "Balanced demo",
    recommendations: buildRecommendations(DEFAULT_INPUTS, result),
    scenarios: [{ name: "Small roof", source: "illustrative demo", systemKw: 3, annualGenerationKwh: 4000, annualSavingsUsd: 450, installationCostLowUsd: 4000, installationCostHighUsd: 6000, paybackYears: 12 }],
  });
}

describe("assessment assistant contract and deterministic fallback", () => {
  it("creates a bounded location-free summary from calculator results", () => {
    const summary = request();
    expect(isAssistantRequest(summary)).toBe(true);
    expect(summary.assessment.outputs.annualSavingsUsd).toBe(calculateSolar(DEFAULT_INPUTS).annualSavings);
    expect(JSON.stringify(summary)).not.toContain("cityOrPostcode");
    expect(JSON.stringify(summary)).not.toContain("roofImage");
  });

  it("rejects unexpected fields and impossible/non-finite values", () => {
    const withLocation = { ...request(), assessment: { ...request().assessment, cityOrPostcode: "Private" } };
    expect(isAssistantRequest(withLocation)).toBe(false);
    const withNaN = request();
    withNaN.assessment.outputs.annualSavingsUsd = Number.NaN;
    expect(isAssistantRequest(withNaN)).toBe(false);
    expect(isAssistantRequest({ ...request(), question: "x".repeat(1001) })).toBe(false);
  });

  it("answers report and scenario questions with actual engine summaries", () => {
    const answer = buildAssistantFallback(request("Compare the scenarios"));
    expect(answer.mode).toBe("local");
    expect(answer.facts.some(fact => fact.startsWith("Small roof:"))).toBe(true);
    expect(answer.assumptions.join(" ")).toContain("Generic yield");
    expect(isAssistantReply(answer)).toBe(true);
  });

  it("falls back locally on unavailable, malformed, and invalid server responses", async () => {
    const unavailable = new LocalFirstAssessmentAssistant(vi.fn().mockRejectedValue(new Error("offline")));
    expect((await unavailable.answer(request())).mode).toBe("local");
    const malformed = new LocalFirstAssessmentAssistant(vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    expect((await malformed.answer(request())).mode).toBe("local");
    const rateLimited = new LocalFirstAssessmentAssistant(vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    expect((await rateLimited.answer(request())).status).toContain("limit");
  });
});
