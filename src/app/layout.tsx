import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { GlobalBackground } from "@/components/solar/global-background";
export const metadata: Metadata = {
  title: "SolarSmart · Rooftop solar, made clear",
  description: "Explore a transparent rooftop solar planning estimate with editable assumptions. No account or credentials required.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><GlobalBackground/><div className="solar-app-content">{children}</div></body></html>; }
