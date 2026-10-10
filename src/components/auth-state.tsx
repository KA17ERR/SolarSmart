"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
const AuthContext = createContext<AuthStatus>("loading");

export function AuthStateProvider({ initialStatus, children }: { initialStatus: AuthStatus; children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(initialStatus);

  useEffect(() => { setStatus(initialStatus); }, [initialStatus]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setStatus("unauthenticated"); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setStatus(session?.user ? "authenticated" : "unauthenticated");
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={status}>{children}</AuthContext.Provider>;
}

export function useAuthStatus() { return useContext(AuthContext); }

export function LogoutButton({ className, children = "Sign out", tabIndex }: { className?: string; children?: ReactNode; tabIndex?: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    if (pending) return;
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    try {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) { setPending(false); return; }
      }
      router.replace("/");
      router.refresh();
    } catch { /* Keep the user on the page if the session could not be cleared. */ }
    finally { setPending(false); }
  }
  return <button className={className} type="button" onClick={signOut} disabled={pending} tabIndex={tabIndex}>{pending ? "Signing out…" : children}</button>;
}
