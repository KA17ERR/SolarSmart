import type { SolarInputs, SolarResults } from "@/lib/solar";

/** Useful deterministic wording when the optional Strands service is not configured. */
export function buildFallbackExplanation(inputs: SolarInputs, result: SolarResults): string {
  const roofNote = result.roofLimited
    ? "The usable roof area limits the modeled system size, so the estimate offsets less of the sample bill."
    : "The entered usable roof area does not limit this modeled system size.";
  return `The estimate models a ${result.systemKw} kW system producing about ${result.annualProductionKwh.toLocaleString()} kWh each year. That is ${Math.round(inputs.selfConsumption * 100)}% modeled bill offset, or about $${result.annualSavings.toLocaleString()} in first-year savings using your $${inputs.utilityRate.toFixed(2)}/kWh assumption. ${roofNote} Simple payback is ${result.paybackYears} years before financing, maintenance, taxes, or export credits. Confirm roof conditions, local tariffs, and incentives with qualified local sources.`;
}
