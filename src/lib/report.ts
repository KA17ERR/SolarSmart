import type { SolarInputs, SolarResults } from "./solar";

const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

/** Builds a plain-text planning report entirely from local assumptions and calculated results. */
export function buildEstimateReport(inputs: SolarInputs, result: SolarResults, scenarioName = "Custom scenario"): string {
  return [
    "SOLARSMART · ROOFTOP SOLAR PLANNING ESTIMATE",
    `Scenario: ${scenarioName}`,
    "Status: Illustrative estimate; not an engineering assessment or installer quote.",
    "",
    "FEASIBILITY SNAPSHOT",
    `Modeled system size: ${result.systemKw} kW`,
    `Modeled roof capacity: ${result.roofCapacityKw} kW (${result.roofLimited ? "roof area limits the modeled size" : "roof area does not limit the modeled size"})`,
    `Estimated annual production: ${result.annualProductionKwh.toLocaleString()} kWh`,
    `Estimated first-year bill savings: ${currency(result.annualSavings)}`,
    `Estimated simple payback: ${result.paybackYears} years`,
    `Assumed net system cost: ${currency(result.netCost)}`,
    `Illustrative 25-year net savings: ${currency(result.twentyFiveYearSavings)}`,
    `Modeled annual CO₂ avoided: ${(result.co2AvoidedKg / 1000).toFixed(2)} tonnes (generic grid factor)`,
    "",
    "INPUT ASSUMPTIONS",
    `Monthly bill: ${currency(inputs.monthlyBill)}`,
    `Utility rate assumption: $${inputs.utilityRate.toFixed(2)}/kWh (replace with your bill rate)`,
    `Peak sun-hours assumption: ${inputs.sunHours}/day (not a live irradiance reading)`,
    `Roof area: ${inputs.roofAreaSqFt.toLocaleString()} sq ft; usable share: ${inputs.usableRoofPercent}%`,
    `Orientation factor: ${(inputs.orientationFactor * 100).toFixed(0)}%; shading factor: ${(inputs.shadingFactor * 100).toFixed(0)}%`,
    `Assumed system cost: ${currency(inputs.systemCost)}; incentive assumption: ${(inputs.incentiveRate * 100).toFixed(0)}%`,
    `Annual utility price increase: ${(inputs.electricityEscalation * 100).toFixed(1)}%; modeled bill offset: ${(inputs.selfConsumption * 100).toFixed(0)}%`,
    "",
    "MODEL NOTES AND NEXT STEPS",
    "The model assumes 60 sq ft per kW, a generic 80% system sizing factor, and a generic 0.385 kg CO₂/kWh grid factor. Values are demo assumptions, not verified local measurements.",
    "Check roof structure, age, orientation, shade, electrical service, permitting, utility rules, current tariffs, and incentive eligibility with qualified local professionals and official sources.",
    "Savings exclude financing, maintenance, insurance, taxes, export compensation, and utility fixed charges. Do not treat this estimate as a guarantee of savings or installation feasibility.",
    "",
    "Generated locally by SolarSmart. No account or upload is required.",
  ].join("\n");
}
