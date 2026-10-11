"use client";

import type { ElementType } from "react";
import BlurText from "@/components/animations/BlurText";
import ScrollReveal from "@/components/animations/ScrollReveal";

type AnimatedTextProps = {
  text: string;
  as?: ElementType;
  effect?: "blur" | "scroll";
  className?: string;
  id?: string;
  delay?: number;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  baseOpacity?: number;
  enableBlur?: boolean;
  blurStrength?: number;
  baseRotation?: number;
  scrollContainerRef?: { current: HTMLElement | null };
};

/** Shared accessible wrapper for the supplied blur and scroll text effects. */
export function AnimatedText({ text, as = "p", effect = "blur", className, id, delay, animateBy, direction, baseOpacity, enableBlur, blurStrength, baseRotation, scrollContainerRef }: AnimatedTextProps) {
  if (effect === "scroll") return <ScrollReveal as={as} id={id} containerClassName={className} baseOpacity={baseOpacity} enableBlur={enableBlur} blurStrength={blurStrength} baseRotation={baseRotation} scrollContainerRef={scrollContainerRef}>{text}</ScrollReveal>;
  return <BlurText as={as} id={id} className={className} text={text} delay={delay} animateBy={animateBy} direction={direction}/>;
}
