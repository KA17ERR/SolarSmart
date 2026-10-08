import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { Tooltip } from "@/components/ui";
export function MetricCard({ icon, label, value, foot, help }: { icon: ReactNode; label: string; value: string; foot: ReactNode; help?: string }) {
  return <Card as="article" className="metric"><div className="metric-head"><span className="metric-label">{label}{help && <Tooltip label={`About ${label.toLowerCase()}`}>{help}</Tooltip>}</span><span className="metric-icon" aria-hidden="true">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot">{foot}</div></Card>;
}
