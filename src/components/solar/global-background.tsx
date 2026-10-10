"use client";

import WebThreads from "@/components/solar/web-threads";

/** A single persistent decorative layer shared by every App Router route. */
export function GlobalBackground() {
  return <WebThreads
    className="web-threads-global"
    color1="#315d49"
    color2="#789875"
    color3="#d6c69f"
    speed={0.12}
    threadCount={3}
    frequency={5}
    spread={0.18}
    taper={1}
    position={0.5}
    fanMode="center"
    glow={0.02}
    falloff={0.6}
    thickness={1.1}
    brightness={0.58}
    opacity={0.2}
    mirror
    shimmer={false}
    grain
    grainIntensity={0.02}
    mouseInteraction={false}
    mouseStrength={0.1}
  />;
}
