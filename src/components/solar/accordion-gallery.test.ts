import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCORDION_GALLERY_ITEMS, nextAccordionGalleryIndex } from "./accordion-gallery";

describe("dashboard accordion gallery", () => {
  it("uses distinct local solar artwork and real in-page destinations", () => {
    expect(ACCORDION_GALLERY_ITEMS).toHaveLength(5);
    expect(new Set(ACCORDION_GALLERY_ITEMS.map(item => item.image)).size).toBe(5);
    for (const item of ACCORDION_GALLERY_ITEMS) {
      expect(item.image.startsWith("/images/")).toBe(true);
      expect(existsSync(join(process.cwd(), "public", item.image.slice(1)))).toBe(true);
      expect(item.href.startsWith("#")).toBe(true);
      expect(item.href.length).toBeGreaterThan(1);
      expect(item.alt).toBeTruthy();
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
