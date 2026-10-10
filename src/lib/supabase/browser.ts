"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfiguration } from "./config";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;
let browserClient: BrowserSupabaseClient | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const config = getSupabaseConfiguration();
  if (!config) return null;
  browserClient = createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
