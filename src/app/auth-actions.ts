"use server";

import { redirect } from "next/navigation";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = { error?: string; message?: string };

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  const target = new URL(value, "https://solarsmart.invalid");
  return target.origin === "https://solarsmart.invalid" ? `${target.pathname}${target.search}${target.hash}` : "/dashboard";
}
function siteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");
  // Keep local development local, but never generate localhost email links
  // from a production deployment if Amplify's variable was omitted.
  return process.env.NODE_ENV === "production"
    ? "https://main.d1ifsf72k3a4lj.amplifyapp.com"
    : "http://localhost:3000";
}
function emailOkay(email: string) { return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function signupErrorMessage(code?: string) {
  switch (code) {
    case "weak_password":
      return "Choose a stronger password that meets your Supabase project's password requirements.";
    case "signup_disabled":
      return "New account registration is disabled in Supabase. Enable new-user sign-ups in the project's Authentication settings.";
    case "email_provider_disabled":
      return "Email and password registration is disabled in Supabase. Enable the Email provider in Authentication settings.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Supabase is temporarily rate-limiting sign-up attempts. Wait a few minutes and try again.";
    case "email_exists":
    case "user_already_exists":
      return "We couldn't create the account. If you already registered, try signing in or use Forgot password.";
    default:
      return "We couldn't create the account. Check the details and try again. If the problem continues, review the Supabase Authentication settings.";
  }
}

export async function loginAction(_previous: AuthActionState, data: FormData): Promise<AuthActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Account sign-in is not configured. You can still use the free demo." };
  const email = text(data, "email").toLowerCase(); const password = String(data.get("password") ?? "");
  if (!emailOkay(email) || password.length < 1 || password.length > 256) return { error: "Enter a valid email and password." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "We could not sign you in with those details. Check them and try again." };
  redirect(safeNext(text(data, "next")));
}

export async function signupAction(_previous: AuthActionState, data: FormData): Promise<AuthActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Account sign-up is not configured. The local demo remains available." };
  const name = text(data, "name"); const email = text(data, "email").toLowerCase();
  const password = String(data.get("password") ?? ""); const confirmation = String(data.get("confirmPassword") ?? "");
  if (name.length < 1 || name.length > 80) return { error: "Enter a name up to 80 characters." };
  if (!emailOkay(email)) return { error: "Enter a valid email address." };
  if (password.length < 8 || password.length > 256) return { error: "Use a password with at least 8 characters." };
  if (password !== confirmation) return { error: "The passwords do not match." };
  const supabase = await createSupabaseServerClient();
  const { data: result, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
  if (error) return { error: signupErrorMessage(error.code) };
  if (result.session) redirect("/dashboard");
  return { error: "Supabase did not start a sign-in session. Turn off the email confirmation requirement in your Supabase project's email auth settings, then try creating the account again." };
}

export async function forgotPasswordAction(_previous: AuthActionState, data: FormData): Promise<AuthActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Password recovery is not configured. You can still use the local demo." };
  const email = text(data, "email").toLowerCase();
  if (!emailOkay(email)) return { error: "Enter a valid email address." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteOrigin()}/auth/callback?next=/account/update-password` });
  if (error) return { error: "We could not send a recovery request. Check the email and try again later." };
  return { message: "If an account matches that address, a recovery link will arrive by email." };
}

export async function updatePasswordAction(_previous: AuthActionState, data: FormData): Promise<AuthActionState> {
  if (!hasSupabaseConfiguration()) return { error: "Password updates are not configured." };
  const password = String(data.get("password") ?? ""); const confirmation = String(data.get("confirmPassword") ?? "");
  if (password.length < 8 || password.length > 256) return { error: "Use a password with at least 8 characters." };
  if (password !== confirmation) return { error: "The passwords do not match." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "We could not update the password. Request a fresh recovery link and try again." };
  redirect("/dashboard?password=updated");
}

export async function logoutAction() {
  if (hasSupabaseConfiguration()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
