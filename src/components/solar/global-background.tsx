"use client";

import WebThreads from "@/components/solar/web-threads";

/** A single persistent decorative layer shared by every App Router route. */
export function GlobalBackground() {
  return <WebThreads
    className="web-threads-global"
    color1="#7654d8"
    color2="#b6a0ff"
    color3="#eee8ff"
    speed={0.2}
    threadCount={6}
    frequency={5}
    spread={0.18}
    taper={1}
    position={0.5}
    fanMode="center"
    glow={0.02}
    falloff={0.6}
    thickness={1.1}
    brightness={0.92}
    opacity={0.88}
    mirror
    shimmer={false}
    grain
    grainIntensity={0.05}
    mouseInteraction
    mouseStrength={0.3}
  />;
}
