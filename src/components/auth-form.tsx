"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, signupAction, forgotPasswordAction, updatePasswordAction, resendSignupVerificationAction, type AuthActionState } from "@/app/auth-actions";

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
  return <>
  <form action={action} className="auth-form">
    <label>Name<input type="text" name="name" autoComplete="name" maxLength={80} required/></label>
    <label>Email address<input type="email" name="email" autoComplete="email" maxLength={254} required/></label>
    <label>Password<PasswordInput name="password" autoComplete="new-password" minLength={8}/></label>
    <label>Confirm password<PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8}/></label>
    {state.error && <p className="auth-form-feedback error" role="alert">{state.error}</p>}
    <button type="submit" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
  </form>
  {state.message && <><p className="auth-form-feedback" role="status">{state.message}</p><ResendVerificationForm/></>}
  </>;
}

function ResendVerificationForm() {
  const [state, action, pending] = useActionState(resendSignupVerificationAction, initial);
  return <form action={action} className="auth-resend-form">
    <label>Resend verification email<input type="email" name="email" autoComplete="email" maxLength={254} required/></label>
    {state.error && <p className="auth-form-feedback error" role="alert">{state.error}</p>}
    {state.message && <p className="auth-form-feedback" role="status">{state.message}</p>}
    <button type="submit" className="auth-resend-button" disabled={pending}>{pending ? "Sending…" : "Resend verification email"}</button>
  </form>;
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
