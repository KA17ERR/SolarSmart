import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { SavedProjects, type SavedProjectView } from "@/components/saved-projects";
import { logoutAction } from "@/app/auth-actions";
import { hasSupabaseConfiguration } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My solar projects · SolarSmart" };
export default async function DashboardPage() {
  const configured = hasSupabaseConfiguration();
  if (!configured) return <div className="app-shell"><SiteHeader/><main id="main-content" className="main account-main" tabIndex={-1}><div className="account-container" id="dashboard"><Badge variant="success"><span className="demo-indicator"/> Local demo</Badge><h1>Your solar projects</h1><p>Try the planner without an account. Optional saved projects need a configured Supabase account.</p><Card className="account-demo-card"><h2>Demo dashboard</h2><p>This demo keeps the sample assessment in browser memory. No account credentials or cloud database are needed.</p><div><ButtonLink href="/planner">Build a local plan</ButtonLink><ButtonLink href="/assessment?scenario=balanced#dashboard" variant="secondary">Open sample results</ButtonLink></div></Card><Link href="/login">Account setup</Link></div></main><SiteFooter/></div>;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  const { data, error } = await supabase.from("solar_projects").select("id,name,location_label,assessment_status,updated_at").order("updated_at", { ascending: false });
  const projects: SavedProjectView[] = (data ?? []).map(row => ({ id: row.id, name: row.name, location: row.location_label, status: row.assessment_status, updatedAt: row.updated_at }));
  return <div className="app-shell"><SiteHeader/><main id="main-content" className="main account-main" tabIndex={-1}><div className="account-container" id="dashboard"><div className="account-title-row"><div><Badge variant="success">Private account</Badge><h1>Your solar projects</h1><p>Projects are stored in your configured account. Each result is recalculated with SolarSmart’s deterministic model.</p></div><form action={logoutAction}><button className="account-logout">Sign out</button></form></div>
    {error ? <Card className="account-error" role="alert"><h2>Project storage needs setup</h2><p>We could not read the project list. Apply the documented Supabase migration, then try again.</p><Link href="/planner">Continue with the local planner</Link></Card> : <Card className="saved-projects-card"><div className="saved-projects-heading"><div><h2>Saved plans</h2><p>{projects.length} {projects.length === 1 ? "project" : "projects"}</p></div><ButtonLink href="/planner">Build a new plan</ButtonLink></div><SavedProjects projects={projects}/></Card>}
    <p className="account-privacy-note">This app uses provider-managed authentication. Row-level database policies restrict each account to its own project records.</p>
  </div></main><SiteFooter/></div>;
}
