import { DEFAULT_INPUTS, type SolarInputs } from "./solar";

export type AreaUnit = "sq-ft" | "sq-m";
export type PropertyType = "single-family" | "multi-unit" | "small-business" | "other";
export type RoofType = "pitched-shingle" | "pitched-tile" | "metal" | "flat" | "other";
export type EnergyInputMethod = "monthly-bill" | "monthly-consumption";
export type ShadingCategory = "none" | "light" | "moderate" | "heavy" | "unknown";
export type OrientationCategory = "equator-facing" | "east-west" | "away-from-equator" | "unknown";
export type AssessmentPriority = "bill-savings" | "upfront-cost" | "environmental-impact" | "exploring";

/** Raw, separate wizard form model. Numeric fields stay strings until validation and conversion. */
export type AssessmentDraft = {
  isDemoExample: boolean;
  cityOrPostcode: string;
  propertyType: PropertyType | "";
  roofType: RoofType | "";
  usableRoofArea: string;
  areaUnit: AreaUnit | "";
  energyInputMethod: EnergyInputMethod;
  monthlyBill: string;
  monthlyConsumptionKwh: string;
  electricityTariff: string;
  shading: ShadingCategory | "";
  orientation: OrientationCategory | "";
  budgetUsd: string;
  priority: AssessmentPriority;
};

export type AssessmentFieldErrors = Partial<Record<keyof AssessmentDraft, string>>;

/** Context shown alongside results. Personal location is never used to look up data. */
export type AssessmentContext = {
  cityOrPostcode: string;
  isDemoExample: boolean;
  propertyType: PropertyType;
  roofType: RoofType;
  usableRoofArea: number;
  areaUnit: AreaUnit;
  energyInputMethod: EnergyInputMethod;
  monthlyEnergyInput: number;
  tariffUsdPerKwh: number;
  tariffWasAssumed: boolean;
  shading: ShadingCategory;
  orientation: OrientationCategory;
  budgetUsd?: number;
  priority: AssessmentPriority;
};

export type PreparedAssessment = { solarInputs: SolarInputs; context: AssessmentContext };

export const EMPTY_ASSESSMENT_DRAFT: AssessmentDraft = {
  isDemoExample: false,
  cityOrPostcode: "",
  propertyType: "",
  roofType: "",
  usableRoofArea: "",
  areaUnit: "sq-ft",
  energyInputMethod: "monthly-bill",
  monthlyBill: "",
  monthlyConsumptionKwh: "",
  electricityTariff: "",
  shading: "",
  orientation: "unknown",
  budgetUsd: "",
  priority: "exploring",
};

/** Fictional values for a guided demo only. No local tariffs or solar data are implied. */
export const DEMO_ASSESSMENT_DRAFT: AssessmentDraft = {
  isDemoExample: true,
  cityOrPostcode: "Sampleville (demo)",
  propertyType: "single-family",
  roofType: "pitched-shingle",
  usableRoofArea: "850",
  areaUnit: "sq-ft",
  energyInputMethod: "monthly-bill",
  monthlyBill: "180",
  monthlyConsumptionKwh: "1200",
  electricityTariff: "0.15",
  shading: "light",
  orientation: "equator-facing",
  budgetUsd: "14000",
  priority: "bill-savings",
};

export const AREA_UNITS: Record<AreaUnit, { label: string; squareFeetPerUnit: number }> = {
  "sq-ft": { label: "square feet (sq ft)", squareFeetPerUnit: 1 },
  "sq-m": { label: "square metres (m²)", squareFeetPerUnit: 10.7639 },
};

/** Convert the displayed area while preserving its approximate physical size when a user changes units. */
export function convertAreaValue(value: string, from: AreaUnit, to: AreaUnit): string {
  if (from === to || !value.trim()) return value;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  const converted = parsed * AREA_UNITS[from].squareFeetPerUnit / AREA_UNITS[to].squareFeetPerUnit;
  return Number(converted.toPrecision(10)).toString();
}

const SHADING_FACTOR: Record<ShadingCategory, number> = { none: 1, light: 0.95, moderate: 0.82, heavy: 0.65, unknown: 0.9 };
const ORIENTATION_FACTOR: Record<OrientationCategory, number> = { "equator-facing": 1, "east-west": 0.88, "away-from-equator": 0.72, unknown: DEFAULT_INPUTS.orientationFactor };
const PROPERTY_TYPES: PropertyType[] = ["single-family", "multi-unit", "small-business", "other"];
const ROOF_TYPES: RoofType[] = ["pitched-shingle", "pitched-tile", "metal", "flat", "other"];
const SHADING_TYPES: ShadingCategory[] = ["none", "light", "moderate", "heavy", "unknown"];
const ORIENTATION_TYPES: OrientationCategory[] = ["equator-facing", "east-west", "away-from-equator", "unknown"];
const PRIORITY_TYPES: AssessmentPriority[] = ["bill-savings", "upfront-cost", "environmental-impact", "exploring"];

function parseField(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** Validates raw form values without coercing blank or malformed values into zero. */
export function validateAssessmentDraft(draft: AssessmentDraft): AssessmentFieldErrors {
  const errors: AssessmentFieldErrors = {};
  const city = draft.cityOrPostcode.trim();
  if (city.length < 2 || city.length > 80) errors.cityOrPostcode = "Enter a city or postcode (2–80 characters). Do not enter a street address.";
  if (!PROPERTY_TYPES.includes(draft.propertyType as PropertyType)) errors.propertyType = "Choose a property type.";
  if (!ROOF_TYPES.includes(draft.roofType as RoofType)) errors.roofType = "Choose a roof type.";

  const area = parseField(draft.usableRoofArea);
  if (!area || area <= 0) errors.usableRoofArea = "Enter a usable roof area greater than zero.";
  else if (area > (draft.areaUnit === "sq-m" ? 92903 : 1_000_000)) errors.usableRoofArea = "This area is above the supported range. Check the unit or enter a smaller estimate.";
  if (draft.areaUnit !== "sq-ft" && draft.areaUnit !== "sq-m") errors.areaUnit = "Choose square feet or square metres.";

  if (draft.energyInputMethod === "monthly-bill") {
    const bill = parseField(draft.monthlyBill);
    if (bill === undefined || bill < 0 || bill > 100_000) errors.monthlyBill = "Enter a monthly bill from $0 to $100,000.";
  } else if (draft.energyInputMethod === "monthly-consumption") {
    const consumption = parseField(draft.monthlyConsumptionKwh);
    if (consumption === undefined || consumption <= 0 || consumption > 100_000) errors.monthlyConsumptionKwh = "Enter monthly electricity use greater than 0 and no more than 100,000 kWh.";
  } else errors.energyInputMethod = "Choose a bill or consumption input method.";

  const tariff = parseField(draft.electricityTariff);
  if (draft.electricityTariff.trim() && (tariff === undefined || tariff < 0.001 || tariff > 1000)) errors.electricityTariff = "Enter a rate between $0.001 and $1,000 per kWh, or leave it blank to use the disclosed demo assumption.";
  if (draft.energyInputMethod === "monthly-consumption" && tariff !== undefined && tariff > 0 && (parseField(draft.monthlyConsumptionKwh) ?? 0) * tariff > 100_000) {
    errors.monthlyConsumptionKwh = "This usage and rate imply a monthly bill above the model’s $100,000 limit. Check both values or use the monthly-bill option.";
  }
  if (!SHADING_TYPES.includes(draft.shading as ShadingCategory)) errors.shading = "Choose a shading category, or select not sure.";
  if (!ORIENTATION_TYPES.includes(draft.orientation as OrientationCategory)) errors.orientation = "Choose an orientation category or select not sure.";
  if (!PRIORITY_TYPES.includes(draft.priority)) errors.priority = "Choose a planning priority.";

  const budget = parseField(draft.budgetUsd);
  if (draft.budgetUsd.trim() && (budget === undefined || budget < 0 || budget > 100_000_000)) errors.budgetUsd = "Enter an optional budget from $0 to $100,000,000, or leave it blank.";
  return errors;
}

/** Maps reviewed wizard values to the existing pure calculation model and disclosed context. */
export function prepareAssessment(draft: AssessmentDraft): PreparedAssessment {
  const errors = validateAssessmentDraft(draft);
  if (Object.keys(errors).length) throw new Error("Complete or correct the highlighted assessment fields.");

  const area = parseField(draft.usableRoofArea)!;
  const tariffWasAssumed = !draft.electricityTariff.trim();
  const tariffUsdPerKwh = tariffWasAssumed ? DEFAULT_INPUTS.utilityRate : parseField(draft.electricityTariff)!;
  const monthlyEnergyInput = parseField(draft.energyInputMethod === "monthly-bill" ? draft.monthlyBill : draft.monthlyConsumptionKwh)!;
  const monthlyBill = draft.energyInputMethod === "monthly-bill" ? monthlyEnergyInput : monthlyEnergyInput * tariffUsdPerKwh;
  const squareFeet = area * AREA_UNITS[draft.areaUnit as AreaUnit].squareFeetPerUnit;
  const context: AssessmentContext = {
    cityOrPostcode: draft.cityOrPostcode.trim(),
    isDemoExample: draft.isDemoExample,
    propertyType: draft.propertyType as PropertyType,
    roofType: draft.roofType as RoofType,
    usableRoofArea: area,
    areaUnit: draft.areaUnit as AreaUnit,
    energyInputMethod: draft.energyInputMethod,
    monthlyEnergyInput,
    tariffUsdPerKwh,
    tariffWasAssumed,
    shading: (draft.shading || "unknown") as ShadingCategory,
    orientation: draft.orientation as OrientationCategory,
    budgetUsd: draft.budgetUsd.trim() ? parseField(draft.budgetUsd) : undefined,
    priority: draft.priority,
  };
  return {
    context,
    solarInputs: {
      ...DEFAULT_INPUTS,
      monthlyBill,
      utilityRate: tariffUsdPerKwh,
      roofAreaSqFt: squareFeet,
      usableRoofPercent: 100,
      shadingFactor: SHADING_FACTOR[context.shading],
      orientationFactor: ORIENTATION_FACTOR[context.orientation],
    },
  };
}

export const PROPERTY_LABEL: Record<PropertyType, string> = { "single-family": "Single-family home", "multi-unit": "Multi-unit property", "small-business": "Small business", other: "Other property" };
export const ROOF_LABEL: Record<RoofType, string> = { "pitched-shingle": "Pitched · shingle", "pitched-tile": "Pitched · tile", metal: "Metal", flat: "Flat", other: "Other / not sure" };
export const SHADING_LABEL: Record<ShadingCategory, string> = { none: "No noticeable shade", light: "Light shade", moderate: "Moderate shade", heavy: "Heavy shade", unknown: "Not sure · demo factor used" };
export const ORIENTATION_LABEL: Record<OrientationCategory, string> = { "equator-facing": "Mostly toward the equator", "east-west": "Mostly east or west", "away-from-equator": "Mostly away from the equator", unknown: "Not sure · generic factor used" };
export const PRIORITY_LABEL: Record<AssessmentPriority, string> = { "bill-savings": "Understand bill savings", "upfront-cost": "Understand upfront cost", "environmental-impact": "Understand environmental impact", exploring: "Explore the options" };
