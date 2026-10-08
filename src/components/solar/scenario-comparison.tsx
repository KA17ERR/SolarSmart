"use client";
import { ArrowRight, Check, Layers3 } from "lucide-react";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { calculateSolar, type SolarResults } from "@/lib/solar";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
type Props = { activeId: string; onSelect: (scenario: (typeof DEMO_SCENARIOS)[number]) => void; currentResult: SolarResults };
export function ScenarioComparison({ activeId, onSelect, currentResult }: Props) {
  const current = currentResult;
  return <section className="scenario-section" id="scenarios" aria-labelledby="scenario-heading">
    <div className="section-heading"><div><div className="eyebrow">Explore the range</div><h2 id="scenario-heading">Compare demo scenarios</h2><p>Three fictional assumption sets help show how roof and exposure inputs change the estimate.</p></div><div className="sample-tag"><Layers3 size={13}/> SAMPLE SCENARIOS</div></div>
    <div className="scenario-grid">{DEMO_SCENARIOS.map(scenario => {
      const estimate = calculateSolar(scenario.inputs);
      const active = activeId === scenario.id;
      return <article className={`scenario-card${active ? " selected" : ""}`} key={scenario.id}>
        <div className="scenario-top"><span className="scenario-icon"><Layers3 size={16}/></span>{active && <span className="selected-label"><Check size={12}/> Selected</span>}</div>
        <h3>{scenario.name}</h3><p>{scenario.description}</p>
        <div className="scenario-stats"><div><small>System size</small><strong>{estimate.systemKw} kW</strong></div><div><small>Annual savings</small><strong>{money(estimate.annualSavings)}</strong></div><div><small>Simple payback</small><strong>{estimate.paybackYears} yrs</strong></div></div>
        <button className={active ? "scenario-button active" : "scenario-button"} type="button" onClick={() => onSelect(scenario)}>{active ? "Scenario selected" : "Use this scenario"}<ArrowRight size={14}/></button>
      </article>;
    })}</div>
    <p className="scenario-current">Current form estimate: <strong>{current.systemKw} kW</strong> · {money(current.annualSavings)} estimated first-year savings. Results are illustrative, not quotes or guarantees.</p>
  </section>;
}
