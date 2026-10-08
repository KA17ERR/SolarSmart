/** Transparent financial model. Inputs are assumptions supplied by the user or labeled demo data. */
import { validateInputs } from "./validation";
export type SolarInputs = { monthlyBill: number; utilityRate: number; sunHours: number; systemCost: number; incentiveRate: number; electricityEscalation: number; selfConsumption: number; roofAreaSqFt: number; usableRoofPercent: number; orientationFactor: number; shadingFactor: number };
export type SolarResults = { systemKw: number; roofCapacityKw: number; roofLimited: boolean; annualProductionKwh: number; annualSavings: number; netCost: number; paybackYears: number; twentyFiveYearSavings: number; monthlySavings: number; co2AvoidedKg: number };
export { validateInputs } from "./validation";
export const DEFAULT_INPUTS: SolarInputs = { monthlyBill: 180, utilityRate: 0.15, sunHours: 5.2, systemCost: 12800, incentiveRate: 0, electricityEscalation: 0.03, selfConsumption: 0.82, roofAreaSqFt: 850, usableRoofPercent: 70, orientationFactor: 0.9, shadingFactor: 0.95 };
export function calculateSolar(input: SolarInputs): SolarResults {
  const errors = validateInputs(input);
  if (errors.length) throw new Error(errors.join(" "));
  const annualBill = input.monthlyBill * 12;
  const targetProduction = (annualBill / input.utilityRate) * input.selfConsumption;
  const roofCapacityKw = (input.roofAreaSqFt * (input.usableRoofPercent / 100)) / 60;
  const requestedKw = targetProduction / (input.sunHours * 365 * 0.8 * input.orientationFactor * input.shadingFactor);
  const systemKw = Number(Math.min(requestedKw, roofCapacityKw).toFixed(1));
  const roofLimited = requestedKw > roofCapacityKw;
  const annualProductionKwh = Math.round(systemKw * input.sunHours * 365 * 0.8 * input.orientationFactor * input.shadingFactor);
  const annualSavings = Math.round(Math.min(annualBill * input.selfConsumption, annualProductionKwh * input.utilityRate));
  const netCost = Math.round(input.systemCost * (1 - input.incentiveRate));
  const paybackYears = annualSavings > 0 ? Number((netCost / annualSavings).toFixed(1)) : 0;
  let twentyFiveYearSavings = 0;
  for (let year = 0; year < 25; year++) twentyFiveYearSavings += annualSavings * (1 + input.electricityEscalation) ** year;
  return { systemKw, roofCapacityKw: Number(roofCapacityKw.toFixed(1)), roofLimited, annualProductionKwh, annualSavings, netCost, paybackYears, twentyFiveYearSavings: Math.round(twentyFiveYearSavings - netCost), monthlySavings: Math.round(annualSavings / 12), co2AvoidedKg: Math.round(annualProductionKwh * 0.385) };
}
