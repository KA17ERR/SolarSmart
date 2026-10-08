import { DEFAULT_INPUTS, type SolarInputs } from "./solar";

export type DemoScenario = { id: string; name: string; description: string; inputs: SolarInputs };
/** Fictional what-if inputs for product demos. These do not represent a particular location. */
export const DEMO_SCENARIOS: DemoScenario[] = [
  { id: "compact", name: "Small roof", description: "A compact roof area that constrains modeled capacity.", inputs: { ...DEFAULT_INPUTS, roofAreaSqFt: 500, usableRoofPercent: 60, sunHours: 4.7, orientationFactor: 0.82, shadingFactor: 0.82, systemCost: 14500, targetAnnualOffsetRate: 0.7 } },
  { id: "balanced", name: "Medium roof", description: "The default medium-roof sample assumptions used in the dashboard.", inputs: DEFAULT_INPUTS },
  { id: "open-sun", name: "Highly shaded roof", description: "A fictional roof with substantial modeled shade losses.", inputs: { ...DEFAULT_INPUTS, roofAreaSqFt: 900, usableRoofPercent: 68, sunHours: 5.2, orientationFactor: 0.9, shadingFactor: 0.38, systemCost: 13600, targetAnnualOffsetRate: 0.72 } },
];
