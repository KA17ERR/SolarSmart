"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Sun, X } from "lucide-react";
import { ButtonLink } from "@/components/ui";

const links = [
  { label: "How It Works", id: "how-it-works" },
  { label: "Solar Planner", id: "planner" },
  { label: "Energy Dashboard", id: "dashboard" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const inAssessment = pathname.startsWith("/assessment");
  const inPlanner = pathname.startsWith("/planner");
  const inDashboard = pathname.startsWith("/dashboard");
  const [active, setActive] = useState(inAssessment || inDashboard ? "dashboard" : inPlanner ? "planner" : "home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasDashboard, setHasDashboard] = useState(false);

  function hrefFor(id: string) {
    if (id === "planner") return "/planner";
    if (id === "dashboard") return inAssessment && hasDashboard ? "#dashboard" : "/dashboard";
    if (id === "how-it-works" && !inAssessment && !inPlanner) return "#how-it-works";
    return `/#${id}`;
  }

  useEffect(() => {
    const dashboardAvailable = !!document.getElementById("dashboard");
    setHasDashboard(dashboardAvailable);
    setActive(inAssessment ? dashboardAvailable ? "dashboard" : "home" : inDashboard ? "dashboard" : inPlanner ? "planner" : "home");
    const targets = links.map(link => document.getElementById(link.id)).filter((target): target is HTMLElement => target !== null);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: "-105px 0px -58% 0px", threshold: [0, .15, .35, .6] });
    targets.forEach(target => observer.observe(target));
    const onHashChange = () => { if (location.hash) setActive(location.hash.slice(1)); };
    window.addEventListener("hashchange", onHashChange);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", onHashChange); };
  }, [inAssessment, inDashboard, inPlanner]);

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
        <a className="site-brand" href={inAssessment || inPlanner ? "/#home" : "#home"} onClick={() => setMenuOpen(false)} aria-label="SolarSmart home">
          <span className="site-brand-mark"><Sun size={19} aria-hidden="true"/></span>
          <span>Solar<span className="site-brand-light">Smart</span><small>ROOFTOP SOLAR, MADE CLEAR</small></span>
        </a>
        <nav className="primary-nav" aria-label="Main navigation">
          {links.map(link => <a key={link.id} href={hrefFor(link.id)} className={active === link.id ? "primary-nav-link active" : "primary-nav-link"} aria-current={active === link.id ? "location" : undefined}>{link.label}</a>)}
        </nav>
        <a className="header-login" href="/login">Log in</a>
        <ButtonLink className="header-cta" href="/planner">Build My Solar <span aria-hidden="true">→</span></ButtonLink>
        <button type="button" className="mobile-menu-toggle" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button>
      </div>
      <nav id="mobile-navigation" className={menuOpen ? "mobile-nav open" : "mobile-nav"} aria-label="Mobile navigation" hidden={!menuOpen}>
        {links.map(link => <a key={link.id} href={hrefFor(link.id)} className={active === link.id ? "mobile-nav-link active" : "mobile-nav-link"} aria-current={active === link.id ? "location" : undefined} onClick={() => setMenuOpen(false)}>{link.label}</a>)}
        <a href="/login" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Log in</a>
        <ButtonLink href="/planner" className="mobile-cta">Build My Solar <span aria-hidden="true">→</span></ButtonLink>
      </nav>
    </header>
  </>;
}
