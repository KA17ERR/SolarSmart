import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCORDION_GALLERY_ITEMS, nextAccordionGalleryIndex } from "./accordion-gallery";
import { DASHBOARD_INSIGHTS } from "@/lib/dashboard-insights";

describe("dashboard accordion gallery", () => {
  it("uses distinct local artwork and links every topic to its own detail page", () => {
    expect(ACCORDION_GALLERY_ITEMS).toHaveLength(5);
    expect(ACCORDION_GALLERY_ITEMS.map(item => item.label)).toEqual(["Solar System", "Energy Generation", "Consumption and Savings", "Scenario Comparison", "System Assumptions"]);
    expect(new Set(ACCORDION_GALLERY_ITEMS.map(item => item.image)).size).toBe(5);
    expect(ACCORDION_GALLERY_ITEMS.map(item => item.href)).toEqual(DASHBOARD_INSIGHTS.map(item => `/assessment/insights/${item.slug}`));
    for (const item of ACCORDION_GALLERY_ITEMS) {
      expect(item.image.startsWith("/images/")).toBe(true);
      expect(item.image.endsWith(".webp")).toBe(true);
      expect(existsSync(join(process.cwd(), "public", item.image.slice(1)))).toBe(true);
      expect(item.href.startsWith("/assessment/insights/")).toBe(true);
      expect(item.href.length).toBeGreaterThan("/assessment/insights/".length);
      expect(item.alt).toBeTruthy();
    }
    for (const insight of DASHBOARD_INSIGHTS) {
      expect(insight.sections.length).toBeGreaterThanOrEqual(3);
      expect(insight.summary.length).toBeGreaterThan(40);
    }
  });
  it("supports arrow-key navigation in both directions and wraps at each end", () => {
    expect(nextAccordionGalleryIndex(0, "ArrowLeft")).toBe(4);
    expect(nextAccordionGalleryIndex(4, "ArrowRight")).toBe(0);
    expect(nextAccordionGalleryIndex(1, "ArrowDown")).toBe(2);
    expect(nextAccordionGalleryIndex(2, "ArrowUp")).toBe(1);
    expect(nextAccordionGalleryIndex(2, "Enter")).toBeNull();
  });
});
