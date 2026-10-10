import type { HTMLAttributes } from "react";

type GhostFibersProps = HTMLAttributes<HTMLDivElement> & {
  glowColor?: string;
  lineColor?: string;
  speed?: number;
  scale?: number;
  rotation?: number;
  rotationSpeed?: number;
  layers?: number;
  waves?: number;
  twist?: number;
  threads?: number;
  spread?: number;
  thickness?: number;
  glow?: number;
  brightness?: number;
  vignette?: number;
  grain?: number;
  mouseInteraction?: boolean;
  intro?: boolean;
  lightMode?: boolean;
  paused?: boolean;
  dpr?: number;
};

declare function GhostFibers(props: GhostFibersProps): React.JSX.Element;
export default GhostFibers;
