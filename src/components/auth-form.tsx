"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, signupAction, resendVerificationAction, forgotPasswordAction, updatePasswordAction, type AuthActionState } from "@/app/auth-actions";

const initial: AuthActionState = {};

function PasswordInput({ name, autoComplete, minLength = 1 }: { name: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return <span className="password-input-wrap"><input type={visible ? "text" : "password"} name={name} autoComplete={autoComplete} minLength={minLength} maxLength={256} required/><button type="button" className="password-visibility" onClick={() => setVisible(value => !value)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span>;
}

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  return <form action={action} className="auth-form">
    <input type="hidden" name="next" value={next}/>
    <label>Email address<input type="email" name="email" autoComplete="email" maxLength={254} required/></label>
    <label>Password<PasswordInput name="password" autoComplete="current-password"/></label>
    <div className="auth-form-row"><Link href="/forgot-password">Forgot password?</Link></div>
    {state.error && <p className="auth-form-feedback error" role="alert">{state.error}</p>}
    <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initial);
  const [email, setEmail] = useState("");
  const [resendState, resendAction, resendPending] = useActionState(resendVerificationAction, initial);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(current => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  return <>
    <form action={action} className="auth-form">
      <label>Name<input type="text" name="name" autoComplete="name" maxLength={80} required/></label>
      <label>Email address<input type="email" name="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)}/></label>
      <label>Password<PasswordInput name="password" autoComplete="new-password" minLength={8}/></label>
      <label>Confirm password<PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8}/></label>
      {state.error && <p className="auth-form-feedback error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    </form>
    {state.message && <section className="verification-panel" aria-labelledby="verification-title">
      <h2 id="verification-title">Check your email</h2>
      <p className="auth-form-feedback" role="status">{state.message}</p>
      <form action={resendAction} className="verification-resend-form" onSubmit={() => setCooldown(60)}>
        <input type="hidden" name="email" value={email}/>
        {resendState.message && <p className="auth-form-feedback" role="status">{resendState.message}</p>}
        {resendState.error && <p className="auth-form-feedback error" role="alert">{resendState.error}</p>}
        {cooldown > 0 && <p className="verification-cooldown" role="status">You can request another email in {cooldown} seconds.</p>}
        <button type="submit" className="verification-resend" disabled={!email || resendPending || cooldown > 0}>
          {resendPending ? "Sending…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
        </button>
      </form>
      <p className="verification-signin">Already verified? <Link href="/login">Sign in</Link></p>
    </section>}
  </>;
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  return <form action={action} className="auth-form">
    <label>Email address<input type="email" name="email" autoComplete="email" maxLength={254} required/></label>
    {state.error && <p className="auth-form-feedback error" role="alert">{state.error}</p>}
    {state.message && <p className="auth-form-feedback" role="status">{state.message}</p>}
    <button type="submit" disabled={pending}>{pending ? "Sending…" : "Send recovery link"}</button>
  </form>;
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return <form action={action} className="auth-form">
    <label>New password<PasswordInput name="password" autoComplete="new-password" minLength={8}/></label>
    <label>Confirm new password<PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8}/></label>
    {state.error && <p className="auth-form-feedback error" role="alert">{state.error}</p>}
    <button type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
  </form>;
}
