"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Leaf, ShieldCheck, Sun } from "lucide-react";

export function SiteFooter() {
  const pathname = usePathname();
  const inAssessment = pathname.startsWith("/assessment");
  const inComparison = pathname.startsWith("/assessment/compare");
  const onHome = pathname === "/";
  const [hasDashboard, setHasDashboard] = useState(false);
  useEffect(() => { setHasDashboard(Boolean(document.getElementById("dashboard"))); }, [pathname]);
  const home = onHome ? "#home" : "/#home";
  const assessment = inComparison ? "/assessment#estimate" : inAssessment ? hasDashboard ? "#estimate" : "#solar-assessment" : "/assessment#estimate";
  const howItWorks = onHome ? "#how-it-works" : "/#how-it-works";
  const about = onHome ? "#about" : "/#about";
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="footer-brand"><a className="site-brand footer-mark" href={home}><span className="site-brand-mark"><Sun size={17} aria-hidden="true"/></span><span>Solar<span className="site-brand-light">Smart</span></span></a><p>Clear early estimates for a brighter energy decision.</p></div>
      <nav className="footer-links" aria-label="Footer navigation"><a href={assessment}>Solar assessment</a><a href={howItWorks}>How it works</a><a href={about}>About this estimate</a></nav>
      <div className="footer-note"><ShieldCheck size={16} aria-hidden="true"/><span>Local demo · no account required</span><Leaf size={15} aria-hidden="true"/></div>
    </div>
    <div className="footer-bottom"><span>© SolarSmart · Planning estimates only</span><a href={about}>Assumptions & limitations</a></div>
  </footer>;
}
