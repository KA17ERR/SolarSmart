import type { ReactNode } from "react";
export function MetricCard({ icon, label, value, foot }: { icon: ReactNode; label: string; value: string; foot: ReactNode }) {
  return <article className="metric"><div className="metric-head"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot">{foot}</div></article>;
}
