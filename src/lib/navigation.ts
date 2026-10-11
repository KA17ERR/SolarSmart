export type MainNavigationLink = { label: string; id: "how-it-works" | "planner" | "assessment" | "dashboard" };

export const MAIN_NAVIGATION_LINKS: MainNavigationLink[] = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Solar Planner", id: "planner" },
  { label: "Solar Assessment", id: "assessment" },
  { label: "Energy Dashboard", id: "dashboard" },
];

export function getNavigationHref(id: MainNavigationLink["id"], pathname: string, hasDashboard = false) {
  if (id === "planner") return "/planner";
  if (id === "assessment") return "/assessment";
  if (id === "dashboard") return pathname.startsWith("/assessment") && hasDashboard ? "#dashboard" : "/dashboard";
  return pathname === "/" ? "#how-it-works" : "/#how-it-works";
}

export function getHomeHref(pathname: string) {
  return pathname === "/" ? "#home" : "/#home";
}

export function getVisibleNavigationLinks(authenticated: boolean) {
  return MAIN_NAVIGATION_LINKS.filter(link => authenticated || link.id === "how-it-works");
}

export function getNavigationVisibility(status: "loading" | "authenticated" | "unauthenticated") {
  return { authenticated: status === "authenticated", unauthenticated: status === "unauthenticated" };
}
