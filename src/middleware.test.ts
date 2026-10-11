import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  config: null as { url: string; publishableKey: string } | null,
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfiguration: () => mocks.config }));

import { middleware } from "./middleware";

describe("Supabase session middleware", () => {
  afterEach(() => {
    mocks.config = null;
    mocks.createServerClient.mockReset();
  });

  it("passes refreshed cookies and anti-cache headers through to Amplify", async () => {
    mocks.config = { url: "https://project.supabase.co", publishableKey: "public-key" };
    mocks.createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getClaims: async () => {
          options.cookies.setAll(
            [{ name: "sb-project-auth-token", value: "fresh-token", options: { httpOnly: true, secure: true, path: "/" } }],
            { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" },
          );
          return { data: { claims: { sub: "user-id" } }, error: null };
        },
      },
    }));

    const response = await middleware(new NextRequest("https://solarsmart.example/dashboard"));

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe("fresh-token");
  });

  it("redirects protected planner URLs to login while preserving the intended destination", async () => {
    const response = await middleware(new NextRequest("https://solarsmart.example/planner?project=abc"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://solarsmart.example/login?next=%2Fplanner%3Fproject%3Dabc");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("protects assessment routes and preserves nested destinations", async () => {
    const response = await middleware(new NextRequest("https://solarsmart.example/assessment/insights/consumption-savings?scenario=balanced"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://solarsmart.example/login?next=%2Fassessment%2Finsights%2Fconsumption-savings%3Fscenario%3Dbalanced");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("fails closed when Supabase cannot verify a session", async () => {
    mocks.config = { url: "https://project.supabase.co", publishableKey: "public-key" };
    mocks.createServerClient.mockReturnValue({ auth: { getClaims: async () => ({ data: { claims: null }, error: new Error("session unavailable") }) } });
    const response = await middleware(new NextRequest("https://solarsmart.example/dashboard"));
    expect(response.headers.get("location")).toBe("https://solarsmart.example/login?next=%2Fdashboard");
  });

  it("allows a verified session into the planner without caching private pages", async () => {
    mocks.config = { url: "https://project.supabase.co", publishableKey: "public-key" };
    mocks.createServerClient.mockReturnValue({ auth: { getClaims: async () => ({ data: { claims: { sub: "user-1" } }, error: null }) } });
    const response = await middleware(new NextRequest("https://solarsmart.example/planner"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
