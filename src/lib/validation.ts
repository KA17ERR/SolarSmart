import { validateInputs as validateSolarInputs, type SolarInputs } from "./solar";

/** Returns plain-language validation messages for the assumptions form. */
export function validateInputs(input: SolarInputs): string[] {
  return validateSolarInputs(input);
}
