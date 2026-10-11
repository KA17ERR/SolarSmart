"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Home, Menu, Sun, X } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { LogoutButton, useAuthStatus } from "@/components/auth-state";
import { getHomeHref, getNavigationHref, getNavigationVisibility, getVisibleNavigationLinks, MAIN_NAVIGATION_LINKS } from "@/lib/navigation";

export function SiteHeader({ showMainMenuLink = false, accordionOnly = false }: { showMainMenuLink?: boolean; accordionOnly?: boolean }) {
  const pathname = usePathname();
  const authStatus = useAuthStatus();
  const { authenticated, unauthenticated } = getNavigationVisibility(authStatus);
  const visibleLinks = getVisibleNavigationLinks(authenticated);
  const inAssessment = pathname.startsWith("/assessment");
  const inPlanner = pathname.startsWith("/planner");
  const inDashboard = pathname.startsWith("/dashboard");
  const [active, setActive] = useState(inAssessment ? "assessment" : inDashboard ? "dashboard" : inPlanner ? "planner" : "home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasDashboard, setHasDashboard] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => { setPortalReady(true); }, []);

  useEffect(() => {
    const dashboardAvailable = !!document.getElementById("dashboard");
    setHasDashboard(dashboardAvailable);
    setActive(inAssessment ? "assessment" : inDashboard ? "dashboard" : inPlanner ? "planner" : "home");
    const targets = MAIN_NAVIGATION_LINKS.map(link => document.getElementById(link.id)).filter((target): target is HTMLElement => target !== null);
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
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); };
  }, [menuOpen]);

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header ref={headerRef} className={`site-header${showMainMenuLink ? " has-main-menu-link" : ""}${accordionOnly ? " accordion-only-header" : ""}`}>
      <div className="site-header-inner">
        {!accordionOnly && <a className="site-brand" href={getHomeHref(pathname)} onClick={() => setMenuOpen(false)} aria-label="SolarSmart home">
          <span className="site-brand-mark"><Sun size={19} aria-hidden="true"/></span>
          <span>Solar<span className="site-brand-light">Smart</span><small>ROOFTOP SOLAR, MADE CLEAR</small></span>
        </a>}
        {showMainMenuLink && <Link className="header-main-menu-link" href={getHomeHref(pathname)} aria-label="Main Menu"><Home size={15} aria-hidden="true"/><span>Main Menu</span></Link>}
        <button type="button" className={`card-nav-toggle${menuOpen ? " open" : ""}`} aria-label={menuOpen ? "Close Explore navigation" : "Explore navigation"} aria-expanded={menuOpen} aria-controls="main-card-navigation" onClick={() => setMenuOpen(open => !open)}>
          <Menu className="card-nav-menu-icon" size={18} aria-hidden="true" />{menuOpen ? <X className="card-nav-mobile-close" size={18} aria-hidden="true" /> : null}<span className="card-nav-label">Explore</span><ChevronDown className="card-nav-chevron" size={15} aria-hidden="true" />
        </button>
      {authStatus === "loading" && <span className="header-auth-skeleton" aria-label="Restoring account navigation"/>}
      {unauthenticated && <><Link className="header-login" href="/login">Log in</Link><Link className="header-login" href="/signup">Sign up</Link></>}
      {authenticated && <><Link className="header-login" href="/dashboard">Energy Dashboard</Link><ButtonLink className="header-cta" href="/planner">Build My Solar <span aria-hidden="true">→</span></ButtonLink><LogoutButton className="header-login header-sign-out"/></>}
      </div>
      {portalReady && createPortal(<nav ref={menuRef} id="main-card-navigation" className={`card-nav-content${menuOpen ? " open" : ""}`} aria-label="Main navigation" aria-hidden={!menuOpen}>
        {visibleLinks.map(link => { const index = MAIN_NAVIGATION_LINKS.findIndex(item => item.id === link.id); const kicker = link.id === "how-it-works" ? "Discover" : link.id === "planner" ? "Design" : link.id === "assessment" ? "Review" : "Explore"; const description = link.id === "how-it-works" ? "See how a solar plan comes together." : link.id === "planner" ? "Build a plan around your roof and energy use." : link.id === "assessment" ? "Review an estimate with your project inputs." : "Explore modeled generation, savings, and assumptions."; return <a key={link.id} href={getNavigationHref(link.id, pathname, hasDashboard)} className={`nav-card${index === MAIN_NAVIGATION_LINKS.length - 1 ? " nav-card-accent" : ""}${active === link.id ? " active" : ""}`} aria-current={active === link.id ? "location" : undefined} tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} onKeyDown={event => { if (event.key === "Escape") setMenuOpen(false); }}>
          <span className="nav-card-kicker">{kicker}</span><strong>{link.label}</strong><span className="nav-card-description">{description}</span><span className="nav-card-link">Open section <ArrowUpRight size={15} aria-hidden="true" /></span>
        </a>; })}
        {unauthenticated && <><Link className="nav-card auth-nav-card" href="/login" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)}><span className="nav-card-kicker">Account</span><strong>Log in</strong><span className="nav-card-link">Sign in to your account <ArrowUpRight size={15}/></span></Link><Link className="nav-card auth-nav-card" href="/signup" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)}><span className="nav-card-kicker">New here?</span><strong>Sign up</strong><span className="nav-card-link">Create an account <ArrowUpRight size={15}/></span></Link></>}
      </nav>, document.body)}
    </header>
  </>;
}
