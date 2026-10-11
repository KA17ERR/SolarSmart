import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getDashboardInsight } from "@/lib/dashboard-insights";
import { calculateSolar, validateInputs, type SolarInputs, type SolarResults } from "@/lib/solar";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { buildRecommendations } from "@/lib/recommendations";
import { GenerationProjectionChart, SavingsProjectionChart } from "@/components/solar/projection-charts";
import "../../../dashboard-insights.css";
import { AnimatedText } from "@/components/animations/AnimatedText";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const insight = getDashboardInsight(slug);
  return insight ? { title: `${insight.title} · SolarSmart`, description: insight.summary } : { title: "Solar Dashboard Guide · SolarSmart" };
}

export default async function DashboardInsightPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ scenario?: string; inputs?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const insight = getDashboardInsight(slug);
  if (!insight) notFound();
  const scenario = DEMO_SCENARIOS.find(item => item.id === query.scenario) ?? DEMO_SCENARIOS.find(item => item.id === "balanced")!;
  const customInputs = parseInputs(query.inputs);
  const inputs = customInputs ?? scenario.inputs;
  const result = calculateSolar(inputs);
  const dashboardHref = `/assessment?scenario=${scenario.id}${customInputs ? `&inputs=${encodeURIComponent(JSON.stringify(customInputs))}` : ""}#dashboard-gallery`;

  return <div className="app-shell dashboard-insight-shell">
    <SiteHeader />
    <main className="main dashboard-insight-main" id="main-content">
      <Link className="insight-back-link" href={dashboardHref}><ArrowLeft size={15} /> Back to energy dashboard</Link>
      <section className="insight-hero">
        <div className="insight-hero-copy">
          <p className="eyebrow">{insight.eyebrow}</p>
          <AnimatedText as="h1" text={insight.title} delay={20}/>
          <AnimatedText text={insight.summary} delay={8}/>
          <div className="insight-hero-actions">
            <Link className="button button-primary" href={dashboardHref}>View dashboard <ArrowUpRight size={15} /></Link>
            <Link className="button button-secondary" href="/assessment">Start a new assessment <ArrowUpRight size={15} /></Link>
            {insight.slug === "scenario-comparison" && <Link className="button button-secondary" href="/assessment/compare">Compare scenarios <ArrowUpRight size={15} /></Link>}
          </div>
        </div>
        <div className="insight-hero-image"><Image src={insight.image} alt={insight.imageAlt} fill sizes="(max-width: 760px) 100vw, 48vw" priority /></div>
      </section>
      <InsightMetrics slug={slug} inputs={inputs} result={result} />
      {slug === "energy-generation" && <GenerationProjectionChart result={result} />}
      {slug === "consumption-savings" && <SavingsProjectionChart result={result} />}
      <section className="insight-content" aria-label={`${insight.title} details`}>
        {insight.sections.map(section => <article className="insight-card" key={section.title}>
          <div><AnimatedText as="h2" effect="scroll" text={section.title} baseOpacity={0.86} enableBlur blurStrength={1} baseRotation={0}/><p>{section.body}</p>{section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}</div>
        </article>)}
      </section>
      <p className="insight-disclaimer">Planning information only. The dashboard uses the inputs and assumptions shown there; confirm site conditions, utility rates, and system details with qualified local sources.</p>
      <Link className="insight-bottom-link" href={dashboardHref}><ArrowLeft size={15} /> Return to the energy dashboard</Link>
    </main>
    <SiteFooter />
  </div>;
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

function InsightMetrics({ slug, inputs, result }: { slug: string; inputs: SolarInputs; result: SolarResults }) {
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const number = (value: number) => Math.round(value).toLocaleString("en-US");
  const metrics = slug === "system-overview" ? [
    ["Estimated system", `${result.systemKw.toFixed(1)} kW`], ["Roof capacity", `${result.roofCapacityKw.toFixed(1)} kW`], ["Annual generation", `${number(result.annualProductionKwh)} kWh`], ["Estimated cost range", `${money(result.installationCostRangeUsd.low)}–${money(result.installationCostRangeUsd.high)}`], ["Simple payback", result.paybackYears === null ? "Not reached" : `${result.paybackYears.toFixed(1)} years`], ["Avoided emissions", `${(result.co2AvoidedKg / 1000).toFixed(2)} t CO₂ / year`],
  ] : slug === "energy-generation" ? [
    ["Annual generation", `${number(result.annualProductionKwh)} kWh`], ["Annual household use", `${number(result.annualConsumptionKwh)} kWh`], ["Used on site", `${number(result.annualSelfConsumedKwh)} kWh`], ["Exported to grid", `${number(result.annualExportedKwh)} kWh`],
  ] : slug === "consumption-savings" ? [
    ["Estimated savings", `${money(result.annualSavings)} / year`], ["Monthly average", `${money(result.monthlySavings)} / month`], ["Value of solar used on site", `${money(result.annualRetailSavingsUsd)} / year`], ["Export credit estimate", `${money(result.annualExportRevenueUsd)} / year`], ["Year one remaining bill", money(result.annualProjection[0]?.remainingBillUsd ?? 0)], ["Modeled annual consumption", `${number(result.annualConsumptionKwh)} kWh`],
  ] : slug === "system-assumptions" ? [
    ["Average monthly bill", `${money(inputs.monthlyBill)} / month`], ["Annual electricity use", `${number(inputs.annualConsumptionKwh ?? inputs.monthlyBill * 12 / inputs.utilityRate)} kWh`], ["Retail electricity rate", `$${inputs.utilityRate.toFixed(3)} / kWh`], ["Export compensation", `$${inputs.exportCompensationRate.toFixed(3)} / kWh`], ["Estimated system cost", money(inputs.systemCost)], ["Incentive assumption", `${Math.round(inputs.incentiveRate * 100)}%`], ["Annual bill increase", `${(inputs.electricityEscalation * 100).toFixed(1)}%`], ["Roof area", `${number(inputs.roofAreaSqFt)} sq ft`], ["Usable roof", `${Math.round(inputs.usableRoofPercent)}%`], ["Sun-hours assumption", `${inputs.sunHours} hours / day`], ["Orientation factor", `${Math.round(inputs.orientationFactor * 100)}%`], ["Shade factor", `${Math.round(inputs.shadingFactor * 100)}%`], ["Sizing target", `${Math.round(inputs.targetAnnualOffsetRate * 100)}%`],
  ] : [
    ["Base system capacity", `${result.systemKw.toFixed(1)} kW`], ["Base annual generation", `${number(result.annualProductionKwh)} kWh`], ["Base annual savings", `${money(result.annualSavings)} / year`],
  ];

  const recommendations = (slug === "system-overview" || slug === "system-assumptions") ? buildRecommendations(inputs, result) : [];
  return <section className="insight-live-data" aria-label="Current assessment details">
    <div className="insight-live-heading"><div><p className="eyebrow">Current assessment</p><h2>{slug === "system-assumptions" ? "Inputs used in this estimate" : "Results from this dashboard"}</h2></div><span>Planning estimate · not a quote</span></div>
    <dl className="insight-metric-grid">{metrics.map(([label, value]) => <div className="insight-metric" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {slug === "scenario-comparison" && <div className="insight-scenario-list">{DEMO_SCENARIOS.map(scenario => { const comparison = calculateSolar(scenario.inputs); return <div key={scenario.id}><strong>{scenario.name}</strong><span>{comparison.systemKw.toFixed(1)} kW · {number(comparison.annualProductionKwh)} kWh/year · {money(comparison.annualSavings)}/year savings</span></div>; })}<Link href="/assessment/compare">Open scenario comparison <ArrowUpRight size={14}/></Link></div>}
    {recommendations.length > 0 && <div className="insight-recommendations"><h3>Practical next steps for this estimate</h3><ol>{recommendations.map(item => <li key={item.title}><strong>{item.title}</strong><span>{item.detail}</span></li>)}</ol></div>}
    {slug === "system-assumptions" && <div className="insight-checklist"><h3>Planning checklist</h3><ul><li>Check a recent electricity bill and confirm the retail rate.</li><li>Confirm usable roof area, roof condition, orientation, and shade.</li><li>Ask a qualified installer for a site-specific design and itemized quote.</li><li>Verify export compensation, permits, and incentive eligibility with official sources.</li></ul></div>}
  </section>;
}
