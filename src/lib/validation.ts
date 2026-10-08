import type { SolarInputs } from "./solar";

/** Returns plain-language validation messages for the assumptions form. */
export function validateInputs(input: SolarInputs): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(input.monthlyBill) || input.monthlyBill < 0 || input.monthlyBill > 100000) errors.push("Monthly bill must be between 0 and 100,000.");
  if (!Number.isFinite(input.utilityRate) || input.utilityRate <= 0 || input.utilityRate > 1000) errors.push("Utility rate must be greater than 0 and no more than 1,000 per kWh.");
  if (!Number.isFinite(input.sunHours) || input.sunHours <= 0 || input.sunHours > 12) errors.push("Peak sun hours must be greater than 0 and no more than 12.");
  if (!Number.isFinite(input.systemCost) || input.systemCost < 0 || input.systemCost > 100000000) errors.push("System cost must be between 0 and 100,000,000.");
  if (!Number.isFinite(input.incentiveRate) || input.incentiveRate < 0 || input.incentiveRate > 0.9) errors.push("Incentive assumption must be between 0% and 90%.");
  if (!Number.isFinite(input.electricityEscalation) || input.electricityEscalation < 0 || input.electricityEscalation > 0.2) errors.push("Annual bill increase must be between 0% and 20%.");
  if (!Number.isFinite(input.selfConsumption) || input.selfConsumption < 0 || input.selfConsumption > 1) errors.push("Self-consumption must be between 0% and 100%.");
  if (!Number.isFinite(input.roofAreaSqFt) || input.roofAreaSqFt < 0 || input.roofAreaSqFt > 1000000) errors.push("Roof area must be between 0 and 1,000,000 square feet.");
  if (!Number.isFinite(input.usableRoofPercent) || input.usableRoofPercent < 0 || input.usableRoofPercent > 100) errors.push("Usable roof share must be between 0% and 100%.");
  if (!Number.isFinite(input.orientationFactor) || input.orientationFactor < 0.1 || input.orientationFactor > 1) errors.push("Orientation factor must be between 10% and 100%.");
  if (!Number.isFinite(input.shadingFactor) || input.shadingFactor < 0.1 || input.shadingFactor > 1) errors.push("Shading factor must be between 10% and 100%.");
  return errors;
}
