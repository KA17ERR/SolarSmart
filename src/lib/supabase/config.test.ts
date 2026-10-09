import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseConfiguration, hasSupabaseConfiguration } from "./config";

describe("optional Supabase configuration", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("keeps account integration disabled when no credentials are configured", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(hasSupabaseConfiguration()).toBe(false);
    expect(getSupabaseConfiguration()).toBeNull();
  });
  it("accepts an https project URL and publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_demo");
    expect(getSupabaseConfiguration()).toEqual({ url: "https://example.supabase.co", publishableKey: "sb_publishable_demo" });
  });
  it("rejects insecure remote URLs but permits local Supabase development", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-demo");
    expect(hasSupabaseConfiguration()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    expect(hasSupabaseConfiguration()).toBe(true);
  });
  it("supports the legacy anon key variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-public-demo");
    expect(getSupabaseConfiguration()?.publishableKey).toBe("legacy-public-demo");
  });
});
