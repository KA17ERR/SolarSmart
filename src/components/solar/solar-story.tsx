"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, House, PanelsTopLeft, ChartNoAxesCombined } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { useAuthStatus } from "@/components/auth-state";
import { CinematicSolarScene } from "@/components/solar/cinematic-solar-scene";
import { AnimatedText } from "@/components/animations/AnimatedText";

const scenes = [
  { title: "Turn sunlight into energy for your home.", detail: "Explore a solar system designed around your roof and electricity use.", aria: "Daylight reaches a rooftop solar array." },
  { title: "Save today’s sunlight for later.", detail: "Explore how solar generation and storage can work together.", aria: "Sunset light falls across the same rooftop solar home." },
  { title: "Power your home after sunset.", detail: "Plan around your roof, your electricity use, and your priorities.", aria: "At night, warm interior light glows inside the same solar home." },
] as const;

function phaseFor(progress: number) { return progress < .34 ? 0 : progress < .67 ? 1 : 2; }
function setSceneFrame(section: HTMLElement, progress: number) {
  section.style.setProperty("--scene-progress", progress.toFixed(4));
  section.style.setProperty("--scene-sky", skyAt(progress));
  section.style.setProperty("--scene-mask-x", `${150 - progress * 57}%`);
  section.style.setProperty("--scene-mask-y", `${150 - progress * 34}%`);
  window.dispatchEvent(new Event("solar-scene-progress"));
}
function skyAt(progress: number) {
  const day = [9, 24, 43], dusk = [52, 38, 48], night = [5, 12, 29];
  const from = progress < .5 ? day : dusk;
  const to = progress < .5 ? dusk : night;
  const local = progress < .5 ? progress * 2 : (progress - .5) * 2;
  return from.map((value, index) => Math.round(value + (to[index] - value) * local).toString()).join(", ");
}

export function SolarStory() {
  const root = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const authenticated = useAuthStatus() === "authenticated";

  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = media.matches;
    const updateReduced = () => { reduce = media.matches; setReducedMotion(reduce); };
    updateReduced();
    media.addEventListener("change", updateReduced);
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (reduce) return;
        const bounds = section.getBoundingClientRect();
        const travel = Math.max(1, section.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -bounds.top / travel));
        setSceneFrame(section, progress);
        const next = phaseFor(progress);
        setPhase(current => current === next ? current : next);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); media.removeEventListener("change", updateReduced); };
  }, []);

  function selectPhase(next: number) {
    if (!root.current) return;
    const progress = [0, .5, 1][next];
    setSceneFrame(root.current, progress);
    setPhase(next);
  }

  function exploreEnergyFlow() {
    const section = root.current;
    if (!section) return;
    if (reducedMotion) { selectPhase(1); return; }
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top + travel * .5, behavior: "smooth" });
  }

  return <>
    <section className="solar-story" id="home" aria-label="SolarSmart solar energy story" ref={root}>
      <SiteHeader/>
      <div className="solar-scene-pin" aria-live="off">
        <div className="solar-sunlight-overlay" aria-hidden="true"/>
        <CinematicSolarScene stage={phase} flow="day"/>
        <div className="scene-atmosphere" aria-hidden="true"/>
        <div className="scene-copy" data-phase={phase} aria-live="polite" aria-atomic="true">
          <p className="scene-eyebrow">A roof can be a source of energy</p>
          <AnimatedText key={`scene-title-${phase}`} as="h1" text={scenes[phase].title} effect="blur" delay={55} className="scene-heading-reveal"/>
          <AnimatedText key={`scene-detail-${phase}`} as="p" text={scenes[phase].detail} effect="blur" delay={18} className="scene-subtitle scene-copy-reveal"/>
          {authenticated && <Link href="/planner" className="scene-primary-cta">Design My Solar System <ArrowRight size={17} aria-hidden="true"/></Link>}
          <button type="button" className="scene-secondary-cta" onClick={exploreEnergyFlow}>Explore the Energy Flow <ArrowDown size={16} aria-hidden="true"/></button>
        </div>
        <div className="scene-state-label" role="status">{["DAY · GENERATE", "EVENING · STORE", "NIGHT · USE"][phase]}</div>
        <div className="scene-scroll-hint" aria-hidden="true"><span>Scroll to follow your energy</span><ArrowDown size={16}/></div>
        {reducedMotion && <div className="scene-phase-controls" role="group" aria-label="Explore the solar scene"><button type="button" aria-pressed={phase === 0} onClick={() => selectPhase(0)}>Day</button><button type="button" aria-pressed={phase === 1} onClick={() => selectPhase(1)}>Evening</button><button type="button" aria-pressed={phase === 2} onClick={() => selectPhase(2)}>Night</button></div>}
        <span className="scene-sr-only">{scenes[phase].aria}</span>
      </div>
    </section>
    <section className="home-steps" id="how-it-works" aria-labelledby="steps-title">
      <div className="home-steps-inner"><p className="landing-eyebrow">A simple place to begin</p><AnimatedText as="h2" id="steps-title" effect="scroll" text="From roof to a clearer solar plan." className="home-steps-title" baseOpacity={0.72} enableBlur blurStrength={1} baseRotation={0}/>
        <ol><li><span><House size={20}/></span><strong>Choose your home</strong><p>Use the sample property or enter approximate roof dimensions.</p></li><li><span><PanelsTopLeft size={20}/></span><strong>Place your panels</strong><p>Adjust a schematic layout and tell us about your energy use.</p></li><li><span><ChartNoAxesCombined size={20}/></span><strong>See your estimate</strong><p>Explore modeled generation, cost, savings, and next steps.</p></li></ol>
      </div>
    </section>
    <section className="home-closing" id="about"><p className="landing-eyebrow">A clear place to start</p><AnimatedText as="h2" effect="scroll" text="Your roof. Your energy. Your plan." className="home-closing-title" baseOpacity={0.76} enableBlur blurStrength={1} baseRotation={0}/><p>Explore how a rooftop solar system could fit your home.</p>{authenticated && <><Link href="/planner" className="scene-primary-cta">Build My Solar <ArrowRight size={17}/></Link><Link href="/assessment?scenario=balanced#dashboard" className="home-sample-link">Open your solar assessment</Link></>}</section>
  </>;
}
