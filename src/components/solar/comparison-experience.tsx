"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Download, Plus, RotateCcw, Trash2, Pencil, Check, X, Sun, TriangleAlert, Lightbulb } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Alert, Badge, Button, Card, TextField } from "@/components/ui";
import { calculateSolar, DEFAULT_CALCULATION_ASSUMPTIONS, DEFAULT_INPUTS, type CalculationAssumptions, type SolarInputs } from "@/lib/solar";
import { buildEstimateReport } from "@/lib/report";
import { createDefaultAlternatives, createScenario, duplicateScenario, evaluateScenario, formatMetric, renameScenario, updateScenarioAssumption, updateScenarioInput, withPinnedAnnualConsumption, type Scenario, type ScenarioMetric } from "@/lib/comparison";

const fieldSpecs: Array<{ field: keyof SolarInputs; label: string; unit: string; step?: string; max?: string; hint?: string; percent?: boolean }> = [
  { field: "roofAreaSqFt", label: "Roof area", unit: "sq ft", max: "1000000", hint: "Approximate total roof area." },
  { field: "usableRoofPercent", label: "Usable share", unit: "%", max: "100", hint: "Area remaining after setbacks and obstructions." },
  { field: "shadingFactor", label: "Shade factor", unit: "%", step: "1", max: "100", percent: true, hint: "100% means no modeled shade loss." },
  { field: "annualConsumptionKwh", label: "Annual electricity use", unit: "kWh / year", max: "1200000", hint: "Baseline use is inferred from assessment bill and tariff; edit this directly for a usage scenario." },
  { field: "utilityRate", label: "Retail tariff", unit: "USD / kWh", step: "0.01", max: "1000", hint: "Enter the rate from a recent bill." },
  { field: "exportCompensationRate", label: "Export compensation", unit: "USD / kWh", step: "0.01", max: "1000", hint: "Utility export credit; zero until verified." },
  { field: "systemCost", label: "Expected system cost", unit: "USD", max: "100000000", hint: "Planning assumption, not an installer quote." },
  { field: "targetAnnualOffsetRate", label: "Sizing target", unit: "% of usage", max: "100", percent: true, hint: "Changes requested system capacity; roof still limits it." },
  { field: "sunHours", label: "Generic yield input", unit: "hours / day", step: "0.1", max: "12", hint: "Illustrative value only, not a live solar reading." },
  { field: "orientationFactor", label: "Orientation factor", unit: "%", step: "1", max: "100", percent: true, hint: "Generic orientation effect; no roof survey is performed." },
  { field: "electricityEscalation", label: "Annual bill increase", unit: "% / year", step: "0.1", max: "20", percent: true },
];
const assumptionSpecs: Array<{ field: keyof CalculationAssumptions; label: string; unit: string; step?: string; min: number; max: number; percent?: boolean }> = [
  { field: "physicalSelfConsumptionRate", label: "Physical self-consumption", unit: "%", step: "1", min: 0, max: 100, percent: true },
];
const currency = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

type Props = { baseInputs?: SolarInputs; baseName?: string; baseSourceLabel?: string; tariffWasAssumed?: boolean };
export function ComparisonExperience({ baseInputs = DEFAULT_INPUTS, baseName = "Base assessment", baseSourceLabel = "Assessment values", tariffWasAssumed = false }: Props) {
  const router = useRouter();
  const [base, setBase] = useState(() => withPinnedAnnualConsumption(baseInputs));
  const [baseTitle] = useState(baseName);
  const [scenarios, setScenarios] = useState(() => createDefaultAlternatives(baseInputs));
  const [selectedId, setSelectedId] = useState<string | "base">("base");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toast, setToast] = useState("");
  const baseResult = useMemo(() => calculateSolar(base), [base]);
  const selected = scenarios.find(item => item.id === selectedId);
  const evaluation = selected ? evaluateScenario(base, selected) : null;
  const comparisons = scenarios.map(scenario => evaluateScenario(base, scenario));
  const chartRows = [{ name: "Base", capacity: baseResult.systemKw, savings: baseResult.annualSavings }, ...comparisons.filter(item => item.result).map(item => ({ name: item.scenario.name, capacity: item.result!.systemKw, savings: item.result!.annualSavings }))];

  function updateScenario(id: string, transform: (scenario: Scenario) => Scenario) { setScenarios(current => current.map(scenario => scenario.id === id ? transform(scenario) : scenario)); }
  function addScenario() { const scenario = createScenario("New scenario", base); setScenarios(current => [...current, scenario]); setSelectedId(scenario.id); setRenameId(scenario.id); setRenameValue(scenario.name); }
  function duplicateSelected() { const source = selected ?? createScenario(baseTitle, base, "assessment"); const copy = duplicateScenario(source); setScenarios(current => [...current, copy]); setSelectedId(copy.id); setRenameId(copy.id); setRenameValue(copy.name); }
  function reset() { const nextBase = withPinnedAnnualConsumption(baseInputs); setBase(nextBase); setScenarios(createDefaultAlternatives(nextBase)); setSelectedId("base"); setRenameId(null); setToast("Comparison scenarios restored"); }
  function remove(id: string) { setScenarios(current => current.filter(scenario => scenario.id !== id)); if (selectedId === id) setSelectedId("base"); }
  function exportComparison() {
    const selectedTitle = selected ? selected.name : baseTitle;
    const result = selected ? evaluation?.result : baseResult;
    if (!result) { setToast("Fix invalid scenario assumptions before exporting"); return; }
    const report = buildEstimateReport(selected?.inputs ?? base, result, selectedTitle);
    const rows = selected ? evaluation!.metrics.map(metric => `${metric.label}: base ${formatMetric(metric, metric.base)}; scenario ${formatMetric(metric, metric.alternative)}; difference ${formatDelta(metric)}`).join("\n") : "The selected view is the base assessment.";
    downloadText(`${report}\n\nCOMPARISON WITH ${baseTitle.toUpperCase()}\n${rows}\n\nScenario-specific self-consumption assumption: ${((selected?.assumptions.physicalSelfConsumptionRate ?? DEFAULT_CALCULATION_ASSUMPTIONS.physicalSelfConsumptionRate) * 100).toFixed(0)}%. This is an illustrative load-timing assumption, not a measured hourly profile.`);
    setToast("Comparison report downloaded");
  }
  function resetAlternatives() { setScenarios(createDefaultAlternatives(base)); setSelectedId("base"); setToast("Sample alternatives restored for this base assessment"); }
  function updateInput(id: string, field: keyof SolarInputs, value: number) {
    updateScenario(id, scenario => {
      let updated = updateScenarioInput(scenario, field, value);
      if (field === "utilityRate") updated = updateScenarioInput(updated, "monthlyBill", updated.inputs.annualConsumptionKwh! * value / 12);
      if (field === "annualConsumptionKwh") updated = updateScenarioInput(updated, "monthlyBill", value * updated.inputs.utilityRate / 12);
      return updated;
    });
  }

  return <div className="app-shell"><SiteHeader/><main className="main" id="main-content" tabIndex={-1}>
    <header className="topbar"><div className="breadcrumbs">Solar planning&nbsp; / &nbsp;<b>Scenario comparison</b></div><div className="top-right"><div className="demo-pill"><i className="dot"/>LOCAL COMPARISON</div></div></header>
    <div className="content comparison-page">
      <div className="comparison-heading"><div><div className="eyebrow">Decision support · estimates only</div><h1>Compare solar scenarios</h1><p>Explore how different assumptions change the same deterministic estimate. No AI or cloud services are used.</p></div><Button variant="secondary" onClick={() => { if (document.referrer.includes("/assessment")) router.back(); else router.push("/assessment"); }}><ArrowLeft size={15}/> Back to results</Button></div>
      <Alert title="Compare one scenario at a time" variant="info">Each alternative is compared with the same base assessment. Changing several assumptions at once can show a combined effect, but cannot tell which input caused it.</Alert>

      <section className="comparison-layout" aria-label="Scenario choices and selected assumptions">
        <Card as="section" className="comparison-scenario-list"><div className="comparison-section-title"><div><h2>Scenarios</h2><p>Select a row to inspect and edit its assumptions.</p></div><Badge variant="outline">{scenarios.length} alternatives</Badge></div>
          <button type="button" className={`comparison-choice${selectedId === "base" ? " is-active" : ""}`} aria-pressed={selectedId === "base"} onClick={() => setSelectedId("base")}><span className="choice-mark"><Sun size={15}/></span><span className="choice-copy"><strong>{baseTitle}</strong><small>{baseSourceLabel} · fixed baseline</small></span><strong className="choice-value">{baseResult.systemKw.toFixed(1)} kW</strong></button>
          {scenarios.length === 0 && <p className="comparison-empty">No alternatives yet. Add a scenario to start comparing.</p>}
          {scenarios.map(scenario => {
            const current = evaluateScenario(base, scenario);
            return <div className={`comparison-choice-wrap${selectedId === scenario.id ? " is-active" : ""}`} key={scenario.id}>
              <button type="button" className="comparison-choice" aria-pressed={selectedId === scenario.id} onClick={() => setSelectedId(scenario.id)}><span className="choice-mark"><Sun size={15}/></span><span className="choice-copy"><strong>{scenario.name}</strong><small>{scenario.origin === "sample" ? "Sample assumptions · editable" : scenario.origin === "duplicate" ? "Duplicated assumptions · editable" : "User-edited assumptions"}</small></span><strong className="choice-value">{current.result ? `${current.result.systemKw.toFixed(1)} kW` : "Invalid"}</strong></button>
              {renameId === scenario.id ? <div className="inline-rename"><TextField label={`Rename ${scenario.name}`} value={renameValue} onChange={event => setRenameValue(event.target.value)} maxLength={48}/><Button size="sm" aria-label="Save scenario name" onClick={() => { updateScenario(scenario.id, item => renameScenario(item, renameValue)); setRenameId(null); }}> <Check size={14}/> Save</Button><Button variant="quiet" size="sm" aria-label="Cancel renaming" onClick={() => setRenameId(null)}><X size={14}/></Button></div> : <div className="choice-actions"><Button size="sm" variant="quiet" onClick={() => { setRenameId(scenario.id); setRenameValue(scenario.name); }} aria-label={`Rename ${scenario.name}`}><Pencil size={13}/> Rename</Button><Button size="sm" variant="quiet" onClick={() => { const copy = duplicateScenario(scenario); setScenarios(items => [...items, copy]); setSelectedId(copy.id); }} aria-label={`Duplicate ${scenario.name}`}><Copy size={13}/> Duplicate</Button><Button size="sm" variant="quiet" onClick={() => remove(scenario.id)} aria-label={`Remove ${scenario.name}`}><Trash2 size={13}/> Remove</Button></div>}
            </div>;
          })}
          <div className="scenario-list-actions"><Button onClick={addScenario}><Plus size={15}/> Add scenario</Button><Button variant="secondary" onClick={duplicateSelected}><Copy size={15}/> Duplicate selected</Button><Button variant="quiet" onClick={resetAlternatives}><RotateCcw size={15}/> Reset samples</Button></div>
        </Card>

        <Card as="section" className="comparison-editor"><div className="comparison-section-title"><div><h2>{selected ? `Edit ${selected.name}` : "Base assessment"}</h2><p>{selected ? "Changes recalculate immediately using the shared solar engine." : "The original assessment stays unchanged as the comparison baseline."}</p></div>{selected && <Badge variant={selected.origin === "sample" ? "warning" : "success"}>{selected.origin === "sample" ? "Illustrative sample" : "Editable scenario"}</Badge>}</div>
          {!selected ? <div className="base-overview"><p><strong>{baseTitle}</strong> is your fixed baseline. To explore a different outcome, select or add an alternative.</p><dl><div><dt>Baseline source</dt><dd>{baseSourceLabel}</dd></div><div><dt>Roof area</dt><dd>{base.roofAreaSqFt.toLocaleString()} sq ft · {base.usableRoofPercent}% usable</dd></div><div><dt>Annual electricity use</dt><dd>{Math.round(base.annualConsumptionKwh ?? 0).toLocaleString()} kWh · held constant for tariff what-ifs</dd></div><div><dt>Implied monthly bill</dt><dd>{currency(base.monthlyBill)}</dd></div><div><dt>Retail tariff</dt><dd>${base.utilityRate.toFixed(3)}/kWh · {tariffWasAssumed ? "assumed demo default; verify" : "from assessment inputs"}</dd></div><div><dt>Shade factor</dt><dd>{(base.shadingFactor * 100).toFixed(0)}%</dd></div></dl><p className="source-note">Assessment inputs form the baseline. Generic yield, cost, emissions, and self-consumption values remain model defaults unless specifically overridden. Nothing here is a verified local rate or site measurement.</p></div> : <>
            {evaluation?.errors.length ? <Alert variant="error" title="This scenario needs valid inputs">{evaluation.errors.join(" ")} The base assessment and other scenarios remain available.</Alert> : <p className="source-note">Values marked <Badge variant="outline">sample assumption</Badge> came from a fictional preset. Edits are local. Capacity is derived from area, consumption, and the sizing target; it is not a directly overridden number.</p>}
            <div className="comparison-input-grid">{fieldSpecs.map(spec => {
              const raw = selected.inputs[spec.field] ?? Number.NaN; const shown = spec.percent ? raw * 100 : raw;
              const isOverride = raw !== base[spec.field];
              return <TextField key={spec.field} label={`${spec.label} (${spec.unit})`} type="number" inputMode="decimal" min="0" max={spec.max} step={spec.step ?? "1"} value={Number.isFinite(shown) ? shown : ""} hint={`${spec.hint ? `${spec.hint} ` : ""}${isOverride ? "Scenario override vs base." : "Matches the base assessment."}`} error={scenarioFieldError(spec.field, raw)} onChange={event => { const text = event.target.value.trim(); const value = text ? Number(text) : Number.NaN; updateInput(selected.id, spec.field, spec.percent ? value / 100 : value); }}/>
            })}</div>
            <div className="comparison-assumption-control"><h3>Calculation assumptions</h3><p>Default self-consumption is 75% when hourly load timing is unknown. This scenario override is illustrative, not measured.</p>{assumptionSpecs.map(spec => { const effective = selected.assumptions[spec.field] ?? DEFAULT_CALCULATION_ASSUMPTIONS[spec.field]; const shown = spec.percent ? Number(effective) * 100 : Number(effective); return <TextField key={spec.field} label={`${spec.label} (${spec.unit})`} type="number" min={spec.min} max={spec.max} step={spec.step ?? "1"} value={Number.isFinite(shown) ? shown : ""} error={Number.isFinite(shown) && (shown < spec.min || shown > spec.max) ? `Use a value between ${spec.min} and ${spec.max}.` : undefined} onChange={event => { const text = event.target.value.trim(); const raw = text ? Number(text) : Number.NaN; updateScenario(selected.id, item => updateScenarioAssumption(item, spec.field, spec.percent ? raw / 100 : raw)); }} hint={selected.assumptions[spec.field] === undefined ? "Shared engine default · override for this scenario" : "Scenario-specific override"}/>; })}</div>
          </>}
        </Card>
      </section>

      <section className="comparison-results" aria-labelledby="comparison-results-title"><div className="comparison-section-title"><div><div className="eyebrow">Same model · same units</div><h2 id="comparison-results-title">Results against {baseTitle}</h2><p>{selected ? `Comparing “${selected.name}” with your base assessment.` : "Select an alternative to see its absolute and relative change from the base."}</p></div><Button variant="secondary" disabled={Boolean(selected && !evaluation?.result)} onClick={exportComparison}><Download size={14}/> Export selected report</Button></div>
        {selected && evaluation && <>
          {evaluation.errors.length > 0 && <Alert variant="error" title="Results unavailable for this scenario">{evaluation.errors.join(" ")} Correct the scenario assumptions to calculate updated results. No previous scenario values are being shown.</Alert>}
          {evaluation.scenario.changedFields.length === 0 && <Alert variant="success" title="Identical assumptions">This scenario currently matches the base assessment, so differences are zero. Edit an assumption to explore a meaningful alternative.</Alert>}
          {evaluation.scenario.changedFields.length > 1 && <Alert variant="warning" title="Multiple variables changed">This scenario changes {evaluation.scenario.changedFields.length} assumptions. The combined difference is meaningful as a scenario, but cannot be attributed to an individual variable.</Alert>}
          <div className="comparison-metric-table-wrap"><table className="comparison-metric-table"><caption className="sr-only">Metric comparison with absolute and percentage differences</caption><thead><tr><th scope="col">Estimate</th><th scope="col">Base</th><th scope="col">{selected.name}</th><th scope="col">Difference</th><th scope="col">Change</th></tr></thead><tbody>{evaluation.metrics.map(metric => <MetricRow key={metric.key} metric={metric}/>)}</tbody></table></div>
        </>}
        <div className="comparison-charts"><ScenarioChart title="Feasible system capacity" unit="kW" data={chartRows} dataKey="capacity" color="#2482cf"/><ScenarioChart title="Estimated first-year savings" unit="USD / year" data={chartRows} dataKey="savings" color="#d7973d" currency/> </div>
      </section>

      {selected && evaluation?.result && <section className="comparison-recommendations"><div className="comparison-section-title"><div><div className="eyebrow">Decision support · deterministic</div><h2>What to consider next</h2><p>Guidance uses the selected scenario inputs and calculated outputs.</p></div><Lightbulb size={22} aria-hidden="true"/></div><div className="recommendation-cards">{evaluation.recommendations.map((item, index) => <Card as="article" key={`${item.title}-${index}`}><Badge variant={item.priority === "next" ? "warning" : "outline"}>{item.priority === "next" ? "Next step" : "Consider"}</Badge><h3>{item.title}</h3><p>{item.detail}</p></Card>)}</div><p className="comparison-disclaimer"><TriangleAlert size={14}/> Recommendations identify questions to investigate; they do not confirm installation suitability or guarantee savings.</p></section>}
      <div className="comparison-bottom-actions"><Button variant="quiet" onClick={reset}><RotateCcw size={14}/> Reset comparison</Button><Button variant="secondary" onClick={() => router.push("/assessment")}><ArrowLeft size={14}/> Start a new assessment</Button></div>
    </div>
  </main><SiteFooter/>{toast && <div className="ui-notification" role="status"><span>{toast}</span><Button variant="quiet" size="sm" onClick={() => setToast("")}>Dismiss</Button></div>}</div>;
}

function MetricRow({ metric }: { metric: ScenarioMetric }) {
  return <tr><th scope="row">{metric.label}<small>{metric.unit}</small></th><td>{formatMetric(metric, metric.base)}</td><td>{formatMetric(metric, metric.alternative)}</td><td className={metric.difference === null ? "" : metric.difference > 0 ? "delta-positive" : metric.difference < 0 ? "delta-negative" : ""}>{metric.difference === null ? "Unavailable" : `${metric.difference > 0 ? "+" : ""}${formatMetric(metric, metric.difference)}`}</td><td>{metric.percentDifference === null ? "—" : `${metric.percentDifference > 0 ? "+" : ""}${metric.percentDifference.toFixed(1)}%`}</td></tr>;
}
function formatDelta(metric: ScenarioMetric) { return metric.difference === null ? "unavailable" : `${metric.difference > 0 ? "+" : ""}${formatMetric(metric, metric.difference)} (${metric.percentDifference === null ? "percentage not meaningful" : `${metric.percentDifference.toFixed(1)}%`})`; }
function ScenarioChart({ title, unit, data, dataKey, color, currency: isCurrency = false }: { title: string; unit: string; data: Array<{ name: string; capacity: number; savings: number }>; dataKey: "capacity" | "savings"; color: string; currency?: boolean }) {
  return <Card as="section" className="comparison-chart" aria-label={`${title}, ${unit}`}><h3>{title}</h3><p>{unit}</p><div className="comparison-chart-canvas" role="img" aria-label={`${title} by scenario: ${data.map(row => `${row.name}: ${isCurrency ? currency(row[dataKey]) : `${row[dataKey].toFixed(1)} kW`}`).join("; ")}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 2 }}><CartesianGrid stroke="#edf0ec" vertical={false} strokeDasharray="3 4"/><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#52645a" }} tickLine={false} axisLine={false}/><YAxis width={isCurrency ? 58 : 42} tick={{ fontSize: 10, fill: "#52645a" }} tickLine={false} axisLine={false} tickFormatter={value => isCurrency ? `$${Number(value).toLocaleString()}` : `${value} kW`}/><Tooltip formatter={value => isCurrency ? [currency(Number(value)), "USD / year"] : [`${Number(value).toFixed(2)} kW`, "Capacity"]}/><Bar dataKey={dataKey} name={title} fill={color} radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></div></Card>;
}
function scenarioFieldError(field: keyof SolarInputs, value: number): string | undefined {
  if (!Number.isFinite(value)) return "Enter a finite number.";
  if (field === "utilityRate" && (value < 0.001 || value > 1000)) return "Retail tariff must be from 0.001 to 1,000 USD/kWh.";
  if (field === "shadingFactor" && (value < 0 || value > 1)) return "Shade factor must be between 0 and 100%.";
  if (field === "roofAreaSqFt" && (value < 0 || value > 1_000_000)) return "Roof area must be between 0 and 1,000,000 sq ft.";
  if (field === "systemCost" && (value < 0 || value > 100_000_000)) return "Cost must be between $0 and $100,000,000.";
  if (field === "annualConsumptionKwh" && (value < 0 || value > 1_200_000)) return "Annual electricity use must be between 0 and 1,200,000 kWh.";
  if (field === "sunHours" && (value <= 0 || value > 12)) return "Generic yield input must be greater than 0 and at most 12 hours per day.";
  if (field === "orientationFactor" && (value < 0.1 || value > 1)) return "Orientation factor must be between 10% and 100%.";
  if (field === "usableRoofPercent" && (value < 0 || value > 100)) return "Usable share must be between 0 and 100%.";
  if (field === "targetAnnualOffsetRate" && (value < 0 || value > 1)) return "Sizing target must be between 0 and 100%.";
  if (field === "electricityEscalation" && (value < 0 || value > 0.2)) return "Annual increase must be between 0 and 20%.";
  return undefined;
}
function downloadText(text: string) { const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "solarsmart-scenario-comparison.txt"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }

