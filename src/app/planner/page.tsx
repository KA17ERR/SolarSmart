import type { Metadata } from "next";
import { SolarPlanner } from "@/components/solar/solar-planner";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPlannerInputs, normalizeLegacyDemoLayout, type PlannerInputs } from "@/lib/planner";

export const metadata: Metadata = { title: "Build My Solar Plan · SolarSmart", description: "Create a local, illustrative rooftop solar layout and estimate without an account." };

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const authConfigured = hasSupabaseConfiguration();
  let isSignedIn = false;
  let savedProjectId: string | undefined;
  let savedInputs: PlannerInputs | undefined;
  let savedInputsMigrated = false;
  let loadMessage: string | undefined;
  const projectParam = (await searchParams).project;
  const requestedProjectId = typeof projectParam === "string" ? projectParam : undefined;
  if (authConfigured) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      isSignedIn = Boolean(data.user);
      if (isSignedIn && requestedProjectId && /^[0-9a-f-]{36}$/i.test(requestedProjectId)) {
        const { data: snapshot } = await supabase.from("energy_assessments").select("inputs").eq("project_id", requestedProjectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (snapshot && isPlannerInputs(snapshot.inputs)) { savedProjectId = requestedProjectId; const normalized = normalizeLegacyDemoLayout(snapshot.inputs); savedInputs = normalized.inputs; savedInputsMigrated = normalized.changed; }
        else loadMessage = "The saved project details could not be restored. You can continue with the local demo.";
      } else if (requestedProjectId) loadMessage = "Sign in to restore this saved project. The local demo remains available.";
    }
    catch {
      isSignedIn = false;
      if (requestedProjectId) loadMessage = "We couldn’t connect to restore this saved project. Your information has not been changed; you can retry or continue with the local demo.";
    }
  }
  if (!authConfigured && requestedProjectId) loadMessage = "Saved projects need an optional configured account. The local demo remains available.";
  return <SolarPlanner isSignedIn={isSignedIn} authConfigured={authConfigured} initialInputs={savedInputs} initialProjectId={savedProjectId} loadMessage={loadMessage} initialSavedDraftDirty={savedInputsMigrated}/>;
}
