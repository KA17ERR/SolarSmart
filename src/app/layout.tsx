import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SolarSmart · Rooftop solar, made clear", description: "Explore a transparent rooftop solar planning estimate with editable assumptions. No account or credentials required." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
