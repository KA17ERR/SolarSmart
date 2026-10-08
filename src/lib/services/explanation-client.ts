import type { SolarResults } from "@/lib/solar";

/** Calls the optional API only when explicitly configured; failures remain non-blocking. */
export async function requestOptionalExplanation(results: SolarResults): Promise<string | null> {
  const endpoint = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!endpoint) return null;
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/explain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ results }),
    signal: AbortSignal.timeout(4500),
  });
  if (!response.ok) throw new Error("The optional explanation service is unavailable.");
  const payload: unknown = await response.json();
  if (typeof payload === "object" && payload !== null && "explanation" in payload && typeof payload.explanation === "string") return payload.explanation;
  throw new Error("The optional explanation service returned an invalid response.");
}
