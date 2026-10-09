import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";

function destination(value: string | null) { return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard"; }

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code && hasSupabaseConfiguration()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination(searchParams.get("next")), origin));
  }
  return NextResponse.redirect(new URL("/login?auth=link-error", origin));
}
