"use client";
import { useMemo, useState } from "react";
import { calculateSolar, DEFAULT_INPUTS, validateInputs, type SolarInputs } from "@/lib/solar";

export function useAssessment(initialInputs: SolarInputs = DEFAULT_INPUTS) {
  const [inputs, setInputs] = useState<SolarInputs>(initialInputs);
  const validationErrors = useMemo(() => validateInputs(inputs), [inputs]);
  const isValid = validationErrors.length === 0;
  // Keep the page usable while a partially typed/invalid form value is being corrected.
  const modelInputs = isValid ? inputs : DEFAULT_INPUTS;
  const result = useMemo(() => calculateSolar(modelInputs), [modelInputs]);
  function updateField(field: keyof SolarInputs, value: string) {
    const parsed = value.trim() ? Number(value) : Number.NaN;
    setInputs(current => ({ ...current, [field]: Number.isFinite(parsed) ? parsed : Number.NaN }));
  }
  function applyInputs(next: SolarInputs) { setInputs(next); }
  function validate() { return isValid; }
  function reset() { setInputs(DEFAULT_INPUTS); }
  return { inputs, modelInputs, result, errors: validationErrors, isValid, updateField, applyInputs, validate, reset };
}
