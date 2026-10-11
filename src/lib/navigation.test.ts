import { describe, expect, it } from "vitest";
import { getNavigationVisibility, getVisibleNavigationLinks } from "./navigation";

describe("authenticated main navigation", () => {
  it("keeps protected planner and dashboard links out of logged-out navigation", () => {
    expect(getVisibleNavigationLinks(false).map(link => link.id)).toEqual(["how-it-works"]);
  });

  it("shows the planner and energy dashboard to authenticated users", () => {
    expect(getVisibleNavigationLinks(true).map(link => link.id)).toEqual(["how-it-works", "planner", "assessment", "dashboard"]);
  });

  it("keeps both authentication action sets hidden while session restoration is unresolved", () => {
    expect(getNavigationVisibility("loading")).toEqual({ authenticated: false, unauthenticated: false });
    expect(getVisibleNavigationLinks(getNavigationVisibility("loading").authenticated).map(link => link.id)).toEqual(["how-it-works"]);
  });

  it("shows only sign-in actions when signed out and authenticated actions when signed in", () => {
    expect(getNavigationVisibility("unauthenticated")).toEqual({ authenticated: false, unauthenticated: true });
    expect(getNavigationVisibility("authenticated")).toEqual({ authenticated: true, unauthenticated: false });
  });
});
