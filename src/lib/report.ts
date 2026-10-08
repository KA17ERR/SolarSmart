import type { AssessmentContext } from "./assessment";
import { ORIENTATION_LABEL, PROPERTY_LABEL, ROOF_LABEL, SHADING_LABEL } from "./assessment";
import type { SolarInputs, SolarResults } from "./solar";

export type ReportScenario = { name: string; inputs: SolarInputs; result: SolarResults };
export type EstimateReportData = {
  generatedAt: Date;
  scenarioName: string;
  inputs: SolarInputs;
  result: SolarResults;
  context?: AssessmentContext;
  comparisons?: ReportScenario[];
  recommendations?: Array<{ title: string; reason?: string; detail?: string }>;
};

const currency = (value: number | null) => value === null ? "Not available" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = (value: number | null, digits = 0) => value === null ? "Not available" : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
const dateLabel = (date: Date) => Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);

/** Pure report model renderer. All metrics come directly from the calculation engine output. */
export function buildEstimateReportData(data: EstimateReportData): string {
  const { inputs, result, context } = data;
  const lines = [
    "SOLARSMART · ROOFTOP SOLAR PLANNING ESTIMATE",
    `Generated: ${dateLabel(data.generatedAt)}`,
    `Scenario: ${data.scenarioName}`,
    "Estimate only · not an installer quotation, engineering certification, or guaranteed outcome.",
    "",
    "ASSESSMENT DETAILS",
    ...(context ? [
      `Location entered: ${context.cityOrPostcode}`,
      `Property: ${PROPERTY_LABEL[context.propertyType]}`,
      `Roof: ${ROOF_LABEL[context.roofType]}`,
      `Usable roof area entered: ${number(context.usableRoofArea)} ${context.areaUnit === "sq-m" ? "m²" : "sq ft"}`,
      `Shading: ${SHADING_LABEL[context.shading]}`,
      `Orientation: ${ORIENTATION_LABEL[context.orientation]}`,
      `Energy input: ${context.energyInputMethod === "monthly-bill" ? `${currency(context.monthlyEnergyInput)} monthly bill` : `${number(context.monthlyEnergyInput)} kWh/month`}`,
      `Tariff: $${number(context.tariffUsdPerKwh, 3)}/kWh (${context.tariffWasAssumed ? "default assumption" : "user entered"})`,
      ...(context.budgetUsd === undefined ? [] : [`Optional budget context: ${currency(context.budgetUsd)}`]),
    ] : ["Detailed property context was not supplied."]),
    `Assessment values: ${data.scenarioName}${context?.isDemoExample ? " · illustrative demo data" : ""}`,
    "",
    "ESTIMATED RESULTS",
    `Feasible modeled capacity: ${number(result.systemKw, 2)} kW (roof capacity ${number(result.roofCapacityKw, 2)} kW)`,
    `Annual generation: ${number(result.annualProductionKwh)} kWh`,
    `Annual consumption modeled: ${number(result.annualConsumptionKwh)} kWh`,
    `Annual bill savings: ${currency(result.annualSavings)} (retail savings ${currency(result.annualRetailSavingsUsd)}; export revenue ${currency(result.annualExportRevenueUsd)})`,
    `Illustrative installed cost: ${currency(result.installationCostRangeUsd.low)}–${currency(result.installationCostRangeUsd.high)}`,
    `Simple payback: ${result.paybackYears === null ? `not reached within ${result.projectionHorizonYears}-year model horizon` : `${number(result.paybackYears, 1)} years`}`,
    `Annual avoided emissions: ${result.co2AvoidedKg === null ? "Not available" : `${number(result.co2AvoidedKg / 1000, 2)} tonnes CO₂`}`,
    `Emissions factor: ${number(result.assumptions.gridEmissionsKgCo2PerKwh, 3)} kg CO₂/kWh (generic illustrative factor; not location-specific)`,
    "",
    ...(data.comparisons?.length ? ["SCENARIO COMPARISONS", ...data.comparisons.map(item => `${item.name}: ${number(item.result.systemKw, 2)} kW · ${number(item.result.annualProductionKwh)} kWh/year · ${currency(item.result.annualSavings)}/year savings · ${currency(item.result.installationCostRangeUsd.low)}–${currency(item.result.installationCostRangeUsd.high)} cost`), ""] : []),
    "MODEL ASSUMPTIONS",
    `Roof density: ${number(result.assumptions.roofAreaSqFtPerKw)} sq ft/kW; performance ratio: ${number(result.assumptions.systemPerformanceRatio * 100)}%; physical self-consumption: ${number(result.assumptions.physicalSelfConsumptionRate * 100)}%; degradation: ${number(result.assumptions.annualDegradationRate * 100, 2)}%/year.`,
    `Yield assumption: ${number(inputs.sunHours, 1)} peak sun-hours/day; this is a generic model input, not a live solar irradiance reading.`,
    `Utility rate assumption: $${number(inputs.utilityRate, 2)}/kWh (replace with a current utility-bill rate).`,
    `Roof usable share: ${number(inputs.usableRoofPercent)}%; orientation factor: ${number(inputs.orientationFactor * 100)}%; shading factor: ${number(inputs.shadingFactor * 100)}%.`,
    `System cost basis: ${currency(inputs.systemCost)}; configured incentive assumption: ${number(inputs.incentiveRate * 100)}% (default unsupported subsidies are zero).`,
    `Export compensation assumption: $${number(inputs.exportCompensationRate, 3)}/kWh. Generated electricity offsets retail purchases only to the extent it is self-consumed; exports use this separate rate.`,
    "",
    "MISSING INPUTS AND WARNINGS",
    ...(result.warnings.length ? result.warnings.map(item => `• ${item.message}`) : ["No calculation warnings were returned; site-specific details are still unverified."]),
    "",
    "LIMITATIONS",
    ...result.limitations.map(item => `• ${item.message}`),
    "Actual production and costs depend on roof condition and geometry, shade, weather, equipment, tariffs, export rules, and installation quality. Savings exclude financing, maintenance, insurance, taxes, utility fixed charges, and other costs. No subsidy, approval, or installation suitability is confirmed.",
    "",
    "RECOMMENDED NEXT STEPS",
    ...(data.recommendations?.length ? data.recommendations.map(item => `• ${item.title}: ${item.reason ?? item.detail ?? "See assessment recommendation."}`) : ["• Confirm roof measurements and shade with a qualified installer.", "• Check your current utility tariff and export-credit rules.", "• Request itemized quotes and verify local permits and incentive eligibility with official sources."]),
    "",
    "Generated locally by SolarSmart. Assessment data is not transmitted by this report generator.",
  ];
  return lines.join("\n");
}

/** Backwards-compatible helper used by existing comparison exports. */
export function buildEstimateReport(inputs: SolarInputs, result: SolarResults, scenarioName = "Custom scenario"): string {
  return buildEstimateReportData({ inputs, result, scenarioName, generatedAt: new Date() });
}

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  // Neutralize spreadsheet formula prefixes in user-controlled labels.
  const raw = String(value);
  const safe = /^[=+@\-]/.test(raw) && !Number.isFinite(Number(raw)) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

/** Structured numeric rows for spreadsheet review; does not recalculate values. */
export function buildEstimateCsv(data: EstimateReportData): string {
  const { result, scenarioName } = data;
  const rows: Array<Array<string | number | null>> = [
    ["scenario", "metric", "value", "unit", "source"],
    [scenarioName, "system_capacity", result.systemKw, "kW", "calculation engine"],
    [scenarioName, "annual_generation", result.annualProductionKwh, "kWh/year", "calculation engine"],
    [scenarioName, "annual_consumption", result.annualConsumptionKwh, "kWh/year", "calculation engine"],
    [scenarioName, "annual_savings", result.annualSavings, "USD/year", "calculation engine"],
    [scenarioName, "installation_cost_low", result.installationCostRangeUsd.low, "USD", "illustrative cost assumption"],
    [scenarioName, "installation_cost_expected", result.installationCostRangeUsd.expected, "USD", "illustrative cost assumption"],
    [scenarioName, "installation_cost_high", result.installationCostRangeUsd.high, "USD", "illustrative cost assumption"],
    [scenarioName, "payback", result.paybackYears, "years", "null when not reached within model horizon"],
    [scenarioName, "annual_avoided_emissions", result.co2AvoidedKg, "kg CO2/year", `generic factor ${result.assumptions.gridEmissionsKgCo2PerKwh} kg/kWh`],
    ...result.annualProjection.map(row => [scenarioName, `year_${row.year}_cumulative_net_savings`, row.cumulativeNetSavingsUsd, "USD", "calculation engine"] as Array<string | number | null>),
    ...(data.comparisons ?? []).flatMap(scenario => [
      [scenario.name, "system_capacity", scenario.result.systemKw, "kW", "calculation engine"],
      [scenario.name, "annual_generation", scenario.result.annualProductionKwh, "kWh/year", "calculation engine"],
      [scenario.name, "annual_savings", scenario.result.annualSavings, "USD/year", "calculation engine"],
      [scenario.name, "payback", scenario.result.paybackYears, "years", "null when not reached within model horizon"],
    ]),
  ];
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
