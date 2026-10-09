import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui";
import { ForgotPasswordForm } from "@/components/auth-form";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Password recovery · SolarSmart" };
export default function ForgotPasswordPage() {
  const configured = hasSupabaseConfiguration();
  return <div className="app-shell"><SiteHeader/><main id="main-content" className="main auth-main" tabIndex={-1}><Card className="auth-card auth-wrap"><p className="landing-eyebrow">Account help</p><h1>Reset your password.</h1><p className="auth-lede">{configured ? "We’ll send a secure recovery link if an account matches the email." : "Password recovery is unavailable until the optional authentication service is configured."}</p>{configured ? <ForgotPasswordForm/> : <p className="auth-form-feedback">You can continue using the local demo without signing in.</p>}<Link className="auth-back-link" href="/login">Back to sign in</Link></Card></main><SiteFooter/></div>;
}
