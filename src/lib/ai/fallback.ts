import type { SolarInputs, SolarResults } from "@/lib/solar";
import type { AssistantReply, AssistantRequest } from "@/lib/assistant/contract";

/** Useful deterministic wording when the optional Strands service is not configured. */
export function buildFallbackExplanation(inputs: SolarInputs, result: SolarResults): string {
  const roofNote = result.roofLimited
    ? "The usable roof area limits the modeled system size, so the estimate offsets less of the sample bill."
    : "The entered usable roof area does not limit this modeled system size.";
  const payback = result.paybackYears === null ? `A simple payback period cannot be calculated within the ${result.projectionHorizonYears}-year model horizon.` : `Simple payback is about ${result.paybackYears.toFixed(1)} years before financing, maintenance, and taxes.`;
  return `The estimate models a ${result.systemKw.toFixed(2)} kW system producing about ${Math.round(result.annualProductionKwh).toLocaleString()} kWh each year. It models ${Math.round(result.annualSelfConsumedKwh).toLocaleString()} kWh used on site and ${Math.round(result.annualExportedKwh).toLocaleString()} kWh exported. Estimated first-year savings are $${Math.round(result.annualSavings).toLocaleString()}: $${Math.round(result.annualRetailSavingsUsd).toLocaleString()} from self-consumed power and $${Math.round(result.annualExportRevenueUsd).toLocaleString()} from exports, using the entered $${inputs.utilityRate.toFixed(2)}/kWh retail tariff and $${inputs.exportCompensationRate.toFixed(2)}/kWh export assumption. ${roofNote} ${payback} Confirm roof conditions, local tariffs, export rules, and incentives with qualified local sources.`;
}

/** Deterministic, question-aware assistant mode. Every numeric fact comes from the validated engine summary. */
export function buildAssistantFallback(request: AssistantRequest, status = "Strands is not configured on this server; the local assistant is answering."): AssistantReply {
  const { assessment, question } = request;
  const q = question.toLowerCase();
  const { inputs, outputs: o } = assessment;
  let narrative = "I can explain the current SolarSmart estimate using its calculated results and disclosed assumptions. I cannot confirm installation suitability or predict a guaranteed outcome.";
  if (/scenario|compare|difference|alternative/.test(q)) {
    narrative = assessment.scenarios.length > 1
      ? `The scenario rows below come from the same calculation engine. Compare their roof constraints, modeled annual generation, first-year savings, installed cost ranges, and payback availability. These are illustrative alternatives; a change across several assumptions cannot identify which one caused a difference.`
      : "No alternative scenarios were supplied with this report. Use Compare scenarios to create an alternative; each scenario will use the same deterministic calculator.";
  } else if (/assum|why|calculated|model/.test(q)) {
    narrative = `The model size is constrained by the roof capacity and a consumption offset target. Production uses a generic yield input adjusted by roof orientation and shade. Savings separate electricity used on site at the entered retail tariff from exports at the separately configured export credit.`;
  } else if (/improv|provide|missing|what.*need|more accurate|better estimate/.test(q)) {
    narrative = `The most useful additions are a measured clear roof area, a current bill rate and export-credit rule, a better shade and orientation assessment, an itemized installer price, and an hourly electricity-use profile. These can improve the inputs, but they still do not replace a site survey.`;
  } else if (/payback|cost|save|bill|financial|money/.test(q)) {
    narrative = `Savings depend on how much generation is used at the property and how the utility compensates exports. The displayed cost range is illustrative, and payback is unavailable when the engine does not reach cost recovery within its stated horizon. Financing and ongoing costs are excluded.`;
  } else if (/emission|carbon|environment|co2/.test(q)) {
    narrative = `The emissions estimate applies a generic grid factor to modeled annual generation. It is not location-specific and is not a lifecycle assessment of panels, batteries, manufacturing, or installation.`;
  }

  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  const format = (value: number, digits = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
  const facts = [
    `Modeled feasible capacity: ${format(o.systemKw, 2)} kW; usable roof capacity: ${format(o.roofCapacityKw, 2)} kW${o.roofLimited ? " (roof-limited)" : ""}.`,
    `Estimated annual generation: ${format(o.annualProductionKwh)} kWh; modeled annual use: ${format(o.annualConsumptionKwh)} kWh.`,
    `Estimated first-year savings: ${money(o.annualSavingsUsd)} (${money(o.annualRetailSavingsUsd)} retail-bill savings and ${money(o.annualExportRevenueUsd)} export revenue).`,
    `Illustrative installed cost: ${money(o.installationCostLowUsd)}–${money(o.installationCostHighUsd)}; payback: ${o.paybackYears === null ? `not reached within ${o.projectionHorizonYears} years` : `${format(o.paybackYears, 1)} years`}.`,
    `Modeled annual avoided emissions: ${format(o.co2AvoidedKg / 1000, 2)} tonnes CO₂ using ${format(o.gridEmissionsKgCo2PerKwh, 3)} kg CO₂/kWh.`,
  ];
  if (o.annualConsumptionKwh === 0) facts[1] = `Estimated annual generation: ${format(o.annualProductionKwh)} kWh; modeled annual electricity use: 0 kWh.`;
  const assumptions = [
    `Retail tariff: $${format(inputs.utilityRate, 3)}/kWh; export credit: $${format(inputs.exportCompensationRate, 3)}/kWh.`,
    `Generic yield input: ${format(inputs.sunHours, 1)} peak sun-hours/day; not a live irradiance measurement.`,
    `Physical self-consumption assumption: ${format(o.physicalSelfConsumptionRate * 100)}%; system cost basis: ${money(inputs.systemCost)}; incentive assumption: ${format(inputs.incentiveRate * 100)}%.`,
    `Target annual energy offset: ${format(inputs.targetAnnualOffsetRate * 100)}%; annual electricity price escalation: ${format(inputs.electricityEscalation * 100)}%. These are model inputs, not forecasts.`,
  ];
  const unknowns = Array.from(new Set([...assessment.warnings, ...assessment.limitations,
    "Roof structure, measured shade, permitting, utility approval, and current incentive eligibility are not verified.",
    "Actual weather, equipment performance, export compensation, and installer pricing are unknown."])).slice(0, 8);
  const nextSteps = assessment.recommendations.length ? assessment.recommendations.slice(0, 5).map(item => `${item.title}: ${item.detail}`) : ["Confirm roof dimensions and shade with a qualified installer.", "Verify your current tariff and export rules with the utility.", "Request an itemized site-specific quote."];
  const scenarios = assessment.scenarios.map(s => `${s.name}: ${format(s.systemKw, 1)} kW; ${format(s.annualGenerationKwh)} kWh/year; ${money(s.annualSavingsUsd)}/year savings; ${money(s.installationCostLowUsd)}–${money(s.installationCostHighUsd)} cost; ${s.paybackYears === null ? "payback not reached" : `${format(s.paybackYears, 1)} years modeled payback`}.`);
  if (/scenario|compare|difference|alternative/.test(q) && scenarios.length) facts.push(...scenarios);

  return { schemaVersion: "1.0", mode: "local", status: status.slice(0, 180), narrative, facts, assumptions, unknowns, nextSteps };
}
