import { describe, expect, it } from "vitest";
import { calculateSolar, DEFAULT_INPUTS } from "./solar";
import { buildEstimateCsv, buildEstimateReportData } from "./report";

const inputs = { ...DEFAULT_INPUTS };
const result = calculateSolar(inputs);
const data = { generatedAt: new Date("2026-10-09T00:00:00Z"), scenarioName: "Sample roof", inputs, result, recommendations: [{ title: "Check shade", detail: "Tree cover is not verified." }] };

describe("estimate report generation", () => {
  it("includes a dated estimate, engine results, assumptions, limitations and next steps", () => {
    const report = buildEstimateReportData(data);
    expect(report).toContain("October 9, 2026");
    expect(report).toContain(`${result.systemKw.toFixed(1)} kW`);
    expect(report).toContain(`${Math.round(result.annualProductionKwh).toLocaleString()} kWh`);
    expect(report).toContain("not an installer quotation, engineering certification");
    expect(report).toContain("0.385 kg CO₂/kWh (generic illustrative factor; not location-specific)");
    expect(report).toContain("Check shade: Tree cover is not verified.");
    expect(report).toContain("Actual production and costs depend on roof condition and geometry");
  });
  it("exports structured CSV values and leaves unavailable payback blank", () => {
    const csv = buildEstimateCsv(data);
    expect(csv).toContain('"system_capacity","' + result.systemKw + '","kW"');
    expect(csv).toContain("year_1_cumulative_net_savings");
    expect(csv).toContain('"payback","' + (result.paybackYears ?? "") + '","years"');
  });
  it("quotes and neutralizes spreadsheet formulas in scenario labels", () => {
    const csv = buildEstimateCsv({ ...data, scenarioName: "=IMPORTDATA(1)" });
    expect(csv).toContain("'=IMPORTDATA(1)");
  });
});
