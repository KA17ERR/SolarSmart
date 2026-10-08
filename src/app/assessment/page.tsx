import type { Metadata } from "next";
import { AssessmentDashboard } from "@/components/solar/assessment-dashboard";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { AssessmentFlow } from "@/components/solar/assessment-flow";

export const metadata: Metadata = {
  title: "Solar Assessment · SolarSmart",
  description: "Explore an editable, roof-aware solar planning estimate using transparent assumptions.",
};

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const { scenario: scenarioId } = await searchParams;
  const initialScenario = DEMO_SCENARIOS.find(scenario => scenario.id === scenarioId)?.id;
  return initialScenario
    ? <AssessmentDashboard key={initialScenario} initialScenario={initialScenario}/>
    : <AssessmentFlow/>;
}
