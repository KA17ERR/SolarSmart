"use client";

import { useState } from "react";
import { AssessmentDashboard } from "@/components/solar/assessment-dashboard";
import { AssessmentWizard, type AssessmentSubmission } from "@/components/solar/assessment-wizard";
import type { PlannerInputs } from "@/lib/planner";

export function AssessmentFlow({ sourcePlanner = false, initialPlannerInputs }: { sourcePlanner?: boolean; initialPlannerInputs?: PlannerInputs }) {
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [showResults, setShowResults] = useState(false);
  return <>
    <div hidden={showResults}>
      <AssessmentWizard sourcePlanner={sourcePlanner} initialPlannerInputs={initialPlannerInputs} onComplete={value => { setSubmission(value); setShowResults(true); }}/>
    </div>
    {submission && <div hidden={!showResults}>
      <AssessmentDashboard initialInputs={submission.solarInputs} assessmentContext={submission.context} onEditAssessment={() => setShowResults(false)}/>
    </div>}
  </>;
}
