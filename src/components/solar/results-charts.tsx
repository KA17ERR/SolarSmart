"use client";

import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, EmptyState } from "@/components/ui";
import type { AnnualProjection, SolarResults } from "@/lib/solar";

const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
const tick = { fontSize: 10, fill: "#68776d" };

export function GenerationChart({ rows }: { rows: AnnualProjection[] }) {
  return <ChartContainer id="generation-chart" title="Estimated electricity generation" description="Annual output by modeled year · kilowatt-hours (kWh)" className="card result-chart">
    {rows.length ? <div className="result-chart-wrap" role="img" aria-label={`Line chart showing estimated annual electricity generation. Year one ${number(rows[0].generationKwh)} kilowatt-hours, year ${rows.at(-1)?.year} ${number(rows.at(-1)?.generationKwh ?? 0)} kilowatt-hours.`}>
      <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 10, right: 18, bottom: 8, left: 12 }}><CartesianGrid stroke="#edf0ec" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="year" tick={tick} tickLine={false} axisLine={false} tickFormatter={value => `Yr ${value}`} label={{ value: "Modeled year", position: "insideBottom", offset: -3, fontSize: 10, fill: "#68776d" }}/><YAxis tick={tick} tickLine={false} axisLine={false} width={54} tickFormatter={number} label={{ value: "Generation (kWh/year)", angle: -90, position: "insideLeft", fontSize: 10, fill: "#68776d" }}/><Tooltip formatter={value => [`${number(Number(value))} kWh`, "Annual generation"]} labelFormatter={year => `Year ${year}`} contentStyle={{ border: "1px solid #edf0ec", borderRadius: 8, fontSize: 11 }}/><Line type="monotone" dataKey="generationKwh" name="Annual generation" stroke="#347451" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }}/></LineChart></ResponsiveContainer>
    </div> : <EmptyState title="Generation projection unavailable" description="Complete the required roof and energy inputs to view the modelled projection."/>}
  </ChartContainer>;
}

export function CostRecoveryChart({ result }: { result: SolarResults }) {
  const rows = result.annualProjection;
  return <ChartContainer id="cost-recovery-chart" title="Installation cost and cumulative savings" description="Expected net cost compared with cumulative modeled savings · USD" className="card result-chart">
    {rows.length ? <><div className="chart-legend"><span><i className="legend-dot"/>Cumulative savings</span><span><i className="legend-dot orange"/>Expected net installation cost</span></div><div className="result-chart-wrap" role="img" aria-label={`Chart comparing expected net installation cost of ${currency(result.netCost)} with cumulative savings over ${result.projectionHorizonYears} modeled years.`}>
      <ResponsiveContainer width="100%" height="100%"><AreaChart data={rows} margin={{ top: 12, right: 18, bottom: 8, left: 12 }}><defs><linearGradient id="cumulativeSavingsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70a777" stopOpacity={.2}/><stop offset="95%" stopColor="#70a777" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0ec" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="year" tick={tick} tickLine={false} axisLine={false} tickFormatter={value => `Yr ${value}`} label={{ value: "Modeled year", position: "insideBottom", offset: -3, fontSize: 10, fill: "#68776d" }}/><YAxis tick={tick} tickLine={false} axisLine={false} width={58} tickFormatter={value => `$${number(Number(value))}`} label={{ value: "Cumulative USD", angle: -90, position: "insideLeft", fontSize: 10, fill: "#68776d" }}/><Tooltip formatter={(value, name) => [currency(Number(value)), name === "cumulativeSavingsUsd" ? "Cumulative savings" : "Net installation cost"]} labelFormatter={year => `Year ${year}`} contentStyle={{ border: "1px solid #edf0ec", borderRadius: 8, fontSize: 11 }}/><ReferenceLine y={result.netCost} stroke="#c57b37" strokeDasharray="5 4" label={{ value: "Expected cost", position: "insideTopRight", fontSize: 10, fill: "#9b632f" }}/><Area type="monotone" dataKey="cumulativeSavingsUsd" name="Cumulative savings" stroke="#4c8056" strokeWidth={2} fill="url(#cumulativeSavingsFill)"/></AreaChart></ResponsiveContainer>
    </div><p className="chart-footnote">Cumulative savings are before financing, maintenance, taxes, and other excluded costs. Cost uses the entered price and any unverified incentive assumption.</p></> : <EmptyState title="Cost comparison unavailable" description="Complete the required inputs to compare cumulative savings with installation cost."/>}
  </ChartContainer>;
}
