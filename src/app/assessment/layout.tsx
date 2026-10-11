import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/** Protect assessment, comparison, and insight pages as one authenticated feature area. */
export default async function AssessmentLayout({ children }: { children: ReactNode }) {
  if (!hasSupabaseConfiguration()) redirect("/login?next=%2Fassessment");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?next=%2Fassessment");
  return children;
}
