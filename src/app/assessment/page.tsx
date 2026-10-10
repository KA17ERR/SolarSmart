import type { Metadata } from "next";
import { AssessmentDashboard } from "@/components/solar/assessment-dashboard";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { validateInputs, type SolarInputs } from "@/lib/solar";
import { AssessmentFlow } from "@/components/solar/assessment-flow";

export const metadata: Metadata = {
  title: "Solar Assessment · SolarSmart",
  description: "Explore an editable, roof-aware solar planning estimate using transparent assumptions.",
};

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ scenario?: string; inputs?: string }> }) {
  const { scenario: scenarioId, inputs: inputsQuery } = await searchParams;
  const initialScenario = DEMO_SCENARIOS.find(scenario => scenario.id === scenarioId)?.id;
  const initialInputs = parseInputs(inputsQuery);
  return initialScenario || initialInputs
    ? <AssessmentDashboard key={`${initialScenario ?? "custom"}-${inputsQuery ?? ""}`} initialScenario={initialScenario ?? "balanced"} initialInputs={initialInputs}/>
    : <AssessmentFlow/>;
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
