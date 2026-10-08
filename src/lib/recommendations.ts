import type { SolarInputs, SolarResults } from "./solar";
import type { AssessmentContext } from "./assessment";

export type Recommendation = { title: string; detail: string; priority: "next" | "consider" };

/** Plain deterministic guidance derived only from the current assessment and model output. */
export function buildRecommendations(inputs: SolarInputs, result: SolarResults, context?: AssessmentContext): Recommendation[] {
  const items: Recommendation[] = [];
  if (result.roofLimited) items.push({ title: "Confirm usable roof measurements", detail: `The current roof constraint limits the estimate to ${result.systemKw.toFixed(1)} kW. Recheck clear roof sections, setbacks, vents, and obstructions with a qualified installer.`, priority: "next" });
  else items.push({ title: "Verify roof layout and condition", detail: "Roof area does not constrain this modeled system, but roof structure, age, layout, and code compliance were not assessed.", priority: "next" });

  if (inputs.shadingFactor <= 0.65) items.push({ title: "Get a shade assessment", detail: `The entered shade factor is ${(inputs.shadingFactor * 100).toFixed(0)}%, which materially reduces modeled annual generation. Ask an installer to assess shade through the day and across seasons.`, priority: "next" });
  else items.push({ title: "Confirm seasonal shading", detail: "The shade input is an estimate. Trees, nearby buildings, and seasonal sun paths can change actual production.", priority: "consider" });

  const servedShare = result.annualConsumptionKwh > 0 ? result.annualSelfConsumedKwh / result.annualConsumptionKwh : 0;
  if (servedShare < 0.5) items.push({ title: "Review your load profile", detail: `The model serves about ${(servedShare * 100).toFixed(0)}% of annual use on site under its self-consumption assumption. Compare system size with when you use electricity and check the utility's export credit.`, priority: "consider" });
  else items.push({ title: "Compare system size with your usage", detail: `The model estimates ${(Math.round(result.annualSelfConsumedKwh)).toLocaleString()} kWh used on site out of ${(Math.round(result.annualConsumptionKwh)).toLocaleString()} kWh annual consumption. A real hourly load profile could change this split.`, priority: "consider" });

  if (context?.tariffWasAssumed || !context) items.push({ title: "Replace the sample tariff", detail: "Use the energy rate from a recent utility bill and confirm whether export credits differ from the retail rate.", priority: "next" });
  else items.push({ title: "Confirm the tariff and export policy", detail: `This estimate uses your entered $${inputs.utilityRate.toFixed(3)}/kWh retail rate and $${inputs.exportCompensationRate.toFixed(3)}/kWh export assumption. Verify both against current utility terms.`, priority: "consider" });

  if (context?.orientation === "unknown") items.push({ title: "Identify roof orientation", detail: "Orientation is not known, so a generic model factor is being used. Confirm roof faces and pitch during a site visit.", priority: "consider" });
  if (result.paybackYears === null) items.push({ title: "Treat payback as unresolved", detail: `The modeled investment is not recovered within ${result.projectionHorizonYears} years, or there is no positive modeled savings. Request an itemized quote and review local utility compensation before drawing a conclusion.`, priority: "next" });

  items.push({ title: "Request a qualified site assessment", detail: "Ask for a site-specific production estimate, equipment details, installation quote, roof review, permitting requirements, warranty terms, and any verified incentive sources.", priority: "next" });
  return items;
}
