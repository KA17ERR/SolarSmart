import type { SolarResults } from "@/lib/solar";

/** A minimal, versioned facts-only envelope; the service may explain but never recalculate it. */
export function toExplanationPayload(results: SolarResults) {
  return {
    schemaVersion: results.schemaVersion,
    systemKw: results.systemKw,
    roofCapacityKw: results.roofCapacityKw,
    roofLimited: results.roofLimited,
    annualProductionKwh: results.annualProductionKwh,
    annualSelfConsumedKwh: results.annualSelfConsumedKwh,
    annualExportedKwh: results.annualExportedKwh,
    annualRetailSavingsUsd: results.annualRetailSavingsUsd,
    annualExportRevenueUsd: results.annualExportRevenueUsd,
    annualSavings: results.annualSavings,
    netCost: results.netCost,
    paybackYears: results.paybackYears,
    projectionHorizonYears: results.projectionHorizonYears,
    co2AvoidedKg: results.co2AvoidedKg,
  };
}

// All optional assistant calls now use the validated same-origin server interface in
// `services/assessment-assistant.ts`. Keep this pure serializer for compatibility/tests.
