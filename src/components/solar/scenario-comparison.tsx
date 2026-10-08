"use client";
import { ArrowRight, Check, Layers3 } from "lucide-react";
import { Badge, Button, Card, ChartContainer } from "@/components/ui";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { calculateSolar, type SolarResults } from "@/lib/solar";
import { buildScenarioChartData } from "@/lib/dashboard-model";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
type Props = { activeId: string; onSelect: (scenario: (typeof DEMO_SCENARIOS)[number]) => void; currentResult: SolarResults };
export function ScenarioComparison({ activeId, onSelect, currentResult }: Props) {
  const comparison = buildScenarioChartData();
  return <section className="scenario-section" id="scenarios" aria-labelledby="scenario-heading">
    <div className="section-heading"><div><div className="eyebrow">Explore the range</div><h2 id="scenario-heading">Compare demo scenarios</h2><p>Fictional small, medium, and highly shaded roofs. Select one to update the complete dashboard.</p></div><div className="sample-tag"><Layers3 size={13}/> SAMPLE SCENARIOS</div></div>
    <div className="scenario-grid">{DEMO_SCENARIOS.map(scenario => {
      const estimate = calculateSolar(scenario.inputs);
      const active = activeId === scenario.id;
      return <Card as="article" className={`scenario-card${active ? " selected" : ""}`} key={scenario.id}>
        <div className="scenario-top"><span className="scenario-icon"><Layers3 size={16}/></span>{active && <Badge variant="success"><Check size={12}/> Selected</Badge>}</div>
        <h3>{scenario.name}</h3><p>{scenario.description}</p>
        <div className="scenario-stats"><div><small>System size</small><strong>{estimate.systemKw.toFixed(1)} kW</strong></div><div><small>Annual savings</small><strong>{money(estimate.annualSavings)}</strong></div><div><small>Simple payback</small><strong>{estimate.paybackYears === null ? "—" : `${estimate.paybackYears.toFixed(1)} yrs`}</strong></div></div>
        <Button variant={active ? "secondary" : "quiet"} className={`scenario-button${active ? " active" : ""}`} aria-pressed={active} onClick={() => onSelect(scenario)}>{active ? "Scenario selected" : "Use this scenario"}<ArrowRight size={14}/></Button>
      </Card>;
    })}</div>
    <ChartContainer title="Scenario comparison" description="Modeled system capacity and first-year savings across the sample scenarios" className="card scenario-chart-card">
      <div className="result-chart-wrap" role="img" aria-label={comparison.map(item => `${item.name}: ${item.systemKw.toFixed(1)} kilowatts and ${money(item.annualSavings)} estimated annual savings`).join(". ")}>
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={comparison} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}><CartesianGrid stroke="#edf0ec" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#68776d" }} tickLine={false} axisLine={false}/><YAxis yAxisId="capacity" tick={{ fontSize: 10, fill: "#68776d" }} tickLine={false} axisLine={false} width={48} label={{ value: "Capacity (kW)", angle: -90, position: "insideLeft", fontSize: 10 }}/><YAxis yAxisId="savings" orientation="right" tick={{ fontSize: 10, fill: "#68776d" }} tickLine={false} axisLine={false} width={54} tickFormatter={value => `$${value}`} label={{ value: "Savings (USD/year)", angle: 90, position: "insideRight", fontSize: 10 }}/><Tooltip formatter={(value, name) => name === "systemKw" ? [`${Number(value).toFixed(1)} kW`, "System capacity"] : [money(Number(value)), "First-year savings"]} contentStyle={{ border: "1px solid #edf0ec", borderRadius: 8, fontSize: 11 }}/><Legend formatter={value => value === "systemKw" ? "System capacity (kW)" : "First-year savings (USD)"}/><Bar yAxisId="capacity" dataKey="systemKw" name="systemKw" fill="#78a77d" radius={[4, 4, 0, 0]}/><Line yAxisId="savings" dataKey="annualSavings" name="annualSavings" stroke="#c57b37" strokeWidth={2} dot={{ r: 4 }}/></ComposedChart></ResponsiveContainer>
      </div>
    </ChartContainer>
    <p className="scenario-current">Current assessment: <strong>{currentResult.systemKw.toFixed(1)} kW</strong> · {money(currentResult.annualSavings)} estimated first-year savings. Results are illustrative, not quotes or guarantees.</p>
  </section>;
}
