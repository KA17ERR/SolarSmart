"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, EmptyState } from "@/components/ui";

type DataPoint = { year: string; solar: number; utility: number };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function SavingsChart({ data }: { data: DataPoint[] }) {
  return <ChartContainer id="savings-chart" title="Estimated annual savings" description="Modeled solar savings and remaining utility bill by year · USD/year" className="card savings-chart result-chart">
    {data.length ? <><div className="chart-legend"><span><i className="legend-dot"/> Solar savings</span><span><i className="legend-dot orange"/> Remaining utility bill</span></div>
      <div className="result-chart-wrap" role="region" aria-label={`Area chart of annual modeled solar savings and remaining utility bill over ${data.length} years.`}><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={data} margin={{ top: 14, right: 14, bottom: 12, left: 10 }}><defs><linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={.28}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient><linearGradient id="billFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={.18}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="year" interval="preserveStartEnd" minTickGap={18} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--chart-axis)" }} tickFormatter={value => `Yr ${value}`}/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--chart-axis)" }} tickFormatter={value => money(Number(value))} width={66} label={{ value: "USD per year", angle: -90, position: "insideLeft", fontSize: 10, fill: "var(--chart-axis)" }}/><Tooltip formatter={value => money(Number(value))} contentStyle={{ border: "1px solid rgb(196 181 253 / 28%)", borderRadius: 8, background: "#11101d", color: "#f4f1ff", fontSize: 11 }} wrapperStyle={{ zIndex: 40, pointerEvents: "none" }} allowEscapeViewBox={{ x: true, y: true }}/><Area type="monotone" dataKey="utility" name="Remaining utility bill" stroke="#38bdf8" strokeWidth={2} fill="url(#billFill)"/><Area type="monotone" dataKey="solar" name="Solar savings" stroke="#a78bfa" strokeWidth={2} fill="url(#solarFill)"/></AreaChart></ResponsiveContainer></div>
    </> : <EmptyState title="Savings projection unavailable" description="Complete the required inputs to view estimated savings."/>}
  </ChartContainer>;
}
