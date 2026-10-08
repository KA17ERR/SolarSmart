import type { SolarInputs, SolarResults } from "@/lib/solar";
import type { Recommendation } from "@/lib/recommendations";

export type AssistantScenarioSummary = {
  name: string;
  source: "current assessment" | "illustrative demo";
  systemKw: number;
  annualGenerationKwh: number;
  annualSavingsUsd: number;
  installationCostLowUsd: number;
  installationCostHighUsd: number;
  paybackYears: number | null;
};

export type AssistantAssessmentSummary = {
  scenarioName: string;
  inputs: Pick<SolarInputs, "monthlyBill" | "annualConsumptionKwh" | "utilityRate" | "sunHours" | "systemCost" | "incentiveRate" | "electricityEscalation" | "targetAnnualOffsetRate" | "exportCompensationRate" | "roofAreaSqFt" | "usableRoofPercent" | "orientationFactor" | "shadingFactor">;
  outputs: {
    systemKw: number;
    roofCapacityKw: number;
    roofLimited: boolean;
    annualProductionKwh: number;
    annualConsumptionKwh: number;
    annualSelfConsumedKwh: number;
    annualExportedKwh: number;
    annualSavingsUsd: number;
    annualRetailSavingsUsd: number;
    annualExportRevenueUsd: number;
    installationCostLowUsd: number;
    installationCostExpectedUsd: number;
    installationCostHighUsd: number;
    paybackYears: number | null;
    projectionHorizonYears: number;
    co2AvoidedKg: number;
    gridEmissionsKgCo2PerKwh: number;
    physicalSelfConsumptionRate: number;
  };
  warnings: string[];
  limitations: string[];
  recommendations: Array<Pick<Recommendation, "title" | "detail">>;
  scenarios: AssistantScenarioSummary[];
};

export type AssistantRequest = { schemaVersion: "1.0"; question: string; assessment: AssistantAssessmentSummary };
export type AssistantMode = "local" | "strands";
export type AssistantReply = {
  schemaVersion: "1.0";
  mode: AssistantMode;
  status: string;
  narrative: string;
  facts: string[];
  assumptions: string[];
  unknowns: string[];
  nextSteps: string[];
};

const finiteBetween = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const text = (value: unknown, max = 500): value is string => typeof value === "string" && value.length <= max;
const textList = (value: unknown, maxItems = 12): value is string[] => Array.isArray(value) && value.length <= maxItems && value.every(item => text(item, 700));
const nullableFinite = (value: unknown, min = 0, max = 1_000_000_000): value is number | null => value === null || finiteBetween(value, min, max);
const onlyKeys = (value: object, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));

/** Builds a minimal, location-free summary from the validated UI assessment and engine output. */
export function createAssistantRequest(args: {
  inputs: SolarInputs;
  result: SolarResults;
  question: string;
  scenarioName: string;
  recommendations: Recommendation[];
  scenarios?: AssistantScenarioSummary[];
}): AssistantRequest {
  const { inputs, result } = args;
  return {
    schemaVersion: "1.0",
    question: args.question.trim().slice(0, 1000),
    assessment: {
      scenarioName: args.scenarioName.slice(0, 80),
      inputs: {
        monthlyBill: inputs.monthlyBill,
        ...(inputs.annualConsumptionKwh === undefined ? {} : { annualConsumptionKwh: inputs.annualConsumptionKwh }),
        utilityRate: inputs.utilityRate,
        sunHours: inputs.sunHours,
        systemCost: inputs.systemCost,
        incentiveRate: inputs.incentiveRate,
        electricityEscalation: inputs.electricityEscalation,
        targetAnnualOffsetRate: inputs.targetAnnualOffsetRate,
        exportCompensationRate: inputs.exportCompensationRate,
        roofAreaSqFt: inputs.roofAreaSqFt,
        usableRoofPercent: inputs.usableRoofPercent,
        orientationFactor: inputs.orientationFactor,
        shadingFactor: inputs.shadingFactor,
      },
      outputs: {
        systemKw: result.systemKw, roofCapacityKw: result.roofCapacityKw, roofLimited: result.roofLimited,
        annualProductionKwh: result.annualProductionKwh, annualConsumptionKwh: result.annualConsumptionKwh,
        annualSelfConsumedKwh: result.annualSelfConsumedKwh, annualExportedKwh: result.annualExportedKwh,
        annualSavingsUsd: result.annualSavings, annualRetailSavingsUsd: result.annualRetailSavingsUsd,
        annualExportRevenueUsd: result.annualExportRevenueUsd,
        installationCostLowUsd: result.installationCostRangeUsd.low,
        installationCostExpectedUsd: result.installationCostRangeUsd.expected,
        installationCostHighUsd: result.installationCostRangeUsd.high,
        paybackYears: result.paybackYears, projectionHorizonYears: result.projectionHorizonYears,
        co2AvoidedKg: result.co2AvoidedKg,
        gridEmissionsKgCo2PerKwh: result.assumptions.gridEmissionsKgCo2PerKwh,
        physicalSelfConsumptionRate: result.assumptions.physicalSelfConsumptionRate,
      },
      warnings: result.warnings.map(item => item.message),
      limitations: result.limitations.map(item => item.message),
      recommendations: args.recommendations.slice(0, 8).map(({ title, detail }) => ({ title, detail })),
      scenarios: (args.scenarios ?? []).slice(0, 6),
    },
  };
}

export function isAssistantRequest(value: unknown): value is AssistantRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Partial<AssistantRequest>;
  const a = request.assessment;
  if (Object.keys(value).some(key => !["schemaVersion", "question", "assessment"].includes(key)) || request.schemaVersion !== "1.0" || !text(request.question, 1000) || !request.question.trim() || !a || typeof a !== "object") return false;
  if (Object.keys(a).some(key => !["scenarioName", "inputs", "outputs", "warnings", "limitations", "recommendations", "scenarios"].includes(key))) return false;
  const i = a.inputs as Record<string, unknown> | undefined;
  const o = a.outputs as Record<string, unknown> | undefined;
  if (!i || !o || !text(a.scenarioName, 80) || !textList(a.warnings) || !textList(a.limitations) || !Array.isArray(a.recommendations) || a.recommendations.length > 8 || !Array.isArray(a.scenarios) || a.scenarios.length > 6) return false;
  const inputRanges: Record<string, [number, number]> = {
    monthlyBill: [0, 100_000], annualConsumptionKwh: [0, 1_200_000], utilityRate: [0.001, 1000], sunHours: [0.001, 12],
    systemCost: [0, 100_000_000], incentiveRate: [0, 0.9], electricityEscalation: [0, 0.2], targetAnnualOffsetRate: [0, 1], exportCompensationRate: [0, 1000], roofAreaSqFt: [0.001, 1_000_000],
    usableRoofPercent: [0, 100], orientationFactor: [0.1, 1], shadingFactor: [0, 1],
  };
  if (!Object.keys(inputRanges).filter(key => key !== "annualConsumptionKwh").every(key => key in i)
    || Object.entries(inputRanges).some(([key, [min, max]]) => i[key] !== undefined && !finiteBetween(i[key], min, max))) return false;
  const outputRanges: Record<string, [number, number]> = {
    systemKw: [0, 100_000], roofCapacityKw: [0, 100_000], annualProductionKwh: [0, 1_000_000_000], annualConsumptionKwh: [0, 1_200_000],
    annualSelfConsumedKwh: [0, 1_000_000_000], annualExportedKwh: [0, 1_000_000_000], annualSavingsUsd: [0, 1_000_000_000],
    annualRetailSavingsUsd: [0, 1_000_000_000], annualExportRevenueUsd: [0, 1_000_000_000], installationCostLowUsd: [0, 1_000_000_000],
    installationCostExpectedUsd: [0, 1_000_000_000], installationCostHighUsd: [0, 1_000_000_000], projectionHorizonYears: [1, 100],
    co2AvoidedKg: [0, 1_000_000_000], gridEmissionsKgCo2PerKwh: [0, 10], physicalSelfConsumptionRate: [0, 1],
  };
  if (!onlyKeys(i, Object.keys(inputRanges)) || !onlyKeys(o, [...Object.keys(outputRanges), "roofLimited", "paybackYears"])) return false;
  if (Object.entries(outputRanges).some(([key, [min, max]]) => !finiteBetween(o[key], min, max)) || !nullableFinite(o.paybackYears, 0, 100)) return false;
  if (typeof o.roofLimited !== "boolean") return false;
  if (!a.recommendations.every(rec => typeof rec === "object" && rec !== null && onlyKeys(rec, ["title", "detail"]) && text(rec.title, 160) && text(rec.detail, 700))) return false;
  return a.scenarios.every(s => typeof s === "object" && s !== null && onlyKeys(s, ["name", "source", "systemKw", "annualGenerationKwh", "annualSavingsUsd", "installationCostLowUsd", "installationCostHighUsd", "paybackYears"]) && text(s.name, 100) && (s.source === "current assessment" || s.source === "illustrative demo")
    && finiteBetween(s.systemKw, 0, 100_000) && finiteBetween(s.annualGenerationKwh, 0, 1_000_000_000)
    && finiteBetween(s.annualSavingsUsd, 0, 1_000_000_000) && finiteBetween(s.installationCostLowUsd, 0, 1_000_000_000)
    && finiteBetween(s.installationCostHighUsd, 0, 1_000_000_000) && nullableFinite(s.paybackYears, 0, 100));
}

export function isAssistantReply(value: unknown): value is AssistantReply {
  if (typeof value !== "object" || value === null) return false;
  const reply = value as Partial<AssistantReply>;
  return onlyKeys(value, ["schemaVersion", "mode", "status", "narrative", "facts", "assumptions", "unknowns", "nextSteps"])
    && reply.schemaVersion === "1.0" && (reply.mode === "local" || reply.mode === "strands")
    && text(reply.status, 180) && text(reply.narrative, 1400) && !/\d/.test(reply.narrative)
    && textList(reply.facts) && textList(reply.assumptions) && textList(reply.unknowns) && textList(reply.nextSteps);
}
