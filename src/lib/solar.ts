
/** Stable, unit-explicit input contract consumed by the UI, report and optional explainer. */
export type SolarInputs = {
  monthlyBill: number;
  /** Optional explicit annual use (kWh). When supplied, it avoids coupling usage to tariff changes. */
  annualConsumptionKwh?: number;
  utilityRate: number;
  sunHours: number;
  systemCost: number;
  incentiveRate: number;
  electricityEscalation: number;
  /** Sizing target: share of annual consumption the system is intended to serve. */
  targetAnnualOffsetRate: number;
  /** Optional direct sizing target for a selected panel layout; takes precedence over the consumption-offset target. */
  systemCapacityTargetKw?: number;
  /** Compensation for exported energy. Defaults to zero because export rules are unknown. */
  exportCompensationRate: number;
  roofAreaSqFt: number;
  usableRoofPercent: number;
  orientationFactor: number;
  shadingFactor: number;
};

export type ValidationIssue = { field: keyof SolarInputs | `assumptions.${string}`; message: string };
export type WarningSeverity = "info" | "caution";
export type CalculationWarning = { code: string; severity: WarningSeverity; message: string };
export type CalculationLimitation = { code: string; message: string };
export type DataQuality = { completenessPercent: number; confidence: "low" | "moderate"; reasons: string[] };

export type CalculationAssumptions = {
  schemaVersion: "1.0";
  roofAreaSqFtPerKw: number;
  systemPerformanceRatio: number;
  physicalSelfConsumptionRate: number;
  installationCostLowMultiplier: number;
  installationCostHighMultiplier: number;
  annualDegradationRate: number;
  gridEmissionsKgCo2PerKwh: number;
  projectionHorizonYears: number;
  maximumPaybackYears: number;
  assumptionSources: Record<string, string>;
};

export const DEFAULT_CALCULATION_ASSUMPTIONS: CalculationAssumptions = {
  schemaVersion: "1.0",
  roofAreaSqFtPerKw: 60,
  systemPerformanceRatio: 0.8,
  physicalSelfConsumptionRate: 0.75,
  installationCostLowMultiplier: 0.85,
  installationCostHighMultiplier: 1.15,
  annualDegradationRate: 0.005,
  gridEmissionsKgCo2PerKwh: 0.385,
  projectionHorizonYears: 25,
  maximumPaybackYears: 25,
  assumptionSources: {
    roofAreaSqFtPerKw: "Illustrative layout planning assumption; replace with installer design.",
    systemPerformanceRatio: "Generic model assumption; not a site measurement.",
    physicalSelfConsumptionRate: "Illustrative self-consumption split; storage/load profile not supplied.",
    installationCostRange: "Illustrative range around user-entered cost; not a quote.",
    annualDegradationRate: "Illustrative annual degradation assumption.",
    gridEmissionsKgCo2PerKwh: "Generic illustrative grid factor; not location-specific.",
  },
};

/** Generic annual kWh per kW model; input factors are assumptions, never live measurements. */
export function estimatedAnnualYieldPerKw(input: Pick<SolarInputs, "sunHours" | "orientationFactor" | "shadingFactor">, assumptions: Pick<CalculationAssumptions, "systemPerformanceRatio"> = DEFAULT_CALCULATION_ASSUMPTIONS): number {
  return input.sunHours * 365 * assumptions.systemPerformanceRatio * input.orientationFactor * input.shadingFactor;
}

export type AnnualProjection = {
  year: number;
  generationKwh: number;
  consumptionKwh: number;
  selfConsumedKwh: number;
  exportedKwh: number;
  retailSavingsUsd: number;
  exportRevenueUsd: number;
  totalSavingsUsd: number;
  remainingBillUsd: number;
  cumulativeSavingsUsd: number;
  cumulativeNetSavingsUsd: number;
};
export type NullableEstimate<T> = T | null;
export type SolarEstimate = {
  schemaVersion: "1.0";
  status: "complete" | "partial" | "invalid";
  systemKw: NullableEstimate<number>;
  roofCapacityKw: NullableEstimate<number>;
  roofLimited: boolean;
  annualProductionKwh: NullableEstimate<number>;
  annualConsumptionKwh: NullableEstimate<number>;
  annualSelfConsumedKwh: NullableEstimate<number>;
  annualExportedKwh: NullableEstimate<number>;
  annualSavings: NullableEstimate<number>;
  annualRetailSavingsUsd: NullableEstimate<number>;
  annualExportRevenueUsd: NullableEstimate<number>;
  monthlySavings: NullableEstimate<number>;
  installationCostRangeUsd: { low: NullableEstimate<number>; expected: NullableEstimate<number>; high: NullableEstimate<number> };
  netInstallationCostRangeUsd: { low: NullableEstimate<number>; expected: NullableEstimate<number>; high: NullableEstimate<number> };
  netCost: NullableEstimate<number>;
  paybackYears: NullableEstimate<number>;
  paybackRangeYears: { low: NullableEstimate<number>; high: NullableEstimate<number> };
  projectionHorizonYears: number;
  cumulativeSavingsUsd: NullableEstimate<number>;
  twentyFiveYearSavings: NullableEstimate<number>;
  co2AvoidedKg: NullableEstimate<number>;
  annualProjection: AnnualProjection[];
  assumptions: CalculationAssumptions;
  warnings: CalculationWarning[];
  limitations: CalculationLimitation[];
  dataQuality: DataQuality;
  errors: ValidationIssue[];
};
export type SolarResults = SolarEstimate & {
  status: "complete";
  systemKw: number;
  roofCapacityKw: number;
  annualProductionKwh: number;
  annualConsumptionKwh: number;
  annualSelfConsumedKwh: number;
  annualExportedKwh: number;
  annualSavings: number;
  annualRetailSavingsUsd: number;
  annualExportRevenueUsd: number;
  monthlySavings: number;
  installationCostRangeUsd: { low: number; expected: number; high: number };
  netInstallationCostRangeUsd: { low: number; expected: number; high: number };
  netCost: number;
  cumulativeSavingsUsd: number;
  co2AvoidedKg: number;
};

export const DEFAULT_INPUTS: SolarInputs = {
  monthlyBill: 180,
  utilityRate: 0.15,
  sunHours: 5.2,
  systemCost: 12800,
  incentiveRate: 0,
  electricityEscalation: 0.03,
  targetAnnualOffsetRate: 0.82,
  exportCompensationRate: 0,
  roofAreaSqFt: 850,
  usableRoofPercent: 70,
  orientationFactor: 0.9,
  shadingFactor: 0.95,
};

/** Heuristic warning threshold only; valid high tariffs remain supported by the model. */
export const HIGH_TARIFF_REVIEW_THRESHOLD_USD_PER_KWH = 5;

export function validateInputs(input: SolarInputs): string[] {
  return validateInputIssues(input).map(issue => issue.message);
}
function validateInputIssues(input: Partial<SolarInputs>): ValidationIssue[] {
  const rules: [keyof SolarInputs, string, (value: number) => boolean][] = [
    ["monthlyBill", "Monthly bill must be between 0 and 100,000.", value => value < 0 || value > 100000],
    ["annualConsumptionKwh", "Annual electricity use must be between 0 and 1,200,000 kWh.", value => value < 0 || value > 1200000],
    ["utilityRate", "Utility rate must be between 0.001 and 1,000 per kWh.", value => value < 0.001 || value > 1000],
    ["sunHours", "Peak sun hours must be greater than 0 and no more than 12.", value => value <= 0 || value > 12],
    ["systemCost", "System cost must be between 0 and 100,000,000.", value => value < 0 || value > 100000000],
    ["incentiveRate", "Incentive assumption must be between 0% and 90%.", value => value < 0 || value > 0.9],
    ["electricityEscalation", "Annual bill increase must be between 0% and 20%.", value => value < 0 || value > 0.2],
    ["targetAnnualOffsetRate", "Target annual offset must be between 0% and 100%.", value => value < 0 || value > 1],
    ["systemCapacityTargetKw", "Target system capacity must be between 0 and 1,000 kW.", value => value < 0 || value > 1000],
    ["exportCompensationRate", "Export compensation must be between 0 and 1,000 per kWh.", value => value < 0 || value > 1000],
    ["roofAreaSqFt", "Roof area must be between 0 and 1,000,000 square feet.", value => value < 0 || value > 1000000],
    ["usableRoofPercent", "Usable roof share must be between 0% and 100%.", value => value < 0 || value > 100],
    ["orientationFactor", "Orientation factor must be between 10% and 100%.", value => value < 0.1 || value > 1],
    ["shadingFactor", "Shading factor must be between 0% and 100%.", value => value < 0 || value > 1],
  ];
  const issues: ValidationIssue[] = [];
  for (const [field, message, invalid] of rules) {
    const value = input[field];
    if (typeof value === "number" && (!Number.isFinite(value) || invalid(value))) issues.push({ field, message });
  }
  return issues;
}

function emptyEstimate(assumptions: CalculationAssumptions, errors: ValidationIssue[], warnings: CalculationWarning[]): SolarEstimate {
  return {
    schemaVersion: "1.0", status: errors.length ? "invalid" : "partial", systemKw: null, roofCapacityKw: null, roofLimited: false,
    annualProductionKwh: null, annualConsumptionKwh: null, annualSelfConsumedKwh: null, annualExportedKwh: null,
    annualSavings: null, annualRetailSavingsUsd: null, annualExportRevenueUsd: null, monthlySavings: null,
    installationCostRangeUsd: { low: null, expected: null, high: null }, netInstallationCostRangeUsd: { low: null, expected: null, high: null },
    netCost: null, paybackYears: null, paybackRangeYears: { low: null, high: null }, projectionHorizonYears: assumptions.projectionHorizonYears,
    cumulativeSavingsUsd: null, twentyFiveYearSavings: null, co2AvoidedKg: null, annualProjection: [], assumptions, warnings,
    limitations: DEFAULT_LIMITATIONS, dataQuality: { completenessPercent: 0, confidence: "low", reasons: ["Required inputs are missing or invalid."] }, errors,
  };
}

const DEFAULT_LIMITATIONS: CalculationLimitation[] = [
  { code: "site-survey", message: "This is not an engineering assessment. Roof structure, obstructions, wiring, code and permitting are not assessed." },
  { code: "local-data", message: "Solar yield, tariffs, emissions and incentives are generic or user-provided assumptions, not live local data." },
  { code: "finance", message: "Financing, maintenance, insurance, taxes, fixed utility charges and changing export rules are excluded." },
  { code: "cost", message: "Installation cost range is illustrative; obtain itemized local installer quotes." },
];

/** Partial estimation is useful for intake; absent values remain null rather than fabricated. */
export function estimateSolar(input: Partial<SolarInputs>, overrides: Partial<CalculationAssumptions> = {}): SolarEstimate {
  const assumptions: CalculationAssumptions = { ...DEFAULT_CALCULATION_ASSUMPTIONS, ...overrides, assumptionSources: { ...DEFAULT_CALCULATION_ASSUMPTIONS.assumptionSources, ...overrides.assumptionSources } };
  const warnings: CalculationWarning[] = [];
  const errors: ValidationIssue[] = [];
  const keys = Object.keys(DEFAULT_INPUTS) as (keyof SolarInputs)[];
  const complete = keys.every(key => typeof input[key] === "number");
  errors.push(...validateInputIssues(input));
  if (!complete) warnings.push({ code: "missing-inputs", severity: "info", message: "Some inputs are missing; unsupported results are left blank." });
  for (const [key, value] of Object.entries(assumptions)) {
    if (typeof value === "number" && !Number.isFinite(value)) errors.push({ field: `assumptions.${key}`, message: `Calculation assumption ${key} must be finite.` });
  }
  const assumptionRanges: [keyof CalculationAssumptions, number, number][] = [
    ["roofAreaSqFtPerKw", 1, 1000], ["systemPerformanceRatio", 0.01, 1.5], ["physicalSelfConsumptionRate", 0, 1],
    ["installationCostLowMultiplier", 0, 10], ["installationCostHighMultiplier", 0, 10], ["annualDegradationRate", 0, 0.2],
    ["gridEmissionsKgCo2PerKwh", 0, 10], ["projectionHorizonYears", 1, 100], ["maximumPaybackYears", 1, 100],
  ];
  for (const [key, min, max] of assumptionRanges) {
    const value = assumptions[key];
    if (typeof value === "number" && (value < min || value > max || !Number.isFinite(value))) errors.push({ field: `assumptions.${key}`, message: `Calculation assumption ${key} must be between ${min} and ${max}.` });
  }
  if (assumptions.installationCostLowMultiplier > assumptions.installationCostHighMultiplier) errors.push({ field: "assumptions.installationCostLowMultiplier", message: "The low cost multiplier cannot exceed the high cost multiplier." });
  if (!Number.isInteger(assumptions.projectionHorizonYears) || !Number.isInteger(assumptions.maximumPaybackYears)) errors.push({ field: "assumptions.projectionHorizonYears", message: "Projection and payback horizons must use whole years." });
  if (assumptions.maximumPaybackYears > assumptions.projectionHorizonYears) errors.push({ field: "assumptions.maximumPaybackYears", message: "Maximum payback horizon cannot exceed the projection horizon." });
  if (errors.length) {
    warnings.push({ code: "invalid-input", severity: "caution", message: "Correct invalid inputs before using this estimate." });
    return emptyEstimate(assumptions, errors, warnings);
  }

  const base = emptyEstimate(assumptions, [], warnings);
  const area = input.roofAreaSqFt;
  const usable = input.usableRoofPercent;
  const sun = input.sunHours;
  const utilityRate = input.utilityRate;
  const monthlyBill = input.monthlyBill;
  const targetOffset = input.targetAnnualOffsetRate;
  const annualYieldPerKw = sun === undefined ? null : estimatedAnnualYieldPerKw({ sunHours: sun, orientationFactor: input.orientationFactor ?? 1, shadingFactor: input.shadingFactor ?? 1 }, assumptions);
  const roofCapacity = area === undefined || usable === undefined ? null : (area * usable / 100) / assumptions.roofAreaSqFtPerKw;
  const annualConsumption = input.annualConsumptionKwh ?? (monthlyBill !== undefined && utilityRate !== undefined ? monthlyBill * 12 / utilityRate : null);
  let systemKw: number | null = null;
  if (roofCapacity !== null && annualConsumption !== null && annualYieldPerKw !== null && targetOffset !== undefined) {
    if (annualYieldPerKw === 0) systemKw = 0;
    else {
      const requestedKw = input.systemCapacityTargetKw ?? annualConsumption * targetOffset / annualYieldPerKw;
      systemKw = Math.min(requestedKw, roofCapacity);
    }
  }
  const roofLimitedRequestKw = input.systemCapacityTargetKw ?? (annualConsumption !== null && targetOffset !== undefined && annualYieldPerKw !== null && annualYieldPerKw > 0 ? annualConsumption * targetOffset / annualYieldPerKw : null);
  const roofLimited = systemKw !== null && roofCapacity !== null && roofLimitedRequestKw !== null && systemKw < roofLimitedRequestKw;
  const generation = systemKw !== null && annualYieldPerKw !== null ? systemKw * annualYieldPerKw : null;
  const consumptionSelfRate = assumptions.physicalSelfConsumptionRate;
  const selfConsumed = generation === null || annualConsumption === null ? null : Math.min(generation * consumptionSelfRate, annualConsumption);
  const exported = generation === null || selfConsumed === null ? null : Math.max(0, generation - selfConsumed);
  const retailSavings = selfConsumed !== null && utilityRate !== undefined ? selfConsumed * utilityRate : null;
  const exportRevenue = exported !== null && input.exportCompensationRate !== undefined ? exported * input.exportCompensationRate : exported !== null ? 0 : null;
  const annualSavings = retailSavings !== null && exportRevenue !== null ? retailSavings + exportRevenue : null;
  const cost = input.systemCost;
  const costRange = cost === undefined ? { low: null, expected: null, high: null } : { low: cost * assumptions.installationCostLowMultiplier, expected: cost, high: cost * assumptions.installationCostHighMultiplier };
  const incentiveRate = input.incentiveRate ?? 0;
  const netRange = { low: costRange.low === null ? null : costRange.low * (1 - incentiveRate), expected: costRange.expected === null ? null : costRange.expected * (1 - incentiveRate), high: costRange.high === null ? null : costRange.high * (1 - incentiveRate) };
  const projections: AnnualProjection[] = [];
  let cumulative = 0;
  if (generation !== null && annualConsumption !== null && utilityRate !== undefined && annualSavings !== null) {
    for (let year = 1; year <= assumptions.projectionHorizonYears; year++) {
      const yearGeneration = generation * (1 - assumptions.annualDegradationRate) ** (year - 1);
      const yearSelfConsumed = Math.min(yearGeneration * consumptionSelfRate, annualConsumption);
      const yearExported = Math.max(0, yearGeneration - yearSelfConsumed);
      const yearRate = utilityRate * (1 + (input.electricityEscalation ?? 0)) ** (year - 1);
      const retail = yearSelfConsumed * yearRate;
      const exportValue = yearExported * (input.exportCompensationRate ?? 0);
      const total = retail + exportValue;
      cumulative += total;
      const yearBill = monthlyBill === undefined ? annualConsumption * utilityRate : monthlyBill * 12;
      const remaining = Math.max(0, yearBill * (1 + (input.electricityEscalation ?? 0)) ** (year - 1) - retail);
      projections.push({ year, generationKwh: yearGeneration, consumptionKwh: annualConsumption, selfConsumedKwh: yearSelfConsumed, exportedKwh: yearExported, retailSavingsUsd: retail, exportRevenueUsd: exportValue, totalSavingsUsd: total, remainingBillUsd: remaining, cumulativeSavingsUsd: cumulative, cumulativeNetSavingsUsd: cumulative - (netRange.expected ?? 0) });
    }
  }
  const paybackForCost = (target: number | null): number | null => {
    if (target === null) return null;
    if (target === 0) return 0;
    const point = projections.find(row => row.cumulativeSavingsUsd >= target);
    if (!point || point.totalSavingsUsd <= 0) return null;
    const value = point.year - 1 + (target - (point.cumulativeSavingsUsd - point.totalSavingsUsd)) / point.totalSavingsUsd;
    return value <= assumptions.maximumPaybackYears ? value : null;
  };
  const payback = paybackForCost(netRange.expected);
  const paybackRange = { low: paybackForCost(netRange.low), high: paybackForCost(netRange.high) };

  if (monthlyBill === 0) warnings.push({ code: "zero-consumption", severity: "caution", message: "A zero bill implies zero modeled consumption; savings and payback are unavailable." });
  if (utilityRate !== undefined && utilityRate > HIGH_TARIFF_REVIEW_THRESHOLD_USD_PER_KWH) warnings.push({ code: "high-retail-tariff", severity: "caution", message: `The entered retail tariff exceeds $${HIGH_TARIFF_REVIEW_THRESHOLD_USD_PER_KWH}/kWh. This is unusual for a USD-per-kWh input and materially increases modeled savings; confirm the decimal place, currency, and units against your bill.` });
  if (input.shadingFactor !== undefined && input.shadingFactor <= 0.25) warnings.push({ code: "extreme-shading", severity: "caution", message: "Very heavy modeled shade makes production highly uncertain; seek a site assessment." });
  if (annualYieldPerKw === 0) warnings.push({ code: "zero-modeled-yield", severity: "caution", message: "The entered production factors result in zero modeled yield; no system size or savings can be estimated." });
  if (roofCapacity === 0) warnings.push({ code: "insufficient-roof", severity: "caution", message: "No usable roof capacity is available under the entered assumptions." });
  if (input.exportCompensationRate === undefined) warnings.push({ code: "export-rate-assumed-zero", severity: "caution", message: "Export compensation is unknown and defaults to zero in this estimate; actual utility export rules may differ." });
  else if (input.exportCompensationRate === 0) warnings.push({ code: "export-uncompensated", severity: "info", message: "Exported energy receives no modeled compensation; actual utility export rules may differ." });
  if (input.incentiveRate && input.incentiveRate > 0) warnings.push({ code: "unverified-incentive", severity: "caution", message: "The incentive is a user-entered assumption only; eligibility and amount have not been verified." });
  if (annualConsumption !== null && annualConsumption > 0 && !input.monthlyBill) warnings.push({ code: "bill-from-rate", severity: "info", message: "Annual consumption was inferred from the entered bill and tariff assumptions." });
  if (netRange.expected !== null && payback === null && annualSavings !== null && annualSavings > 0) warnings.push({ code: "payback-out-of-horizon", severity: "caution", message: `Payback exceeds the ${assumptions.maximumPaybackYears}-year model horizon or cannot be estimated reliably.` });
  const providedCount = keys.filter(key => typeof input[key] === "number").length;
  const qualityReasons = [input.sunHours === undefined ? "Generic yield assumption is unavailable." : "Sun-hours value is an illustrative input, not a live measurement.", input.exportCompensationRate === undefined ? "Unknown export compensation is modeled as zero." : input.exportCompensationRate === 0 ? "Export compensation is modeled as zero; verify utility export rules." : "Export compensation is an entered model assumption; verify utility rules."];
  const completenessPercent = Math.round(providedCount / keys.length * 100);
  const result: SolarEstimate = {
    ...base, status: complete ? "complete" : "partial", roofCapacityKw: roofCapacity, systemKw, roofLimited,
    annualProductionKwh: generation, annualConsumptionKwh: annualConsumption, annualSelfConsumedKwh: selfConsumed, annualExportedKwh: exported,
    annualSavings, annualRetailSavingsUsd: retailSavings, annualExportRevenueUsd: exportRevenue, monthlySavings: annualSavings === null ? null : annualSavings / 12,
    installationCostRangeUsd: costRange, netInstallationCostRangeUsd: netRange, netCost: netRange.expected,
    paybackYears: payback,
    paybackRangeYears: paybackRange, projectionHorizonYears: assumptions.projectionHorizonYears,
    cumulativeSavingsUsd: projections.length ? cumulative : null,
    twentyFiveYearSavings: projections.length ? projections[assumptions.projectionHorizonYears - 1]?.cumulativeNetSavingsUsd ?? cumulative - (netRange.expected ?? 0) : null,
    co2AvoidedKg: generation === null ? null : generation * assumptions.gridEmissionsKgCo2PerKwh,
    annualProjection: projections, assumptions, warnings, limitations: DEFAULT_LIMITATIONS,
    dataQuality: { completenessPercent, confidence: completenessPercent >= 90 && input.sunHours !== undefined ? "moderate" : "low", reasons: qualityReasons }, errors,
  };
  return result;
}

export function calculateSolar(input: SolarInputs, assumptions?: Partial<CalculationAssumptions>): SolarResults {
  const result = estimateSolar(input, assumptions);
  if (result.status !== "complete") throw new Error(result.errors.map(error => error.message).join(" ") || "Solar estimate is incomplete.");
  return result as SolarResults;
}
