"use client";
import { useEffect, useState } from "react";
import { ComparisonExperience } from "@/components/solar/comparison-experience";
import { PageLoading } from "@/components/ui/page-loading";
import { validateInputs, type SolarInputs } from "@/lib/solar";

type Handoff = { inputs: SolarInputs; name: string; sourceLabel: string; tariffWasAssumed: boolean };
function isHandoff(value: unknown): value is Handoff {
  if (!value || typeof value !== "object" || !("inputs" in value) || !("name" in value)) return false;
  const inputs = (value as { inputs: Record<string, unknown> }).inputs;
  const fields = ["monthlyBill", "utilityRate", "sunHours", "systemCost", "incentiveRate", "electricityEscalation", "targetAnnualOffsetRate", "exportCompensationRate", "roofAreaSqFt", "usableRoofPercent", "orientationFactor", "shadingFactor"];
  const record = value as { name: unknown; sourceLabel?: unknown; tariffWasAssumed?: unknown };
  return fields.every(field => typeof inputs?.[field] === "number" && Number.isFinite(inputs[field] as number)) && validateInputs(inputs as SolarInputs).length === 0 && typeof record.name === "string" && (record.sourceLabel === undefined || typeof record.sourceLabel === "string") && (record.tariffWasAssumed === undefined || typeof record.tariffWasAssumed === "boolean");
}

export function ComparisonEntry() {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("solarsmart-comparison-base");
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isHandoff(parsed)) { setHandoff(parsed); window.sessionStorage.removeItem("solarsmart-comparison-base"); }
      }
    } catch { /* A malformed local handoff safely falls back to the built-in demo. */ }
    setReady(true);
  }, []);
  return ready ? <ComparisonExperience baseInputs={handoff?.inputs} baseName={handoff?.name} baseSourceLabel={handoff?.sourceLabel ?? "Built-in illustrative demo values"} tariffWasAssumed={handoff?.tariffWasAssumed ?? true}/> : <PageLoading kind="comparison"/>;
}
