/** Pure roof-grid geometry for the local planner. Dimensions are illustrative and
 * must be confirmed by an installer; this module does not assess roof structure. */
export type PanelOrientation = "landscape" | "portrait";
export type RoofShape = "flat" | "gable" | "hip";
export type PanelLayoutInput = {
  roofWidthM: number;
  roofLengthM: number;
  panelWidthM: number;
  panelLengthM: number;
  edgeClearanceM?: number;
  gapM?: number;
  orientation?: PanelOrientation;
  roofShape?: RoofShape;
  maxPanels?: number;
  /** Stable one-based module indexes to render; omitted indexes leave visible gaps. */
  panelIds?: number[];
};
export type PlacedPanel = { id: number; x: number; y: number; width: number; height: number; row: number; column: number };
export type PanelLayout = { panels: PlacedPanel[]; columns: number; rows: number; roofAreaM2: number; occupiedAreaM2: number; usableAreaM2: number };

export function calculatePanelLayout(input: PanelLayoutInput): PanelLayout {
  const { roofWidthM, roofLengthM, panelWidthM, panelLengthM } = input;
  const clearance = input.edgeClearanceM ?? 0.3;
  const gap = input.gapM ?? 0.05;
  const finitePositive = [roofWidthM, roofLengthM, panelWidthM, panelLengthM].every(value => Number.isFinite(value) && value > 0);
  if (!finitePositive || !Number.isFinite(clearance) || clearance < 0 || !Number.isFinite(gap) || gap < 0 || (input.maxPanels !== undefined && (!Number.isInteger(input.maxPanels) || input.maxPanels < 0))) {
    return { panels: [], columns: 0, rows: 0, roofAreaM2: 0, occupiedAreaM2: 0, usableAreaM2: 0 };
  }
  const rotated = input.orientation === "portrait";
  const width = rotated ? panelLengthM : panelWidthM;
  const height = rotated ? panelWidthM : panelLengthM;
  const usableWidth = Math.max(0, roofWidthM - clearance * 2);
  const usableLength = Math.max(0, roofLengthM - clearance * 2);
  const columns = usableWidth < width ? 0 : Math.floor((usableWidth + gap) / (width + gap));
  const rows = usableLength < height ? 0 : Math.floor((usableLength + gap) / (height + gap));
  const capacity = columns * rows;
  const count = Math.min(capacity, input.maxPanels ?? capacity);
  const panelIds = input.panelIds ? new Set(input.panelIds.filter(id => Number.isInteger(id) && id > 0 && id <= capacity)) : null;
  const panels: PlacedPanel[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns);
    const column = i % columns;
    if (panelIds && !panelIds.has(i + 1)) continue;
    const panel = { id: i + 1, x: clearance + column * (width + gap), y: clearance + row * (height + gap), width, height, row, column };
    if (input.roofShape === "gable" && panel.x < roofWidthM / 2 && panel.x + panel.width > roofWidthM / 2) continue;
    if (input.roofShape === "hip" && !fitsHipPlane(panel, roofWidthM, roofLengthM, clearance)) continue;
    panels.push(panel);
  }
  const area = roofWidthM * roofLengthM;
  return { panels, columns, rows, roofAreaM2: area, occupiedAreaM2: panels.length * width * height, usableAreaM2: usableWidth * usableLength };
}

function fitsHipPlane(panel: PlacedPanel, roofWidthM: number, roofLengthM: number, clearance: number) {
  const inset = Math.min(roofWidthM * .22, roofLengthM * .18);
  const top = clearance + inset;
  const bottom = roofLengthM - clearance - inset;
  const left = clearance;
  const right = roofWidthM - clearance;
  const polygon = [
    [left + inset, clearance], [right - inset, clearance], [right, top], [right, bottom],
    [right - inset, roofLengthM - clearance], [left + inset, roofLengthM - clearance], [left, bottom], [left, top],
  ];
  const corners = [[panel.x, panel.y], [panel.x + panel.width, panel.y], [panel.x, panel.y + panel.height], [panel.x + panel.width, panel.y + panel.height]];
  return corners.every(([x, y]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  });
}
