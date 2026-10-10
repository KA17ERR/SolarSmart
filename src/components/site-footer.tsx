"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Compass, Info, Leaf, ShieldCheck, Sun } from "lucide-react";
import { Dialog } from "@/components/ui";
import { Button } from "@/components/ui";

export function SiteFooter() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [aboutOpen, setAboutOpen] = useState(false);
  const home = onHome ? "#home" : "/#home";
  const assessment = "/assessment#estimate";
  const howItWorks = onHome ? "#how-it-works" : "/#how-it-works";
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="footer-brand"><a className="site-brand footer-mark" href={home}><span className="site-brand-mark"><Sun size={17} aria-hidden="true"/></span><span>Solar<span className="site-brand-light">Smart</span></span></a><p>Clear early estimates for a brighter energy decision.</p></div>
      <nav className="footer-links footer-dock" aria-label="Explore SolarSmart">
        <a href={assessment}><ClipboardCheck size={18} aria-hidden="true"/><span>Solar assessment</span><ArrowUpRight className="footer-dock-arrow" size={14} aria-hidden="true"/></a>
        <a href={howItWorks}><Compass size={18} aria-hidden="true"/><span>How it works</span><ArrowUpRight className="footer-dock-arrow" size={14} aria-hidden="true"/></a>
        <Button variant="quiet" className="footer-dock-about" onClick={() => setAboutOpen(true)}><Info size={18} aria-hidden="true"/><span>About this estimate</span></Button>
      </nav>
      <div className="footer-note"><ShieldCheck size={16} aria-hidden="true"/><span>Local demo · no account required</span><Leaf size={15} aria-hidden="true"/></div>
    </div>
    <div className="footer-bottom"><span>© SolarSmart · Planning estimates only</span><Link href="/assessment/insights/system-assumptions">Assumptions &amp; limitations</Link></div>
    <Dialog open={aboutOpen} title="About this estimate" onClose={() => setAboutOpen(false)}>
      <div className="estimate-about-copy">
        <p>SolarSmart calculates an early planning estimate from the roof, energy-use, tariff, and system-cost inputs shown in your assessment. It is a deterministic model, not a site survey, utility quote, or guarantee.</p>
        <h3>What the model includes</h3>
        <ul><li>Estimated generation uses generic peak sun-hours, orientation, shade, and an 80% system performance factor.</li><li>Generation degrades by the model default of 0.5% per year.</li><li>On-site solar use uses the model default of 75%; remaining generation is exported at the compensation rate entered or assumed (zero when unspecified).</li><li>Bill projections use the annual electricity escalation entered for the assessment; the sample default is 3%.</li></ul>
        <h3>What to verify</h3>
        <p>Sun-hours, roof availability, utility rates, export rules, installed cost, and incentives may be user-entered or illustrative defaults. The model does not fetch live weather, tariff, or incentive data. Financing, maintenance, taxes, and battery savings are excluded. Review <Link href="/assessment/insights/system-assumptions" onClick={() => setAboutOpen(false)}>assumptions and limitations</Link> for the inputs used in this estimate.</p>
      </div>
    </Dialog>
  </footer>;
}
