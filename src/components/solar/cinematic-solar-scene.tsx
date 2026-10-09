"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type SolarSceneProps = { stage?: number; flow?: "day" | "night" | "high" };
type SceneFrame = "day" | "evening" | "night";

const FRAMES: Array<{ key: SceneFrame; src: string; label: string }> = [
  { key: "day", src: "/images/solar-home-day.png", label: "Daytime architectural solar home" },
  { key: "evening", src: "/images/solar-home-evening.png", label: "The same solar home at sunset" },
  { key: "night", src: "/images/solar-home-night.png", label: "The same solar home at night" },
];

function smooth(from: number, to: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * A locally bundled, matched architectural render sequence replaces the toy-like
 * primitive model. Only opacity is updated during scroll; image decoding and
 * compositing stay outside React's render loop and require no WebGL.
 */
export function CinematicSolarScene({ stage = 0 }: SolarSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<Array<HTMLImageElement | null>>([]);

  useEffect(() => {
    const scene = sceneRef.current;
    const story = scene?.closest<HTMLElement>(".solar-story");
    if (!scene || !story) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyFrame = () => {
      const progress = Number.parseFloat(story.style.getPropertyValue("--scene-progress")) || 0;
      let opacity: number[];
      if (reducedMotion.matches) {
        opacity = FRAMES.map((_, index) => Number(index === Math.max(0, Math.min(2, stage))));
      } else {
        const intoEvening = smooth(.27, .62, progress);
        const intoNight = smooth(.67, .96, progress);
        opacity = [1 - intoEvening, intoEvening * (1 - intoNight), intoNight];
      }
      imageRefs.current.forEach((image, index) => {
        if (!image) return;
        image.style.opacity = String(opacity[index] ?? 0);
      });
    };

    applyFrame();
    window.addEventListener("solar-scene-progress", applyFrame);
    reducedMotion.addEventListener("change", applyFrame);
    return () => {
      window.removeEventListener("solar-scene-progress", applyFrame);
      reducedMotion.removeEventListener("change", applyFrame);
    };
  }, [stage]);

  return <div ref={sceneRef} className="solar-scene-canvas-wrap cinematic-solar-scene" role="img" aria-label="Photorealistic illustrative home with rooftop solar panels shown in daytime, evening, and nighttime lighting">
    {FRAMES.map((frame, index) => <Image
      key={frame.key}
      ref={node => { imageRefs.current[index] = node; }}
      className={`cinematic-scene-frame cinematic-scene-frame-${frame.key}`}
      src={frame.src}
      alt=""
      fill
      sizes="100vw"
      quality={78}
      unoptimized
      priority={index === 0}
      aria-hidden="true"
    />)}
    <span className="scene-model-label">ARCHITECTURAL VISUAL · ILLUSTRATIVE</span>
  </div>;
}
