import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { GlobalBackground } from "@/components/solar/global-background";
import { AuthStateProvider, type AuthStatus } from "@/components/auth-state";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const metadata: Metadata = {
  title: "SolarSmart · Rooftop solar, made clear",
  description: "Explore a clear rooftop solar planning experience with transparent assumptions and account-aware project tools.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let initialStatus: AuthStatus = "unauthenticated";
  if (hasSupabaseConfiguration()) {
    initialStatus = "loading";
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error) initialStatus = user ? "authenticated" : "unauthenticated";
    } catch { /* Keep the navigation unresolved until the browser auth listener restores the session. */ }
  }
  return <html lang="en"><body><GlobalBackground/><AuthStateProvider initialStatus={initialStatus}><div className="solar-app-content">{children}</div></AuthStateProvider></body></html>;
}
