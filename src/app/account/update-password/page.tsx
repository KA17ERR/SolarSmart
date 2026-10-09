import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui";
import { UpdatePasswordForm } from "@/components/auth-form";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password · SolarSmart" };
export default async function UpdatePasswordPage() {
  if (!hasSupabaseConfiguration()) redirect("/login");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <div className="app-shell"><SiteHeader/><main id="main-content" className="main auth-main" tabIndex={-1}><Card className="auth-card auth-wrap"><p className="landing-eyebrow">Secure account recovery</p><h1>Choose a new password.</h1><p className="auth-lede">Your password is changed by the authentication provider.</p><UpdatePasswordForm/></Card></main><SiteFooter/></div>;
}
