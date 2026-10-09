"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";
import "./WebThreads.css";

type FanMode = "center" | "left" | "right";
type WebThreadsProps = {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  threadCount?: number;
  frequency?: number;
  spread?: number;
  taper?: number;
  position?: number;
  fanMode?: FanMode;
  glow?: number;
  falloff?: number;
  thickness?: number;
  brightness?: number;
  opacity?: number;
  mirror?: boolean;
  shimmer?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  backgroundColor?: string;
  lightMode?: boolean;
  className?: string;
  sceneReactive?: boolean;
};

const FAN_MODE: Record<FanMode, number> = { center: 0, left: 1, right: 2 };
const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;
const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define TAU 6.28318530718
#define MAX_THREADS 10
float glow(float x, float strength, float distance) {
  return distance / pow(max(x, 1e-4), strength);
}
void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float count = max(uThreadCount, 1.0);
  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  float spreadDx = uSpread * abs(uv.x - pinchX);
  float mirrorDirection = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  float phaseTime = iTime * uSpeed;
  float phaseStep = TAU / count;
  float yOffset = uv.y - uPosition;
  float intensity = 0.0;
  vec3 color = vec3(0.0);
  for (int index = 0; index < MAX_THREADS; index++) {
    float line = float(index);
    if (line >= count) break;
    float amplitude = spreadDx * (1.0 + line * uTaper);
    float shimmer = uShimmer > 0.5 ? sin(iTime * 1.7 + line * 1.3) * 0.35 : 0.0;
    float phase = (phaseTime + line * phaseStep) * mirrorDirection + shimmer;
    float distance = abs(yOffset + sin(uv.x * uFrequency + phase) * amplitude) / max(uThickness, 0.01);
    float energy = glow(distance, uFalloff, uGlow);
    float colorMix = count > 1.0 ? line / (count - 1.0) : 0.0;
    vec3 threadColor = mix(uColor1, uColor2, colorMix);
    color += energy * threadColor;
    intensity += energy;
  }
  float core = smoothstep(0.5, 2.2, intensity);
  color = mix(color, uColor3 * intensity, core * 0.5);
  float brightness = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 delta = uv - uMouse;
    brightness += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-dot(delta, delta) * 6.0) * 0.6;
  }
  color *= brightness;
  float alpha = clamp(intensity, 0.0, 1.0) * uOpacity;
  vec3 rgb = color * alpha;
  if (uGrain > 0.5) {
    float noise = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    rgb = clamp(rgb + noise, 0.0, 1.0);
    alpha = clamp(alpha + noise, 0.0, 1.0);
  }
  fragColor = vec4(rgb, alpha);
}
`;

function rgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  if (!/^[\da-f]{6}$/i.test(clean)) return [1, 1, 1];
  return [0, 2, 4].map(index => parseInt(clean.slice(index, index + 2), 16) / 255) as [number, number, number];
}
function setColor(uniform: { value: Float32Array }, hex: string) {
  const color = rgb(hex);
  uniform.value[0] = color[0]; uniform.value[1] = color[1]; uniform.value[2] = color[2];
}
function mixColor(from: [number, number, number], to: [number, number, number], amount: number) {
  return from.map((value, index) => value + (to[index] - value) * amount) as [number, number, number];
}
function toHex(color: [number, number, number]) {
  return `#${color.map(value => Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

const palettes = {
  day: [rgb("#287de0"), rgb("#48d6e6"), rgb("#efbb72")],
  evening: [rgb("#357dbb"), rgb("#64cbdc"), rgb("#e5a269")],
  night: [rgb("#17477f"), rgb("#3b9fca"), rgb("#a77749")],
} as const;

export default function WebThreads({
  color1 = "#287de0", color2 = "#48d6e6", color3 = "#efbb72", speed = 0.11,
  threadCount = 5, frequency = 4.2, spread = 0.19, taper = 0.64, position = 0.49,
  fanMode = "center", glow = 0.018, falloff = 0.64, thickness = 1.05, brightness = 0.58,
  opacity = 0.58, mirror = true, shimmer = false, grain = false, grainIntensity = 0.025,
  mouseInteraction = true, mouseStrength = 0.16, className = "", sceneReactive = false,
}: WebThreadsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer | null = null;
    let frame = 0;
    let visible = false;
    let pageVisible = !document.hidden;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let lost = false;
    let currentMouseX = 0.5;
    let currentMouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let currentMouseActive = 0;
    let targetMouseActive = 0;
    let startedAt = performance.now();
    let geometry: Triangle | null = null;
    let program: Program | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    const removeListeners: Array<() => void> = [];
    const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const cleanup = () => {
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      removeListeners.forEach(remove => remove());
      geometry?.remove();
      program?.remove();
      if (renderer) {
        const canvas = renderer.gl.canvas;
        if (canvas.parentElement === container) canvas.remove();
        renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
    const mouse = new Float32Array([0.5, 0.5]);

    try {
      renderer = new Renderer({ webgl: 2, alpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.5), powerPreference: "low-power" });
      const gl = renderer.gl;
      if (!(gl instanceof WebGL2RenderingContext)) throw new Error("WebGL 2 is unavailable");
      const canvas = gl.canvas;
      canvas.setAttribute("aria-hidden", "true");
      container.appendChild(canvas);
      gl.clearColor(0, 0, 0, 0);
      geometry = new Triangle(gl);
      program = new Program(gl, {
        vertex: VERTEX,
        fragment: FRAGMENT,
        uniforms: {
          iTime: { value: 0 }, iResolution: { value: new Float32Array([1, 1]) }, uSpeed: { value: speed },
          uThreadCount: { value: threadCount }, uFrequency: { value: frequency }, uSpread: { value: spread },
          uTaper: { value: taper }, uPosition: { value: position }, uFanMode: { value: FAN_MODE[fanMode] },
          uGlow: { value: glow }, uFalloff: { value: falloff }, uThickness: { value: thickness },
          uBrightness: { value: brightness }, uOpacity: { value: opacity }, uMirror: { value: mirror ? 1 : 0 },
          uShimmer: { value: shimmer ? 1 : 0 }, uGrain: { value: grain ? 1 : 0 }, uGrainIntensity: { value: grainIntensity },
          uColor1: { value: new Float32Array(rgb(color1)) }, uColor2: { value: new Float32Array(rgb(color2)) }, uColor3: { value: new Float32Array(rgb(color3)) },
          uMouse: { value: mouse }, uMouseStrength: { value: mouseStrength }, uEnableMouse: { value: mouseInteraction ? 1 : 0 }, uMouseActive: { value: 0 },
        },
      });
      const activeProgram = program;
      const activeGeometry = geometry;
      const mesh = new Mesh(gl, { geometry: activeGeometry, program: activeProgram });

      const render = (time: number) => {
        if (disposed || lost) return;
        activeProgram.uniforms.iTime.value = reducedMotion ? 0 : (time - startedAt) * 0.001;
        currentMouseX += (targetMouseX - currentMouseX) * 0.06;
        currentMouseY += (targetMouseY - currentMouseY) * 0.06;
        currentMouseActive += (targetMouseActive - currentMouseActive) * 0.06;
        mouse[0] = currentMouseX; mouse[1] = currentMouseY;
        activeProgram.uniforms.uMouseActive.value = currentMouseActive;
        renderer!.render({ scene: mesh });
      };
      const canAnimate = () => visible && pageVisible && !reducedMotion && !lost && !disposed;
      const loop = (time: number) => {
        frame = 0;
        render(time);
        if (canAnimate()) frame = requestAnimationFrame(loop);
      };
      const start = () => { if (canAnimate() && !frame) frame = requestAnimationFrame(loop); };
      const resize = () => {
        const rect = container.getBoundingClientRect();
        renderer!.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
        const resolution = activeProgram.uniforms.iResolution.value as Float32Array;
        resolution[0] = gl.drawingBufferWidth; resolution[1] = gl.drawingBufferHeight;
        render(performance.now());
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      }, { threshold: 0 });
      intersectionObserver.observe(container);
      const onVisibility = () => { pageVisible = !document.hidden; if (pageVisible) start(); else stop(); };
      const activeMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onMotionChange = () => { reducedMotion = activeMotionQuery.matches; startedAt = performance.now(); if (reducedMotion) { stop(); render(performance.now()); } else start(); };
      const onMouseMove = (event: PointerEvent) => {
        if (!mouseInteraction || reducedMotion || event.pointerType !== "mouse") return;
        const rect = container.getBoundingClientRect();
        const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        targetMouseActive = inside ? 1 : 0;
        if (inside) { targetMouseX = (event.clientX - rect.left) / Math.max(1, rect.width); targetMouseY = 1 - (event.clientY - rect.top) / Math.max(1, rect.height); }
      };
      const onProgress = () => {
        if (!sceneReactive) return;
        const story = document.querySelector(".solar-story");
        const progress = story ? Number.parseFloat(getComputedStyle(story).getPropertyValue("--scene-progress")) || 0 : 0;
        const palette = progress < 0.5
          ? [mixColor(palettes.day[0], palettes.evening[0], progress * 2), mixColor(palettes.day[1], palettes.evening[1], progress * 2), mixColor(palettes.day[2], palettes.evening[2], progress * 2)]
          : [mixColor(palettes.evening[0], palettes.night[0], (progress - 0.5) * 2), mixColor(palettes.evening[1], palettes.night[1], (progress - 0.5) * 2), mixColor(palettes.evening[2], palettes.night[2], (progress - 0.5) * 2)];
        setColor(activeProgram.uniforms.uColor1, toHex(palette[0]));
        setColor(activeProgram.uniforms.uColor2, toHex(palette[1]));
        setColor(activeProgram.uniforms.uColor3, toHex(palette[2]));
        if (reducedMotion || !canAnimate()) render(performance.now());
      };
      const onContextLost = (event: Event) => { event.preventDefault(); lost = true; stop(); container.classList.add("web-threads-fallback"); canvas.remove(); container.dataset.webgl = "fallback"; };
      canvas.addEventListener("webglcontextlost", onContextLost);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pointermove", onMouseMove, { passive: true });
      window.addEventListener("solar-scene-progress", onProgress);
      activeMotionQuery.addEventListener("change", onMotionChange);
      removeListeners.push(
        () => canvas.removeEventListener("webglcontextlost", onContextLost),
        () => document.removeEventListener("visibilitychange", onVisibility),
        () => window.removeEventListener("pointermove", onMouseMove),
        () => window.removeEventListener("solar-scene-progress", onProgress),
        () => activeMotionQuery.removeEventListener("change", onMotionChange),
      );
      container.dataset.webgl = "ready";
      visible = container.getBoundingClientRect().bottom > 0 && container.getBoundingClientRect().top < window.innerHeight;
      if (sceneReactive) onProgress();
      start();

    } catch {
      cleanup();
      container.dataset.webgl = "fallback";
      container.classList.add("web-threads-fallback");
    }

    return cleanup;
  }, [color1, color2, color3, speed, threadCount, frequency, spread, taper, position, fanMode, glow, falloff, thickness, brightness, opacity, mirror, shimmer, grain, grainIntensity, mouseInteraction, mouseStrength, sceneReactive]);

  return <div ref={containerRef} className={`web-threads-container ${className}`.trim()} aria-hidden="true"/>;
}
