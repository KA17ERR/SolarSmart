import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SolarSmart · Solar, made clear", description: "Explore a solar estimate using transparent, local-first calculations." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
