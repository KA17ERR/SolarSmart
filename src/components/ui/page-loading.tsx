import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui";

/** Stable, token-based loading frame for server-rendered application routes. */
export function PageLoading({ kind = "dashboard" }: { kind?: "dashboard" | "planner" | "comparison" }) {
  const title = kind === "planner" ? "Preparing your solar planner" : kind === "comparison" ? "Preparing scenario comparison" : "Loading your solar projects";
  return <div className="app-shell"><SiteHeader/><main className={`main route-loading route-loading-${kind}`} aria-busy="true" aria-label={title}>
    <div className="route-loading-inner"><div className="route-loading-heading"><Skeleton className="route-loading-eyebrow"/><Skeleton className="route-loading-title"/><Skeleton className="route-loading-copy"/></div>
      <div className="route-loading-content"><div className="route-loading-primary"><Skeleton className="route-loading-toolbar"/><Skeleton className="route-loading-panel"/></div><div className="route-loading-aside"><Skeleton className="route-loading-panel"/><Skeleton className="route-loading-panel route-loading-short"/></div></div>
    </div><span className="route-loading-status" role="status">{title}…</span>
  </main><SiteFooter/></div>;
}
