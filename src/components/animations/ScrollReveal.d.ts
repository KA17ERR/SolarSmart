import type { ElementType, ReactNode, RefObject } from "react";

export interface ScrollRevealProps {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  "aria-label"?: string;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  as?: ElementType;
  id?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
}

declare function ScrollReveal(props: ScrollRevealProps): JSX.Element;
export default ScrollReveal;
