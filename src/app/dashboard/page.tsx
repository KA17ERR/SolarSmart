import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { SavedProjects, type SavedProjectView } from "@/components/saved-projects";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AnimatedText } from "@/components/animations/AnimatedText";

export const metadata: Metadata = { title: "My solar projects · SolarSmart" };
export default async function DashboardPage() {
  const configured = hasSupabaseConfiguration();
  if (!configured) redirect("/login?next=%2Fdashboard");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  const { data, error } = await supabase.from("solar_projects").select("id,name,location_label,assessment_status,updated_at").order("updated_at", { ascending: false });
  const projects: SavedProjectView[] = (data ?? []).map(row => ({ id: row.id, name: row.name, location: row.location_label, status: row.assessment_status, updatedAt: row.updated_at }));
  return <div className="app-shell"><SiteHeader/><main id="main-content" className="main account-main" tabIndex={-1}><div className="account-container" id="dashboard"><div className="account-title-row"><div><Badge variant="success">Private account</Badge><AnimatedText as="h1" text="Your solar projects" delay={20}/><AnimatedText as="p" text="Projects are stored in your configured account. Each result is recalculated with SolarSmart’s deterministic model." delay={8}/></div></div>
    {error ? <Card className="account-error" role="alert"><h2>Project storage needs setup</h2><p>We could not read the project list. Apply the documented Supabase migration, then try again.</p><Link href="/planner">Continue to the planner</Link></Card> : <Card className="saved-projects-card"><div className="saved-projects-heading"><div><h2>Saved plans</h2><p>{projects.length} {projects.length === 1 ? "project" : "projects"}</p></div><ButtonLink href="/planner">Build a new plan</ButtonLink></div><SavedProjects projects={projects}/></Card>}
    <p className="account-privacy-note">This app uses provider-managed authentication. Row-level database policies restrict each account to its own project records.</p>
  </div></main><SiteFooter/></div>;
}
