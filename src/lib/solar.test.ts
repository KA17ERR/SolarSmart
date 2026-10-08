import { describe, expect, it } from "vitest";
import { calculateSolar, DEFAULT_INPUTS, estimateSolar, validateInputs } from "./solar";
import { DEMO_SCENARIOS } from "./scenarios";
import { buildEstimateReport } from "./report";
import { buildFallbackExplanation } from "./ai/fallback";
import { toExplanationPayload } from "./services/explanation-client";

describe("deterministic solar calculation engine", () => {
  it("matches a hand-checkable demonstration calculation", () => {
    const result = calculateSolar(DEFAULT_INPUTS);
    const annualYieldPerKw = 5.2 * 365 * 0.8 * 0.9 * 0.95;
    const capacity = 14400 * 0.82 / annualYieldPerKw;
    expect(result.annualConsumptionKwh).toBe(14400);
    expect(result.systemKw).toBeCloseTo(capacity, 10);
    expect(result.annualProductionKwh).toBeCloseTo(capacity * annualYieldPerKw, 8);
    expect(result.annualSelfConsumedKwh).toBeCloseTo(result.annualProductionKwh * 0.75, 8);
    expect(result.annualExportedKwh).toBeCloseTo(result.annualProductionKwh * 0.25, 8);
    expect(result.annualSavings).toBeCloseTo(result.annualSelfConsumedKwh * 0.15, 8);
    expect(result.co2AvoidedKg).toBeCloseTo(result.annualProductionKwh * 0.385, 8);
    expect(result.installationCostRangeUsd.low).toBeCloseTo(10880, 8);
    expect(result.installationCostRangeUsd.expected).toBe(12800);
    expect(result.installationCostRangeUsd.high).toBeCloseTo(14720, 8);
    expect(result.annualProjection).toHaveLength(25);
    const aiFacts = toExplanationPayload(result);
    expect(aiFacts.annualSavings).toBe(result.annualSavings);
    expect("annualProjection" in aiFacts).toBe(false);
  });

  it("is deterministic and larger consumption increases the requested system", () => {
    expect(calculateSolar(DEFAULT_INPUTS)).toEqual(calculateSolar(DEFAULT_INPUTS));
    expect(calculateSolar({ ...DEFAULT_INPUTS, monthlyBill: 360 }).systemKw).toBeGreaterThan(calculateSolar(DEFAULT_INPUTS).systemKw);
  });

  it("models export compensation separately from retail savings", () => {
    const noExportPay = calculateSolar(DEFAULT_INPUTS);
    const paidExport = calculateSolar({ ...DEFAULT_INPUTS, exportCompensationRate: 0.05 });
    expect(paidExport.annualRetailSavingsUsd).toBeCloseTo(noExportPay.annualRetailSavingsUsd, 9);
    expect(paidExport.annualExportRevenueUsd).toBeCloseTo(paidExport.annualExportedKwh * 0.05, 9);
    expect(paidExport.annualSavings).toBeGreaterThan(noExportPay.annualSavings);
  });

  it("keeps unusual high tariffs calculable but warns that savings are highly rate-sensitive", () => {
    const result = calculateSolar({ ...DEFAULT_INPUTS, utilityRate: 90 });
    expect(result.annualSavings).toBeGreaterThan(0);
    expect(result.warnings.some(warning => warning.code === "high-retail-tariff")).toBe(true);
    expect(calculateSolar({ ...DEFAULT_INPUTS, utilityRate: 5 }).warnings.some(warning => warning.code === "high-retail-tariff")).toBe(false);
  });

  it("validates zero tariff, impossible values, NaN, and supported boundaries", () => {
    expect(validateInputs({ ...DEFAULT_INPUTS, utilityRate: 0 })).toContain("Utility rate must be between 0.001 and 1,000 per kWh.");
    expect(validateInputs({ ...DEFAULT_INPUTS, monthlyBill: Number.NaN }).length).toBeGreaterThan(0);
    expect(validateInputs({ ...DEFAULT_INPUTS, roofAreaSqFt: 1_000_001 }).length).toBeGreaterThan(0);
    expect(validateInputs({ ...DEFAULT_INPUTS, roofAreaSqFt: 0, usableRoofPercent: 0, systemCost: 0 }).length).toBe(0);
    expect(() => calculateSolar({ ...DEFAULT_INPUTS, systemCost: -1 })).toThrow(/System cost/);
  });

  it("handles a zero bill and zero roof without division by zero", () => {
    const zeroBill = calculateSolar({ ...DEFAULT_INPUTS, monthlyBill: 0 });
    expect(zeroBill.systemKw).toBe(0);
    expect(zeroBill.annualSavings).toBe(0);
    expect(zeroBill.paybackYears).toBeNull();
    expect(zeroBill.warnings.some(warning => warning.code === "zero-consumption")).toBe(true);
    const zeroRoof = calculateSolar({ ...DEFAULT_INPUTS, usableRoofPercent: 0 });
    expect(zeroRoof.systemKw).toBe(0);
    expect(zeroRoof.roofLimited).toBe(true);
    expect(zeroRoof.paybackYears).toBeNull();
  });

  it("returns useful partial output and warnings when inputs are missing", () => {
    const partial = estimateSolar({ roofAreaSqFt: 600, usableRoofPercent: 70 });
    expect(partial.status).toBe("partial");
    expect(partial.roofCapacityKw).toBe(7);
    expect(partial.annualSavings).toBeNull();
    expect(partial.warnings.some(warning => warning.code === "missing-inputs")).toBe(true);
  });

  it("returns errors, never non-finite values, for invalid partial input", () => {
    const invalid = estimateSolar({ ...DEFAULT_INPUTS, utilityRate: 0 });
    expect(invalid.status).toBe("invalid");
    expect(invalid.errors.length).toBeGreaterThan(0);
    expect(() => calculateSolar({ ...DEFAULT_INPUTS, utilityRate: 0 })).toThrow();
  });

  it("handles zero installation cost and rejects invalid configurable assumptions", () => {
    const freeSystem = calculateSolar({ ...DEFAULT_INPUTS, systemCost: 0 });
    expect(freeSystem.paybackYears).toBe(0);
    expect(Number.isFinite(freeSystem.paybackYears)).toBe(true);
    const invalidAssumptions = estimateSolar(DEFAULT_INPUTS, { physicalSelfConsumptionRate: 2 });
    expect(invalidAssumptions.status).toBe("invalid");
    expect(invalidAssumptions.errors.some(issue => issue.field === "assumptions.physicalSelfConsumptionRate")).toBe(true);
  });

  it("converts square metres consistently in the assessment adapter", async () => {
    const { DEMO_ASSESSMENT_DRAFT, prepareAssessment } = await import("./assessment");
    const sqftInput = prepareAssessment({ ...DEMO_ASSESSMENT_DRAFT, usableRoofArea: "100", areaUnit: "sq-ft" });
    const sqmInput = prepareAssessment({ ...DEMO_ASSESSMENT_DRAFT, usableRoofArea: String(100 / 10.7639), areaUnit: "sq-m" });
    expect(sqmInput.solarInputs.roofAreaSqFt).toBeCloseTo(sqftInput.solarInputs.roofAreaSqFt, 8);
  });

  it("reduces generation for shading and flags very heavy modeled shade", () => {
    const normal = calculateSolar(DEFAULT_INPUTS);
    const shade = calculateSolar({ ...DEFAULT_INPUTS, shadingFactor: 0.2 });
    expect(shade.annualProductionKwh).toBeLessThan(normal.annualProductionKwh);
    expect(shade.warnings.some(warning => warning.code === "extreme-shading")).toBe(true);
    const noYield = calculateSolar({ ...DEFAULT_INPUTS, shadingFactor: 0 });
    expect(noYield.systemKw).toBe(0);
    expect(noYield.roofLimited).toBe(false);
    expect(noYield.warnings.some(warning => warning.code === "zero-modeled-yield")).toBe(true);
  });

  it("caps capacity to roof area and reports the constraint", () => {
    const estimate = calculateSolar({ ...DEFAULT_INPUTS, roofAreaSqFt: 240 });
    expect(estimate.roofLimited).toBe(true);
    expect(estimate.systemKw).toBe(2.8);
  });

  it("keeps extreme valid calculations finite and leaves long payback unavailable", () => {
    const estimate = calculateSolar({ ...DEFAULT_INPUTS, monthlyBill: 100000, utilityRate: 0.001, roofAreaSqFt: 1000000, usableRoofPercent: 100, systemCost: 100000000 });
    const visit = (value: unknown): boolean => typeof value === "number" ? Number.isFinite(value) : Array.isArray(value) ? value.every(visit) : typeof value === "object" && value !== null ? Object.values(value).every(visit) : true;
    expect(visit(estimate)).toBe(true);
    expect(estimate.paybackYears).toBeNull();
  });

  it("provides distinct valid sample scenarios and report/fallback output", () => {
    expect(DEMO_SCENARIOS).toHaveLength(3);
    expect(DEMO_SCENARIOS.every(scenario => validateInputs(scenario.inputs).length === 0)).toBe(true);
    expect(new Set(DEMO_SCENARIOS.map(scenario => calculateSolar(scenario.inputs).systemKw)).size).toBe(3);
    const result = calculateSolar(DEFAULT_INPUTS);
    const report = buildEstimateReport(DEFAULT_INPUTS, result, "Balanced demo");
    expect(report).toContain("Balanced demo");
    expect(report).toContain("Utility rate assumption");
    expect(report).toContain("not an engineering assessment");
    expect(buildFallbackExplanation(DEFAULT_INPUTS, result)).toContain("used on site");
  });
});
