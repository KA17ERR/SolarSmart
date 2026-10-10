"use client";

import GhostFibers from "@/components/solar/ghost-fibers";

/** A single persistent decorative layer shared by every App Router route. */
export function GlobalBackground() {
  return <GhostFibers
    className="ghost-fibers-global"
    glowColor="#206ef8"
    speed={0.3}
    scale={1.5}
    rotationSpeed={0.49}
    layers={4}
    twist={0.12}
    threads={1}
    glow={2.05}
    brightness={2.5}
    vignette={0.5}
    rotation={1}
    waves={0.025}
    spread={1.05}
    thickness={1}
    grain={0.05}
    mouseInteraction
    lightMode={false}
  />;
}
