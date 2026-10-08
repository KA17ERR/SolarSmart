import { describe, expect, it } from "vitest";
import { buildSavingsChartData, buildScenarioChartData } from "./dashboard-model";
import { calculateSolar, DEFAULT_INPUTS } from "./solar";
import { DEMO_SCENARIOS } from "./scenarios";
import { buildRecommendations } from "./recommendations";

describe("dashboard result view models", () => {
  it("keeps savings chart values tied to the engine projection", () => {
    const base = calculateSolar(DEFAULT_INPUTS);
    const chart = buildSavingsChartData(base, 3);
    expect(chart).toHaveLength(3);
    expect(chart[0]).toEqual({ year: "Year 1", solar: base.annualProjection[0].totalSavingsUsd, utility: base.annualProjection[0].remainingBillUsd });
    const changed = calculateSolar({ ...DEFAULT_INPUTS, exportCompensationRate: 0.08 });
    expect(buildSavingsChartData(changed)[0].solar).toBeGreaterThan(chart[0].solar);
  });

  it("compares small, medium, and heavily shaded scenarios from the engine", () => {
    expect(DEMO_SCENARIOS.map(item => item.name)).toEqual(["Small roof", "Medium roof", "Highly shaded roof"]);
    const points = buildScenarioChartData();
    expect(points).toHaveLength(3);
    expect(points.every(point => Number.isFinite(point.systemKw) && Number.isFinite(point.annualSavings))).toBe(true);
    expect(points[0].systemKw).toBeLessThan(points[1].systemKw);
    expect(points[2].annualSavings).toBeLessThan(points[1].annualSavings);
  });

  it("changes deterministic next steps when roof, shade, or tariff inputs change", () => {
    const baseResult = calculateSolar(DEFAULT_INPUTS);
    const roofResult = calculateSolar({ ...DEFAULT_INPUTS, roofAreaSqFt: 240 });
    const shadeInputs = { ...DEFAULT_INPUTS, shadingFactor: 0.45 };
    const shadeResult = calculateSolar(shadeInputs);
    expect(buildRecommendations(DEFAULT_INPUTS, baseResult).some(item => item.title === "Confirm usable roof measurements")).toBe(false);
    expect(buildRecommendations({ ...DEFAULT_INPUTS, roofAreaSqFt: 240 }, roofResult).some(item => item.title === "Confirm usable roof measurements")).toBe(true);
    expect(buildRecommendations(shadeInputs, shadeResult).some(item => item.title === "Get a shade assessment")).toBe(true);
  });
});
