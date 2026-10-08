"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, EmptyState } from "@/components/ui";

type DataPoint = { year: string; solar: number; utility: number };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function SavingsChart({ data }: { data: DataPoint[] }) {
  return <ChartContainer id="savings-chart" title="Estimated annual savings" description="Modeled solar savings and remaining utility bill by year · USD/year" className="card savings-chart result-chart">
    {data.length ? <><div className="chart-legend"><span><i className="legend-dot"/> Solar savings</span><span><i className="legend-dot orange"/> Remaining utility bill</span></div>
      <div className="result-chart-wrap" role="img" aria-label={`Area chart of annual modeled solar savings and remaining utility bill over ${data.length} years.`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 8, bottom: 8, left: 8 }}><defs><linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70a777" stopOpacity={.2}/><stop offset="95%" stopColor="#70a777" stopOpacity={0}/></linearGradient><linearGradient id="billFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f2ad6f" stopOpacity={.17}/><stop offset="95%" stopColor="#f2ad6f" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0ec" strokeDasharray="3 4" vertical={false}/><XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#68776d" }} label={{ value: "Projection year", position: "insideBottom", offset: -3, fontSize: 10, fill: "#68776d" }}/><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#68776d" }} tickFormatter={value => `$${value}`} width={57} label={{ value: "USD per year", angle: -90, position: "insideLeft", fontSize: 10, fill: "#68776d" }}/><Tooltip formatter={value => money(Number(value))} contentStyle={{ border: "1px solid #edf0ec", borderRadius: 8, fontSize: 11 }}/><Area type="monotone" dataKey="utility" name="Remaining utility bill" stroke="#c57b37" strokeWidth={2} fill="url(#billFill)"/><Area type="monotone" dataKey="solar" name="Solar savings" stroke="#4c8056" strokeWidth={2} fill="url(#solarFill)"/></AreaChart></ResponsiveContainer></div>
    </> : <EmptyState title="Savings projection unavailable" description="Complete the required inputs to view estimated savings."/>}
  </ChartContainer>;
}
