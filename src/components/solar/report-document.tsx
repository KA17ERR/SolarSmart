import type { EstimateReportData } from "@/lib/report";
import { PROPERTY_LABEL, ROOF_LABEL } from "@/lib/assessment";

const money = (value: number | null) => value === null ? "Not available" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = (value: number | null, digits = 0) => value === null ? "Not available" : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

/** Semantic report surface shared by the preview and browser print layout. */
export function ReportDocument({ data }: { data: EstimateReportData }) {
  const { context, result } = data;
  return <article className="report-document">
    <header className="report-document-header"><div><p className="eyebrow">SolarSmart · planning estimate</p><h2>Rooftop solar assessment</h2><p>Generated {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(data.generatedAt)} · {data.scenarioName}</p></div><span className="report-demo-mark">ESTIMATE ONLY</span></header>
    <p className="report-notice">This report is an estimate, not an installer quotation, engineering certification, or guaranteed outcome.</p>
    <section><h3>Property and assessment</h3><dl className="report-facts">
      <div><dt>Location entered</dt><dd>{context?.cityOrPostcode || "Not supplied"}</dd></div>
      <div><dt>Property</dt><dd>{context ? PROPERTY_LABEL[context.propertyType] : "Not supplied"}</dd></div>
      <div><dt>Roof</dt><dd>{context ? ROOF_LABEL[context.roofType] : "Not supplied"}</dd></div>
      <div><dt>Usable roof area</dt><dd>{context ? `${number(context.usableRoofArea)} ${context.areaUnit === "sq-m" ? "m²" : "sq ft"}` : `${number(data.inputs.roofAreaSqFt)} sq ft model input`}</dd></div>
      <div><dt>Tariff assumption</dt><dd>${number(data.inputs.utilityRate, 3)}/kWh {context?.tariffWasAssumed ? "· default" : "· entered/model input"}</dd></div>
      <div><dt>Shading factor</dt><dd>{number(data.inputs.shadingFactor * 100)}%</dd></div>
    </dl></section>
    <section><h3>Estimated results</h3><div className="report-metrics">
      <div><span>Feasible capacity</span><strong>{number(result.systemKw, 2)} kW</strong></div><div><span>Annual generation</span><strong>{number(result.annualProductionKwh)} kWh</strong></div>
      <div><span>Annual savings</span><strong>{money(result.annualSavings)}</strong></div><div><span>Installed cost range</span><strong>{money(result.installationCostRangeUsd.low)}–{money(result.installationCostRangeUsd.high)}</strong></div>
      <div><span>Simple payback</span><strong>{result.paybackYears === null ? "Not reached" : `${number(result.paybackYears, 1)} years`}</strong></div><div><span>Annual avoided emissions</span><strong>{number(result.co2AvoidedKg / 1000, 2)} t CO₂</strong></div>
    </div><p>Cost is illustrative. Payback is only shown when reached within the {result.projectionHorizonYears}-year model horizon.</p></section>
    {!!data.comparisons?.length && <section><h3>Scenario comparisons</h3><ul>{data.comparisons.map(item => <li key={item.name}>{item.name}: {number(item.result.systemKw, 2)} kW, {number(item.result.annualProductionKwh)} kWh/year, {money(item.result.annualSavings)}/year</li>)}</ul></section>}
    <section><h3>Assumptions and data quality</h3><p>Generic yield input: {number(data.inputs.sunHours, 1)} peak sun-hours/day (not a live measurement); roof utilization: {number(data.inputs.usableRoofPercent)}%; physical self-consumption: {number(result.assumptions.physicalSelfConsumptionRate * 100)}%; export compensation: ${number(data.inputs.exportCompensationRate, 3)}/kWh. Emissions use a generic {number(result.assumptions.gridEmissionsKgCo2PerKwh, 3)} kg CO₂/kWh factor, not a location-specific lifecycle analysis.</p>
      {result.warnings.length > 0 && <><h4>Warnings and missing inputs</h4><ul>{result.warnings.map(item => <li key={item.code}>{item.message}</li>)}</ul></>}
      <h4>Limitations</h4><ul>{result.limitations.map(item => <li key={item.code}>{item.message}</li>)}</ul><p>Actual results depend on roof conditions, shading, weather, equipment, tariffs, export rules, and installation quality. Savings are not guaranteed.</p></section>
    <section><h3>Recommended next steps</h3><ul>{data.recommendations?.length ? data.recommendations.map(item => <li key={item.title}><strong>{item.title}:</strong> {item.reason}</li>) : <><li>Confirm usable roof measurements and shade.</li><li>Check your utility tariff and export-credit rules.</li><li>Request an itemized quote and confirm permitting with qualified local professionals.</li></>}</ul></section>
    <footer>Generated locally by SolarSmart. Assessment details are not transmitted by report generation.</footer>
  </article>;
}
