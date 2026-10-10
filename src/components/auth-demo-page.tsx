import Link from "next/link";
import { ShieldCheck, Sun } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge, Card } from "@/components/ui";
import { LoginForm, SignupForm } from "@/components/auth-form";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";

export function AuthDemoPage({ mode, next, authMessage }: { mode: "login" | "signup"; next?: string; authMessage?: string }) {
  const signup = mode === "signup";
  const authEnabled = hasSupabaseConfiguration();
  return <div className="app-shell"><SiteHeader/><main id="main-content" className="main auth-main" tabIndex={-1}><div className="auth-wrap"><Card className="auth-card"><span className="auth-icon"><Sun size={21}/></span><Badge variant="success"><span className="demo-indicator"/> {authEnabled ? "Account access" : "Account access unavailable"}</Badge><h1>{signup ? "Create your solar account." : "Welcome back to SolarSmart."}</h1><p className="auth-lede">{authEnabled ? "Your account is managed securely by Supabase. Solar calculations still run in the SolarSmart calculation engine." : "Account sign-in is not configured in this installation. Contact the site administrator to enable access."}</p>
    {authEnabled && (signup ? <SignupForm/> : <LoginForm next={next}/>)}
    {authMessage === "link-error" && <p className="auth-form-feedback error" role="alert">That sign-in or recovery link could not be verified. Request a fresh link and try again.</p>}
    {!authEnabled && <div className="auth-demo-note"><ShieldCheck size={18}/><p>Protected solar planning requires an account session. No account credentials are collected here.</p></div>}
    <p className="auth-secondary">{signup ? "Already have an account? " : "New to SolarSmart? "}<Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p>
    <p className="auth-config-note">{authEnabled ? "Private project records are protected by database row-level security." : "Optional authentication and database features require administrator configuration. This page does not collect credentials in demo mode."}</p></Card></div></main><SiteFooter/></div>;
}
