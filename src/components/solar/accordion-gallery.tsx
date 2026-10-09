"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";

export type GalleryItem = { id: string; image: string; label: string; description: string; href: string; alt: string };
export const ACCORDION_GALLERY_ITEMS: GalleryItem[] = [
  { id: "system-overview", image: "/images/solar-home-day.png", label: "System overview", description: "A rooftop plan, sized from the current assessment.", href: "#dashboard", alt: "Illustrative modern home with rooftop solar panels in daylight" },
  { id: "energy-production", image: "/images/gallery/generation.svg", label: "Energy production", description: "Explore modeled generation against household use.", href: "#generation-chart", alt: "Original illustration of a solar panel roof in sunlight" },
  { id: "consumption-savings", image: "/images/gallery/energy-use.svg", label: "Consumption & savings", description: "See modeled bill savings and remaining utility costs.", href: "#savings-chart", alt: "Original illustration of energy flowing between a solar home and the grid" },
  { id: "scenario-comparison", image: "/images/gallery/storage.svg", label: "Compare scenarios", description: "Try the built-in small, medium, and shaded roof examples.", href: "#scenarios", alt: "Original illustration of a solar battery, inverter, and panel array" },
  { id: "project-assumptions", image: "/images/gallery/roof-assumptions.svg", label: "Assumptions & details", description: "Review input sources, model defaults, and limitations.", href: "#assumptions", alt: "Original illustration of roof direction, panel layout, and sun angle" },
];
export function nextAccordionGalleryIndex(index: number, key: string): number | null {
  const offset = key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  return offset ? (index + offset + ACCORDION_GALLERY_ITEMS.length) % ACCORDION_GALLERY_ITEMS.length : null;
}

/** Compact visual navigation to real sections in this current assessment. */
export function AccordionGallery() {
  const [active, setActive] = useState(0);
  const panelRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  function onKeyDown(index: number, event: KeyboardEvent<HTMLAnchorElement>) {
    const next = nextAccordionGalleryIndex(index, event.key);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    panelRefs.current[next]?.focus();
  }

  return <section className="dashboard-gallery-section" aria-labelledby="dashboard-gallery-title">
    <div className="dashboard-gallery-heading"><div><p className="eyebrow">Explore your results</p><h2 id="dashboard-gallery-title">Your solar plan, at a glance</h2><p>Choose a view to jump to that part of this assessment.</p></div><span className="gallery-local-label">Local solar illustrations</span></div>
    <nav className="accordion-gallery" aria-label="Explore sections of this assessment">
      {ACCORDION_GALLERY_ITEMS.map((item, index) => <a key={item.id} ref={node => { panelRefs.current[index] = node; }} href={item.href} className={`ag-panel${active === index ? " ag-panel-active" : ""}`} aria-label={`${item.label}. ${item.description}`} aria-current={active === index ? "true" : undefined} onClick={() => { const target = document.getElementById(item.href.slice(1)); target?.closest("details")?.setAttribute("open", ""); }} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onKeyDown={event => onKeyDown(index, event)}>
        <span className="ag-panel-image"><Image src={item.image} alt={item.alt} fill sizes="(max-width: 680px) 100vw, 52vw" unoptimized/></span><span className="ag-panel-shade" aria-hidden="true"/><span className="ag-panel-label"><strong>{item.label}</strong><span>{item.description}</span></span><span className="ag-panel-action" aria-hidden="true"><ArrowUpRight size={16}/></span>
      </a>)}
    </nav>
  </section>;
}
