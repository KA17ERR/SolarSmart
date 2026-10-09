export type SupabaseConfiguration = { url: string; publishableKey: string };

export function getSupabaseConfiguration(): SupabaseConfiguration | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !publishableKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) return null;
  } catch { return null; }
  return { url, publishableKey };
}

export function hasSupabaseConfiguration() { return getSupabaseConfiguration() !== null; }
