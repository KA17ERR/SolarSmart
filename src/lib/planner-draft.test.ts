import { describe, expect, it } from "vitest";
import { clearPlannerDraft, plannerDraftKey, readPlannerDraft, writePlannerDraft, type PlannerDraftSnapshot } from "./planner-draft";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

const snapshot: PlannerDraftSnapshot = {
  version: 1, userId: "user-a", projectId: null, step: 5, submitted: false, savedAt: 1,
  form: { place: "Sampleville", location: null, property: "Detached home", width: 8, length: 10, orientation: "landscape", roofShape: "gable", facing: "south", panelWatts: 450, panelWidth: 1.1, panelLength: 1.9, panelIds: null, monthlyUse: 850, monthlyBill: 127.5, energyMode: "consumption", appliances: [], rate: .15, sunHours: 4.8, shading: "moderate", tilt: 20, costPerKw: 2400, batteryKwh: 0 },
};

describe("per-user planner draft persistence", () => {
  it("restores the complete review step, layout, location and supported inputs for the same user", () => {
    const storage = memoryStorage();
    expect(writePlannerDraft(storage, snapshot)).toBe(true);
    expect(readPlannerDraft(storage, "user-a")).toEqual(snapshot);
    expect(readPlannerDraft(storage, "user-b")).toBeNull();
    expect(readPlannerDraft(storage, "user-a", "another-project")).toBeNull();
  });

  it("rejects malformed browser data and can clear one user's draft", () => {
    const storage = memoryStorage();
    storage.setItem(plannerDraftKey("user-a"), "{not-json");
    expect(readPlannerDraft(storage, "user-a")).toBeNull();
    expect(writePlannerDraft(storage, { ...snapshot, step: 9 })).toBe(false);
    writePlannerDraft(storage, snapshot);
    clearPlannerDraft(storage, "user-a");
    expect(readPlannerDraft(storage, "user-a")).toBeNull();
  });
});
