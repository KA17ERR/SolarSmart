import type { ElementType } from "react";

export interface BlurTextProps {
  text?: string;
  delay?: number;
  className?: string;
  id?: string;
  "aria-label"?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, string | number>;
  animationTo?: Array<Record<string, string | number>>;
  easing?: (progress: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  as?: ElementType;
}

declare function BlurText(props: BlurTextProps): JSX.Element;
export default BlurText;
