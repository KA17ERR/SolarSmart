import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { calculateSolar, DEFAULT_INPUTS } from "@/lib/solar";
import { buildRecommendations } from "@/lib/recommendations";
import { createAssistantRequest } from "@/lib/assistant/contract";

function makeRequest(ip: string) {
  const result = calculateSolar(DEFAULT_INPUTS);
  const payload = createAssistantRequest({ inputs: DEFAULT_INPUTS, result, question: "Explain my report", scenarioName: "Demo", recommendations: buildRecommendations(DEFAULT_INPUTS, result) });
  return new NextRequest("http://localhost/api/assistant", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(payload) });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("assistant server boundary", () => {
  it("uses deterministic local output and makes no upstream request when unconfigured", async () => {
    vi.stubEnv("SOLARSMART_AI_ENDPOINT", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(makeRequest("192.0.2.31"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("local");
    expect(body.status).toContain("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts only a validated qualitative model narrative and attaches engine facts", async () => {
    vi.stubEnv("SOLARSMART_AI_ENDPOINT", "https://assistant.example.test/explain");
    vi.stubEnv("SOLARSMART_AI_API_KEY", "server-only-test-key");
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "strands", narrative: "Exports use a distinct configured credit, so their value can differ from retail offsets." }), { status: 200 }));
    vi.stubGlobal("fetch", upstream);
    const response = await POST(makeRequest("192.0.2.32"));
    const body = await response.json();
    expect(body.mode).toBe("strands");
    expect(body.facts.some((fact: string) => fact.includes("Estimated annual generation"))).toBe(true);
    expect(upstream.mock.calls[0][1].headers["x-api-key"]).toBe("server-only-test-key");
  });

  it("rejects malformed input and falls back if the model returns numbers", async () => {
    vi.stubEnv("SOLARSMART_AI_ENDPOINT", "https://assistant.example.test/explain");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "strands", narrative: "Savings are 42 percent." }), { status: 200 })));
    const malformed = await POST(new NextRequest("http://localhost/api/assistant", { method: "POST", body: "{}", headers: { "x-forwarded-for": "192.0.2.33" } }));
    expect(malformed.status).toBe(400);
    const response = await POST(makeRequest("192.0.2.34"));
    expect((await response.json()).mode).toBe("local");
  });
});
