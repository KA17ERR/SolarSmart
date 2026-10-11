"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Card, LoadingIndicator, ProgressIndicator, TextField } from "@/components/ui";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { assessmentDraftFromPlanner, convertAreaValue, DEMO_ASSESSMENT_DRAFT, EMPTY_ASSESSMENT_DRAFT, ORIENTATION_LABEL, PRIORITY_LABEL, PROPERTY_LABEL, ROOF_LABEL, SHADING_LABEL, prepareAssessment, validateAssessmentDraft, type AssessmentDraft, type AssessmentFieldErrors, type AreaUnit, type PreparedAssessment } from "@/lib/assessment";
import { calculateSolar, type SolarResults } from "@/lib/solar";
import type { PlannerInputs } from "@/lib/planner";
import { plannerFormToInputs, readPlannerDraft } from "@/lib/planner-draft";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { calculateSolarPlan, plannerInputsToSolarInputs } from "@/lib/planner";
import { PageLoading } from "@/components/ui/page-loading";
import { RoofPhotoInput } from "@/components/solar/roof-photo-input";
import type { RoofPhotoPreview } from "@/lib/roof-photo";
import BlurText from "@/components/animations/BlurText";

const stepFields: Array<Array<keyof AssessmentDraft>> = [
  ["cityOrPostcode", "propertyType"],
  ["roofType", "usableRoofArea", "areaUnit", "shading", "orientation"],
  ["energyInputMethod", "monthlyBill", "monthlyConsumptionKwh", "electricityTariff"],
  ["budgetUsd", "priority"],
];
const stepTitles = ["Property basics", "Roof and site", "Electricity use", "Budget and goals"];
const stepDescriptions = [
  "Share a general location and property category. A city or postcode is enough; no street address or coordinates are needed.",
  "Estimate the usable area that might fit panels, then describe roof type, shade, and orientation if known.",
  "Choose the bill or consumption detail you have handy. A tariff is helpful, but you can leave it unknown.",
  "Add an optional budget ceiling and tell us what you want to understand first. These preferences do not alter the calculation.",
];

export type AssessmentSubmission = PreparedAssessment & { results: SolarResults };

export function AssessmentWizard({ onComplete, sourcePlanner = false, initialPlannerInputs }: { onComplete: (submission: AssessmentSubmission) => void; sourcePlanner?: boolean; initialPlannerInputs?: PlannerInputs }) {
  const [draft, setDraft] = useState<AssessmentDraft>(EMPTY_ASSESSMENT_DRAFT);
  const [plannerBaseline, setPlannerBaseline] = useState<AssessmentDraft | null>(null);
  const [plannerBaselineInputs, setPlannerBaselineInputs] = useState<PlannerInputs | null>(null);
  const [draftLoading, setDraftLoading] = useState(sourcePlanner);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<AssessmentFieldErrors>({});
  const [notice, setNotice] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [roofPhoto, setRoofPhoto] = useState<RoofPhotoPreview | null>(null);
  const submissionLock = useRef(false);
  const roofPhotoUrl = useRef<string | null>(null);
  const isReview = step === 4;
  const progressStep = Math.min(step + 1, 4);
  const plannerDifferences = useMemo(() => {
    if (!plannerBaseline) return [];
    const labels: Partial<Record<keyof AssessmentDraft, string>> = { cityOrPostcode: "location", usableRoofArea: "usable roof area", roofType: "roof type", shading: "shading", orientation: "orientation", monthlyConsumptionKwh: "monthly energy use", monthlyBill: "monthly bill", electricityTariff: "electricity tariff" };
    return (Object.keys(labels) as Array<keyof AssessmentDraft>).filter(key => draft[key] !== plannerBaseline[key]).map(key => labels[key]).filter((value): value is string => Boolean(value));
  }, [draft, plannerBaseline]);

  useEffect(() => () => { if (roofPhotoUrl.current) URL.revokeObjectURL(roofPhotoUrl.current); }, []);

  useEffect(() => {
    if (!sourcePlanner) return;
    let cancelled = false;
    void (async () => {
      let plannerInputs = initialPlannerInputs;
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
        if (user && typeof window !== "undefined") {
          const local = readPlannerDraft(window.sessionStorage, user.id);
          if (local) plannerInputs = plannerFormToInputs(local.form);
        }
      } catch { /* If browser storage or session restoration is unavailable, use the saved server-side project when present. */ }
      if (cancelled) return;
      if (plannerInputs) {
        const nextDraft = assessmentDraftFromPlanner(plannerInputs);
        setDraft(nextDraft);
        setPlannerBaseline(nextDraft);
        setPlannerBaselineInputs(plannerInputs);
        setNotice("Your saved Solar Planner details are prefilled. Review or edit them; assessment edits apply only to this estimate and do not overwrite your saved plan.");
      } else {
        setNotice("No saved planner data was found. You can continue with a new assessment or return to the planner.");
      }
      setDraftLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sourcePlanner, initialPlannerInputs]);

  function replaceRoofPhoto(photo: RoofPhotoPreview | null) {
    if (roofPhotoUrl.current && roofPhotoUrl.current !== photo?.previewUrl) URL.revokeObjectURL(roofPhotoUrl.current);
    roofPhotoUrl.current = photo?.previewUrl ?? null;
    setRoofPhoto(photo);
  }

  function update<K extends keyof AssessmentDraft>(key: K, value: AssessmentDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setNotice("");
    setSubmitError("");
  }

  function loadSample() {
    replaceRoofPhoto(null);
    setDraft({ ...DEMO_ASSESSMENT_DRAFT });
    setErrors({});
    setSubmitError("");
    setNotice("Fictional sample values loaded. Review or edit them before calculating.");
    setStep(4);
  }

  function restart() {
    submissionLock.current = false;
    replaceRoofPhoto(null);
    setDraft({ ...EMPTY_ASSESSMENT_DRAFT });
    setErrors({});
    setSubmitError("");
    setNotice("Assessment restarted. Your previous entries have been cleared from this page.");
    setPlannerBaseline(null);
    setPlannerBaselineInputs(null);
    setStep(0);
  }

  function next() {
    const allErrors = validateAssessmentDraft(draft);
    const currentErrors = stepFields[step].reduce<AssessmentFieldErrors>((result, key) => {
      if (allErrors[key]) result[key] = allErrors[key];
      return result;
    }, {});
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length) return;
    setNotice("");
    setStep(current => Math.min(4, current + 1));
  }

  function review() {
    const allErrors = validateAssessmentDraft(draft);
    setErrors(allErrors);
    const firstInvalidStep = stepFields.findIndex(fields => fields.some(field => allErrors[field]));
    if (firstInvalidStep >= 0) {
      setStep(firstInvalidStep);
      setSubmitError("Complete the highlighted details before reviewing your assessment.");
      return;
    }
    setSubmitError("");
    setStep(4);
  }

  async function calculate() {
    if (submissionLock.current) return;
    const allErrors = validateAssessmentDraft(draft);
    setErrors(allErrors);
    const firstInvalidStep = stepFields.findIndex(fields => fields.some(field => allErrors[field]));
    if (firstInvalidStep >= 0) {
      setStep(firstInvalidStep);
      setSubmitError("We found a detail to correct. Your entries are still here.");
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const prepared = prepareAssessment(draft);
      await new Promise<void>(resolve => window.setTimeout(resolve, 160));
      const solarInputs = plannerBaselineInputs && plannerDifferences.length === 0
        ? plannerInputsToSolarInputs(plannerBaselineInputs, calculateSolarPlan(plannerBaselineInputs).systemCapacityKw)
        : prepared.solarInputs;
      const results = calculateSolar(solarInputs);
      submissionLock.current = false;
      onComplete({ ...prepared, solarInputs, results });
    } catch {
      setSubmitError("We could not calculate this estimate. Your information is saved in this wizard; review the highlighted values and try again.");
      submissionLock.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  if (draftLoading) return <PageLoading kind="assessment"/>;
  return <div className="app-shell assessment-flow-shell">
    <SiteHeader/>
    <main className="main" id="main-content" tabIndex={-1}>
      <div className="assessment-wizard-page">
        <div className="wizard-page-heading"><div><Badge variant="success"><span className="demo-indicator"/> Local assessment · no account</Badge><p className="landing-eyebrow">Rooftop solar planning</p><h1><BlurText text="Let’s build an estimate for your property." delay={28} className="wizard-heading-reveal"/></h1><p>Answer a few practical questions. Your inputs stay in this browser and feed a transparent, deterministic estimate.</p></div><div className="wizard-demo-actions"><Button variant="secondary" onClick={loadSample}><Sparkles size={15} aria-hidden="true"/> Try sample data</Button><Button variant="quiet" onClick={restart}><RotateCcw size={14} aria-hidden="true"/> Restart</Button></div></div>
        <div id="solar-assessment" className="wizard-layout">
          <Card as="aside" className="wizard-side-note"><div className="wizard-side-icon" aria-hidden="true">i</div><h2>A useful early estimate</h2><p>We use your area, shade, orientation, and energy details with disclosed generic defaults. Your city or postcode is only shown with your results; it does not trigger a location lookup.</p><p className="wizard-side-demo"><strong>Sample values are illustrative.</strong> No live tariffs, irradiance, subsidy amounts, or approvals are fetched.</p><Link href="/" className="text-link">Back to SolarSmart home <ArrowRight size={14}/></Link></Card>
          <Card as="section" id="estimate" className="wizard-card" aria-labelledby="wizard-title">
            <div className="wizard-progress-heading"><span>Step {progressStep} of 4{isReview ? " · Review" : ""}</span><span>{isReview ? "Ready to calculate" : "Your answers are saved as you go"}</span></div>
            <ProgressIndicator value={progressStep} max={4} label="Assessment progress"/>
            <div className="wizard-title-row"><div><p className="landing-eyebrow">{isReview ? "Check before calculating" : `Step ${step + 1}`}</p><h2 id="wizard-title">{isReview ? "Review your details" : stepTitles[step]}</h2><p>{isReview ? "Make sure the details and assumptions look right. You can edit any section before calculating." : stepDescriptions[step]}</p></div>{!isReview && <span className="wizard-required-note">{step === 3 ? "Optional" : <><span aria-hidden="true">*</span> Required</>}</span>}</div>
            {notice && <Alert variant="info" title="Assessment update">{notice}</Alert>}
            {plannerDifferences.length > 0 && <Alert variant="warning" title="These details differ from your Solar Planner">Changed: {plannerDifferences.join(", ")}. This estimate may differ from the saved plan. Your edits apply only to this assessment. <Button variant="quiet" size="sm" onClick={() => { if (plannerBaseline) setDraft({ ...plannerBaseline }); setSubmitError(""); }}>Restore planner values</Button></Alert>}
            {submitError && <Alert variant="error" title="Assessment needs attention">{submitError}</Alert>}
            {isReview ? <ReviewSummary draft={draft} hasRoofPhoto={Boolean(roofPhoto)} onEdit={targetStep => { setStep(targetStep); setNotice(""); setSubmitError(""); }}/> : <div className="wizard-step-content">{step === 0 ? <PropertyStep draft={draft} errors={errors} update={update}/> : step === 1 ? <RoofStep draft={draft} errors={errors} update={update} roofPhoto={roofPhoto} onRoofPhotoChange={replaceRoofPhoto}/> : step === 2 ? <EnergyStep draft={draft} errors={errors} update={update}/> : <PreferencesStep draft={draft} errors={errors} update={update}/>}</div>}
            <div className="wizard-footer-actions">
              <div className="wizard-footer-left"><Button variant="quiet" onClick={() => { setStep(current => Math.max(0, current - 1)); setSubmitError(""); }} disabled={step === 0 || submitting}><ArrowLeft size={15} aria-hidden="true"/> Back</Button><Link className="wizard-cancel-link" href="/">Cancel</Link></div>
      {submitting ? <LoadingIndicator label="Calculating locally…"/> : isReview ? <Button specular onClick={calculate}><Check size={15} aria-hidden="true"/> Calculate my estimate</Button> : <Button specular onClick={step === 3 ? review : next}>{step === 3 ? "Review details" : "Next"}<ArrowRight size={15} aria-hidden="true"/></Button>}
            </div>
            <p className="wizard-privacy-note">Local calculation · no registration, upload, AI service, or AWS connection required.</p>
          </Card>
        </div>
      </div>
    </main>
    <SiteFooter/>
  </div>;
}

type StepProps = { draft: AssessmentDraft; errors: AssessmentFieldErrors; update: <K extends keyof AssessmentDraft>(key: K, value: AssessmentDraft[K]) => void };

function PropertyStep({ draft, errors, update }: StepProps) {
  return <div className="wizard-form-grid">
    <TextField label="City or postcode" required value={draft.cityOrPostcode} onChange={event => update("cityOrPostcode", event.target.value)} hint="General location only; do not enter a street address." error={errors.cityOrPostcode} autoComplete="off" maxLength={80} placeholder="For example, Sampleville or 00000"/>
    <WizardSelect label="Property type" required value={draft.propertyType} error={errors.propertyType} onChange={value => update("propertyType", value as AssessmentDraft["propertyType"])} options={[{ value: "", label: "Choose a property type" }, { value: "single-family", label: "Single-family home" }, { value: "multi-unit", label: "Multi-unit property" }, { value: "small-business", label: "Small business" }, { value: "other", label: "Other property" }]}/>
  </div>;
}

function RoofStep({ draft, errors, update, roofPhoto, onRoofPhotoChange }: StepProps & { roofPhoto: RoofPhotoPreview | null; onRoofPhotoChange: (photo: RoofPhotoPreview | null) => void }) {
  return <div className="wizard-form-grid">
    <WizardSelect label="Roof type" required value={draft.roofType} error={errors.roofType} onChange={value => update("roofType", value as AssessmentDraft["roofType"])} options={[{ value: "", label: "Choose a roof type" }, { value: "pitched-shingle", label: "Pitched · shingle" }, { value: "pitched-tile", label: "Pitched · tile" }, { value: "metal", label: "Metal" }, { value: "flat", label: "Flat" }, { value: "other", label: "Other / not sure" }]}/>
    <div className="wizard-area-fields"><TextField label="Approximate usable roof area" required type="number" inputMode="decimal" min="0.1" step="any" value={draft.usableRoofArea} onChange={event => update("usableRoofArea", event.target.value)} hint="Estimate the open area available after large obstacles and setbacks." error={errors.usableRoofArea} placeholder="e.g. 850"/><WizardSelect label="Area unit" required value={draft.areaUnit} error={errors.areaUnit} hint="Changing units converts the entered area to preserve its approximate size." onChange={value => { const nextUnit = value as AreaUnit; const currentUnit: AreaUnit = draft.areaUnit === "sq-m" ? "sq-m" : "sq-ft"; update("usableRoofArea", convertAreaValue(draft.usableRoofArea, currentUnit, nextUnit)); update("areaUnit", nextUnit); }} options={[{ value: "sq-ft", label: "Square feet (sq ft)" }, { value: "sq-m", label: "Square metres (m²)" }]}/></div>
    <WizardSelect label="Roof shading" required value={draft.shading} error={errors.shading} onChange={value => update("shading", value as AssessmentDraft["shading"])} hint="Choose not sure if you have not assessed shade." options={[{ value: "", label: "Choose a shading category" }, { value: "none", label: "No noticeable shade" }, { value: "light", label: "Light shade" }, { value: "moderate", label: "Moderate shade" }, { value: "heavy", label: "Heavy shade" }, { value: "unknown", label: "Not sure" }]}/>
    <WizardSelect label="Roof orientation, if known" required value={draft.orientation} error={errors.orientation} hint="Use the direction toward or away from your local equator; no location lookup is performed." onChange={value => update("orientation", value as AssessmentDraft["orientation"])} options={[{ value: "unknown", label: "Not sure · use generic factor" }, { value: "equator-facing", label: "Mostly toward the equator" }, { value: "east-west", label: "Mostly east or west" }, { value: "away-from-equator", label: "Mostly away from the equator" }]}/>
    <p className="wizard-assumption-note">Orientation and shading categories map to generic model factors. They are not a shade survey or site-specific production study.</p>
    <RoofPhotoInput value={roofPhoto} onChange={onRoofPhotoChange}/>
  </div>;
}

function EnergyStep({ draft, errors, update }: StepProps) {
  return <div className="wizard-energy-step">
    <fieldset className="wizard-choice-group"><legend>Which electricity detail do you have? <span className="required-mark" aria-hidden="true">*</span></legend><p>Choose one. Enter the amount from a typical month.</p><div className="wizard-choice-row">
      <label className={draft.energyInputMethod === "monthly-bill" ? "wizard-choice selected" : "wizard-choice"}><input type="radio" name="energy-input-method" value="monthly-bill" checked={draft.energyInputMethod === "monthly-bill"} onChange={() => update("energyInputMethod", "monthly-bill")}/><span><strong>Monthly electricity bill</strong><small>Enter a bill amount in USD</small></span></label>
      <label className={draft.energyInputMethod === "monthly-consumption" ? "wizard-choice selected" : "wizard-choice"}><input type="radio" name="energy-input-method" value="monthly-consumption" checked={draft.energyInputMethod === "monthly-consumption"} onChange={() => update("energyInputMethod", "monthly-consumption")}/><span><strong>Monthly consumption</strong><small>Enter usage in kWh</small></span></label>
    </div>{errors.energyInputMethod && <FieldError>{errors.energyInputMethod}</FieldError>}</fieldset>
    {draft.energyInputMethod === "monthly-bill" ? <TextField label="Average monthly electricity bill (USD)" required type="number" inputMode="decimal" min="0" max="100000" step="0.01" value={draft.monthlyBill} onChange={event => update("monthlyBill", event.target.value)} hint="Use a recent bill average; $0 is allowed and produces no modeled payback." error={errors.monthlyBill} placeholder="e.g. 180"/> : <TextField label="Average monthly electricity consumption (kWh)" required type="number" inputMode="decimal" min="1" max="100000" step="any" value={draft.monthlyConsumptionKwh} onChange={event => update("monthlyConsumptionKwh", event.target.value)} hint="Typical monthly use from your utility bill." error={errors.monthlyConsumptionKwh} placeholder="e.g. 900"/>}
    <TextField label="Electricity tariff (optional, USD per kWh)" type="number" inputMode="decimal" min="0.001" max="1000" step="0.001" value={draft.electricityTariff} onChange={event => update("electricityTariff", event.target.value)} hint="If unknown, the calculation uses the disclosed illustrative $0.15/kWh demo assumption." error={errors.electricityTariff} placeholder="Leave blank if unknown"/>
    {!draft.electricityTariff.trim() && <Alert variant="info" title="Using an illustrative rate">The calculator will use $0.15/kWh as a placeholder. It is not a live tariff; replace it with the rate on your bill when available.</Alert>}
  </div>;
}

function PreferencesStep({ draft, errors, update }: StepProps) {
  return <div className="wizard-form-grid">
    <TextField label="Optional budget ceiling (USD)" type="number" inputMode="decimal" min="0" max="100000000" step="100" value={draft.budgetUsd} onChange={event => update("budgetUsd", event.target.value)} hint="Shown as context beside the modeled system-cost assumption. It does not change estimated installation cost." error={errors.budgetUsd} placeholder="Leave blank if unknown"/>
    <WizardSelect label="What would you like to understand first?" value={draft.priority} error={errors.priority} onChange={value => update("priority", value as AssessmentDraft["priority"])} options={[{ value: "exploring", label: "Explore the options" }, { value: "bill-savings", label: "Understand bill savings" }, { value: "upfront-cost", label: "Understand upfront cost" }, { value: "environmental-impact", label: "Understand environmental impact" }]}/>
    <Alert variant="info" title="Preferences stay contextual">Your budget and priority are shown in the results for discussion. They do not change the calculator’s installation-cost or savings assumptions.</Alert>
  </div>;
}

function ReviewSummary({ draft, hasRoofPhoto, onEdit }: { draft: AssessmentDraft; hasRoofPhoto: boolean; onEdit: (step: number) => void }) {
  const area = Number(draft.usableRoofArea);
  const areaDescription = `${area.toLocaleString()} ${draft.areaUnit === "sq-m" ? "m²" : "sq ft"}`;
  const energyDescription = draft.energyInputMethod === "monthly-bill" ? `${Number(draft.monthlyBill).toLocaleString()} USD / month` : `${Number(draft.monthlyConsumptionKwh).toLocaleString()} kWh / month`;
  const tariff = draft.electricityTariff.trim() ? `$${Number(draft.electricityTariff).toFixed(3)}/kWh (entered)` : "$0.15/kWh (illustrative default)";
  const sections = [
    { title: "Property", step: 0, rows: [["City or postcode", draft.cityOrPostcode], ["Property type", draft.propertyType ? PROPERTY_LABEL[draft.propertyType] : "—"]] },
    { title: "Roof and site", step: 1, rows: [["Roof type", draft.roofType ? ROOF_LABEL[draft.roofType] : "—"], ["Usable roof area", areaDescription], ["Shading", draft.shading ? SHADING_LABEL[draft.shading] : "—"], ["Orientation", ORIENTATION_LABEL[draft.orientation || "unknown"]], ["Optional photo", hasRoofPhoto ? "Local preview only · not analyzed or included in report" : "Not provided"]] },
    { title: "Electricity", step: 2, rows: [["Monthly input", energyDescription], ["Electricity tariff", tariff]] },
    { title: "Budget and priority", step: 3, rows: [["Budget ceiling", draft.budgetUsd.trim() ? `$${Number(draft.budgetUsd).toLocaleString()} USD` : "Not provided"], ["Priority", PRIORITY_LABEL[draft.priority]]] },
  ];
  return <div className="wizard-review-list">{sections.map(section => <section className="wizard-review-section" key={section.title} aria-labelledby={`review-${section.step}`}><div className="wizard-review-heading"><h3 id={`review-${section.step}`}>{section.title}</h3><Button variant="quiet" size="sm" onClick={() => onEdit(section.step)}>Edit {section.title.toLowerCase()}</Button></div><dl>{section.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}<p className="wizard-review-assumption">Location is for your reference only. It does not look up local tariffs or irradiance. Unknown shade/orientation and omitted tariff values use disclosed generic defaults; the sample sun-hours and system-cost assumptions also remain illustrative.</p></div>;
}

function WizardSelect({ label, value, options, onChange, error, hint, required = false }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; error?: string; hint?: string; required?: boolean }) {
  const id = `wizard-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;
  return <div className="ui-field"><label htmlFor={id}>{label}{required && <> <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> required</span></>}</label><select id={id} className={`ui-input${error ? " has-error" : ""}`} value={value} onChange={event => onChange(event.target.value)} required={required} aria-invalid={!!error} aria-describedby={describedBy}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{hint && <small id={hintId}>{hint}</small>}{error && <small id={errorId} className="field-error" role="alert">{error}</small>}</div>;
}

function FieldError({ children }: { children: string }) { return <p className="field-error wizard-inline-error" role="alert">{children}</p>; }
