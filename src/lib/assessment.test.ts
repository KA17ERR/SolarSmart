import { describe, expect, it } from "vitest";
import { calculateSolar, DEFAULT_INPUTS } from "./solar";
import { convertAreaValue, DEMO_ASSESSMENT_DRAFT, EMPTY_ASSESSMENT_DRAFT, prepareAssessment, validateAssessmentDraft, type AssessmentDraft } from "./assessment";

describe("typed rooftop assessment", () => {
  it("keeps a fresh assessment incomplete until required details are supplied", () => {
    const errors = validateAssessmentDraft(EMPTY_ASSESSMENT_DRAFT);
    expect(errors.cityOrPostcode).toBeDefined();
    expect(errors.propertyType).toBeDefined();
    expect(errors.roofType).toBeDefined();
    expect(errors.usableRoofArea).toBeDefined();
    expect(errors.shading).toBeDefined();
    expect(errors.monthlyBill).toBeDefined();
  });

  it("converts square metres, known consumption and tariff into calculator inputs", () => {
    const draft: AssessmentDraft = { ...DEMO_ASSESSMENT_DRAFT, areaUnit: "sq-m", usableRoofArea: "100", energyInputMethod: "monthly-consumption", monthlyConsumptionKwh: "750", electricityTariff: "0.22" };
    const prepared = prepareAssessment(draft);
    expect(prepared.solarInputs.roofAreaSqFt).toBeCloseTo(1076.39);
    expect(prepared.solarInputs.monthlyBill).toBe(165);
    expect(prepared.solarInputs.utilityRate).toBe(0.22);
    expect(prepared.solarInputs.usableRoofPercent).toBe(100);
    expect(calculateSolar(prepared.solarInputs).systemKw).toBeGreaterThan(0);
    expect(prepared.context.tariffWasAssumed).toBe(false);
  });

  it("preserves physical roof area when the displayed unit changes", () => {
    const squareMetres = convertAreaValue("850", "sq-ft", "sq-m");
    expect(Number(squareMetres)).toBeCloseTo(78.967, 2);
    expect(Number(convertAreaValue(squareMetres, "sq-m", "sq-ft"))).toBeCloseTo(850, 6);
    expect(convertAreaValue("", "sq-ft", "sq-m")).toBe("");
  });

  it("allows unknown orientation and tariff with disclosed demo defaults", () => {
    const prepared = prepareAssessment({ ...DEMO_ASSESSMENT_DRAFT, orientation: "unknown", electricityTariff: "" });
    expect(prepared.solarInputs.utilityRate).toBe(DEFAULT_INPUTS.utilityRate);
    expect(prepared.solarInputs.orientationFactor).toBe(DEFAULT_INPUTS.orientationFactor);
    expect(prepared.context.tariffWasAssumed).toBe(true);
  });

  it("rejects zero or extreme area and malformed units", () => {
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, usableRoofArea: "0" }).usableRoofArea).toBeDefined();
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, usableRoofArea: "100000000" }).usableRoofArea).toBeDefined();
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, areaUnit: "acres" as AssessmentDraft["areaUnit"] }).areaUnit).toBeDefined();
  });

  it("rejects unreasonable consumption, malformed tariff and malformed budget", () => {
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, energyInputMethod: "monthly-consumption", monthlyConsumptionKwh: "0" }).monthlyConsumptionKwh).toBeDefined();
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, energyInputMethod: "monthly-consumption", monthlyConsumptionKwh: "100001" }).monthlyConsumptionKwh).toBeDefined();
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, electricityTariff: "-0.1" }).electricityTariff).toBeDefined();
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, budgetUsd: "Infinity" }).budgetUsd).toBeDefined();
    expect(validateAssessmentDraft({ ...DEMO_ASSESSMENT_DRAFT, energyInputMethod: "monthly-consumption", monthlyConsumptionKwh: "100000", electricityTariff: "1000" }).monthlyConsumptionKwh).toContain("above the model’s $100,000 limit");
  });

  it("allows a zero monthly bill and returns unavailable payback rather than a non-finite value", () => {
    const prepared = prepareAssessment({ ...DEMO_ASSESSMENT_DRAFT, monthlyBill: "0" });
    const result = calculateSolar(prepared.solarInputs);
    expect(result.annualSavings).toBe(0);
    expect(result.paybackYears).toBeNull();
    const finite = (value: unknown): boolean => typeof value === "number" ? Number.isFinite(value) : Array.isArray(value) ? value.every(finite) : typeof value === "object" && value !== null ? Object.values(value).every(finite) : true;
    expect(finite(result)).toBe(true);
  });

  it("treats the city as user-provided context and leaves default production assumptions explicit", () => {
    const prepared = prepareAssessment(DEMO_ASSESSMENT_DRAFT);
    expect(prepared.context.cityOrPostcode).toBe("Sampleville (demo)");
    expect(prepared.context.isDemoExample).toBe(true);
    expect(prepared.solarInputs.sunHours).toBe(DEFAULT_INPUTS.sunHours);
    expect(prepared.solarInputs.systemCost).toBe(DEFAULT_INPUTS.systemCost);
    const entered = prepareAssessment({ ...DEMO_ASSESSMENT_DRAFT, isDemoExample: false, cityOrPostcode: "Portland" });
    expect(entered.context.isDemoExample).toBe(false);
  });
});
