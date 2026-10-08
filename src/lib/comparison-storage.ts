import type { SolarInputs } from "./solar";

/** Keeps handoff data in this browser tab only; no server persistence or external request. */
export function persistComparisonBase(inputs: SolarInputs, name = "Base assessment", sourceLabel = "Assessment values", tariffWasAssumed = false) {
  if (typeof window !== "undefined") window.sessionStorage.setItem("solarsmart-comparison-base", JSON.stringify({ inputs, name, sourceLabel, tariffWasAssumed }));
}
