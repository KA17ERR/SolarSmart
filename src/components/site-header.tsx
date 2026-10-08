"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Sun, X } from "lucide-react";
import { ButtonLink } from "@/components/ui";

const links = [
  { label: "Home", id: "home" },
  { label: "Solar Assessment", id: "solar-assessment" },
  { label: "Dashboard", id: "dashboard" },
  { label: "How It Works", id: "how-it-works" },
  { label: "About", id: "about" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const inAssessment = pathname.startsWith("/assessment");
  const inComparison = pathname.startsWith("/assessment/compare");
  const [active, setActive] = useState(inAssessment ? "dashboard" : "home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasDashboard, setHasDashboard] = useState(false);

  function hrefFor(id: string) {
    if (inComparison) return id === "home" ? "/#home" : id === "dashboard" ? "/assessment?scenario=balanced#dashboard" : id === "solar-assessment" ? "/assessment#estimate" : `/#${id}`;
    if (inAssessment) return id === "home" ? "/#home" : id === "dashboard" ? (hasDashboard ? "#dashboard" : "/assessment?scenario=balanced#dashboard") : id === "solar-assessment" ? (hasDashboard ? "#estimate" : "#solar-assessment") : hasDashboard && id === "about" ? "#about" : `/#${id}`;
    if (id === "solar-assessment") return "/assessment#estimate";
    if (id === "dashboard") return "/assessment?scenario=balanced#dashboard";
    return `#${id}`;
  }

  useEffect(() => {
    const dashboardAvailable = !!document.getElementById("dashboard");
    setHasDashboard(dashboardAvailable);
    setActive(inAssessment ? dashboardAvailable ? "dashboard" : "solar-assessment" : "home");
    const targets = links.map(link => document.getElementById(link.id)).filter((target): target is HTMLElement => target !== null);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-105px 0px -58% 0px", threshold: [0, .15, .35, .6] });
    targets.forEach(target => observer.observe(target));
    const onHashChange = () => { if (location.hash) setActive(location.hash.slice(1)); };
    window.addEventListener("hashchange", onHashChange);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", onHashChange); };
  }, [inAssessment]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <div className="site-header-inner">
        <a className="site-brand" href={inAssessment ? "/#home" : "#home"} onClick={() => setMenuOpen(false)} aria-label="SolarSmart home">
          <span className="site-brand-mark"><Sun size={19} aria-hidden="true"/></span>
          <span>Solar<span className="site-brand-light">Smart</span><small>ROOFTOP SOLAR, MADE CLEAR</small></span>
        </a>
        <nav className="primary-nav" aria-label="Main navigation">
          {links.map(link => <a key={link.id} href={hrefFor(link.id)} className={active === link.id ? "primary-nav-link active" : "primary-nav-link"} aria-current={active === link.id ? "location" : undefined}>{link.label}</a>)}
        </nav>
        <ButtonLink className="header-cta" href={inComparison ? "/assessment#estimate" : inAssessment ? hasDashboard ? "#estimate" : "#solar-assessment" : "/assessment#estimate"}>Check My Solar Potential <span aria-hidden="true">→</span></ButtonLink>
        <button type="button" className="mobile-menu-toggle" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
      </div>
      <nav id="mobile-navigation" className={menuOpen ? "mobile-nav open" : "mobile-nav"} aria-label="Mobile navigation" hidden={!menuOpen}>
        {links.map(link => <a key={link.id} href={hrefFor(link.id)} className={active === link.id ? "mobile-nav-link active" : "mobile-nav-link"} aria-current={active === link.id ? "location" : undefined} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
        <ButtonLink href={inComparison ? "/assessment#estimate" : inAssessment ? hasDashboard ? "#estimate" : "#solar-assessment" : "/assessment#estimate"} className="mobile-cta">Check My Solar Potential <span aria-hidden="true">→</span></ButtonLink>
      </nav>
    </header>
  </>;
}
