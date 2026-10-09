import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Alert, Card } from "@/components/ui";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved solar plan · SolarSmart" };
type MaybeResult = { data: Record<string, unknown> | null; error: unknown };
function value(record: Record<string, unknown> | null, key: string) { const candidate = record?.[key]; return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null; }
function fmt(n: number | null, digits = 0) { return n === null ? "Not estimated" : new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n); }
function money(n: number | null) { return n === null ? "Not estimated" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }

export default async function SavedProjectPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfiguration()) redirect("/dashboard");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/projects/${id}`)}`);
  const { data: project } = await supabase.from("solar_projects").select("id,name,location_label,assessment_status,created_at,updated_at").eq("id", id).maybeSingle();
  if (!project) notFound();
  const [roof, system, assessment] = await Promise.all([
    supabase.from("roof_configurations").select("*").eq("project_id", id).maybeSingle(),
    supabase.from("solar_system_configurations").select("*").eq("project_id", id).maybeSingle(),
    supabase.from("energy_assessments").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]) as [MaybeResult, MaybeResult, MaybeResult];
  const output = assessment.data?.outputs && typeof assessment.data.outputs === "object" ? assessment.data.outputs as Record<string, unknown> : null;
  const payback = value(output, "paybackYears");
  return <div className="app-shell"><SiteHeader/><main id="main-content" className="main account-main" tabIndex={-1}><div className="account-container"><Link className="account-back" href="/dashboard"><ArrowLeft size={15}/> All projects</Link><p className="landing-eyebrow">Saved private project</p><h1>{project.name}</h1><p>{project.location_label} · {project.assessment_status}</p><Link className="ui-button ui-button-primary saved-project-edit" href={`/planner?project=${encodeURIComponent(id)}`}>Continue editing this plan <ArrowRight size={16}/></Link>
    {(roof.error || system.error || assessment.error || !assessment.data) && <Alert variant="warning" title="Some project details are unavailable">The project record is saved, but one or more assessment sections could not be loaded.</Alert>}
    <div className="saved-project-detail-grid"><Card><h2>Roof and layout</h2><dl><div><dt>Dimensions</dt><dd>{fmt(value(roof.data, "width_m"), 1)} × {fmt(value(roof.data, "length_m"), 1)} m</dd></div><div><dt>Orientation</dt><dd>{String(roof.data?.roof_facing ?? "Not saved")}</dd></div><div><dt>Shading</dt><dd>{String(roof.data?.shading ?? "Not saved")}</dd></div><div><dt>Roof tilt</dt><dd>{fmt(value(roof.data, "tilt_degrees"))}°</dd></div></dl></Card>
      <Card><h2>Solar system</h2><dl><div><dt>Panels</dt><dd>{fmt(value(system.data, "panel_count"))}</dd></div><div><dt>Modeled capacity</dt><dd>{fmt(value(system.data, "installed_capacity_kw"), 2)} kW</dd></div><div><dt>Panel rating</dt><dd>{fmt(value(system.data, "panel_watts"))} W</dd></div><div><dt>Battery</dt><dd>{(value(system.data, "battery_capacity_kwh") ?? 0) <= 0 ? "Not included" : `${fmt(value(system.data, "battery_capacity_kwh"), 1)} kWh`}</dd></div></dl></Card>
      <Card><h2>Latest estimate</h2><dl><div><dt>Annual generation</dt><dd>{fmt(value(output, "annualProductionKwh"))} kWh</dd></div><div><dt>Annual bill savings</dt><dd>{money(value(output, "annualSavings"))}</dd></div><div><dt>Expected installation cost</dt><dd>{money(value((output?.installationCostRangeUsd as Record<string, unknown> | undefined) ?? null, "expected"))}</dd></div><div><dt>Simple payback</dt><dd>{payback === null ? "Not estimated" : `${fmt(payback, 1)} years`}</dd></div></dl><p className="saved-model-version">Calculated with {String(assessment.data?.calculation_version ?? "the SolarSmart model")}. Estimates are not quotations or guarantees.</p></Card>
    </div>
  </div></main><SiteFooter/></div>;
}
