import { validateInputs, type SolarInputs } from "./solar";
import type { AssessmentContext } from "./assessment";

export const HISTORY_SCHEMA_VERSION = 1 as const;
export const HISTORY_STORAGE_KEY = "solarsmart.assessment-history";
export type SavedAssessment = { id: string; name: string; savedAt: string; inputs: SolarInputs; context?: AssessmentContext };
export type HistoryNotice = "corrupt-data" | "unsupported-version" | "migrated" | null;
export type HistoryReadResult = { records: SavedAssessment[]; notice: HistoryNotice };
export type HistoryOperation = { ok: true; records: SavedAssessment[]; notice?: "migrated" } | { ok: false; reason: "unavailable" | "invalid" | "missing" };
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function validSavedAssessment(value: unknown): value is SavedAssessment {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.savedAt !== "string" || !isRecord(value.inputs)) return false;
  if (!value.id.trim() || !value.name.trim() || !Number.isFinite(Date.parse(value.savedAt))) return false;
  if (validateInputs(value.inputs as unknown as SolarInputs).length) return false;
  if (value.context === undefined) return true;
  if (!isRecord(value.context)) return false;
  const context = value.context;
  return typeof context.cityOrPostcode === "string" && typeof context.isDemoExample === "boolean"
    && ["single-family", "multi-unit", "small-business", "other"].includes(String(context.propertyType))
    && ["pitched-shingle", "pitched-tile", "metal", "flat", "other"].includes(String(context.roofType))
    && typeof context.usableRoofArea === "number" && Number.isFinite(context.usableRoofArea) && context.usableRoofArea > 0
    && ["sq-ft", "sq-m"].includes(String(context.areaUnit))
    && ["monthly-bill", "monthly-consumption"].includes(String(context.energyInputMethod))
    && typeof context.monthlyEnergyInput === "number" && Number.isFinite(context.monthlyEnergyInput)
    && typeof context.tariffUsdPerKwh === "number" && Number.isFinite(context.tariffUsdPerKwh)
    && typeof context.tariffWasAssumed === "boolean"
    && ["none", "light", "moderate", "heavy", "unknown"].includes(String(context.shading))
    && ["equator-facing", "east-west", "away-from-equator", "unknown"].includes(String(context.orientation))
    && ["bill-savings", "upfront-cost", "environmental-impact", "exploring"].includes(String(context.priority));
}
function decode(raw: string | null): HistoryReadResult {
  if (!raw) return { records: [], notice: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { records: [], notice: "corrupt-data" };
    if (parsed.version === 0 && Array.isArray(parsed.assessments)) {
      const records = parsed.assessments.flatMap((item, index) => {
        if (!isRecord(item)) return [];
        const candidate = { id: item.id ?? `migrated-${index}`, name: item.name ?? "Saved assessment", savedAt: item.savedAt ?? new Date(0).toISOString(), inputs: item.inputs, ...(item.context ? { context: item.context } : {}) };
        return validSavedAssessment(candidate) ? [candidate] : [];
      });
      return { records, notice: "migrated" };
    }
    if (parsed.version !== HISTORY_SCHEMA_VERSION || !Array.isArray(parsed.records)) return { records: [], notice: "unsupported-version" };
    return { records: parsed.records.filter(validSavedAssessment), notice: parsed.records.every(validSavedAssessment) ? null : "corrupt-data" };
  } catch { return { records: [], notice: "corrupt-data" }; }
}

export function readAssessmentHistory(storage: StorageLike): HistoryReadResult {
  try { return decode(storage.getItem(HISTORY_STORAGE_KEY)); }
  catch { return { records: [], notice: "corrupt-data" }; }
}

function write(storage: StorageLike, records: SavedAssessment[]): HistoryOperation {
  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ version: HISTORY_SCHEMA_VERSION, records }));
    return { ok: true, records };
  } catch { return { ok: false, reason: "unavailable" }; }
}

export function saveAssessmentHistory(storage: StorageLike, value: { name: string; inputs: SolarInputs; context?: AssessmentContext }, now = new Date(), id = globalThis.crypto?.randomUUID?.() ?? `assessment-${now.getTime()}`): HistoryOperation {
  if (validateInputs(value.inputs).length || !Number.isFinite(now.getTime())) return { ok: false, reason: "invalid" };
  const current = readAssessmentHistory(storage);
  if (current.notice === "unsupported-version") return { ok: false, reason: "unavailable" };
  const record: SavedAssessment = { id, name: value.name.trim().slice(0, 80) || "Solar assessment", savedAt: now.toISOString(), inputs: { ...value.inputs }, ...(value.context ? { context: { ...value.context } } : {}) };
  const result = write(storage, [record, ...current.records.filter(item => item.id !== id)]);
  return result.ok && current.notice === "migrated" ? { ...result, notice: "migrated" } : result;
}

export function renameAssessmentHistory(storage: StorageLike, id: string, name: string): HistoryOperation {
  const current = readAssessmentHistory(storage);
  if (!current.records.some(record => record.id === id)) return { ok: false, reason: "missing" };
  return write(storage, current.records.map(record => record.id === id ? { ...record, name: name.trim().slice(0, 80) || record.name } : record));
}

export function deleteAssessmentHistory(storage: StorageLike, id: string): HistoryOperation {
  const current = readAssessmentHistory(storage);
  if (!current.records.some(record => record.id === id)) return { ok: false, reason: "missing" };
  return write(storage, current.records.filter(record => record.id !== id));
}

export function clearAssessmentHistory(storage: StorageLike): HistoryOperation {
  try { storage.removeItem(HISTORY_STORAGE_KEY); return { ok: true, records: [] }; }
  catch { return { ok: false, reason: "unavailable" }; }
}
