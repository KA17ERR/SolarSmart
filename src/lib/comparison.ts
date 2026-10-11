import { calculateSolar, DEFAULT_CALCULATION_ASSUMPTIONS, type CalculationAssumptions, type SolarInputs, type SolarResults } from "./solar";
import { buildRecommendations, type Recommendation } from "./recommendations";

export type Scenario = {
  id: string;
  name: string;
  description: string;
  inputs: SolarInputs;
  assumptions: Partial<CalculationAssumptions>;
  changedFields: string[];
  origin: "assessment" | "sample" | "duplicate" | "user";
};
export type ScenarioMetricKey = "systemKw" | "annualProductionKwh" | "annualSavings" | "installationCostUsd" | "paybackYears" | "co2AvoidedKg";
export type ScenarioMetric = { key: ScenarioMetricKey; label: string; unit: string; base: number | null; alternative: number | null; difference: number | null; percentDifference: number | null };
export type ScenarioEvaluation = { scenario: Scenario; result: SolarResults | null; metrics: ScenarioMetric[]; recommendations: Recommendation[]; errors: string[] };

export const METRIC_DEFINITIONS: Array<{ key: ScenarioMetricKey; label: string; unit: string }> = [
  { key: "systemKw", label: "Feasible capacity", unit: "kW" },
  { key: "annualProductionKwh", label: "Annual generation", unit: "kWh / year" },
  { key: "annualSavings", label: "Annual savings", unit: "USD / year" },
  { key: "installationCostUsd", label: "Expected installed cost", unit: "USD" },
  { key: "paybackYears", label: "Simple payback", unit: "years" },
  { key: "co2AvoidedKg", label: "Avoided emissions", unit: "kg CO₂ / year" },
];

export function createScenario(name: string, inputs: SolarInputs, origin: Scenario["origin"] = "user", assumptions: Partial<CalculationAssumptions> = {}): Scenario {
  return { id: makeId(), name: normalizeName(name), description: origin === "sample" ? "Illustrative comparison assumptions" : "Editable what-if scenario", inputs: { ...inputs }, assumptions: { ...assumptions }, changedFields: [], origin };
}
export function normalizeName(name: string): string { return name.trim().slice(0, 48) || "Untitled scenario"; }
export function duplicateScenario(scenario: Scenario, name = `${scenario.name} copy`): Scenario {
  return { ...scenario, id: makeId(), name: normalizeName(name), description: "Copied from another scenario", inputs: { ...scenario.inputs }, assumptions: { ...scenario.assumptions }, changedFields: [...scenario.changedFields], origin: "duplicate" };
}
export function renameScenario(scenario: Scenario, name: string): Scenario { return { ...scenario, name: normalizeName(name) }; }
export function updateScenarioInput(scenario: Scenario, field: keyof SolarInputs, value: number): Scenario {
  return { ...scenario, origin: "user", inputs: { ...scenario.inputs, [field]: value }, changedFields: addChanged(scenario.changedFields, field) };
}
export function updateScenarioAssumption(scenario: Scenario, field: keyof CalculationAssumptions, value: number): Scenario {
  return { ...scenario, origin: "user", assumptions: { ...scenario.assumptions, [field]: value }, changedFields: addChanged(scenario.changedFields, `assumptions.${field}`) };
}
function addChanged(fields: string[], field: string) { return fields.includes(field) ? fields : [...fields, field]; }

export function evaluateScenario(baseInputs: SolarInputs, scenario: Scenario, baseAssumptions: Partial<CalculationAssumptions> = {}): ScenarioEvaluation {
  const baseResult = calculateSolar(baseInputs, baseAssumptions);
  const baselineUse = baseInputs.annualConsumptionKwh ?? baseInputs.monthlyBill * 12 / baseInputs.utilityRate;
  const scenarioUse = scenario.inputs.annualConsumptionKwh ?? scenario.inputs.monthlyBill * 12 / scenario.inputs.utilityRate;
  const changedFields = (Object.keys({ ...baseInputs, ...scenario.inputs }) as Array<keyof SolarInputs>).filter(key => {
    if (key === "annualConsumptionKwh" && Math.abs(scenarioUse - baselineUse) < 1e-8) return false;
    if (key === "monthlyBill" && scenario.inputs.annualConsumptionKwh !== undefined && Math.abs(scenarioUse - baselineUse) < 1e-8 && Math.abs(scenario.inputs.monthlyBill - scenarioUse * scenario.inputs.utilityRate / 12) < 1e-8) return false;
    return baseInputs[key] !== scenario.inputs[key];
  }).map(String);
  const changedAssumptions = Object.keys(scenario.assumptions).filter(key => scenario.assumptions[key as keyof CalculationAssumptions] !== (baseAssumptions[key as keyof CalculationAssumptions] ?? DEFAULT_CALCULATION_ASSUMPTIONS[key as keyof CalculationAssumptions]));
  const evaluatedScenario = { ...scenario, changedFields: [...changedFields, ...changedAssumptions.map(key => `assumptions.${key}`)] };
  let result: SolarResults | null = null;
  let errors: string[] = [];
  try { result = calculateSolar(scenario.inputs, { ...baseAssumptions, ...scenario.assumptions }); }
  catch (error) { errors = [error instanceof Error ? error.message : "These scenario inputs cannot be calculated."]; }
  const values = (solar: SolarResults): Record<ScenarioMetricKey, number | null> => ({
    systemKw: solar.systemKw, annualProductionKwh: solar.annualProductionKwh, annualSavings: solar.annualSavings,
    installationCostUsd: solar.installationCostRangeUsd.expected, paybackYears: solar.paybackYears, co2AvoidedKg: solar.co2AvoidedKg,
  });
  const base = values(baseResult); const alternative = result ? values(result) : Object.fromEntries(METRIC_DEFINITIONS.map(item => [item.key, null])) as Record<ScenarioMetricKey, number | null>;
  const metrics = METRIC_DEFINITIONS.map(definition => {
    const left = base[definition.key]; const right = alternative[definition.key];
    const rawDifference = left === null || right === null ? null : right - left;
    // Avoid showing IEEE-754 noise as a real negative zero for identical/effectively identical scenarios.
    const tolerance = left === null || right === null ? 0 : 1e-10 * Math.max(1, Math.abs(left), Math.abs(right));
    const difference = rawDifference !== null && Math.abs(rawDifference) <= tolerance ? 0 : rawDifference;
    return { ...definition, base: left, alternative: right, difference, percentDifference: difference === null || left === null || left === 0 ? null : difference / Math.abs(left) * 100 };
  });
  return { scenario: evaluatedScenario, result, metrics, recommendations: result ? buildScenarioRecommendations(evaluatedScenario, result) : [], errors };
}

export function buildScenarioRecommendations(scenario: Scenario, result: SolarResults): Recommendation[] {
  const recommendations = buildRecommendations(scenario.inputs, result).map(item => item.title === "Replace the sample tariff" ? {
    ...item,
    title: "Confirm tariff and export policy",
    detail: `This scenario models a retail rate of $${scenario.inputs.utilityRate.toFixed(3)}/kWh and export compensation of $${scenario.inputs.exportCompensationRate.toFixed(3)}/kWh. Verify both against current utility terms.`,
  } : item);
  const more: Recommendation[] = [];
  if (scenario.changedFields.length > 1) more.push({ title: "Interpret multi-variable changes carefully", detail: `This scenario changes ${scenario.changedFields.length} assumptions (${scenario.changedFields.join(", ")}). The difference cannot be attributed to one factor alone.`, priority: "consider" });
  if (scenario.inputs.shadingFactor <= 0.5) more.push({ title: "Arrange a shade review", detail: `The modeled shade factor is ${(scenario.inputs.shadingFactor * 100).toFixed(0)}%, which materially reduces modeled production. Tree growth and seasonal shadows need an on-site review.`, priority: "next" });
  if (result.paybackYears === null) more.push({ title: "Payback is not reached in the model horizon", detail: `Modeled cost recovery does not occur within ${result.projectionHorizonYears} years under this scenario. It is not a promise that it never will.`, priority: "consider" });
  if (scenario.inputs.utilityRate <= 0.001) more.push({ title: "Confirm the retail tariff", detail: "The retail tariff is zero or near zero, so savings comparisons are not informative. Use a recent utility bill rate.", priority: "next" });
  return [...more, ...recommendations].slice(0, 6);
}

/** Three controlled comparison presets; only documented values differ from the user's base. */
export function createDefaultAlternatives(base: SolarInputs): Scenario[] {
  const pinnedBase = withPinnedAnnualConsumption(base);
  return [
    createScenario("More usable roof", { ...pinnedBase, roofAreaSqFt: Math.min(1_000_000, pinnedBase.roofAreaSqFt * 1.3), usableRoofPercent: Math.min(100, pinnedBase.usableRoofPercent + 10) }, "sample"),
    createScenario("Reduced shade", { ...pinnedBase, shadingFactor: Math.min(1, pinnedBase.shadingFactor + 0.2) }, "sample"),
    createScenario("Lower retail tariff", { ...pinnedBase, utilityRate: Math.max(0.001, pinnedBase.utilityRate * 0.8), monthlyBill: pinnedBase.annualConsumptionKwh! * Math.max(0.001, pinnedBase.utilityRate * 0.8) / 12 }, "sample"),
  ];
}

/** Full reset payload for the sample-reset action; custom scenarios and edit state are discarded. */
export function resetAlternativesState(base: SolarInputs): { scenarios: Scenario[]; selectedId: "base"; renameId: null; renameValue: "" } {
  return { scenarios: createDefaultAlternatives(base), selectedId: "base", renameId: null, renameValue: "" };
}

/** Pins the baseline's inferred use so a tariff what-if changes price, not the assumed kWh load. */
export function withPinnedAnnualConsumption(inputs: SolarInputs): SolarInputs {
  const inferredUse = Number.isFinite(inputs.utilityRate) && inputs.utilityRate > 0 ? inputs.monthlyBill * 12 / inputs.utilityRate : Number.NaN;
  return { ...inputs, annualConsumptionKwh: inputs.annualConsumptionKwh ?? inferredUse };
}

export function formatMetric(metric: ScenarioMetric, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return metric.key === "paybackYears" ? "Not reached" : "Unavailable";
  if (metric.key === "annualSavings" || metric.key === "installationCostUsd") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const digits = metric.key === "co2AvoidedKg" ? 0 : 1;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)} ${metric.key === "co2AvoidedKg" ? "kg CO₂" : metric.unit}`;
}

function makeId(): string { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

export const BASE_ASSUMPTION_SOURCES = DEFAULT_CALCULATION_ASSUMPTIONS.assumptionSources;
