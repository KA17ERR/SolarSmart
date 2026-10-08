import { calculateSolar, type SolarResults } from "./solar";
import { DEMO_SCENARIOS, type DemoScenario } from "./scenarios";

export type SavingsChartPoint = { year: string; solar: number; utility: number };
export type ScenarioChartPoint = { name: string; systemKw: number; annualSavings: number };

/** Chart series are projections from the calculation engine, not UI-side formulas. */
export function buildSavingsChartData(result: SolarResults, yearCount = 6): SavingsChartPoint[] {
  return result.annualProjection.slice(0, yearCount).map(row => ({
    year: `Year ${row.year}`,
    solar: row.totalSavingsUsd,
    utility: row.remainingBillUsd,
  }));
}

/** Computes the scenario chart from the same calculator used by the dashboard metrics. */
export function buildScenarioChartData(scenarios: DemoScenario[] = DEMO_SCENARIOS): ScenarioChartPoint[] {
  return scenarios.map(scenario => {
    const result = calculateSolar(scenario.inputs);
    return { name: scenario.name, systemKw: result.systemKw, annualSavings: result.annualSavings };
  });
}
