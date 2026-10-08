"use client";

import { useState } from "react";
import { Badge, Card, ChartContainer, EmptyState } from "@/components/ui";
import { buildRecommendations } from "@/lib/recommendations";
import type { AssessmentContext } from "@/lib/assessment";
import { ORIENTATION_LABEL, PROPERTY_LABEL, ROOF_LABEL, SHADING_LABEL } from "@/lib/assessment";
import type { SolarInputs, SolarResults } from "@/lib/solar";

const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const factor = (value: number) => `${Math.round(value * 100)}%`;
const percent = (value: number) => `${Math.round(value)}%`;

export function AssumptionsPanel({ inputs, result, context, scenarioName, demoMode }: { inputs: SolarInputs; result: SolarResults; context?: AssessmentContext; scenarioName: string; demoMode: boolean }) {
  const assessmentSource = context?.isDemoExample ? "Sample or edited" : "From you";
  const editableSampleSource = context?.isDemoExample ? "Sample or edited" : "Current form value";
  const assessmentRows = context ? [
    ["General location", context.cityOrPostcode, assessmentSource],
    ["Property and roof", `${PROPERTY_LABEL[context.propertyType]} · ${ROOF_LABEL[context.roofType]}`, assessmentSource],
    ["Usable roof area", `${context.usableRoofArea.toLocaleString()} ${context.areaUnit === "sq-m" ? "m²" : "sq ft"}`, assessmentSource],
    ["Electricity input", context.energyInputMethod === "monthly-bill" ? `${currency(context.monthlyEnergyInput)} per month` : `${context.monthlyEnergyInput.toLocaleString()} kWh per month`, assessmentSource],
    ["Retail tariff", `$${context.tariffUsdPerKwh.toFixed(3)}/kWh`, context.tariffWasAssumed ? "Illustrative default" : assessmentSource],
    ["Roof shade", SHADING_LABEL[context.shading], context.shading === "unknown" ? "Generic factor used" : assessmentSource],
    ["Roof orientation", ORIENTATION_LABEL[context.orientation], context.orientation === "unknown" ? "Generic factor used" : assessmentSource],
  ] : [
    ["Scenario", scenarioName, demoMode ? "Fictional demo data" : "Current assessment"],
    ["Approximate roof area", `${inputs.roofAreaSqFt.toLocaleString()} sq ft · ${percent(inputs.usableRoofPercent)} modeled usable`, demoMode ? "Fictional demo data" : editableSampleSource],
    ["Monthly electricity bill", `${currency(inputs.monthlyBill)} · $${inputs.utilityRate.toFixed(3)}/kWh`, demoMode ? "Fictional demo data" : editableSampleSource],
    ["Orientation and shading", `${factor(inputs.orientationFactor)} orientation · ${factor(inputs.shadingFactor)} shade factor`, demoMode ? "Fictional demo data" : editableSampleSource],
  ];

  const modelRows = [
    ["Generic annual yield input", `${inputs.sunHours.toFixed(1)} peak sun-hours/day`, "Illustrative; not a live reading"],
    ["Target annual offset", factor(inputs.targetAnnualOffsetRate), "System sizing target"],
    ["Physical self-consumption", factor(result.assumptions.physicalSelfConsumptionRate), "Assumed load timing; no hourly profile"],
    ["Export compensation", `$${inputs.exportCompensationRate.toFixed(3)}/kWh`, inputs.exportCompensationRate === 0 ? "Zero until utility rate is verified" : "User-entered; verify with utility"],
    ["Expected system cost", currency(inputs.systemCost), "Illustrative; not an installer quote"],
    ["Incentive", factor(inputs.incentiveRate), inputs.incentiveRate === 0 ? "Defaults to zero" : "User-entered; eligibility unverified"],
    ["Retail rate escalation", `${factor(inputs.electricityEscalation)} per year`, "Illustrative; not a forecast"],
    ["Model constants", `${result.assumptions.roofAreaSqFtPerKw} sq ft/kW · ${factor(result.assumptions.systemPerformanceRatio)} performance · ${(result.assumptions.annualDegradationRate * 100).toFixed(2)}% annual degradation`, "Generic planning assumptions"],
  ];

  const calculatedRows = [
    ["Estimated system capacity", `${result.systemKw.toFixed(2)} kW`],
    ["Annual electricity generation", `${Math.round(result.annualProductionKwh).toLocaleString()} kWh`],
    ["Annual consumption / self-use", `${Math.round(result.annualConsumptionKwh).toLocaleString()} / ${Math.round(result.annualSelfConsumedKwh).toLocaleString()} kWh`],
    ["Annual exports", `${Math.round(result.annualExportedKwh).toLocaleString()} kWh`],
    ["First-year modeled savings", currency(result.annualSavings)],
    ["Avoided emissions", `${(result.co2AvoidedKg / 1000).toFixed(2)} t CO₂/year`],
  ];

  return <Card as="section" className="results-panel assumptions-panel" id="assumptions" aria-labelledby="assumptions-title">
    <div className="results-panel-heading"><div><p className="eyebrow">Know what shaped the estimate</p><h2 className="card-title" id="assumptions-title">Assumptions and confidence</h2><p className="card-sub">Source labels distinguish information you entered from demo/model values and calculated results.</p></div><Badge variant={demoMode ? "warning" : "success"}>{demoMode ? "Illustrative demo" : "Planning estimate"}</Badge></div>
    <p className="confidence-note">No numerical confidence score is shown. The model has no measured irradiance, hourly load profile, shade survey, or installer design, so completeness should not be mistaken for site accuracy.</p>
    <div className="assumption-columns">
      <SourceList title={context ? context.isDemoExample ? "Sample assessment values" : "From your assessment" : demoMode ? "Demo assessment inputs" : "Current assessment inputs"} rows={assessmentRows}/>
      <SourceList title="Model assumptions" rows={modelRows}/>
      <SourceList title="Calculated by SolarSmart" rows={calculatedRows.map(([label, value]) => [label, value, "Calculation output"])} calculated/>
    </div>
    <div className="quality-reasons"><strong>Data quality notes</strong><ul>{result.dataQuality.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>
    <div className="result-notices">
      {result.warnings.length > 0 && <div><h3>Warnings</h3><ul>{result.warnings.map(warning => <li key={warning.code}><Badge variant={warning.severity === "caution" ? "warning" : "outline"}>{warning.severity === "caution" ? "Check" : "Note"}</Badge><span>{warning.message}</span></li>)}</ul></div>}
      <div><h3>Limitations</h3><ul>{result.limitations.map(item => <li key={item.code}><span>{item.message}</span></li>)}</ul></div>
    </div>
  </Card>;
}

function SourceList({ title, rows, calculated = false }: { title: string; rows: string[][]; calculated?: boolean }) {
  return <section className={`source-list${calculated ? " source-calculated" : ""}`}><h3>{title}</h3><dl>{rows.map(([label, value, source]) => <div className="source-row" key={label}><dt>{label}</dt><dd>{value}</dd><span>{source}</span></div>)}</dl></section>;
}

export function RecommendationsPanel({ inputs, result, context }: { inputs: SolarInputs; result: SolarResults; context?: AssessmentContext }) {
  const recommendations = buildRecommendations(inputs, result, context);
  return <Card as="section" className="results-panel recommendation-panel" id="recommendations" aria-labelledby="recommendations-title">
    <p className="eyebrow">Based on this assessment</p><h2 className="card-title" id="recommendations-title">Practical next steps</h2><p className="card-sub">Deterministic guidance tied to your current inputs and calculated results.</p>
    <ol className="recommendation-list">{recommendations.map((item, index) => <li key={item.title}><span className="recommendation-number">{index + 1}</span><div><div className="recommendation-title-row"><h3>{item.title}</h3><Badge variant={item.priority === "next" ? "success" : "neutral"}>{item.priority === "next" ? "Next" : "Consider"}</Badge></div><p>{item.detail}</p></div></li>)}</ol>
    <AssessmentChecklist/>
  </Card>;
}

function AssessmentChecklist() {
  const [checked, setChecked] = useState<string[]>([]);
  const tasks = ["Check a recent electricity bill and confirm the retail rate", "Confirm usable roof area, roof condition, orientation, and shade", "Ask a qualified installer for a site-specific design and itemized quote", "Verify export compensation, permits, and any incentive eligibility with official sources"];
  function toggle(task: string) { setChecked(current => current.includes(task) ? current.filter(item => item !== task) : [...current, task]); }
  return <fieldset className="next-checklist"><legend>My planning checklist</legend>{tasks.map(task => <label key={task}><input type="checkbox" checked={checked.includes(task)} onChange={() => toggle(task)}/><span>{task}</span></label>)}</fieldset>;
}

export function MonthlyProfileNotice() {
  return <ChartContainer title="Monthly generation profile" description="No month-by-month production values are available in this assessment" className="card result-chart monthly-profile-notice"><EmptyState title="A monthly profile is not modeled" description="SolarSmart uses an annual generic yield input, not a location-specific seasonal model. We leave monthly production blank instead of inventing a weather profile."/></ChartContainer>;
}
