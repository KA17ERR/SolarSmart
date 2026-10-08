import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS } from "./solar";
import { clearAssessmentHistory, deleteAssessmentHistory, HISTORY_STORAGE_KEY, readAssessmentHistory, renameAssessmentHistory, saveAssessmentHistory } from "./assessment-history";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("optional local assessment history", () => {
  it("saves, reopens, renames, deletes and clears a versioned record", () => {
    const storage = new MemoryStorage();
    const save = saveAssessmentHistory(storage, { name: "Original", inputs: DEFAULT_INPUTS }, new Date("2026-10-09T00:00:00Z"), "r1");
    expect(save.ok).toBe(true);
    expect(JSON.parse(storage.getItem(HISTORY_STORAGE_KEY)!).version).toBe(1);
    expect(readAssessmentHistory(storage).records[0].inputs).toEqual(DEFAULT_INPUTS);
    const renamed = renameAssessmentHistory(storage, "r1", "Renamed");
    expect(renamed.ok && renamed.records[0].name).toBe("Renamed");
    const deleted = deleteAssessmentHistory(storage, "r1");
    expect(deleted.ok && deleted.records).toHaveLength(0);
    saveAssessmentHistory(storage, { name: "Again", inputs: DEFAULT_INPUTS }, new Date(), "r2");
    const cleared = clearAssessmentHistory(storage);
    expect(cleared.ok && cleared.records).toHaveLength(0);
  });
  it("migrates version 0 records and reports malformed or unsupported data", () => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: 0, assessments: [{ id: "old", name: "Legacy", inputs: DEFAULT_INPUTS }] }));
    const migrated = readAssessmentHistory(storage);
    expect(migrated.notice).toBe("migrated");
    expect(migrated.records[0].name).toBe("Legacy");
    storage.setItem(HISTORY_STORAGE_KEY, "{bad json");
    expect(readAssessmentHistory(storage)).toEqual({ records: [], notice: "corrupt-data" });
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: 80, records: [] }));
    expect(readAssessmentHistory(storage).notice).toBe("unsupported-version");
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    expect(saveAssessmentHistory(storage, { name: "Do not overwrite", inputs: DEFAULT_INPUTS }).ok).toBe(false);
    expect(storage.getItem(HISTORY_STORAGE_KEY)).toBe(raw);
  });
  it("rejects invalid assessments and catches storage restrictions", () => {
    expect(saveAssessmentHistory(new MemoryStorage(), { name: "Invalid", inputs: { ...DEFAULT_INPUTS, roofAreaSqFt: NaN } }).ok).toBe(false);
    const blocked = { getItem: () => null, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("denied"); } };
    expect(saveAssessmentHistory(blocked, { name: "Valid", inputs: DEFAULT_INPUTS }).ok).toBe(false);
    expect(clearAssessmentHistory(blocked).ok).toBe(false);
  });
});
