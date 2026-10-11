import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfiguration } from "@/lib/supabase/config";

function isProtectedPath(pathname: string) {
  return pathname === "/planner" || pathname.startsWith("/planner/")
    || pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    || pathname === "/assessment" || pathname.startsWith("/assessment/")
    || pathname === "/account/update-password";
}

function loginRedirect(request: NextRequest, response?: NextResponse) {
  const target = request.nextUrl.clone();
  const next = `${target.pathname}${target.search}`;
  target.pathname = "/login";
  target.search = "";
  target.searchParams.set("next", next);
  const redirectResponse = NextResponse.redirect(target);
  response?.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie));
  redirectResponse.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  redirectResponse.headers.set("Expires", "0");
  redirectResponse.headers.set("Pragma", "no-cache");
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const protectedPath = isProtectedPath(request.nextUrl.pathname);
  const config = getSupabaseConfiguration();
  if (!config) return protectedPath ? loginRedirect(request) : NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, cacheHeaders) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  let authenticated = false;
  try {
    const { data } = await supabase.auth.getClaims();
    authenticated = Boolean(data?.claims?.sub);
  } catch { /* Protected routes fail closed; public pages stay available through auth outages. */ }

  if (protectedPath) {
    if (!authenticated) return loginRedirect(request, response);
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
    response.headers.set("Expires", "0");
    response.headers.set("Pragma", "no-cache");
  }
  return response;
}

export const config = {
  matcher: ["/planner/:path*", "/login", "/dashboard/:path*", "/assessment/:path*", "/account/update-password"],
};
