import type { SolarInputs, SolarResults } from "./solar";

export type ScenarioReportData = {
  generatedAt: Date;
  scenarioName: string;
  scenarioDescription: string;
  sourceLabel: string;
  changedFields: string[];
  inputs: SolarInputs;
  result: SolarResults;
  baseName: string;
  baseResult: SolarResults;
};

const number = (value: number, digits = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const rate = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
const dateLabel = (date: Date) => Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function comparisonChart(title: string, unit: string, baseName: string, baseValue: number, scenarioName: string, scenarioValue: number, color: string, format: (value: number) => string) {
  const safeBase = Number.isFinite(baseValue) ? Math.max(0, baseValue) : 0;
  const safeScenario = Number.isFinite(scenarioValue) ? Math.max(0, scenarioValue) : 0;
  const scale = Math.max(safeBase, safeScenario, 1);
  const rows = [{ label: baseName, value: safeBase, y: 44 }, { label: scenarioName, value: safeScenario, y: 91 }];
  const rowMarkup = rows.map(row => {
    const width = Math.max(row.value > 0 ? 2 : 0, row.value / scale * 330);
    const fittedLabel = row.label.length > 20 ? `${row.label.slice(0, 19)}…` : row.label;
    return `<text class="bar-label" x="0" y="${row.y + 5}"><title>${escapeHtml(row.label)}</title>${escapeHtml(fittedLabel)}</text><rect x="170" y="${row.y - 11}" width="330" height="20" rx="5" fill="#e8edf3"/><rect x="170" y="${row.y - 11}" width="${width.toFixed(2)}" height="20" rx="5" fill="${color}"/><text class="bar-value" x="516" y="${row.y + 5}">${escapeHtml(format(row.value))}</text>`;
  }).join("");
  return `<figure class="report-chart"><figcaption>${escapeHtml(title)} <span>${escapeHtml(unit)}</span></figcaption><svg viewBox="0 0 690 126" role="img" aria-label="${escapeHtml(title)} comparison: ${escapeHtml(baseName)} ${escapeHtml(format(safeBase))}; ${escapeHtml(scenarioName)} ${escapeHtml(format(safeScenario))}."><title>${escapeHtml(title)} comparison</title><desc>Horizontal bars compare the base assessment with the selected scenario. The value scale begins at zero.</desc>${rowMarkup}</svg></figure>`;
}

/** Standalone, offline HTML report with vector charts and a browser print action. */
export function buildScenarioReportHtml(data: ScenarioReportData): string {
  const { inputs, result, baseResult } = data;
  const scenarioName = escapeHtml(data.scenarioName);
  const changedFields = data.changedFields.length ? data.changedFields.map(escapeHtml).join(", ") : "No input differences from the base assessment";
  const generationChart = comparisonChart("Annual generation", "kWh / year", data.baseName, baseResult.annualProductionKwh, data.scenarioName, result.annualProductionKwh, "#7253d4", value => `${number(value)} kWh`);
  const capacityChart = comparisonChart("Feasible system capacity", "kW", data.baseName, baseResult.systemKw, data.scenarioName, result.systemKw, "#247eb6", value => `${number(value, 2)} kW`);
  const consumptionChart = comparisonChart("Annual electricity consumption", "kWh / year", data.baseName, baseResult.annualConsumptionKwh, data.scenarioName, result.annualConsumptionKwh, "#3d8d71", value => `${number(value)} kWh`);
  const savingsChart = comparisonChart("Estimated first-year savings", "USD / year", data.baseName, baseResult.annualSavings, data.scenarioName, result.annualSavings, "#c17a25", currency);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SolarSmart report · ${scenarioName}</title>
<style>
  :root{color-scheme:light;--ink:#182536;--muted:#566579;--line:#dce3eb;--navy:#101d31;--accent:#775bd3}*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:var(--ink);font:15px/1.55 Arial,Helvetica,sans-serif}.actions{position:sticky;top:0;z-index:2;display:flex;justify-content:flex-end;gap:10px;padding:12px max(20px,calc((100vw - 960px)/2));border-bottom:1px solid #d9e0e9;background:#ffffffed;backdrop-filter:blur(12px)}button{border:1px solid #cbd5e1;border-radius:7px;padding:9px 14px;background:#fff;color:#243449;font:600 13px Arial,sans-serif;cursor:pointer}button.primary{border-color:#5841a5;background:#5841a5;color:#fff}button:focus-visible{outline:3px solid #9d8be0;outline-offset:2px}.page{width:min(100% - 32px,960px);margin:24px auto;padding:38px;background:#fff;border:1px solid #e1e6ed;border-radius:12px;box-shadow:0 12px 34px #172a4212}.header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding-bottom:22px;border-bottom:2px solid var(--navy)}.eyebrow{text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-size:11px;font-weight:700;margin:0 0 5px}.header h1{font-size:30px;line-height:1.15;margin:0}.header .meta{margin:9px 0 0;color:var(--muted);font-size:13px}.stamp{flex:none;border:1px solid #d5c987;border-radius:5px;background:#fffbea;color:#74651f;padding:6px 9px;font-size:10px;font-weight:700;letter-spacing:.08em}.notice{margin:16px 0;padding:10px 13px;border-left:3px solid #c18b36;background:#fff9e9;color:#554a2d;font-size:12px}.summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0 24px}.metric{min-width:0;padding:13px 15px;border:1px solid var(--line);border-radius:8px;background:#f8fafc}.metric span,.metric strong{display:block}.metric span{color:var(--muted);font-size:11px}.metric strong{margin-top:4px;font-size:17px;overflow-wrap:anywhere}.section-title{margin:22px 0 4px;font-size:17px}.section-copy{margin:0 0 8px;color:var(--muted);font-size:12px}.charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.report-chart{min-width:0;margin:0;padding:12px;border:1px solid var(--line);border-radius:8px;break-inside:avoid;page-break-inside:avoid}.report-chart figcaption{font-weight:700;font-size:12px}.report-chart figcaption span{color:var(--muted);font-weight:400}.report-chart svg{display:block;width:100%;height:auto;margin-top:4px;overflow:visible}.bar-label{fill:#425167;font:12px Arial,sans-serif}.bar-value{fill:#26364b;font:700 12px Arial,sans-serif}.facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 0}.fact{padding:9px 11px;border:1px solid var(--line);border-radius:6px}.fact span,.fact strong{display:block}.fact span{color:var(--muted);font-size:10px}.fact strong{margin-top:3px;font-size:12px;overflow-wrap:anywhere}.disclaimer{margin:18px 0 0;padding-top:12px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.footer{margin-top:15px;color:#718096;font-size:10px}.empty{padding:14px;border:1px dashed var(--line);border-radius:7px;color:var(--muted);font-size:12px}
  @media(max-width:640px){.page{padding:22px 16px;margin:12px auto}.header h1{font-size:24px}.summary{grid-template-columns:repeat(2,minmax(0,1fr))}.charts{grid-template-columns:1fr}.facts{grid-template-columns:repeat(2,minmax(0,1fr))}.actions{justify-content:center}}
  @page{size:A4 portrait;margin:14mm}@media print{body{background:#fff;font-size:10pt}.actions{display:none!important}.page{width:auto;max-width:none;margin:0;padding:0;border:0;border-radius:0;box-shadow:none}.header h1{font-size:22pt}.summary{gap:7px;margin:12px 0 18px}.metric{padding:8px 10px}.metric strong{font-size:12pt}.section-title{margin-top:14px;font-size:13pt}.charts{gap:8px}.report-chart{padding:8px}.report-chart svg{max-height:112px}.facts{gap:6px}.fact{padding:6px 8px}.notice{margin:12px 0}.footer,.disclaimer{font-size:9pt}button{display:none!important}}
</style></head><body>
<div class="actions"><button type="button" onclick="window.print()">Print report</button><button type="button" class="primary" onclick="window.print()">Save as PDF</button></div>
<main class="page"><header class="header"><div><p class="eyebrow">SolarSmart · planning estimate</p><h1>Scenario report: ${scenarioName}</h1><p class="meta">Generated ${escapeHtml(dateLabel(data.generatedAt))} · Compared with ${escapeHtml(data.baseName)}</p></div><span class="stamp">ESTIMATE ONLY</span></header>
<p class="notice">Modeled planning results only. This report is not a roof survey, engineering assessment, installer quote, or guarantee of production or savings.</p>
<h2 class="section-title">Selected scenario summary</h2><p class="section-copy">${escapeHtml(data.scenarioDescription)} · ${escapeHtml(data.sourceLabel)}.</p>
<section class="summary" aria-label="Selected scenario metrics"><div class="metric"><span>Feasible system capacity</span><strong>${number(result.systemKw, 2)} kW</strong></div><div class="metric"><span>Estimated first-year savings</span><strong>${currency(result.annualSavings)} / year</strong></div><div class="metric"><span>Annual generation</span><strong>${number(result.annualProductionKwh)} kWh</strong></div><div class="metric"><span>Annual consumption</span><strong>${number(result.annualConsumptionKwh)} kWh</strong></div><div class="metric"><span>Installed cost range</span><strong>${currency(result.installationCostRangeUsd.low)}–${currency(result.installationCostRangeUsd.high)}</strong></div><div class="metric"><span>Simple payback</span><strong>${result.paybackYears === null ? "Not reached" : `${number(result.paybackYears, 1)} years`}</strong></div><div class="metric"><span>Used on site</span><strong>${number(result.annualSelfConsumedKwh)} kWh / year</strong></div><div class="metric"><span>Exported energy</span><strong>${number(result.annualExportedKwh)} kWh / year</strong></div></section>
<h2 class="section-title">Scenario comparison</h2><p class="section-copy">All bars use a zero baseline and values from SolarSmart’s shared calculation engine.</p><section class="charts" aria-label="Selected scenario charts">${capacityChart}${generationChart}${consumptionChart}${savingsChart}</section>
<h2 class="section-title">Inputs and assumptions</h2><p class="section-copy">${escapeHtml(data.scenarioName)}: ${changedFields}.</p><section class="facts" aria-label="Scenario assumptions"><div class="fact"><span>Roof area</span><strong>${number(inputs.roofAreaSqFt)} sq ft · ${number(inputs.usableRoofPercent)}% usable</strong></div><div class="fact"><span>Retail tariff</span><strong>${rate(inputs.utilityRate)} / kWh</strong></div><div class="fact"><span>Peak sun-hours assumption</span><strong>${number(inputs.sunHours, 1)} hours / day</strong></div><div class="fact"><span>Orientation and shade factors</span><strong>${number(inputs.orientationFactor * 100)}% · ${number(inputs.shadingFactor * 100)}%</strong></div><div class="fact"><span>Self-consumption assumption</span><strong>${number(result.assumptions.physicalSelfConsumptionRate * 100)}%</strong></div><div class="fact"><span>System performance</span><strong>${number(result.assumptions.systemPerformanceRatio * 100)}%</strong></div><div class="fact"><span>Export compensation</span><strong>${rate(inputs.exportCompensationRate)} / kWh</strong></div><div class="fact"><span>Cost assumption</span><strong>${currency(inputs.systemCost)} before any modeled incentive</strong></div><div class="fact"><span>Model horizon</span><strong>${number(result.projectionHorizonYears)} years</strong></div></section>
<p class="disclaimer">${escapeHtml(data.scenarioDescription)} These results are illustrative estimates based on the inputs and generic assumptions shown. Actual output and costs depend on site conditions, weather, equipment, tariffs, export rules, and installation quality. Incentives and payback are not guaranteed.</p><footer class="footer">Generated locally by SolarSmart. The report contains the selected scenario’s current calculation outputs and the fixed base assessment used for comparison.</footer></main></body></html>`;
}

export function scenarioReportFilename(scenarioName: string): string {
  const safe = scenarioName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return `solarsmart-${safe || "scenario"}-report.html`;
}
