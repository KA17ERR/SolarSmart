"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { SolarInputs } from "@/lib/solar";

export type GalleryItem = { id: string; image: string; label: string; description: string; href: string; alt: string };
export const ACCORDION_GALLERY_ITEMS: GalleryItem[] = [
  { id: "system-overview", image: "/images/gallery/solar-home-day.webp", label: "Solar System", description: "Review your system overview and modeled capacity.", href: "/assessment/insights/system-overview", alt: "Wide view of a contemporary home with rooftop photovoltaic panels in daylight" },
  { id: "energy-production", image: "/images/gallery/solar-panels-closeup.webp", label: "Energy Generation", description: "Explore estimated generation against household use.", href: "/assessment/insights/energy-generation", alt: "Close-up of photovoltaic cells catching warm natural sunlight" },
  { id: "consumption-savings", image: "/images/gallery/solar-battery-installation.webp", label: "Consumption and Savings", description: "See modeled bill savings and remaining utility costs.", href: "/assessment/insights/consumption-savings", alt: "Residential solar installation with wall-mounted battery storage" },
  { id: "scenario-comparison", image: "/images/gallery/solar-analytics.webp", label: "Scenario Comparison", description: "Compare system options and their estimated results.", href: "/assessment/insights/scenario-comparison", alt: "Solar energy analytics displayed beside a view of rooftop panels" },
  { id: "project-assumptions", image: "/images/gallery/solar-roof-orientation.webp", label: "System Assumptions", description: "Review input sources, model defaults, and limitations.", href: "/assessment/insights/system-assumptions", alt: "Oblique view of roof geometry and aligned photovoltaic panels" },
];
export function nextAccordionGalleryIndex(index: number, key: string): number | null {
  const offset = key === "ArrowRight" || key === "ArrowDown" ? 1 : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  return offset ? (index + offset + ACCORDION_GALLERY_ITEMS.length) % ACCORDION_GALLERY_ITEMS.length : null;
}

/** Visual navigation to dedicated explanation pages for this assessment. */
export function AccordionGallery({ scenarioId = "balanced", initialInputs }: { scenarioId?: string; initialInputs?: SolarInputs }) {
  const [active, setActive] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const panelRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  function onKeyDown(index: number, event: KeyboardEvent<HTMLAnchorElement>) {
    const next = nextAccordionGalleryIndex(index, event.key);
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    panelRefs.current[next]?.focus();
  }

  return <section className="dashboard-gallery-section" id="dashboard-gallery" aria-label="Energy dashboard topics">
    <nav className="accordion-gallery" aria-label="Explore sections of this assessment">
      {ACCORDION_GALLERY_ITEMS.map((item, index) => {
        const query = new URLSearchParams({ scenario: scenarioId });
        if (initialInputs) query.set("inputs", JSON.stringify(initialInputs));
        return <a key={item.id} ref={node => { panelRefs.current[index] = node; }} href={`${item.href}?${query.toString()}`} className={`ag-panel ag-panel-${item.id}${active === index ? " ag-panel-active" : ""}`} aria-label={`${item.label}. ${item.description}`} onClick={() => setActive(index)} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onKeyDown={event => onKeyDown(index, event)}>
        <span className={`ag-panel-image${failedImages.includes(item.id) ? " ag-panel-image-failed" : ""}`}>{!failedImages.includes(item.id) && <Image src={item.image} alt={item.alt} fill sizes="100vw" unoptimized onError={() => setFailedImages(current => current.includes(item.id) ? current : [...current, item.id])}/>}</span><span className="ag-panel-shade" aria-hidden="true"/><span className="ag-panel-label"><strong>{item.label}</strong><span>{item.description}</span></span><span className="ag-panel-action" aria-hidden="true"><ArrowUpRight size={18}/></span>
      </a>;
      })}
    </nav>
  </section>;
}
