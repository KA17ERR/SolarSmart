import { calculatePanelLayout, type PanelLayout, type PanelOrientation, type RoofShape } from "./panel-layout";
import { estimateSolar, estimatedAnnualYieldPerKw, type SolarEstimate, type SolarInputs } from "./solar";

export type RoofFacing = "south" | "south-east" | "south-west" | "east" | "west" | "north";
export type ShadingCategory = "low" | "moderate" | "high";
export type PlannerInputs = {
  place: string;
  property: string;
  roofWidthM: number;
  roofLengthM: number;
  panelOrientation: PanelOrientation;
  roofShape?: RoofShape;
  roofFacing: RoofFacing;
  panelWatts: number;
  panelWidthM: number;
  panelLengthM: number;
  placedPanelIds: number[] | null;
  monthlyConsumptionKwh: number;
  utilityRateUsdPerKwh: number;
  peakSunHoursPerDay: number;
  shading: ShadingCategory;
  roofTiltDegrees: number;
  installedCostUsdPerKw: number;
  batteryCapacityKwh?: 0 | 5 | 10;
};
export type ApplianceUsageInput = { powerWatts: number; hoursPerDay: number; quantity: number };
export type PlannerValidationIssue = { field: keyof PlannerInputs; message: string };
export type PlannerScenario = { id: "conservative" | "current" | "roof-max"; name: string; panelCount: number; result: SolarEstimate };
export type PlannerBatteryEstimate = { nominalCapacityKwh: number; usableCapacityKwh: number; assumedAverageLoadKw: number | null; estimatedHoursAtAverageLoad: number | null; reserveRate: number; note: string };
export type SolarPlan = {
  input: PlannerInputs;
  estimate: SolarEstimate;
  panelLayout: PanelLayout;
  physicalLayout: PanelLayout;
  roofAreaM2: number;
  roofCapacityKw: number;
  maxPanelCount: number;
  panelCount: number;
  systemCapacityKw: number;
  battery: PlannerBatteryEstimate;
  roofFootprintUsedPercent: number;
  placedPanelIds: number[];
  availablePanelIds: number[];
  scenarios: PlannerScenario[];
  validationIssues: PlannerValidationIssue[];
};

/** Runtime boundary for saved drafts, server actions, and optional storage reads. */
export function isPlannerInputs(value: unknown): value is PlannerInputs {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  const numeric = ["roofWidthM", "roofLengthM", "panelWatts", "panelWidthM", "panelLengthM", "monthlyConsumptionKwh", "utilityRateUsdPerKwh", "peakSunHoursPerDay", "roofTiltDegrees", "installedCostUsdPerKw"];
  if (numeric.some(key => typeof input[key] !== "number" || !Number.isFinite(input[key]))) return false;
  if (typeof input.place !== "string" || !input.place.trim() || input.place.length > 120 || typeof input.property !== "string" || !input.property.trim() || input.property.length > 60) return false;
  if (!["landscape", "portrait"].includes(String(input.panelOrientation)) || !["south", "south-east", "south-west", "east", "west", "north"].includes(String(input.roofFacing)) || !["low", "moderate", "high"].includes(String(input.shading))) return false;
  if (![450, 550].includes(Number(input.panelWatts)) || Number(input.panelWidthM) < .5 || Number(input.panelWidthM) > 3 || Number(input.panelLengthM) < .5 || Number(input.panelLengthM) > 4 || Number(input.roofTiltDegrees) < 0 || Number(input.roofTiltDegrees) > 60) return false;
  if (input.batteryCapacityKwh !== undefined && ![0, 5, 10].includes(Number(input.batteryCapacityKwh))) return false;
  if (input.roofShape !== undefined && !["flat", "gable", "hip"].includes(String(input.roofShape))) return false;
  if (input.placedPanelIds !== null && (!Array.isArray(input.placedPanelIds) || input.placedPanelIds.length > 500 || input.placedPanelIds.some(id => !Number.isSafeInteger(id) || Number(id) < 0))) return false;
  return [0, 1, 2].every(step => validatePlannerStep(input as unknown as PlannerInputs, step as 0 | 1 | 2).length === 0);
}

/** Removes the pre-fix demo's accidental fixed 18-panel default when reopening a saved demo. */
export function normalizeLegacyDemoLayout(input: PlannerInputs): { inputs: PlannerInputs; changed: boolean } {
  const ids = input.placedPanelIds;
  const wasSeededDemo = input.place === "Demo property · Austin, TX" && Array.isArray(ids)
    && ids.length === 18 && ids.every((id, index) => id === index + 1);
  return wasSeededDemo ? { inputs: { ...input, placedPanelIds: null }, changed: true } : { inputs: input, changed: false };
}

export const PANEL_LAYOUT_ASSUMPTIONS = { edgeClearanceM: .35, gapM: .06, usableRoofPercent: 70, squareFeetPerSquareMeter: 10.7639 } as const;
export const ROOF_ORIENTATION_FACTORS: Record<RoofFacing, number> = { south: .96, "south-east": .93, "south-west": .93, east: .86, west: .86, north: .68 };
export const SHADING_FACTORS: Record<ShadingCategory, number> = { low: .96, moderate: .92, high: .62 };
export const BATTERY_RESERVE_RATE = .15;

/** Approximate a 30-day month from user-entered appliance nameplate power and daily use. */
export function estimateMonthlyConsumptionFromAppliances(appliances: ApplianceUsageInput[]): number | null {
  if (appliances.length === 0 || appliances.some(item =>
    !Number.isFinite(item.powerWatts) || item.powerWatts < 0 || item.powerWatts > 20000 ||
    !Number.isFinite(item.hoursPerDay) || item.hoursPerDay < 0 || item.hoursPerDay > 24 ||
    !Number.isFinite(item.quantity) || item.quantity < 0 || item.quantity > 50
  )) return null;
  const monthlyKwh = appliances.reduce((sum, item) => sum + item.powerWatts * item.hoursPerDay * item.quantity, 0) * 30 / 1000;
  return Number.isFinite(monthlyKwh) ? monthlyKwh : null;
}

/** Infer kWh from bill amount and a known retail tariff; returns null for unusable values. */
export function estimateMonthlyConsumptionFromBill(monthlyBill: number, tariffUsdPerKwh: number): number | null {
  if (!Number.isFinite(monthlyBill) || monthlyBill <= 0 || monthlyBill > 30000 || !Number.isFinite(tariffUsdPerKwh) || tariffUsdPerKwh < .001 || tariffUsdPerKwh > 1000) return null;
  const monthlyKwh = monthlyBill / tariffUsdPerKwh;
  return Number.isFinite(monthlyKwh) && monthlyKwh >= 1 && monthlyKwh <= 30000 ? monthlyKwh : null;
}

export function estimatePlannerBattery(monthlyConsumptionKwh: number, nominalCapacityKwh: number): PlannerBatteryEstimate {
  const capacity = Number.isFinite(nominalCapacityKwh) && [0, 5, 10].includes(nominalCapacityKwh) ? nominalCapacityKwh : 0;
  const validUse = Number.isFinite(monthlyConsumptionKwh) && monthlyConsumptionKwh > 0;
  const averageLoad = validUse ? monthlyConsumptionKwh * 12 / 365 / 24 : null;
  const usable = capacity * (1 - BATTERY_RESERVE_RATE);
  return { nominalCapacityKwh: capacity, usableCapacityKwh: usable, assumedAverageLoadKw: averageLoad, estimatedHoursAtAverageLoad: capacity > 0 && averageLoad !== null && averageLoad > 0 ? usable / averageLoad : null, reserveRate: BATTERY_RESERVE_RATE, note: "Simplified continuous-load illustration; actual backup depends on battery/inverter limits, selected circuits, weather, and usage timing. Battery equipment cost and its effect on bill savings are not modeled." };
}

export function validatePlannerStep(input: PlannerInputs, step: 0 | 1 | 2 | 3): PlannerValidationIssue[] {
  if (step === 0 && !input.place.trim()) return [{ field: "place", message: "Enter a city or postcode, or choose the demo home." }];
  if (step === 1) {
    const issues: PlannerValidationIssue[] = [];
    if (!Number.isFinite(input.roofWidthM) || input.roofWidthM < 2 || input.roofWidthM > 100) issues.push({ field: "roofWidthM", message: "Roof width must be between 2 m and 100 m. Check the unit if your roof is unusually sized." });
    if (!Number.isFinite(input.roofLengthM) || input.roofLengthM < 2 || input.roofLengthM > 100) issues.push({ field: "roofLengthM", message: "Roof length must be between 2 m and 100 m. Check the unit if your roof is unusually sized." });
    return issues;
  }
  if (step === 2) {
    const issues: PlannerValidationIssue[] = [];
    if (!Number.isFinite(input.monthlyConsumptionKwh) || input.monthlyConsumptionKwh < 1 || input.monthlyConsumptionKwh > 30000) issues.push({ field: "monthlyConsumptionKwh", message: "Monthly consumption must be between 1 and 30,000 kWh. Check the unit shown on your bill." });
    if (!Number.isFinite(input.utilityRateUsdPerKwh) || input.utilityRateUsdPerKwh < .001 || input.utilityRateUsdPerKwh > 1000) issues.push({ field: "utilityRateUsdPerKwh", message: "Enter a tariff from $0.001 to $1,000 per kWh, and confirm its currency and units against your bill." });
    if (!Number.isFinite(input.peakSunHoursPerDay) || input.peakSunHoursPerDay < .1 || input.peakSunHoursPerDay > 12) issues.push({ field: "peakSunHoursPerDay", message: "Use a generic peak-sun assumption from 0.1 to 12 hours per day. This is not a live reading." });
    if (!Number.isFinite(input.installedCostUsdPerKw) || input.installedCostUsdPerKw < 500 || input.installedCostUsdPerKw > 30000) issues.push({ field: "installedCostUsdPerKw", message: "Enter an illustrative installed cost from $500 to $30,000 per kW." });
    return issues;
  }
  return [];
}

function makeSolarInputs(input: PlannerInputs, capacityKw: number, cost: number): SolarInputs {
  const consumption = input.monthlyConsumptionKwh * 12;
  const orientation = ROOF_ORIENTATION_FACTORS[input.roofFacing];
  const shading = SHADING_FACTORS[input.shading];
  const annualYield = estimatedAnnualYieldPerKw({ sunHours: input.peakSunHoursPerDay, orientationFactor: orientation, shadingFactor: shading });
  const offset = consumption > 0 ? Math.min(1, capacityKw * annualYield / consumption) : 0;
  return {
    monthlyBill: input.monthlyConsumptionKwh * input.utilityRateUsdPerKwh,
    annualConsumptionKwh: consumption,
    utilityRate: input.utilityRateUsdPerKwh,
    sunHours: input.peakSunHoursPerDay,
    systemCost: cost,
    incentiveRate: 0,
    electricityEscalation: 0,
    targetAnnualOffsetRate: offset,
    systemCapacityTargetKw: capacityKw,
    exportCompensationRate: 0,
    roofAreaSqFt: input.roofWidthM * input.roofLengthM * PANEL_LAYOUT_ASSUMPTIONS.squareFeetPerSquareMeter,
    usableRoofPercent: PANEL_LAYOUT_ASSUMPTIONS.usableRoofPercent,
    orientationFactor: orientation,
    shadingFactor: shading,
  };
}

/** Keep planner handoffs on the same capacity, yield, usage, tariff, and cost assumptions. */
export function plannerInputsToSolarInputs(input: PlannerInputs, capacityKw: number): SolarInputs {
  return makeSolarInputs(input, capacityKw, capacityKw * input.installedCostUsdPerKw);
}

function scenarioEstimate(input: PlannerInputs, panelCount: number, assumptions: SolarInputs): SolarEstimate {
  const capacityKw = panelCount * input.panelWatts / 1000;
  return estimateSolar({ ...assumptions, ...makeSolarInputs(input, capacityKw, capacityKw * input.installedCostUsdPerKw) });
}

/** Composes panel geometry with the shared deterministic energy and financial engine. */
export function calculateSolarPlan(input: PlannerInputs): SolarPlan {
  const physicalLayout = calculatePanelLayout({ roofWidthM: input.roofWidthM, roofLengthM: input.roofLengthM, panelWidthM: input.panelWidthM, panelLengthM: input.panelLengthM, edgeClearanceM: PANEL_LAYOUT_ASSUMPTIONS.edgeClearanceM, gapM: PANEL_LAYOUT_ASSUMPTIONS.gapM, orientation: input.panelOrientation });
  const surfaceLayout = calculatePanelLayout({ roofWidthM: input.roofWidthM, roofLengthM: input.roofLengthM, panelWidthM: input.panelWidthM, panelLengthM: input.panelLengthM, edgeClearanceM: PANEL_LAYOUT_ASSUMPTIONS.edgeClearanceM, gapM: PANEL_LAYOUT_ASSUMPTIONS.gapM, orientation: input.panelOrientation, roofShape: input.roofShape ?? "flat" });
  const roofAreaM2 = Number.isFinite(input.roofWidthM * input.roofLengthM) && input.roofWidthM > 0 && input.roofLengthM > 0 ? input.roofWidthM * input.roofLengthM : 0;
  const baseInputs = makeSolarInputs(input, 0, 0);
  const roofEstimate = estimateSolar({ ...baseInputs, targetAnnualOffsetRate: 1 });
  const roofCapacityKw = roofEstimate.roofCapacityKw ?? 0;
  const maxPanelCount = Math.max(0, Math.min(surfaceLayout.panels.length, Math.floor((roofCapacityKw * 1000 + 1e-6) / input.panelWatts)));
  const availablePanelIds = surfaceLayout.panels.slice(0, maxPanelCount).map(panel => panel.id);
  const placedPanelIds = input.placedPanelIds === null ? availablePanelIds : [...new Set(input.placedPanelIds)].filter(id => availablePanelIds.includes(id));
  const panelCount = placedPanelIds.length;
  const systemCapacityKw = panelCount * input.panelWatts / 1000;
  const placedSet = new Set(placedPanelIds);
  const placedPanels = surfaceLayout.panels.filter(panel => placedSet.has(panel.id));
  const panelLayout = { ...surfaceLayout, panels: placedPanels, occupiedAreaM2: placedPanels.length * input.panelWidthM * input.panelLengthM };
  const estimate = estimateSolar(makeSolarInputs(input, systemCapacityKw, systemCapacityKw * input.installedCostUsdPerKw));
  const scenarioCounts = [Math.max(0, Math.floor(panelCount * .55)), panelCount, maxPanelCount];
  const ids = ["conservative", "current", "roof-max"] as const;
  const names = ["Conservative", "Current plan", "Roof-constrained max"] as const;
  const scenarios = scenarioCounts.map((count, index) => ({ id: ids[index], name: names[index], panelCount: count, result: scenarioEstimate(input, count, baseInputs) }));
  const validationIssues: PlannerValidationIssue[] = [...validatePlannerStep(input, 0), ...validatePlannerStep(input, 1), ...validatePlannerStep(input, 2)];
  const battery = estimatePlannerBattery(input.monthlyConsumptionKwh, input.batteryCapacityKwh ?? 0);
  return { input, estimate, panelLayout, physicalLayout, roofAreaM2, roofCapacityKw, maxPanelCount, panelCount, systemCapacityKw, battery, roofFootprintUsedPercent: roofAreaM2 > 0 ? panelLayout.occupiedAreaM2 / roofAreaM2 * 100 : 0, placedPanelIds, availablePanelIds, scenarios, validationIssues };
}
