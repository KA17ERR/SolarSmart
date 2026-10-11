import type { Metadata } from "next";
import { AssessmentDashboard } from "@/components/solar/assessment-dashboard";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { validateInputs, type SolarInputs } from "@/lib/solar";
import { AssessmentFlow } from "@/components/solar/assessment-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { isPlannerInputs, type PlannerInputs } from "@/lib/planner";

export const metadata: Metadata = {
  title: "Solar Assessment · SolarSmart",
  description: "Explore an editable, roof-aware solar planning estimate using transparent assumptions.",
};

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ scenario?: string; inputs?: string; source?: string }> }) {
  const { scenario: scenarioId, inputs: inputsQuery, source } = await searchParams;
  const initialScenario = DEMO_SCENARIOS.find(scenario => scenario.id === scenarioId)?.id;
  const initialInputs = parseInputs(inputsQuery);
  const fromPlanner = source === "planner";
  const initialPlannerInputs = fromPlanner ? await readLatestPlannerInputs() : undefined;
  return initialScenario || initialInputs
    ? <AssessmentDashboard key={`${initialScenario ?? "custom"}-${inputsQuery ?? ""}`} initialScenario={initialScenario ?? "balanced"} initialInputs={initialInputs}/>
    : <AssessmentFlow sourcePlanner={fromPlanner} initialPlannerInputs={initialPlannerInputs}/>;
}

async function readLatestPlannerInputs(): Promise<PlannerInputs | undefined> {
  if (!hasSupabaseConfiguration()) return undefined;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return undefined;
    const { data } = await supabase.from("energy_assessments").select("inputs").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return data && isPlannerInputs(data.inputs) ? data.inputs : undefined;
  } catch { return undefined; }
}

function parseInputs(value?: string): SolarInputs | undefined {
  if (!value || value.length > 4000) return undefined;
  try {
    const inputs = JSON.parse(value) as SolarInputs;
    return inputs && typeof inputs === "object" && !Array.isArray(inputs) && validateInputs(inputs).length === 0 ? inputs : undefined;
  } catch {
    return undefined;
  }
}
