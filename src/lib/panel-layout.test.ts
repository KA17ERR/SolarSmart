import { describe, expect, it } from "vitest";
import { calculatePanelLayout } from "./panel-layout";

describe("panel layout", () => {
  const base = { roofWidthM: 8, roofLengthM: 10, panelWidthM: 1.1, panelLengthM: 1.9, edgeClearanceM: 0.3, gapM: 0.05 };
  it("places proportionate rows and columns with clearances", () => {
    const layout = calculatePanelLayout(base);
    expect(layout.columns).toBe(6);
    expect(layout.rows).toBe(4);
    expect(layout.panels).toHaveLength(24);
    expect(layout.panels[0].x).toBe(0.3);
    expect(layout.panels.at(-1)?.y).toBeCloseTo(6.15);
  });
  it("rotates modules and respects a selected panel cap", () => {
    const layout = calculatePanelLayout({ ...base, orientation: "portrait", maxPanels: 7 });
    expect(layout.panels).toHaveLength(7);
    expect(layout.panels[0].width).toBe(1.9);
    expect(layout.panels[0].height).toBe(1.1);
  });
  it("returns an empty layout when roof is too small or inputs are invalid", () => {
    expect(calculatePanelLayout({ ...base, roofWidthM: 1 }).panels).toHaveLength(0);
    expect(calculatePanelLayout({ ...base, roofLengthM: Number.NaN }).columns).toBe(0);
    expect(calculatePanelLayout({ ...base, maxPanels: -1 }).panels).toHaveLength(0);
  });
  it("keeps panel count zero when explicitly requested", () => {
    expect(calculatePanelLayout({ ...base, maxPanels: 0 }).panels).toHaveLength(0);
  });
  it("removes the selected panel while preserving its roof slot", () => {
    const layout = calculatePanelLayout({ ...base, maxPanels: 4, panelIds: [1, 3, 4] });
    expect(layout.panels.map(panel => panel.id)).toEqual([1, 3, 4]);
    expect(layout.panels[1].column).toBe(2);
  });
  it("counts only unique placed modules in occupied roof area", () => {
    const layout = calculatePanelLayout({ ...base, panelIds: [1, 1, 4] });
    expect(layout.panels.map(panel => panel.id)).toEqual([1, 4]);
    expect(layout.occupiedAreaM2).toBeCloseTo(2 * 1.1 * 1.9);
  });
  it("keeps gable modules on one side or the other of the ridge", () => {
    const layout = calculatePanelLayout({ ...base, roofShape: "gable" });
    expect(layout.panels.length).toBeLessThan(calculatePanelLayout(base).panels.length);
    expect(layout.panels.every(panel => panel.x + panel.width <= 4 || panel.x >= 4)).toBe(true);
  });
  it("reduces hip-roof placement to panels that fit inside the clipped roof plane", () => {
    const layout = calculatePanelLayout({ ...base, roofShape: "hip" });
    expect(layout.panels.length).toBeLessThan(calculatePanelLayout(base).panels.length);
    expect(layout.panels.every(panel => panel.x >= .3 && panel.x + panel.width <= 7.7 && panel.y >= .3 && panel.y + panel.height <= 9.7)).toBe(true);
  });
});
