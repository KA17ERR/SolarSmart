import { describe, expect, it } from "vitest";
import { calculateSolarPlan, estimateMonthlyConsumptionFromAppliances, estimateMonthlyConsumptionFromBill, estimatePlannerBattery, normalizeLegacyDemoLayout, PANEL_LAYOUT_ASSUMPTIONS, plannerInputsToSolarInputs, validatePlannerStep, type PlannerInputs } from "./planner";
import { calculateSolar } from "./solar";

const DEMO_PLAN: PlannerInputs = {
  place: "Demo property · Austin, TX", property: "Detached home", roofWidthM: 8, roofLengthM: 10,
  panelOrientation: "landscape", roofFacing: "south", panelWatts: 450, panelWidthM: 1.1, panelLengthM: 1.9,
  placedPanelIds: Array.from({ length: 18 }, (_, index) => index + 1), monthlyConsumptionKwh: 850,
  utilityRateUsdPerKwh: .15, peakSunHoursPerDay: 4.8, shading: "moderate", roofTiltDegrees: 20, installedCostUsdPerKw: 2400,
};

describe("solar planner model", () => {
  it("connects proportional roof geometry to the shared estimate engine", () => {
    const plan = calculateSolarPlan(DEMO_PLAN);
    expect(plan.roofAreaM2).toBe(80);
    expect(plan.physicalLayout.panels).toHaveLength(24);
    expect(plan.maxPanelCount).toBe(22);
    expect(plan.panelCount).toBe(18);
    expect(plan.systemCapacityKw).toBeCloseTo(8.1);
    expect(plan.estimate.systemKw).toBeCloseTo(8.1);
    expect(plan.estimate.annualProductionKwh).toBeCloseTo(10027, -1);
    expect(plan.estimate.installationCostRangeUsd.expected).toBeCloseTo(19440);
  });
  it("hands the same roof-limited planner configuration into assessment calculations", () => {
    const plan = calculateSolarPlan(DEMO_PLAN);
    const assessmentInputs = plannerInputsToSolarInputs(DEMO_PLAN, plan.systemCapacityKw);
    const assessment = calculateSolar(assessmentInputs);
    expect(assessment.systemKw).toBeCloseTo(plan.estimate.systemKw ?? 0);
    expect(assessment.annualProductionKwh).toBeCloseTo(plan.estimate.annualProductionKwh ?? 0);
    expect(assessment.annualConsumptionKwh).toBeCloseTo(plan.estimate.annualConsumptionKwh ?? 0);
    expect(assessment.annualSavings).toBeCloseTo(plan.estimate.annualSavings ?? 0);
    expect(assessment.installationCostRangeUsd.expected).toBeCloseTo(plan.estimate.installationCostRangeUsd.expected ?? 0);
  });
  it("generates distinct roof-constrained scenarios with the same model", () => {
    const plan = calculateSolarPlan(DEMO_PLAN);
    expect(plan.scenarios.map(scenario => scenario.panelCount)).toEqual([9, 18, 22]);
    expect(plan.scenarios[0].result.annualProductionKwh).toBeLessThan(plan.scenarios[1].result.annualProductionKwh!);
    expect(plan.scenarios[1].result.annualProductionKwh).toBeLessThan(plan.scenarios[2].result.annualProductionKwh!);
    expect(plan.scenarios[2].result.systemKw).toBeCloseTo(9.9);
    expect(plan.scenarios[2].result.annualProductionKwh).toBeGreaterThan(plan.scenarios[2].result.annualConsumptionKwh!);
  });
  it("derives usable module capacity from the selected roof geometry", () => {
    const flat = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: null, roofShape: "flat" });
    const gable = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: null, roofShape: "gable" });
    const hip = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: null, roofShape: "hip" });
    expect(flat.maxPanelCount).toBeGreaterThan(gable.maxPanelCount);
    expect(gable.maxPanelCount).toBeGreaterThan(hip.maxPanelCount);
    expect(gable.panelCount).toBe(gable.maxPanelCount);
    expect(hip.systemCapacityKw).toBeCloseTo(hip.panelCount * DEMO_PLAN.panelWatts / 1000);
  });
  it("changes output with shade, orientation, and panel rating assumptions", () => {
    const baseline = calculateSolarPlan(DEMO_PLAN);
    const shaded = calculateSolarPlan({ ...DEMO_PLAN, shading: "high" });
    const northFacing = calculateSolarPlan({ ...DEMO_PLAN, roofFacing: "north" });
    const efficientModules = calculateSolarPlan({ ...DEMO_PLAN, panelWatts: 550 });
    expect(shaded.estimate.annualProductionKwh).toBeLessThan(baseline.estimate.annualProductionKwh!);
    expect(northFacing.estimate.annualProductionKwh).toBeLessThan(baseline.estimate.annualProductionKwh!);
    expect(efficientModules.systemCapacityKw).toBeGreaterThan(baseline.systemCapacityKw);
  });
  it("converts square metres into the solar engine's square feet capacity unit", () => {
    const plan = calculateSolarPlan(DEMO_PLAN);
    expect(plan.estimate.roofCapacityKw).toBeCloseTo(80 * PANEL_LAYOUT_ASSUMPTIONS.squareFeetPerSquareMeter * .7 / 60, 8);
  });
  it("retains a valid but reduced plan when the user removes selected modules", () => {
    const plan = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: [1, 4, 7] });
    expect(plan.panelLayout.panels.map(panel => panel.id)).toEqual([1, 4, 7]);
    expect(plan.panelCount).toBe(3);
    expect(plan.estimate.systemKw).toBeCloseTo(1.35);
  });
  it("fills the roof-constrained layout by default and recalculates count when roof geometry changes", () => {
    const defaultPlan = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: null });
    const smallerRoof = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: null, roofWidthM: 5, roofLengthM: 6 });
    const largerRoof = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: null, roofWidthM: 12, roofLengthM: 14 });
    expect(defaultPlan.panelCount).toBe(defaultPlan.maxPanelCount);
    expect(smallerRoof.panelCount).toBe(smallerRoof.maxPanelCount);
    expect(largerRoof.panelCount).toBe(largerRoof.maxPanelCount);
    expect(smallerRoof.panelCount).toBeLessThan(defaultPlan.panelCount);
    expect(largerRoof.panelCount).toBeGreaterThan(defaultPlan.panelCount);
    expect(defaultPlan.systemCapacityKw).toBeCloseTo(defaultPlan.panelCount * DEMO_PLAN.panelWatts / 1000);
  });
  it("migrates only the pre-fix seeded demo panel list when reopening saved data", () => {
    const legacy = normalizeLegacyDemoLayout(DEMO_PLAN);
    expect(legacy.changed).toBe(true);
    expect(legacy.inputs.placedPanelIds).toBeNull();
    const edited = normalizeLegacyDemoLayout({ ...DEMO_PLAN, placedPanelIds: [1, 3, 4] });
    expect(edited.changed).toBe(false);
    expect(edited.inputs.placedPanelIds).toEqual([1, 3, 4]);
    expect(normalizeLegacyDemoLayout({ ...DEMO_PLAN, place: "Austin, TX" }).changed).toBe(false);
  });
  it("deduplicates repeated panel ids so they cannot inflate capacity", () => {
    const plan = calculateSolarPlan({ ...DEMO_PLAN, placedPanelIds: [1, 1, 4] });
    expect(plan.panelCount).toBe(2);
    expect(plan.systemCapacityKw).toBeCloseTo(.9);
    expect(plan.roofFootprintUsedPercent).toBeCloseTo(plan.panelLayout.occupiedAreaM2 / plan.roofAreaM2 * 100);
  });
  it("estimates monthly use from appliance watts, daily hours, and quantity", () => {
    expect(estimateMonthlyConsumptionFromAppliances([{ powerWatts: 100, hoursPerDay: 5, quantity: 2 }])).toBe(30);
    expect(estimateMonthlyConsumptionFromAppliances([])).toBeNull();
    expect(estimateMonthlyConsumptionFromAppliances([{ powerWatts: 100, hoursPerDay: 25, quantity: 1 }])).toBeNull();
    expect(estimateMonthlyConsumptionFromAppliances([{ powerWatts: Number.POSITIVE_INFINITY, hoursPerDay: 2, quantity: 1 }])).toBeNull();
  });
  it("infers a reasonable monthly use from a bill only when a tariff is provided", () => {
    expect(estimateMonthlyConsumptionFromBill(127.5, .15)).toBe(850);
    expect(estimateMonthlyConsumptionFromBill(127.5, 0)).toBeNull();
    expect(estimateMonthlyConsumptionFromBill(1, 1000)).toBeNull();
    expect(estimateMonthlyConsumptionFromBill(Number.NaN, .15)).toBeNull();
  });
  it("reports invalid zero consumption, tariff, and roof dimensions without non-finite results", () => {
    expect(validatePlannerStep({ ...DEMO_PLAN, monthlyConsumptionKwh: 0 }, 2)[0].field).toBe("monthlyConsumptionKwh");
    expect(validatePlannerStep({ ...DEMO_PLAN, utilityRateUsdPerKwh: 0 }, 2)[0].field).toBe("utilityRateUsdPerKwh");
    const noRoof = calculateSolarPlan({ ...DEMO_PLAN, roofWidthM: 0, roofLengthM: 0 });
    expect(validatePlannerStep({ ...DEMO_PLAN, roofWidthM: 0 }, 1)).toHaveLength(1);
    expect(noRoof.panelCount).toBe(0);
    expect(Number.isFinite(noRoof.roofCapacityKw)).toBe(true);
    expect(JSON.stringify(noRoof)).not.toMatch(/NaN|Infinity/);
  });
  it("accepts sensible inclusive roof and consumption boundaries", () => {
    expect(validatePlannerStep({ ...DEMO_PLAN, roofWidthM: 2, roofLengthM: 100 }, 1)).toHaveLength(0);
    expect(validatePlannerStep({ ...DEMO_PLAN, monthlyConsumptionKwh: 1 }, 2)).toHaveLength(0);
    expect(validatePlannerStep({ ...DEMO_PLAN, monthlyConsumptionKwh: 30000 }, 2)).toHaveLength(0);
  });
  it("estimates only a disclosed average-load battery runtime and keeps it outside savings", () => {
    const noBattery = calculateSolarPlan({ ...DEMO_PLAN, batteryCapacityKwh: 0 });
    const withBattery = calculateSolarPlan({ ...DEMO_PLAN, batteryCapacityKwh: 5 });
    expect(withBattery.battery.usableCapacityKwh).toBeCloseTo(4.25);
    expect(withBattery.battery.assumedAverageLoadKw).toBeCloseTo(850 * 12 / 365 / 24, 8);
    expect(withBattery.battery.estimatedHoursAtAverageLoad).toBeCloseTo(3.65, 1);
    expect(withBattery.estimate.annualSavings).toBe(noBattery.estimate.annualSavings);
    expect(withBattery.estimate.installationCostRangeUsd.expected).toBe(noBattery.estimate.installationCostRangeUsd.expected);
    expect(estimatePlannerBattery(0, 10).estimatedHoursAtAverageLoad).toBeNull();
    expect(estimatePlannerBattery(850, 7).nominalCapacityKwh).toBe(0);
  });
});
