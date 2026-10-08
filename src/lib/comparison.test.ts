import { describe, expect, it } from "vitest";
import { calculateSolar, DEFAULT_INPUTS } from "./solar";
import { createDefaultAlternatives, createScenario, duplicateScenario, evaluateScenario, formatMetric, renameScenario, updateScenarioAssumption, updateScenarioInput } from "./comparison";

describe("scenario comparison", () => {
  it("uses the shared calculator and reports absolute and relative differences", () => {
    const scenario = createScenario("More shade", { ...DEFAULT_INPUTS, shadingFactor: 0.5 });
    const evaluation = evaluateScenario(DEFAULT_INPUTS, scenario);
    const expected = calculateSolar(scenario.inputs);
    expect(evaluation.result?.systemKw).toBe(expected.systemKw);
    const generation = evaluation.metrics.find(metric => metric.key === "annualProductionKwh")!;
    expect(generation.difference).toBeCloseTo(expected.annualProductionKwh - calculateSolar(DEFAULT_INPUTS).annualProductionKwh);
    expect(generation.percentDifference).toBeCloseTo(generation.difference! / generation.base! * 100);
    expect(evaluation.scenario.changedFields).toContain("shadingFactor");
  });
  it("holds baseline annual kWh constant when a tariff scenario changes the price", () => {
    const tariff = createDefaultAlternatives(DEFAULT_INPUTS)[2];
    const evaluation = evaluateScenario(DEFAULT_INPUTS, tariff);
    expect(tariff.inputs.annualConsumptionKwh).toBeCloseTo(DEFAULT_INPUTS.monthlyBill * 12 / DEFAULT_INPUTS.utilityRate);
    expect(tariff.inputs.monthlyBill).toBeCloseTo(tariff.inputs.annualConsumptionKwh! * tariff.inputs.utilityRate / 12);
    expect(evaluation.scenario.changedFields).toEqual(["utilityRate"]);
    expect(evaluation.result?.annualConsumptionKwh).toBeCloseTo(calculateSolar(DEFAULT_INPUTS).annualConsumptionKwh);
    expect(evaluation.result?.annualSavings).toBeLessThan(calculateSolar(DEFAULT_INPUTS).annualSavings);
  });
  it("does not invent a percentage delta when the base is zero or a metric is unavailable", () => {
    const zeroBase = { ...DEFAULT_INPUTS, monthlyBill: 0 };
    const scenario = createScenario("No bill", zeroBase);
    const result = evaluateScenario(zeroBase, scenario);
    expect(result.metrics.find(item => item.key === "annualSavings")?.base).toBe(0);
    expect(result.metrics.find(item => item.key === "annualSavings")?.percentDifference).toBeNull();
    const unpayable = createScenario("No spend", { ...DEFAULT_INPUTS, systemCost: 100_000_000 });
    expect(evaluateScenario(DEFAULT_INPUTS, unpayable).metrics.find(item => item.key === "paybackYears")?.alternative).toBeNull();
  });
  it("normalizes floating-point noise so equivalent estimates never display negative zero", () => {
    const scenario = createScenario("Equivalent", { ...DEFAULT_INPUTS, shadingFactor: DEFAULT_INPUTS.shadingFactor + 1e-13 });
    const evaluation = evaluateScenario(DEFAULT_INPUTS, scenario);
    expect(evaluation.metrics.filter(metric => metric.base !== null && metric.alternative !== null).every(metric => metric.difference !== null && Object.is(metric.difference, -0) === false)).toBe(true);
    expect(evaluation.metrics.find(metric => metric.key === "annualProductionKwh")?.difference).toBe(0);
    expect(evaluation.metrics.find(metric => metric.key === "annualSavings")?.difference).toBe(0);
  });
  it("surfaces invalid scenario inputs rather than throwing or displaying old numbers", () => {
    const invalid = createScenario("Bad shade", { ...DEFAULT_INPUTS, shadingFactor: 2 });
    const evaluation = evaluateScenario(DEFAULT_INPUTS, invalid);
    expect(evaluation.result).toBeNull();
    expect(evaluation.errors[0]).toMatch(/shading factor/i);
    expect(evaluation.metrics.every(metric => metric.alternative === null && metric.difference === null)).toBe(true);
  });
  it("supports deterministic sample variants and isolated CRUD updates", () => {
    const defaults = createDefaultAlternatives(DEFAULT_INPUTS);
    expect(defaults).toHaveLength(3);
    expect(defaults.map(item => item.name)).toEqual(["More usable roof", "Reduced shade", "Lower retail tariff"]);
    const original = defaults[0];
    const copy = duplicateScenario(original, "Roof copy");
    expect(copy.id).not.toBe(original.id);
    expect(copy.inputs).toEqual(original.inputs);
    expect(renameScenario(copy, "  New name  ").name).toBe("New name");
    const changed = updateScenarioInput(original, "roofAreaSqFt", 900);
    expect(changed.inputs.roofAreaSqFt).toBe(900);
    expect(original.inputs.roofAreaSqFt).not.toBe(900);
    const custom = updateScenarioAssumption(original, "physicalSelfConsumptionRate", 0.4);
    expect(custom.assumptions.physicalSelfConsumptionRate).toBe(0.4);
    expect(evaluateScenario(DEFAULT_INPUTS, custom).scenario.changedFields).toContain("assumptions.physicalSelfConsumptionRate");
  });
  it("labels materially different multi-input scenarios and formats payback gaps safely", () => {
    const scenario = createScenario("Changed roof and shade", { ...DEFAULT_INPUTS, roofAreaSqFt: 500, shadingFactor: 0.4 });
    const evaluation = evaluateScenario(DEFAULT_INPUTS, scenario);
    expect(evaluation.recommendations.some(item => item.title === "Interpret multi-variable changes carefully")).toBe(true);
    const payback = evaluation.metrics.find(item => item.key === "paybackYears")!;
    expect(formatMetric(payback, null)).toBe("Not reached");
  });
});
