import type { Metadata } from "next";
import { AuthDemoPage } from "@/components/auth-demo-page";
export const metadata: Metadata = { title: "Demo access · SolarSmart" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; auth?: string }> }) { const { next, auth } = await searchParams; return <AuthDemoPage mode="login" next={next} authMessage={auth}/>; }
