"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateSolarPlan, isPlannerInputs, type PlannerInputs } from "@/lib/planner";

export type ProjectActionResult = { ok: true; id?: string } | { ok: false; message: string };
const boundedText = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;

function parsePlannerInput(value: unknown): PlannerInputs | null { return isPlannerInputs(value) ? value : null; }

async function persistProject(projectId: string | null, input: PlannerInputs, plan: ReturnType<typeof calculateSolarPlan>): Promise<ProjectActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { ok: false, message: "Sign in to save this project." };
    const { data, error } = await supabase.rpc("save_solar_project_atomic", {
      p_project_id: projectId,
      p_name: `${input.property} · ${input.place}`.slice(0, 120),
      p_location_label: input.place.slice(0, 120),
      p_inputs: input,
      p_outputs: plan.estimate,
      p_monthly_consumption_kwh: input.monthlyConsumptionKwh,
      p_tariff_usd_per_kwh: input.utilityRateUsdPerKwh,
      p_calculation_version: "SolarSmart deterministic model v1",
      p_roof: {
        width_m: input.roofWidthM, length_m: input.roofLengthM, area_m2: plan.roofAreaM2,
        panel_orientation: input.panelOrientation, roof_facing: input.roofFacing,
        tilt_degrees: input.roofTiltDegrees, shading: input.shading,
        assumptions: { usableRoofPercent: 70, sunHoursPerDay: input.peakSunHoursPerDay },
      },
      p_system: {
        panel_watts: input.panelWatts, panel_count: plan.panelCount,
        panel_positions: plan.panelLayout.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
        installed_capacity_kw: plan.systemCapacityKw, battery_capacity_kwh: plan.battery.nominalCapacityKwh,
        assumptions: { panelWidthM: input.panelWidthM, panelLengthM: input.panelLengthM, installedCostUsdPerKw: input.installedCostUsdPerKw, batteryEstimate: plan.battery },
      },
    });
    if (error || typeof data !== "string") return { ok: false, message: "The project could not be saved completely. Your prior saved version remains unchanged; review your connection and retry." };
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/projects/${data}`);
    return { ok: true, id: data };
  } catch { return { ok: false, message: "The project could not be saved. Check your connection and project setup, then retry." }; }
}

export async function saveSolarProject(rawInput: unknown): Promise<ProjectActionResult> {
  if (!hasSupabaseConfiguration()) return { ok: false, message: "Project saving is unavailable in local demo mode." };
  const input = parsePlannerInput(rawInput);
  if (!input) return { ok: false, message: "Some plan details are invalid. Review them and try again." };
  let plan;
  try { plan = calculateSolarPlan(input); } catch { return { ok: false, message: "SolarSmart could not calculate this project from the supplied details." }; }
  if (plan.validationIssues.length || plan.estimate.status === "invalid") return { ok: false, message: "Correct the plan details before saving." };

  return persistProject(null, input, plan);
}

/** Update a saved project. Every query is owner-scoped by the user's RLS session. */
export async function updateSolarProject(id: string, rawInput: unknown): Promise<ProjectActionResult> {
  if (!hasSupabaseConfiguration()) return { ok: false, message: "Project storage is not configured." };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "That project id is invalid." };
  const input = parsePlannerInput(rawInput);
  if (!input) return { ok: false, message: "Some plan details are invalid. Review them and try again." };
  let plan;
  try { plan = calculateSolarPlan(input); } catch { return { ok: false, message: "SolarSmart could not calculate this project from the supplied details." }; }
  if (plan.validationIssues.length || plan.estimate.status === "invalid") return { ok: false, message: "Correct the plan details before saving." };
  return persistProject(id, input, plan);
}

export async function renameSolarProject(id: string, name: string): Promise<ProjectActionResult> {
  if (!hasSupabaseConfiguration()) return { ok: false, message: "Project storage is not configured." };
  if (!/^[0-9a-f-]{36}$/i.test(id) || !boundedText(name, 120)) return { ok: false, message: "Enter a project name up to 120 characters." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to manage saved projects." };
  const { error } = await supabase.from("solar_projects").update({ name: name.trim() }).eq("id", id);
  if (error) return { ok: false, message: "The project name could not be changed." };
  revalidatePath("/dashboard"); return { ok: true };
}

export async function deleteSolarProject(id: string): Promise<ProjectActionResult> {
  if (!hasSupabaseConfiguration()) return { ok: false, message: "Project storage is not configured." };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "That project id is invalid." };
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to manage saved projects." };
  const { error } = await supabase.from("solar_projects").delete().eq("id", id);
  if (error) return { ok: false, message: "The project could not be deleted." };
  revalidatePath("/dashboard"); return { ok: true };
}
