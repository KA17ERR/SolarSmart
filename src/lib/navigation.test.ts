import { describe, expect, it } from "vitest";
import { getHomeHref, getNavigationHref, getNavigationVisibility, getVisibleNavigationLinks } from "./navigation";

describe("authenticated main navigation", () => {
  it("keeps in-page anchors on the homepage and routes home sections from other pages", () => {
    expect(getNavigationHref("how-it-works", "/")).toBe("#how-it-works");
    expect(getNavigationHref("how-it-works", "/dashboard")).toBe("/#how-it-works");
    expect(getNavigationHref("how-it-works", "/assessment/compare")).toBe("/#how-it-works");
  });

  it("routes brand-home navigation to the homepage from non-home pages", () => {
    expect(getHomeHref("/")).toBe("#home");
    expect(getHomeHref("/dashboard")).toBe("/#home");
    expect(getHomeHref("/assessment/compare")).toBe("/#home");
  });

  it("keeps working routes for planner and dashboard, including an available dashboard section", () => {
    expect(getNavigationHref("planner", "/dashboard")).toBe("/planner");
    expect(getNavigationHref("dashboard", "/dashboard")).toBe("/dashboard");
    expect(getNavigationHref("dashboard", "/assessment", true)).toBe("#dashboard");
  });

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
