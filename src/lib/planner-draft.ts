import type { PanelOrientation, RoofShape } from "./panel-layout";
import type { RoofFacing, ShadingCategory } from "./planner";
import { estimateMonthlyConsumptionFromAppliances, estimateMonthlyConsumptionFromBill, type PlannerInputs } from "./planner";

export type PlannerApplianceDraft = { id: number; name: string; powerWatts: number; hoursPerDay: number; quantity: number };
export type PlannerFormDraft = {
  place: string; location: { lat: number; lng: number } | null; property: string; width: number; length: number; orientation: PanelOrientation; roofShape: RoofShape;
  facing: RoofFacing; panelWatts: number; panelWidth: number; panelLength: number; panelIds: number[] | null;
  monthlyUse: number; monthlyBill: number; energyMode: "consumption" | "bill" | "appliances"; appliances: PlannerApplianceDraft[];
  rate: number; sunHours: number; shading: ShadingCategory; tilt: number; costPerKw: number; batteryKwh: 0 | 5 | 10;
};
export type PlannerDraftSnapshot = { version: 1; userId: string; projectId: string | null; form: PlannerFormDraft; step: number; submitted: boolean; savedAt: number };

export const PLANNER_DRAFT_KEY_PREFIX = "solarsmart.planner-draft.v1:";
export const plannerDraftKey = (userId: string) => `${PLANNER_DRAFT_KEY_PREFIX}${userId}`;

export function plannerFormToInputs(form: PlannerFormDraft): PlannerInputs {
  const monthlyConsumptionKwh = form.energyMode === "bill"
    ? estimateMonthlyConsumptionFromBill(form.monthlyBill, form.rate) ?? form.monthlyUse
    : form.energyMode === "appliances"
      ? estimateMonthlyConsumptionFromAppliances(form.appliances) ?? form.monthlyUse
      : form.monthlyUse;
  return {
    place: form.place, location: form.location ?? undefined, property: form.property,
    roofWidthM: form.width, roofLengthM: form.length, panelOrientation: form.orientation, roofShape: form.roofShape,
    roofFacing: form.facing, panelWatts: form.panelWatts, panelWidthM: form.panelWidth, panelLengthM: form.panelLength,
    placedPanelIds: form.panelIds, monthlyConsumptionKwh, utilityRateUsdPerKwh: form.rate,
    peakSunHoursPerDay: form.sunHours, shading: form.shading, roofTiltDegrees: form.tilt,
    installedCostUsdPerKw: form.costPerKw, batteryCapacityKwh: form.batteryKwh,
  };
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function validForm(value: unknown): value is PlannerFormDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const form = value as Record<string, unknown>;
  if (typeof form.place !== "string" || form.place.length > 120 || typeof form.property !== "string") return false;
  if (form.location !== null && (typeof form.location !== "object" || !Number.isFinite((form.location as { lat?: number }).lat) || !Number.isFinite((form.location as { lng?: number }).lng) || Number((form.location as { lat: number }).lat) < -90 || Number((form.location as { lat: number }).lat) > 90 || Number((form.location as { lng: number }).lng) < -180 || Number((form.location as { lng: number }).lng) > 180)) return false;
  const finite = ["width", "length", "panelWatts", "panelWidth", "panelLength", "monthlyUse", "monthlyBill", "rate", "sunHours", "tilt", "costPerKw"];
  if (finite.some(key => typeof form[key] !== "number" || !Number.isFinite(form[key]))) return false;
  if (!["landscape", "portrait"].includes(String(form.orientation)) || !["flat", "gable", "hip"].includes(String(form.roofShape))) return false;
  if (!["south", "south-east", "south-west", "east", "west", "north"].includes(String(form.facing)) || !["low", "moderate", "high"].includes(String(form.shading))) return false;
  if (![450, 550].includes(Number(form.panelWatts)) || !["consumption", "bill", "appliances"].includes(String(form.energyMode)) || ![0, 5, 10].includes(Number(form.batteryKwh))) return false;
  if (form.panelIds !== null && (!Array.isArray(form.panelIds) || form.panelIds.length > 500 || form.panelIds.some(id => !Number.isSafeInteger(id) || Number(id) < 0))) return false;
  if (!Array.isArray(form.appliances) || form.appliances.length > 50 || form.appliances.some(item => !item || typeof item !== "object" || !Number.isSafeInteger((item as PlannerApplianceDraft).id))) return false;
  return true;
}

export function isPlannerDraftSnapshot(value: unknown): value is PlannerDraftSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.version === 1 && typeof snapshot.userId === "string" && typeof snapshot.savedAt === "number" && Number.isFinite(snapshot.savedAt)
    && (snapshot.projectId === null || typeof snapshot.projectId === "string") && Number.isInteger(snapshot.step) && Number(snapshot.step) >= 0 && Number(snapshot.step) <= 5
    && typeof snapshot.submitted === "boolean" && validForm(snapshot.form);
}

export function readPlannerDraft(storage: StorageLike, userId: string, projectId?: string): PlannerDraftSnapshot | null {
  try {
    const raw = storage.getItem(plannerDraftKey(userId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlannerDraftSnapshot(parsed) || parsed.userId !== userId || (projectId !== undefined && parsed.projectId !== projectId)) return null;
    return parsed;
  } catch { return null; }
}

export function writePlannerDraft(storage: StorageLike, snapshot: PlannerDraftSnapshot): boolean {
  if (!isPlannerDraftSnapshot(snapshot)) return false;
  try { storage.setItem(plannerDraftKey(snapshot.userId), JSON.stringify(snapshot)); return true; }
  catch { return false; }
}

export function clearPlannerDraft(storage: StorageLike, userId: string): void {
  try { storage.removeItem(plannerDraftKey(userId)); } catch { /* Storage can be disabled by the browser. */ }
}
