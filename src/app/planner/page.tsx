import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SolarPlanner } from "@/components/solar/solar-planner";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlannerInputs, normalizeLegacyDemoLayout, type PlannerInputs } from "@/lib/planner";

export const metadata: Metadata = { title: "Build My Solar Plan · SolarSmart", description: "Create an illustrative rooftop solar layout and estimate for your account." };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const authConfigured = hasSupabaseConfiguration();
  const params = await searchParams;
  const projectParam = params.project;
  const requestedProjectId = typeof projectParam === "string" ? projectParam : undefined;
  const requestedPath = `/planner${requestedProjectId ? `?project=${encodeURIComponent(requestedProjectId)}` : ""}`;
  if (!authConfigured) redirect(`/login?next=${encodeURIComponent(requestedPath)}`);

  let isSignedIn = false;
  let savedProjectId: string | undefined;
  let savedInputs: PlannerInputs | undefined;
  let savedInputsMigrated = false;
  let loadMessage: string | undefined;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  let hasUser = false;
  try {
    supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    hasUser = Boolean(user);
  } catch { redirect(`/login?next=${encodeURIComponent(requestedPath)}`); }
  if (!hasUser) redirect(`/login?next=${encodeURIComponent(requestedPath)}`);
  isSignedIn = true;
  if (requestedProjectId && /^[0-9a-f-]{36}$/i.test(requestedProjectId)) {
    try {
      const { data: snapshot } = await supabase.from("energy_assessments").select("inputs").eq("project_id", requestedProjectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (snapshot && isPlannerInputs(snapshot.inputs)) { savedProjectId = requestedProjectId; const normalized = normalizeLegacyDemoLayout(snapshot.inputs); savedInputs = normalized.inputs; savedInputsMigrated = normalized.changed; }
      else loadMessage = "The saved project details could not be restored. You can start a new plan.";
    } catch { loadMessage = "We couldn’t connect to restore this saved project. Your information has not been changed; you can retry."; }
  }
  return <SolarPlanner isSignedIn={isSignedIn} authConfigured={authConfigured} initialInputs={savedInputs} initialProjectId={savedProjectId} loadMessage={loadMessage} initialSavedDraftDirty={savedInputsMigrated}/>;
}
