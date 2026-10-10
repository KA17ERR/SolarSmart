import { SiteHeader } from "@/components/site-header";
import { AccordionGallery } from "@/components/solar/accordion-gallery";
import type { AssessmentContext } from "@/lib/assessment";
import type { SolarInputs } from "@/lib/solar";

export function AssessmentDashboard({ initialScenario = "balanced", initialInputs }: {
  initialScenario?: string;
  initialInputs?: SolarInputs;
  assessmentContext?: AssessmentContext;
  onEditAssessment?: () => void;
}) {
  return <div className="app-shell dashboard-index-shell">
    <SiteHeader showMainMenuLink accordionOnly />
    <main id="main-content" className="dashboard-index-main" tabIndex={-1}>
      <AccordionGallery scenarioId={initialInputs ? "custom" : initialScenario} initialInputs={initialInputs} />
    </main>
  </div>;
}
