import type { Metadata } from "next";
import { AuthDemoPage } from "@/components/auth-demo-page";
export const metadata: Metadata = { title: "Account setup · SolarSmart" };
export default function SignupPage() { return <AuthDemoPage mode="signup"/>; }
