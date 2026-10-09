import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfiguration } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  const config = getSupabaseConfiguration();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  try { await supabase.auth.getClaims(); } catch { /* An optional auth outage must not block public demo pages. */ }
  return response;
}

export const config = {
  matcher: ["/planner", "/login", "/signup", "/forgot-password", "/dashboard/:path*", "/account/:path*", "/auth/:path*"],
};
