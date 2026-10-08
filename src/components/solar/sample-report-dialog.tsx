"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button, ButtonLink, Dialog } from "@/components/ui";
import { DEMO_SCENARIOS } from "@/lib/scenarios";
import { buildEstimateReport } from "@/lib/report";
import { calculateSolar } from "@/lib/solar";

const sample = DEMO_SCENARIOS.find(scenario => scenario.id === "balanced")!;
const estimate = calculateSolar(sample.inputs);
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function SampleReportDialog() {
  const [open, setOpen] = useState(false);

  function download() {
    const contents = buildEstimateReport(sample.inputs, estimate, sample.name);
    const url = URL.createObjectURL(new Blob([contents], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "solarsmart-balanced-demo-report.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <>
    <Button variant="secondary" className="landing-report-button" onClick={() => setOpen(true)}><FileText size={16} aria-hidden="true"/> Explore a sample report</Button>
    <Dialog open={open} title="Balanced demo · sample report" onClose={() => setOpen(false)}>
      <p>This report is generated from SolarSmart’s built-in fictional assumptions and deterministic calculator. It contains no live utility or government data.</p>
      <div className="report-preview-grid">
        <div><span>Modeled system</span><strong>{estimate.systemKw.toFixed(1)} kW</strong></div>
        <div><span>Annual generation</span><strong>{estimate.annualProductionKwh.toLocaleString()} kWh</strong></div>
        <div><span>First-year savings</span><strong>{money(estimate.annualSavings)}</strong></div>
        <div><span>Simple payback</span><strong>{estimate.paybackYears === null ? "Not reached in model horizon" : `${estimate.paybackYears.toFixed(1)} years`}</strong></div>
      </div>
      <p className="report-preview-note">Assumptions include an illustrative $0.15/kWh rate, 850 sq ft sample roof, 5.2 sun-hours/day, and 0% incentive. Values are estimates, not quotes or guarantees.</p>
      <div className="report-preview-actions">
        <Button onClick={download}><Download size={15} aria-hidden="true"/> Download complete report</Button>
        <ButtonLink href="/assessment?scenario=balanced#dashboard" variant="quiet" onClick={() => setOpen(false)}>Open live assessment →</ButtonLink>
      </div>
    </Dialog>
  </>;
}
