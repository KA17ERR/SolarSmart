import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui";

/** Stable, token-based loading frame for server-rendered application routes. */
type LoadingKind = "dashboard" | "planner" | "comparison" | "assessment" | "insight" | "home" | "project";

export function PageLoading({ kind = "dashboard" }: { kind?: LoadingKind }) {
  const titles: Record<LoadingKind, string> = {
    dashboard: "Loading your solar projects", planner: "Preparing your solar planner",
    comparison: "Preparing scenario comparison", assessment: "Preparing your solar assessment",
    insight: "Loading assessment details", home: "Loading SolarSmart", project: "Loading saved project",
  };
  const title = titles[kind];
  return <div className="app-shell"><SiteHeader/><main className={`main route-loading route-loading-${kind}`} aria-busy="true" aria-label={title}>
    <div className="route-loading-inner"><div className="route-loading-heading"><Skeleton className="route-loading-eyebrow"/><Skeleton className="route-loading-title"/><Skeleton className="route-loading-copy"/></div>
      {kind === "planner" || kind === "assessment" ? <>
        <Skeleton className="route-loading-toolbar route-loading-progress"/>
        <div className="route-loading-content"><div className="route-loading-primary"><Skeleton className="route-loading-toolbar"/><Skeleton className="route-loading-field"/><Skeleton className="route-loading-field"/><Skeleton className="route-loading-panel"/></div><div className="route-loading-aside"><Skeleton className="route-loading-panel"/><Skeleton className="route-loading-panel route-loading-short"/></div></div>
      </> : kind === "insight" || kind === "home" ? <>
        <div className="route-loading-hero"><Skeleton className="route-loading-panel route-loading-copy-panel"/><Skeleton className="route-loading-panel route-loading-image"/></div>
        <div className="route-loading-card-grid"><Skeleton className="route-loading-panel route-loading-short"/><Skeleton className="route-loading-panel route-loading-short"/><Skeleton className="route-loading-panel route-loading-short"/></div>
      </> : <div className="route-loading-content"><div className="route-loading-primary"><Skeleton className="route-loading-toolbar"/><Skeleton className="route-loading-panel"/><Skeleton className="route-loading-panel route-loading-table"/></div><div className="route-loading-aside"><Skeleton className="route-loading-panel"/><Skeleton className="route-loading-panel route-loading-short"/></div></div>}
    </div><span className="route-loading-status" role="status">{title}…</span>
  </main><SiteFooter/></div>;
}
