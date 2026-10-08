"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownRight, BookOpen, Calculator, ChevronDown, CircleHelp, CloudSun, Download, Gauge, House, Leaf, RotateCcw, Settings2, ShieldCheck, Sparkles, Sun, Wallet } from "lucide-react";
import { EstimateForm } from "@/components/solar/estimate-form";
import { MetricCard } from "@/components/solar/metric-card";
import { ScenarioComparison } from "@/components/solar/scenario-comparison";
import { buildFallbackExplanation } from "@/lib/ai/fallback";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { requestOptionalExplanation } from "@/lib/services/explanation-client";
import { buildEstimateReport } from "@/lib/report";
import { useAssessment } from "@/hooks/use-assessment";
import type { DemoScenario } from "@/lib/scenarios";
import type { SolarInputs } from "@/lib/solar";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const INITIAL_RECOMMENDATION = "Your sample estimate is ready. Review the roof and bill assumptions, then compare a few what-if scenarios to understand the range.";

export default function Home() {
  const assessment = useAssessment();
  const [activeScenario, setActiveScenario] = useState("balanced");
  const [toast, setToast] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [recommendation, setRecommendation] = useState(INITIAL_RECOMMENDATION);
  const { inputs, result, errors } = assessment;
  const scenarioName = DEMO_SCENARIOS.find(item => item.id === activeScenario)?.name ?? "Custom scenario";
  const chartData = useMemo(() => Array.from({ length: 6 }, (_, year) => ({
    year: year === 0 ? "Now" : `Year ${year}`,
    solar: Math.round(result.annualSavings * (1 + inputs.electricityEscalation) ** year),
    utility: Math.round(inputs.monthlyBill * 12 * (1 + inputs.electricityEscalation) ** year),
  })), [inputs.electricityEscalation, inputs.monthlyBill, result.annualSavings]);

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function reset() { assessment.reset(); setActiveScenario("balanced"); setRecommendation(INITIAL_RECOMMENDATION); flash("Demo assumptions restored"); }
  function changeField(field: keyof SolarInputs, value: string) { assessment.updateField(field, value); setActiveScenario("custom"); }
  function chooseScenario(scenario: DemoScenario) { assessment.applyInputs(scenario.inputs); setActiveScenario(scenario.id); flash(`${scenario.name} assumptions applied`); }
  function downloadReport() {
    const content = buildEstimateReport(inputs, result, scenarioName);
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "solarsmart-planning-estimate.txt"; anchor.click(); URL.revokeObjectURL(url);
    flash("Planning report downloaded");
  }
  async function explain() {
    setRecommendation(buildFallbackExplanation(inputs, result));
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      setExplaining(true);
      try {
        const explanation = await requestOptionalExplanation(result);
        if (explanation) setRecommendation(explanation);
        flash("Optional explanation refreshed");
      } catch {
        flash("AI unavailable · local explanation shown");
      } finally { setExplaining(false); }
    } else flash("Local explanation refreshed");
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sun size={20}/></div>solar<span>smart</span></div>
      <div className="nav-label">Workspace</div>
      <a className="nav-item active" href="#overview"><House size={16}/>Overview</a>
      <a className="nav-item" href="#estimate"><Calculator size={16}/>Solar estimate</a>
      <a className="nav-item" href="#insights"><Activity size={16}/>Energy insights</a>
      <a className="nav-item" href="#assistant"><Sparkles size={16}/>AI assistant <span className="optional-label">OPTIONAL</span></a>
      <div className="nav-label manage-label">Manage</div>
      <a className="nav-item" href="#scenarios"><BookOpen size={16}/>Compare scenarios</a>
      <a className="nav-item" href="#next-steps"><Settings2 size={16}/>Next steps</a>
      <div className="sidebar-bottom">
        <div className="help-card"><CircleHelp size={17}/><strong>New to solar?</strong>Start with a no-pressure estimate using the sample assumptions.<br/><button className="link-button" onClick={() => document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth" })}>Explore the calculator →</button></div>
        <div className="user"><div className="avatar">G</div><div><strong className="guest-title">Guest session</strong><div className="guest-caption">Local demo · no account</div></div><ChevronDown size={14} className="guest-chevron"/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumbs">Workspace&nbsp; / &nbsp;<b>Overview</b></div><div className="top-right"><div className="demo-pill"><i className="dot"/>DEMO MODE</div><button className="icon-button" aria-label="Download planning report" onClick={downloadReport}><Download size={15}/></button></div></header>
      <div className="content" id="overview">
        <div className="heading-row"><div><div className="eyebrow">Your energy, at a glance</div><h1>Good morning, Guest <span className="greeting-sun">☀️</span></h1><p className="subhead">A clearer picture of what rooftop solar could look like for you.</p></div><div className="date-chip">◷ &nbsp;Sample estimate</div></div>
        <section className="hero"><div className="hero-copy"><div className="hero-tag">✦ &nbsp;Your rooftop solar snapshot · Demo data</div><h2>Make room for a brighter kind of savings.</h2><p>Explore an early planning estimate from transparent assumptions. Real site conditions, utility rules, and installer quotes determine actual results.</p><div className="hero-actions"><button className="button-primary" onClick={() => document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth" })}>Personalize estimate&nbsp; →</button><button className="button-ghost" onClick={reset}><RotateCcw size={12} aria-hidden="true"/> Reset demo</button></div></div><div className="sun-art" aria-hidden="true"><CloudSun size={88} strokeWidth={1.1}/></div></section>

        <section className="metric-grid" aria-label="Solar planning estimate metrics">
          <MetricCard icon={<Gauge size={14}/>} label="Modeled system size" value={`${result.systemKw} kW`} foot="Roof and energy assumptions"/>
          <MetricCard icon={<Wallet size={14}/>} label="Estimated annual savings" value={money(result.annualSavings)} foot={<><span>↗</span> {money(result.monthlySavings)} / month · estimated</>}/>
          <MetricCard icon={<ArrowDownRight size={14}/>} label="Simple payback period" value={`${result.paybackYears} yrs`} foot="Before financing & maintenance"/>
          <MetricCard icon={<Leaf size={14}/>} label="Estimated CO₂ avoided" value={`${(result.co2AvoidedKg / 1000).toFixed(1)} t`} foot="Generic grid-factor assumption"/>
        </section>

        <section className="feasibility-banner" aria-live="polite"><div className="feasibility-icon"><ShieldCheck size={17}/></div><div><strong>{result.roofLimited ? "Roof area limits the modeled system" : "Roof area may fit the modeled system"}</strong><p>Estimated usable roof capacity: {result.roofCapacityKw} kW · modeled solar system: {result.systemKw} kW. A remote estimate cannot assess roof structure, code, permitting, or actual shade.</p></div><span className="estimate-only">EARLY ESTIMATE</span></section>

        <ScenarioComparison activeId={activeScenario} onSelect={chooseScenario} currentResult={result}/>

        <div className="columns"><div>
          <section id="insights" className="card" aria-labelledby="savings-heading"><div className="card-title-row"><div><h2 className="card-title" id="savings-heading">Your potential savings</h2><p className="card-sub">Illustrative annual bill and modeled savings · USD</p></div><div className="chart-legend"><span><i className="legend-dot"/> Solar savings</span><span><i className="legend-dot orange"/> Utility spend</span></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}><defs><linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70a777" stopOpacity={.2}/><stop offset="95%" stopColor="#70a777" stopOpacity={0}/></linearGradient><linearGradient id="billFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2ad6f" stopOpacity={.17}/><stop offset="95%" stopColor="#f2ad6f" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0ec" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#9aa39c" }}/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#9aa39c" }} tickFormatter={value => `$${value}`} width={43}/><Tooltip formatter={value => money(Number(value))} contentStyle={{ border: "1px solid #edf0ec", borderRadius: 8, fontSize: 11 }}/><Area type="monotone" dataKey="utility" name="Utility spend" stroke="#efaa69" strokeWidth={2} fill="url(#billFill)"/><Area type="monotone" dataKey="solar" name="Solar savings" stroke="#6b9f70" strokeWidth={2} fill="url(#solarFill)"/></AreaChart></ResponsiveContainer></div></section>

          <EstimateForm inputs={inputs} errors={errors} onChange={changeField} onReset={reset} onValidate={() => { if (assessment.validate()) flash("Estimate updated using your assumptions"); }}/>
        </div><div>
          <section className="card right-card"><div className="card-title-row"><div><h2 className="card-title">Where the numbers come from</h2><p className="card-sub">Illustrative model breakdown</p></div><button className="icon-button" aria-label="About the estimate model" onClick={() => flash("Model uses the assumptions shown in Tune your estimate.")}><CircleHelp size={14}/></button></div><div className="donut-row"><div className="donut"><div className="donut-center">{Math.round(inputs.selfConsumption * 100)}%<small>modeled offset</small></div></div><div className="legend-list"><div className="legend-line"><span><i/>Modeled bill offset</span><b>{money(result.annualSavings)}</b></div><div className="legend-line"><span><i/>Remaining bill spend</span><b>{money(Math.max(0, inputs.monthlyBill * 12 - result.annualSavings))}</b></div><div className="legend-line"><span><i/>System cost assumption</span><b>{money(inputs.systemCost)}</b></div></div></div><div className="tip"><strong>Planning tip</strong><br/>Compare multiple installer quotes and ask for their production, shade, equipment, and warranty assumptions.</div></section>

          <section className="card assistant-card" id="assistant"><div className="assistant-head"><div className="assistant-icon"><Sparkles size={15}/></div><div className="assistant-label">SolarSmart assistant<small>Deterministic fallback · optional Strands API</small></div><span className="optional-pill">OPTIONAL</span></div><p className="recommendation">{recommendation}</p><button className="link-button" onClick={explain} disabled={explaining}>{explaining ? "Getting optional explanation…" : "Refresh explanation ↗"}</button></section>

          <section className="card next-steps" id="next-steps"><div className="eyebrow">Practical next steps</div><h2 className="card-title">Move from estimate to evidence</h2><ol><li><span>1</span><div><strong>Check your bill</strong><p>Confirm average monthly use and the utility’s current rate structure.</p></div></li><li><span>2</span><div><strong>Review your roof</strong><p>Note roof age, orientation, shade, and any visible obstructions.</p></div></li><li><span>3</span><div><strong>Compare local quotes</strong><p>Ask qualified installers for a site visit and itemized production assumptions.</p></div></li></ol></section>

          <p className="disclaimer" id="privacy">Planning estimate only. Demo values are illustrative and are not verified tariffs, live solar readings, subsidy amounts, or government approvals. Demo mode sends nothing unless you configure the optional explanation API; that API receives calculated results for explanation. Confirm assumptions with your utility and a qualified local installer.</p>
        </div></div>
      </div>
    </main>
    {toast && <div role="status" className="toast">{toast}</div>}
  </div>;
}
