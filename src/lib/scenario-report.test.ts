import { describe, expect, it } from "vitest";
import { calculateSolar, DEFAULT_INPUTS } from "./solar";
import { buildScenarioReportHtml, scenarioReportFilename } from "./scenario-report";

describe("standalone scenario report", () => {
  it("includes the selected scenario data, comparison charts, printable layout, and true inputs", () => {
    const inputs = { ...DEFAULT_INPUTS, roofAreaSqFt: 1_300, annualConsumptionKwh: 12_000 };
    const result = calculateSolar(inputs);
    const baseResult = calculateSolar(DEFAULT_INPUTS);
    const html = buildScenarioReportHtml({
      generatedAt: new Date("2026-10-11T00:00:00Z"), scenarioName: "Larger roof", scenarioDescription: "User-edited assumptions",
      sourceLabel: "Editable what-if scenario", changedFields: ["roofAreaSqFt"], inputs, result, baseName: "Base assessment", baseResult,
    });

    expect(html).toContain("Scenario report: Larger roof");
    expect(html).toContain("October 11, 2026");
    expect(html).toContain(`${result.systemKw.toFixed(2)} kW`);
    expect(html).toContain("Annual generation comparison");
    expect(html).toContain("Annual electricity consumption comparison");
    expect(html).toContain("Estimated first-year savings comparison");
    expect(html.match(/<svg /g)).toHaveLength(4);
    expect(html).toContain("window.print()");
    expect(html).toContain("@page{size:A4 portrait;margin:14mm}");
    expect(html).toContain("roofAreaSqFt");
  });

  it("keeps reports scenario-specific and escapes user-controlled labels", () => {
    const firstInputs = { ...DEFAULT_INPUTS, shadingFactor: 0.35 };
    const secondInputs = { ...DEFAULT_INPUTS, shadingFactor: 0.9 };
    const baseResult = calculateSolar(DEFAULT_INPUTS);
    const first = buildScenarioReportHtml({ generatedAt: new Date("2026-10-11T00:00:00Z"), scenarioName: "Shade <script>alert(1)</script>", scenarioDescription: "Sample & edited", sourceLabel: "Sample", changedFields: ["shadingFactor"], inputs: firstInputs, result: calculateSolar(firstInputs), baseName: "Base", baseResult });
    const second = buildScenarioReportHtml({ generatedAt: new Date("2026-10-11T00:00:00Z"), scenarioName: "Clearer roof", scenarioDescription: "Sample", sourceLabel: "Sample", changedFields: ["shadingFactor"], inputs: secondInputs, result: calculateSolar(secondInputs), baseName: "Base", baseResult });

    expect(first).toContain("Shade &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(first).not.toContain("<script>alert(1)</script>");
    expect(first).not.toEqual(second);
    expect(scenarioReportFilename("Lower retail tariff! ")).toBe("solarsmart-lower-retail-tariff-report.html");
  });
});
