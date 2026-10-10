import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthDemoPage } from "@/components/auth-demo-page";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in · SolarSmart" };

function safeDestination(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/dashboard";
  const target = new URL(value, "https://solarsmart.invalid");
  return target.origin === "https://solarsmart.invalid" ? `${target.pathname}${target.search}${target.hash}` : "/dashboard";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; auth?: string }> }) {
  const { next, auth } = await searchParams;
  if (!auth && hasSupabaseConfiguration()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect(safeDestination(next));
  }
  return <AuthDemoPage mode="login" next={next} authMessage={auth}/>;
}
