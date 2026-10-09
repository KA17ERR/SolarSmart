"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ChartNoAxesCombined, CircleHelp, CloudSun, Download, Gauge, History, Leaf, Printer, RotateCcw, Sun, Wallet } from "lucide-react";
import { EstimateForm } from "@/components/solar/estimate-form";
import { MetricCard } from "@/components/solar/metric-card";
import { SavingsChart } from "@/components/solar/savings-chart";
import { GenerationChart, CostRecoveryChart } from "@/components/solar/results-charts";
import { ScenarioComparison } from "@/components/solar/scenario-comparison";
import { AssumptionsPanel, MonthlyProfileNotice, RecommendationsPanel } from "@/components/solar/results-details";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Alert, Button, Dialog, Notification, TextField } from "@/components/ui";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { buildEstimateCsv, buildEstimateReportData, type EstimateReportData } from "@/lib/report";
import { buildSavingsChartData } from "@/lib/dashboard-model";
import { persistComparisonBase } from "@/lib/comparison-storage";
import { useAssessment } from "@/hooks/use-assessment";
import type { DemoScenario } from "@/lib/scenarios";
import type { SolarInputs } from "@/lib/solar";
import { ORIENTATION_LABEL, PROPERTY_LABEL, ROOF_LABEL, SHADING_LABEL, type AssessmentContext } from "@/lib/assessment";
import { clearAssessmentHistory, deleteAssessmentHistory, readAssessmentHistory, renameAssessmentHistory, saveAssessmentHistory, type SavedAssessment } from "@/lib/assessment-history";
import { buildRecommendations } from "@/lib/recommendations";
import { ReportDocument } from "@/components/solar/report-document";
import { AssessmentAssistant } from "@/components/solar/assessment-assistant";
import { AccordionGallery } from "@/components/solar/accordion-gallery";
import { calculateSolar } from "@/lib/solar";
import type { AssistantScenarioSummary } from "@/lib/assistant/contract";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function AssessmentDashboard({ initialScenario = "balanced", initialInputs, assessmentContext, onEditAssessment }: { initialScenario?: string; initialInputs?: SolarInputs; assessmentContext?: AssessmentContext; onEditAssessment?: () => void }) {
  const scenario = DEMO_SCENARIOS.find(item => item.id === initialScenario) ?? DEMO_SCENARIOS.find(item => item.id === "balanced")!;
  const assessment = useAssessment(initialInputs ?? scenario.inputs);
  const [activeScenario, setActiveScenario] = useState(initialInputs ? "custom" : scenario.id);
  const [currentContext, setCurrentContext] = useState<AssessmentContext | undefined>(assessmentContext);
  const [toast, setToast] = useState("");
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [historyRecords, setHistoryRecords] = useState<SavedAssessment[]>([]);
  const [historyNotice, setHistoryNotice] = useState("");
  const [renameId, setRenameId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const { inputs, modelInputs, result, errors, isValid } = assessment;
  const shownContext = currentContext;
  const activeDemo = DEMO_SCENARIOS.some(item => item.id === activeScenario);
  const illustrativeDemo = activeDemo || shownContext?.isDemoExample === true;
  const scenarioName = activeDemo ? scenarioNameFor(activeScenario) : shownContext ? "Custom assessment" : "Custom scenario";
  const chartData = buildSavingsChartData(result).map(row => ({ ...row, solar: Math.round(row.solar), utility: Math.round(row.utility) }));
  const solarCoverage = result.annualConsumptionKwh > 0 ? Math.min(100, result.annualSelfConsumedKwh / result.annualConsumptionKwh * 100) : null;
  const assistantScenarios = useMemo<AssistantScenarioSummary[]>(() => {
    const current: AssistantScenarioSummary = { name: scenarioName, source: "current assessment", systemKw: result.systemKw, annualGenerationKwh: result.annualProductionKwh, annualSavingsUsd: result.annualSavings, installationCostLowUsd: result.installationCostRangeUsd.low, installationCostHighUsd: result.installationCostRangeUsd.high, paybackYears: result.paybackYears };
    const demos = DEMO_SCENARIOS.filter(item => item.id !== activeScenario).map(item => {
      const demoResult = calculateSolar(item.inputs);
      return { name: item.name, source: "illustrative demo" as const, systemKw: demoResult.systemKw, annualGenerationKwh: demoResult.annualProductionKwh, annualSavingsUsd: demoResult.annualSavings, installationCostLowUsd: demoResult.installationCostRangeUsd.low, installationCostHighUsd: demoResult.installationCostRangeUsd.high, paybackYears: demoResult.paybackYears };
    });
    return [current, ...demos].slice(0, 6);
  }, [activeScenario, result, scenarioName]);

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  useEffect(() => { const loaded = readAssessmentHistory(window.localStorage); setHistoryRecords(loaded.records); if (loaded.notice) setHistoryNotice(historyNoticeText(loaded.notice)); }, []);
  function reset() { assessment.reset(); setActiveScenario("balanced"); setCurrentContext(undefined); flash("Medium-roof demo restored"); }
  function changeField(field: keyof SolarInputs, value: string) { assessment.updateField(field, value); setActiveScenario("custom"); setCurrentContext(undefined); }
  function chooseScenario(next: DemoScenario) { assessment.applyInputs(next.inputs); setActiveScenario(next.id); setCurrentContext(undefined); flash(`${next.name} assumptions applied`); }
  function reportData(): EstimateReportData { return { generatedAt: reportDate, scenarioName, inputs: modelInputs, result, context: shownContext, recommendations: buildRecommendations(modelInputs, result, shownContext) }; }
  function openReport() { if (!isValid) { flash("Correct the highlighted assumptions before creating a report"); return; } setReportDate(new Date()); setReportDialogOpen(true); }
  function dispatchDownload(filename: string, contents: string, type: string): boolean {
    try {
      const url = URL.createObjectURL(new Blob([contents], { type }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.style.display = "none";
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch { return false; }
  }
  function downloadReport() {
    if (!isValid) { flash("Correct the highlighted assumptions before exporting a report"); return; }
    const content = buildEstimateReportData(reportData());
    flash(dispatchDownload("solarsmart-planning-estimate.txt", content, "text/plain;charset=utf-8") ? "Report prepared by your browser" : "Report export failed. Check browser download permissions and try again.");
  }
  function exportCsv() { if (!isValid) return; flash(dispatchDownload("solarsmart-results.csv", buildEstimateCsv(reportData()), "text/csv;charset=utf-8") ? "CSV prepared by your browser" : "CSV export failed. Check browser download permissions and try again."); }
  function printReport() { try { window.print(); flash("Print dialog opened · choose Save as PDF to create a PDF"); } catch { flash("Print could not be opened. Check browser settings and try again."); } }
  function refreshHistory() { const loaded = readAssessmentHistory(window.localStorage); setHistoryRecords(loaded.records); if (loaded.notice) setHistoryNotice(historyNoticeText(loaded.notice)); }
  function saveCurrentAssessment() {
    if (!isValid) { flash("Correct the highlighted assumptions before saving"); return; }
    try {
      const saved = saveAssessmentHistory(window.localStorage, { name: scenarioName, inputs: modelInputs, context: shownContext });
      if (!saved.ok) { flash(saved.reason === "invalid" ? "This assessment cannot be saved until its values are valid" : "Local history is unavailable in this browser"); return; }
      setHistoryRecords(saved.records); setHistoryNotice(""); flash("Assessment saved on this device");
    } catch { flash("Local history is unavailable in this browser"); }
  }
  function openSavedAssessment(record: SavedAssessment) { assessment.applyInputs(record.inputs); setActiveScenario("custom"); setCurrentContext(record.context); setHistoryDialogOpen(false); flash(`Opened “${record.name}” from local history`); }
  function renameSavedAssessment() {
    try { const renamed = renameAssessmentHistory(window.localStorage, renameId, renameValue); if (renamed.ok) { setHistoryRecords(renamed.records); setRenameId(""); flash("Saved assessment renamed"); } else flash("Could not rename this saved assessment"); }
    catch { flash("Local history is unavailable in this browser"); }
  }
  function removeSavedAssessment(id: string) { try { const removed = deleteAssessmentHistory(window.localStorage, id); if (removed.ok) { setHistoryRecords(removed.records); flash("Saved assessment removed"); } else flash("Could not remove this saved assessment"); } catch { flash("Local history is unavailable in this browser"); } }
  function clearHistory() { try { const removed = clearAssessmentHistory(window.localStorage); if (removed.ok) { setHistoryRecords([]); flash("Local assessment history cleared"); } else flash("Could not clear local history"); } catch { flash("Local history is unavailable in this browser"); } }
  const assistantRevision = JSON.stringify({ inputs, result: [result.systemKw, result.annualProductionKwh, result.annualSavings, result.netCost], activeScenario, context: shownContext });

  return <div className={`app-shell${reportDialogOpen ? " report-print-mode" : ""}`}>
    <SiteHeader/>
    <main className="main" id="main-content" tabIndex={-1}>
      <header className="topbar"><div className="breadcrumbs">Solar planning&nbsp; / &nbsp;<b>Results dashboard</b></div><div className="top-right dashboard-actions">
        {assessmentContext && onEditAssessment && <Button variant="secondary" size="sm" onClick={onEditAssessment}>Edit assessment</Button>}
        <Button variant="secondary" size="sm" onClick={() => { persistComparisonBase(modelInputs, scenarioName, illustrativeDemo ? "Fictional demo or sample values" : "Current assessment values", Boolean(shownContext?.tariffWasAssumed || activeDemo)); window.location.assign("/assessment/compare"); }}>Compare scenarios</Button>
        <Button variant="quiet" size="sm" onClick={() => window.location.assign("/assessment")}>New assessment</Button>
        <div className="demo-pill"><i className="dot"/>{illustrativeDemo ? "DEMO MODE" : "LOCAL MODE"}</div>
        <Button variant="quiet" size="sm" onClick={() => setModelDialogOpen(true)} aria-label="Open calculation methodology"><CircleHelp size={15}/> Method</Button>
        <Button variant="quiet" size="sm" onClick={() => { refreshHistory(); setHistoryDialogOpen(true); }} aria-label="Open local assessment history"><History size={15}/> History</Button>
        <Button variant="secondary" size="sm" onClick={openReport} disabled={!isValid}><Download size={14}/> Report</Button>
      </div></header>
      <div className="content">
        <div className="heading-row"><div><div className="eyebrow">Assessment results</div><h1>{shownContext ? `Solar potential · ${shownContext.cityOrPostcode}` : "Your rooftop solar snapshot"}</h1><p className="subhead">A transparent planning estimate based on {illustrativeDemo ? "illustrative sample values and disclosed assumptions" : "your assessment inputs"}.</p></div><div className="date-chip"><Sun size={13} aria-hidden="true"/> Estimate · {scenarioName}</div></div>
          <section className="hero results-hero" id="home"><div className="hero-copy"><div className="hero-tag"><ChartNoAxesCombined size={14} aria-hidden="true"/> Solar planning snapshot · estimates only</div><h2>Understand the numbers behind your roof.</h2><p>Review potential capacity, energy output, savings, and next steps. Actual results require site conditions, utility rules, equipment details, and a qualified installer assessment.</p><div className="hero-actions"><Button className="hero-primary" onClick={() => document.getElementById("solar-assessment")?.scrollIntoView({ behavior: "smooth" })}>Edit assumptions&nbsp; ↓</Button><Button variant="secondary" className="button-ghost" onClick={reset}><RotateCcw size={12} aria-hidden="true"/> Reset demo</Button></div></div><div className="sun-art" aria-hidden="true"><CloudSun size={82} strokeWidth={1.1}/></div></section>

        {shownContext && <section className="assessment-context-card" aria-labelledby="assessment-context-title"><div><p className="eyebrow">Reviewed inputs</p><h2 id="assessment-context-title">{PROPERTY_LABEL[shownContext.propertyType]} · {ROOF_LABEL[shownContext.roofType]}</h2><p>{shownContext.cityOrPostcode} · {shownContext.usableRoofArea.toLocaleString()} {shownContext.areaUnit === "sq-m" ? "m²" : "sq ft"} usable area</p></div><dl><div><dt>Energy entry</dt><dd>{shownContext.energyInputMethod === "monthly-bill" ? `${money(shownContext.monthlyEnergyInput)} / month` : `${shownContext.monthlyEnergyInput.toLocaleString()} kWh / month`}</dd></div><div><dt>Tariff</dt><dd>${shownContext.tariffUsdPerKwh.toFixed(3)}/kWh {shownContext.tariffWasAssumed ? "· assumed" : "· entered"}</dd></div><div><dt>Shade · orientation</dt><dd>{SHADING_LABEL[shownContext.shading]} · {ORIENTATION_LABEL[shownContext.orientation]}</dd></div>{shownContext.budgetUsd !== undefined && <div><dt>Optional budget context</dt><dd>{money(shownContext.budgetUsd)}</dd></div>}</dl><p className="assessment-context-note">Your general location is shown for context only. No local tariff, weather, or irradiance lookup was performed.</p></section>}

        {!isValid ? <section className="results-unavailable" aria-labelledby="results-unavailable-title"><Alert variant="error" title="Update the highlighted assumptions to recalculate">Results, charts, recommendations, and exports are hidden because the current input set is invalid. No previous estimate is shown as if it matched these values.</Alert><div id="solar-assessment"><EstimateForm inputs={inputs} errors={errors} onChange={changeField} onReset={reset} onValidate={() => { if (assessment.validate()) flash("Estimate recalculated using your current assumptions"); }}/></div></section> : <>
          <section className="metric-grid metric-grid-primary" id="dashboard" aria-label="Solar results overview">
            <MetricCard icon={<Sun size={14}/>} label="Annual generation" value={`${Math.round(result.annualProductionKwh).toLocaleString()} kWh`} foot="Generic yield model · estimated" help="Kilowatt-hours (kWh) estimate energy produced over a year using entered and generic factors."/>
            <MetricCard icon={<Gauge size={14}/>} label="Household consumption" value={`${Math.round(result.annualConsumptionKwh).toLocaleString()} kWh`} foot="Modeled annual use · estimated" help="The annualized electricity use calculated from your entered monthly consumption assumption."/>
            <MetricCard icon={<Wallet size={14}/>} label="Annual bill savings" value={money(result.annualSavings)} foot={`${money(result.monthlySavings)} per month · estimated`} help="Combines on-site solar use valued at retail rate and exports at the separate export-credit assumption."/>
            <MetricCard icon={<ChartNoAxesCombined size={14}/>} label="Solar coverage" value={solarCoverage === null ? "Not estimated" : `${solarCoverage.toFixed(0)}%`} foot="Share of modeled annual use served on-site" help="Estimated self-consumed solar divided by modeled household consumption. It is not an hourly grid-independence measure."/>
          </section>
          <details className="dashboard-disclosure dashboard-technical-summary"><summary>System details, cost, payback & environmental estimate</summary><div className="metric-grid metric-grid-technical">
            <MetricCard icon={<Gauge size={14}/>} label="Estimated capacity" value={`${result.systemKw.toFixed(1)} kW`} foot="Roof-constrained planning size" help="Kilowatts describe modeled peak system capacity, not annual energy."/>
            <MetricCard icon={<Wallet size={14}/>} label="Installation cost range" value={`${money(result.installationCostRangeUsd.low)}–${money(result.installationCostRangeUsd.high)}`} foot="Illustrative · not a quote" help="Local installer quotes may differ materially."/>
            <MetricCard icon={<ArrowDownRight size={14}/>} label="Simple payback" value={result.paybackYears === null ? "Not reached" : `${result.paybackYears.toFixed(1)} yrs`} foot={`Model horizon: ${result.projectionHorizonYears} years`} help="Financing and ongoing costs are excluded."/>
            <MetricCard icon={<Leaf size={14}/>} label="Avoided emissions" value={`${(result.co2AvoidedKg / 1000).toFixed(2)} t CO₂`} foot="Generic factor · estimated annually" help="Not a lifecycle assessment or measured impact."/>
          </div></details>

          <section className="feasibility-banner" aria-live="polite"><div className="feasibility-icon"><ChartNoAxesCombined size={17}/></div><div><strong>{result.roofLimited ? "Roof area constrains the modeled system" : "Roof area does not constrain this modeled size"}</strong><p>Usable roof capacity {result.roofCapacityKw.toFixed(1)} kW · estimated system {result.systemKw.toFixed(1)} kW. This estimate does not assess roof structure, code, permitting, or actual shade.</p></div><span className="estimate-only">EARLY ESTIMATE</span></section>

          <section className="dashboard-primary-chart" aria-label="Estimated generation and consumption"><GenerationChart rows={result.annualProjection}/></section>
          <AccordionGallery/>
          <section className="dashboard-savings-section" aria-label="Estimated savings"><div className="dashboard-section-heading"><div><p className="eyebrow">What it could mean for your bill</p><h2>Estimated savings over time</h2><p>Modeled solar savings and remaining utility bill · USD per year</p></div></div><SavingsChart data={chartData}/></section>

          <details className="dashboard-disclosure" id="scenario-details"><summary>Compare illustrative scenarios</summary><ScenarioComparison activeId={activeScenario} onSelect={chooseScenario} currentResult={result}/></details>

          <section className="dashboard-next-steps"><RecommendationsPanel inputs={modelInputs} result={result} context={shownContext}/></section>
          <details className="dashboard-disclosure" id="assumptions-details"><summary>Review assumptions, data quality and limitations</summary><AssumptionsPanel inputs={modelInputs} result={result} context={shownContext} scenarioName={scenarioName} demoMode={illustrativeDemo}/></details>
          <details className="dashboard-disclosure" id="cost-details"><summary>Explore cumulative savings and cost recovery</summary><CostRecoveryChart result={result}/><MonthlyProfileNotice/></details>

          <div className="dashboard-lower-grid"><EstimateForm inputs={inputs} errors={errors} onChange={changeField} onReset={reset} onValidate={() => { if (assessment.validate()) flash("Estimate recalculated using your current assumptions"); }}/><details className="dashboard-disclosure assistant-disclosure"><summary>Ask the optional results assistant</summary><AssessmentAssistant key={assistantRevision} inputs={modelInputs} result={result} scenarioName={scenarioName} context={shownContext} scenarios={assistantScenarios}/></details></div>
          <p className="disclaimer" id="about">Planning estimates only. Demo data is illustrative and is not a verified tariff, live solar reading, subsidy, approval, engineering assessment, or guarantee. Confirm assumptions with your utility and a qualified local installer.</p>
        </>}
      </div>
    </main>
    <SiteFooter/>
    <Dialog open={modelDialogOpen} title="How this estimate is calculated" onClose={() => setModelDialogOpen(false)}>
      <p>System size uses consumption, a target annual offset, generic annual yield and usable roof area. Annual savings distinguish energy used on site from exports.</p>
      <ul><li>Exported electricity is valued only at the explicit export-compensation assumption (zero by default), not at the retail rate.</li><li>Cost, yield, performance, self-consumption, degradation, and emissions use the disclosed generic assumptions in the results.</li><li>Simple payback is unavailable if cost recovery is not reached within the model horizon.</li></ul>
      <p>Financing, maintenance, taxes, changing export credits, fixed utility charges, roof structure, electrical service, permits, and local incentive eligibility are not modeled.</p>
    </Dialog>
    <Dialog open={reportDialogOpen} title="Assessment report" onClose={() => setReportDialogOpen(false)}>
      <div className="report-actions"><Button variant="secondary" size="sm" onClick={downloadReport}><Download size={14}/> Export text</Button><Button variant="secondary" size="sm" onClick={exportCsv}>Export CSV</Button><Button size="sm" onClick={printReport}><Printer size={14}/> Print / Save as PDF</Button><Button variant="quiet" size="sm" onClick={saveCurrentAssessment}>Save locally</Button></div>
      {toast && <p className="dialog-feedback" role="status">{toast}</p>}
      <p className="history-privacy-note">Report values are rebuilt from the current assessment and calculation output. Printing uses your browser; no PDF service is involved.</p>
      <ReportDocument data={reportData()}/>
    </Dialog>
    <Dialog open={historyDialogOpen} title="Assessment history on this device" onClose={() => setHistoryDialogOpen(false)}>
      {toast && <p className="dialog-feedback" role="status">{toast}</p>}
      <p className="history-privacy-note">History is optional and stays in this browser’s local storage. It does not sync across devices. SolarSmart does not save roof images. Clear this history any time.</p>
      {historyNotice && <Alert variant="warning" title="Some saved history needs attention">{historyNotice}</Alert>}
      {historyRecords.length === 0 ? <div className="history-empty"><h3>No saved assessments</h3><p>Save a valid assessment from its report to reopen it here later.</p></div> : <ul className="history-list">{historyRecords.map(record => <li key={record.id}>
        <div className="history-record-info"><strong>{record.name}</strong><span>{record.context?.cityOrPostcode || "Location not supplied"} · {new Date(record.savedAt).toLocaleDateString()} {record.context?.isDemoExample ? "· illustrative demo" : ""}</span></div>
        <div className="history-record-actions"><Button size="sm" onClick={() => openSavedAssessment(record)}>Open</Button><Button size="sm" variant="quiet" onClick={() => { setRenameId(record.id); setRenameValue(record.name); }}>Rename</Button><Button size="sm" variant="danger" onClick={() => removeSavedAssessment(record.id)}>Delete</Button></div>
        {renameId === record.id && <div className="history-rename"><TextField label="New assessment name" value={renameValue} maxLength={80} onChange={event => setRenameValue(event.target.value)}/><Button size="sm" onClick={renameSavedAssessment}>Save name</Button><Button size="sm" variant="quiet" onClick={() => setRenameId("")}>Cancel</Button></div>}
      </li>)}</ul>}
      {historyRecords.length > 0 && <Button size="sm" variant="danger" onClick={clearHistory}>Delete all local history</Button>}
    </Dialog>
    {toast && <Notification onDismiss={() => setToast("")}>{toast}</Notification>}
  </div>;
}

function scenarioNameFor(id: string) { return DEMO_SCENARIOS.find(item => item.id === id)?.name ?? "Demo scenario"; }
function historyNoticeText(notice: "corrupt-data" | "unsupported-version" | "migrated") {
  if (notice === "migrated") return "Older saved assessments were read in the current format. They will be stored in the current schema the next time you save an assessment.";
  if (notice === "unsupported-version") return "This browser contains a history format from a newer SolarSmart version. It has not been overwritten.";
  return "Some saved entries could not be read. Valid records in the same history remain available; unreadable entries were skipped.";
}
