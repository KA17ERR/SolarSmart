import { DEFAULT_INPUTS, type SolarInputs } from "./solar";

export type DemoScenario = { id: string; name: string; description: string; inputs: SolarInputs };
/** Fictional what-if inputs for product demos. These do not represent a particular location. */
export const DEMO_SCENARIOS: DemoScenario[] = [
  { id: "compact", name: "Compact roof", description: "Smaller usable roof and conservative exposure assumptions.", inputs: { ...DEFAULT_INPUTS, roofAreaSqFt: 500, usableRoofPercent: 60, sunHours: 3.8, orientationFactor: 0.78, shadingFactor: 0.82, systemCost: 14500, selfConsumption: 0.7 } },
  { id: "balanced", name: "Balanced demo", description: "The default sample assumptions used in the dashboard.", inputs: DEFAULT_INPUTS },
  { id: "open-sun", name: "Open roof", description: "More usable roof area and fewer modeled production losses.", inputs: { ...DEFAULT_INPUTS, roofAreaSqFt: 1200, usableRoofPercent: 78, sunHours: 5.8, orientationFactor: 0.96, shadingFactor: 0.97, systemCost: 11200, selfConsumption: 0.9 } },
];
