import Link from "next/link";
import { ArrowDownRight, ArrowRight, Check, CloudSun, FileCheck2, GitCompare, House, Leaf, LockKeyhole, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SampleReportDialog } from "@/components/solar/sample-report-dialog";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { calculateSolar } from "@/lib/solar";

const balancedScenario = DEMO_SCENARIOS.find(scenario => scenario.id === "balanced")!;
const balancedEstimate = calculateSolar(balancedScenario.inputs);
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const features = [
  { icon: House, title: "Roof-aware feasibility", text: "Estimate a system size constrained by usable roof area, with orientation and shade factors made visible." },
  { icon: Wallet, title: "Costs, savings & payback", text: "Explore first-year bill savings, assumed net cost, and simple payback from the values you enter." },
  { icon: GitCompare, title: "Compare what-if scenarios", text: "Switch between three fictional roof and exposure profiles, or edit assumptions for a custom case." },
  { icon: Leaf, title: "Environmental context", text: "See modeled annual CO₂ avoided using a clearly disclosed generic grid factor." },
  { icon: SlidersHorizontal, title: "Transparent assumptions", text: "Inspect and edit the rate, sun-hours, system cost, usable roof share, shade, and bill offset." },
  { icon: Sparkles, title: "Optional plain-language help", text: "Read a deterministic local explanation. An optional Strands service can explain supplied results when configured." },
];

const journey = [
  { number: "01", icon: House, title: "Add property and bill details", text: "Start with the sample values or replace them with your approximate roof area, monthly bill, and rate assumption.", href: "/assessment#estimate", action: "Enter assumptions" },
  { number: "02", icon: Sun, title: "Calculate a planning estimate", text: "A deterministic local model estimates roof-constrained capacity, annual generation, and first-year savings.", href: "/assessment?scenario=balanced#dashboard", action: "See a sample estimate" },
  { number: "03", icon: ArrowDownRight, title: "Compare results and next steps", text: "Review the scenario range, methodology, limitations, and practical questions to take to a qualified installer.", href: "/assessment?scenario=balanced#scenarios", action: "Compare scenarios" },
];

export default function Home() {
  return <div className="app-shell landing-shell">
    <SiteHeader/>
    <main className="main" id="main-content" tabIndex={-1}>
      <section className="landing-hero" id="home" aria-labelledby="landing-title">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <Badge variant="success"><span className="demo-indicator"/> Free local demo · No account required</Badge>
            <p className="landing-eyebrow">Rooftop solar, made clear</p>
            <h1 id="landing-title">Discover what rooftop solar could mean for your home.</h1>
            <p className="landing-lede">Get an understandable early estimate of roof capacity, energy production, costs, savings, payback, and environmental impact—all from assumptions you can see and change.</p>
            <div className="landing-hero-actions">
              <ButtonLink href="/assessment#estimate" className="landing-primary">Check My Solar Potential <ArrowRight size={16} aria-hidden="true"/></ButtonLink>
              <SampleReportDialog/>
            </div>
            <ul className="hero-trust-list" aria-label="Demo benefits"><li><Check size={14} aria-hidden="true"/> Works without credentials</li><li><Check size={14} aria-hidden="true"/> Calculated locally</li></ul>
          </div>
          <DashboardPreview/>
        </div>
      </section>

      <section className="problem-section landing-container" id="problem" aria-labelledby="problem-title">
        <div className="section-intro"><p className="landing-eyebrow">From uncertainty to a clearer first step</p><h2 id="problem-title">Solar decisions involve more than a panel count.</h2><p>Property owners often have to piece together roof suitability, possible system size, costs, bill savings, payback, and environmental impact from separate sources.</p></div>
        <div className="problem-solution">
          <Card as="article" className="problem-card"><p className="eyebrow">The challenge</p><ul><li>Is there enough usable roof area?</li><li>How do shade and orientation affect a possible system?</li><li>Which cost and bill assumptions shape payback?</li><li>What should be verified with local professionals?</li></ul></Card>
          <div className="solution-connector" aria-hidden="true"><ArrowRight size={20}/></div>
          <Card as="article" className="solution-card"><div className="solution-icon"><Sun size={18} aria-hidden="true"/></div><p className="eyebrow">One understandable view</p><h3>Bring the early estimate together.</h3><p>SolarSmart uses a transparent calculator to turn editable inputs into one roof-aware planning view, with comparisons and next steps in context.</p><ButtonLink href="/assessment#estimate" variant="quiet">Build my estimate <ArrowRight size={15} aria-hidden="true"/></ButtonLink></Card>
        </div>
      </section>

      <section className="features-section" id="features" aria-labelledby="features-title">
        <div className="landing-container"><div className="section-intro centered-intro"><p className="landing-eyebrow">A practical planning toolkit</p><h2 id="features-title">The questions you have, in one place.</h2><p>Each result comes from the displayed assumptions and the same deterministic calculation engine.</p></div>
          <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <Card as="article" className="feature-card" key={title}><span className="feature-icon" aria-hidden="true"><Icon size={19}/></span><span className="feature-index">0{index + 1}</span><h3>{title}</h3><p>{text}</p></Card>)}</div>
        </div>
      </section>

      <section className="journey-section landing-container" id="how-it-works" aria-labelledby="journey-title">
        <div className="section-intro"><p className="landing-eyebrow">A simple three-step journey</p><h2 id="journey-title">From a few assumptions to a better conversation.</h2><p>Start with a local estimate. Use it to decide what information to verify next.</p></div>
        <ol className="journey-grid">{journey.map(({ number, icon: Icon, title, text, href, action }) => <li key={number}><Card as="article" className="journey-card"><span className="journey-number">{number}</span><span className="feature-icon" aria-hidden="true"><Icon size={19}/></span><h3>{title}</h3><p>{text}</p><Link href={href} className="text-link">{action} <ArrowRight size={14} aria-hidden="true"/></Link></Card></li>)}</ol>
      </section>

      <section className="demo-section" id="demo-preview" aria-labelledby="demo-title">
        <div className="landing-container"><div className="section-heading demo-heading"><div><p className="landing-eyebrow">Real calculator · Fictional inputs</p><h2 id="demo-title">Preview the range, then open the live assessment.</h2><p>These sample cards use the same calculator as the dashboard; choose one to open its editable scenario.</p></div><Badge variant="outline"><span className="demo-indicator"/> Illustrative demo data</Badge></div>
          <div className="demo-scenario-grid">{DEMO_SCENARIOS.map(scenario => {
            const estimate = calculateSolar(scenario.inputs);
            return <Link href={`/assessment?scenario=${scenario.id}#dashboard`} className="demo-scenario-link" key={scenario.id} aria-label={`Open live ${scenario.name} assessment`}>
              <Card as="article" className="demo-scenario-card"><div className="demo-scenario-top"><span className="feature-icon"><House size={17} aria-hidden="true"/></span><span className="demo-open-label">Open live view <ArrowRight size={13}/></span></div><h3>{scenario.name}</h3><p>{scenario.description}</p><div className="demo-values"><div><span>Modeled size</span><strong>{estimate.systemKw.toFixed(1)} kW</strong></div><div><span>First-year savings</span><strong>{money(estimate.annualSavings)}</strong></div><div><span>Simple payback</span><strong>{estimate.paybackYears === null ? "—" : `${estimate.paybackYears.toFixed(1)} yrs`}</strong></div></div><span className="demo-scenario-disclaimer">Illustrative assumptions · not a quote</span></Card>
            </Link>;
          })}</div>
          <div className="demo-preview-cta"><p>Want to try your own assumptions? The full dashboard lets you edit inputs, compare scenarios, and download a local report.</p><ButtonLink href="/assessment?scenario=balanced#estimate">Open the live solar assessment <ArrowRight size={15}/></ButtonLink></div>
        </div>
      </section>

      <section className="trust-section landing-container" id="about" aria-labelledby="trust-title">
        <div className="section-intro"><p className="landing-eyebrow">Trust the process, check the inputs</p><h2 id="trust-title">Useful estimates start with honest limits.</h2><p>SolarSmart is designed to make its assumptions as visible as its results.</p></div>
        <div className="trust-grid">
          <Card as="article" className="trust-card"><div className="trust-icon"><FileCheck2 size={19} aria-hidden="true"/></div><h3>How the model works</h3><p>Annual bill and rate assumptions inform target energy. Sun-hours, orientation, shade, a generic system factor, and 60 sq ft per kW inform sizing. Usable roof capacity constrains the modeled system; savings are capped by production and assumed bill offset.</p><Link href="#methodology" className="text-link">See the calculation breakdown <ArrowRight size={14}/></Link></Card>
          <Card as="article" className="trust-card"><div className="trust-icon"><ShieldCheck size={19} aria-hidden="true"/></div><h3>What it cannot confirm</h3><p>Results are not an engineering assessment, roof survey, installer quote, approval, or savings guarantee. Actual output depends on roof condition, shading, weather, equipment, tariffs, utility rules, and installation quality.</p><Link href="/assessment?scenario=balanced#about" className="text-link">Read estimate limitations <ArrowRight size={14}/></Link></Card>
          <Card as="article" className="trust-card"><div className="trust-icon"><LockKeyhole size={19} aria-hidden="true"/></div><h3>Your data stays local</h3><p>The local demo keeps inputs in browser state and does not upload them. No account or API key is needed. If you deliberately configure the optional explanation endpoint, calculated results are sent there for explanation.</p><span className="privacy-label">Local-first by default</span></Card>
        </div>
        <p className="trust-note" id="methodology"><strong>Illustrative assumptions:</strong> the built-in rate, sun-hours, roof sizes, system costs, grid factor, and scenarios are sample values. They are not live tariffs, irradiance readings, subsidies, government approvals, verified savings, or claims of certification.</p>
      </section>

      <section className="faq-section" id="faq" aria-labelledby="faq-title"><div className="landing-container faq-inner"><div className="section-intro"><p className="landing-eyebrow">Good to know</p><h2 id="faq-title">A few common questions.</h2><p>Use the estimate as a starting point, then verify the details for your property.</p></div><div className="faq-list">
        <details><summary>Does this tell me if my roof is approved for solar?</summary><p>No. It estimates modeled capacity from the roof area and factors you provide. A qualified professional must inspect structure, condition, electrical service, codes, and permits.</p></details>
        <details><summary>Are the savings and payback guaranteed?</summary><p>No. They are estimates based on editable sample or user-entered values. Financing, maintenance, taxes, export credits, fixed charges, equipment choices, and local utility rules can change actual costs and savings.</p></details>
        <details><summary>Does SolarSmart use live weather or electricity prices?</summary><p>No. The built-in scenario uses illustrative sun-hours and a sample electricity rate. Replace them with current local information from your bill and reliable local sources.</p></details>
        <details><summary>Do I need an account, AWS, or an AI subscription?</summary><p>No. The assessment, calculation, scenario comparison, and report run locally. Optional AI and cloud integrations are disabled unless you configure them yourself.</p></details>
      </div></div></section>

      <section className="closing-cta"><div className="landing-container closing-cta-inner"><div><p className="landing-eyebrow">Start with what you know</p><h2>See a clear first estimate for your roof.</h2><p>Try the local demo, adjust assumptions, and reset whenever you want.</p></div><ButtonLink href="/assessment#estimate" className="landing-primary">Check My Solar Potential <ArrowRight size={16}/></ButtonLink></div></section>
    </main>
    <SiteFooter/>
  </div>;
}

function DashboardPreview() {
  return <aside className="landing-visual-wrap" aria-label="Illustrative dashboard preview using balanced demo inputs">
    <div className="visual-sun" aria-hidden="true"><Sun size={26}/></div>
    <div className="roof-illustration" aria-hidden="true"><svg viewBox="0 0 440 250" role="img"><title>Illustration of a home roof with solar panels</title><path d="M54 132 220 34l166 98v85H54z" fill="#f8fbf4" stroke="#c6d9c3" strokeWidth="3"/><path d="M32 136 220 22l188 114" fill="none" stroke="#f6fbf2" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/><path d="M81 121 151 80l106 65-70 40z" fill="#367b61" stroke="#255d49" strokeWidth="4"/><path d="m120 99 106 64m-72-82 106 65M103 108l70 41m-28-69-40 79m86-48-42 78" stroke="#b9d8c0" strokeWidth="3"/><rect x="280" y="150" width="54" height="67" rx="2" fill="#e6f0e5" stroke="#c6d9c3" strokeWidth="3"/><path d="M54 217h333" stroke="#b8d1b4" strokeWidth="5" strokeLinecap="round"/><circle cx="343" cy="65" r="26" fill="#dcebb4"/><path d="M343 24v-9m0 100v-9m41-41h9m-100 0h9m70-29 7-7m-70 70 7-7m56 0 7 7m-70-70 7 7" stroke="#dcebb4" strokeWidth="4" strokeLinecap="round"/></svg></div>
    <div className="visual-label"><span className="visual-label-dot"/> BALANCED DEMO · SAMPLE DATA</div>
    <Card className="dashboard-preview-card"><div className="preview-card-heading"><div><span>Solar planning snapshot</span><strong>Roof potential at a glance</strong></div><span className="preview-weather-icon"><CloudSun size={19}/></span></div>
      <div className="preview-metrics"><div><span>Modeled system</span><strong>{balancedEstimate.systemKw.toFixed(1)} <small>kW</small></strong></div><div><span>Annual savings</span><strong>{money(balancedEstimate.annualSavings)}</strong></div></div>
      <div className="preview-production"><div className="preview-production-title"><span>Estimated annual generation</span><strong>{balancedEstimate.annualProductionKwh.toLocaleString()} kWh</strong></div><div className="preview-bars" aria-label="Equal monthly averages; seasonal variation is not modeled">{Array.from({ length: 12 }, (_, index) => <span key={index} style={{ height: "64%" }} aria-hidden="true"/>)}</div><div className="preview-months"><span>Equal monthly average</span><span>Seasonality not modeled</span></div></div>
      <div className="preview-result-note"><span><Check size={14}/></span><p><strong>{balancedEstimate.paybackYears?.toFixed(1) ?? "Not reached within the model horizon"} {balancedEstimate.paybackYears === null ? "" : "year simple payback"}</strong><br/>Illustrative estimate · not a quote</p><ArrowRight size={15} aria-hidden="true"/></div>
    </Card>
    <span className="visual-orbit orbit-one" aria-hidden="true"/><span className="visual-orbit orbit-two" aria-hidden="true"/>
  </aside>;
}
