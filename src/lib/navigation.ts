export type MainNavigationLink = { label: string; id: "how-it-works" | "planner" | "dashboard" };

export const MAIN_NAVIGATION_LINKS: MainNavigationLink[] = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Solar Planner", id: "planner" },
  { label: "Energy Dashboard", id: "dashboard" },
];

export function getVisibleNavigationLinks(authenticated: boolean) {
  return MAIN_NAVIGATION_LINKS.filter(link => authenticated || link.id === "how-it-works");
}

export function getNavigationVisibility(status: "loading" | "authenticated" | "unauthenticated") {
  return { authenticated: status === "authenticated", unauthenticated: status === "unauthenticated" };
}
