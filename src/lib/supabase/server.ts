import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfiguration } from "./config";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfiguration();
  if (!config) throw new Error("Supabase is not configured.");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server components cannot write cookies; middleware refreshes sessions. */ }
      },
    },
  });
}
