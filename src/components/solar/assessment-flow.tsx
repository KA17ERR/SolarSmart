"use client";

import { useState } from "react";
import { AssessmentDashboard } from "@/components/solar/assessment-dashboard";
import { AssessmentWizard, type AssessmentSubmission } from "@/components/solar/assessment-wizard";

export function AssessmentFlow() {
  const [submission, setSubmission] = useState<AssessmentSubmission | null>(null);
  const [showResults, setShowResults] = useState(false);
  return <>
    <div hidden={showResults}>
      <AssessmentWizard onComplete={value => { setSubmission(value); setShowResults(true); }}/>
    </div>
    {submission && <div hidden={!showResults}>
      <AssessmentDashboard initialInputs={submission.solarInputs} assessmentContext={submission.context} onEditAssessment={() => setShowResults(false)}/>
    </div>}
  </>;
}
