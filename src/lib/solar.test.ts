import { describe, expect, it } from "vitest";
import { calculateSolar, DEFAULT_INPUTS, validateInputs } from "./solar";
import { DEMO_SCENARIOS } from "./scenarios";
import { buildEstimateReport } from "./report";
describe("solar calculation", () => {
  it("returns stable, transparent results for the demo assumptions", () => {
    expect(calculateSolar(DEFAULT_INPUTS)).toEqual({ systemKw: 9.1, roofCapacityKw: 9.9, roofLimited: false, annualProductionKwh: 11814, annualSavings: 1771, netCost: 12800, paybackYears: 7.2, twentyFiveYearSavings: 51769, monthlySavings: 148, co2AvoidedKg: 4548 });
  });
  it("is deterministic and responds to bill size", () => {
    expect(calculateSolar(DEFAULT_INPUTS)).toEqual(calculateSolar(DEFAULT_INPUTS));
    expect(calculateSolar({ ...DEFAULT_INPUTS, monthlyBill: 360 }).systemKw).toBeGreaterThan(calculateSolar(DEFAULT_INPUTS).systemKw);
  });
  it("rejects invalid input instead of making up a result", () => {
    expect(validateInputs({ ...DEFAULT_INPUTS, sunHours: 16 })).toHaveLength(1);
    expect(validateInputs({ ...DEFAULT_INPUTS, utilityRate: 0 })).toHaveLength(1);
    expect(() => calculateSolar({ ...DEFAULT_INPUTS, systemCost: -1 })).toThrow(/System cost/);
  });
  it("handles zero savings without division errors", () => {
    expect(calculateSolar({ ...DEFAULT_INPUTS, monthlyBill: 0 }).paybackYears).toBe(0);
  });
  it("caps modeled generation and savings when the roof is too small", () => {
    const estimate = calculateSolar({ ...DEFAULT_INPUTS, roofAreaSqFt: 240 });
    expect(estimate.roofLimited).toBe(true);
    expect(estimate.systemKw).toBe(2.8);
    expect(estimate.annualSavings).toBeLessThan(calculateSolar(DEFAULT_INPUTS).annualSavings);
  });
  it("reduces generation for poorer orientation and shade assumptions", () => {
    const clearRoof = calculateSolar(DEFAULT_INPUTS);
    const shadedRoof = calculateSolar({ ...DEFAULT_INPUTS, orientationFactor: 0.6, shadingFactor: 0.7 });
    expect(shadedRoof.annualProductionKwh).toBeLessThan(clearRoof.annualProductionKwh);
    expect(shadedRoof.annualSavings).toBeLessThan(clearRoof.annualSavings);
  });
  it("provides distinct, valid built-in sample scenarios", () => {
    expect(DEMO_SCENARIOS).toHaveLength(3);
    expect(DEMO_SCENARIOS.every(scenario => validateInputs(scenario.inputs).length === 0)).toBe(true);
    expect(new Set(DEMO_SCENARIOS.map(scenario => calculateSolar(scenario.inputs).systemKw)).size).toBe(3);
  });
  it("generates a local report with assumptions and no approval claims", () => {
    const report = buildEstimateReport(DEFAULT_INPUTS, calculateSolar(DEFAULT_INPUTS), "Balanced demo");
    expect(report).toContain("Balanced demo");
    expect(report).toContain("Utility rate assumption");
    expect(report).toContain("not an engineering assessment");
  });
});
