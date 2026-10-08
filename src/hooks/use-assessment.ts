"use client";
import { useMemo, useState } from "react";
import { calculateSolar, DEFAULT_INPUTS, validateInputs, type SolarInputs } from "@/lib/solar";

export function useAssessment() {
  const [inputs, setInputs] = useState<SolarInputs>(DEFAULT_INPUTS);
  const [errors, setErrors] = useState<string[]>([]);
  const validationErrors = useMemo(() => validateInputs(inputs), [inputs]);
  // Keep the page usable while a partially typed/invalid form value is being corrected.
  const result = useMemo(() => calculateSolar(validationErrors.length ? DEFAULT_INPUTS : inputs), [inputs, validationErrors]);
  function updateField(field: keyof SolarInputs, value: string) {
    const parsed = Number(value);
    setInputs(current => ({ ...current, [field]: Number.isFinite(parsed) ? parsed : 0 }));
    setErrors([]);
  }
  function applyInputs(next: SolarInputs) { setInputs(next); setErrors([]); }
  function validate() { const nextErrors = validateInputs(inputs); setErrors(nextErrors); return nextErrors.length === 0; }
  function reset() { setInputs(DEFAULT_INPUTS); setErrors([]); }
  return { inputs, result, errors, updateField, applyInputs, validate, reset };
}
