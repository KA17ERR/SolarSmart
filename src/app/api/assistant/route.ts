import { NextRequest, NextResponse } from "next/server";
import { buildAssistantFallback } from "@/lib/ai/fallback";
import { isAssistantRequest, isAssistantReply, type AssistantReply, type AssistantRequest } from "@/lib/assistant/contract";
import { getAssistantApiKey } from "@/lib/aws/assistant-api-key";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_BODY_CHARS = 16_000;
const MAX_UPSTREAM_CHARS = 2_500;
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 15;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

function clientKey(request: NextRequest): string {
  // Hash-free, short-lived in-memory key only; never logged or persisted.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) || "local";
}

function withinLimit(key: string, now: number): boolean {
  const current = requestWindows.get(key);
  if (!current || now >= current.resetAt) {
    requestWindows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (requestWindows.size > 2000) for (const [entry, window] of requestWindows) if (now >= window.resetAt) requestWindows.delete(entry);
    return true;
  }
  if (current.count >= REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function safeEndpoint(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "host.docker.internal"].includes(url.hostname))) return url;
  } catch { /* Invalid server configuration uses the local fallback. */ }
  return null;
}

function isLocalEndpoint(endpoint: URL): boolean {
  return ["localhost", "127.0.0.1", "host.docker.internal"].includes(endpoint.hostname);
}

async function hasVerifiedUserSession(): Promise<boolean> {
  if (!hasSupabaseConfiguration()) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    return !error && Boolean(data.user?.id);
  } catch {
    return false;
  }
}

function normalizedLocal(request: AssistantRequest, status: string): AssistantReply {
  const reply = buildAssistantFallback(request, status);
  if (isAssistantReply(reply)) return reply;
  return buildAssistantFallback(request, "Local assistant used because a response could not be validated.");
}

/** Same-origin, server-only bridge. No model keys or upstream endpoint are placed in client code. */
export async function POST(request: NextRequest) {
  if (!withinLimit(clientKey(request), Date.now())) return jsonError(429, "Assistant request limit reached. Please wait a minute and try again.");
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return jsonError(413, "Assistant request is too large.");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return jsonError(400, "Send a valid SolarSmart assistant request."); }
  if (!isAssistantRequest(body)) return jsonError(400, "The assessment summary or question is invalid.");

  const endpoint = safeEndpoint(process.env.SOLARSMART_AI_ENDPOINT);
  if (!endpoint) return NextResponse.json(normalizedLocal(body, "Strands is not configured on this server; the local assistant answered."), { headers: { "cache-control": "no-store" } });

  const localEndpoint = isLocalEndpoint(endpoint);
  if (!localEndpoint && !await hasVerifiedUserSession()) {
    return NextResponse.json(normalizedLocal(body, "Sign in to use the hosted assistant; deterministic local guidance is shown."), { headers: { "cache-control": "no-store" } });
  }

  const apiKey = await getAssistantApiKey();
  if (!localEndpoint && !apiKey) {
    return NextResponse.json(normalizedLocal(body, "The hosted assistant is not securely configured; deterministic local guidance is shown."), { headers: { "cache-control": "no-store" } });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: "POST", headers: {
        "content-type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      // The SAM function validates the same typed summary before passing it to Strands.
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) throw new Error("upstream unavailable");
    const text = await upstream.text();
    if (text.length > MAX_UPSTREAM_CHARS) throw new Error("upstream response too large");
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) throw new Error("invalid upstream response");
    const data = parsed as { mode?: unknown; narrative?: unknown };
    if (data.mode !== "strands" || typeof data.narrative !== "string" || !data.narrative.trim() || data.narrative.length > 1400 || /\d/.test(data.narrative)) {
      return NextResponse.json(normalizedLocal(body, "The optional model is unavailable or returned an unusable answer; local guidance is shown."), { headers: { "cache-control": "no-store" } });
    }
    const local = normalizedLocal(body, "Optional Strands answer generated server-side. Displayed numbers remain SolarSmart calculation outputs.");
    const reply: AssistantReply = { ...local, mode: "strands", status: "Optional Strands answer generated server-side. Displayed numbers remain SolarSmart calculation outputs.", narrative: data.narrative.trim() };
    return NextResponse.json(reply, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json(normalizedLocal(body, "The optional model could not be reached; deterministic local guidance is shown."), { headers: { "cache-control": "no-store" } });
  }
}
