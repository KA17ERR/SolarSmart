"use client";
import { Check, ShieldCheck } from "lucide-react";
import type { SolarInputs } from "@/lib/solar";

type Props = { inputs: SolarInputs; errors: string[]; onChange: (field: keyof SolarInputs, value: string) => void; onReset: () => void; onValidate: () => void };
export function EstimateForm({ inputs, errors, onChange, onReset, onValidate }: Props) {
  return <section className="card estimate-card" id="estimate" aria-labelledby="estimate-title">
    <div className="card-title-row"><div><h3 className="card-title" id="estimate-title">Tune your estimate</h3><p className="card-sub">Change an assumption to explore your own what-if scenario.</p></div><button className="reset-button" type="button" onClick={onReset}>Reset to demo</button></div>
    {errors.length > 0 && <div className="error-banner" role="alert">{errors.join(" ")}</div>}
    <form onSubmit={event => { event.preventDefault(); onValidate(); }}>
      <div className="form-section-label">Electricity & costs</div>
      <div className="estimate-grid">
        <Field label="Average monthly electricity bill" suffix="USD / month" value={inputs.monthlyBill} onChange={v => onChange("monthlyBill", v)} hint="Sample value; replace with a recent bill." max="100000"/>
        <Field label="Electricity rate assumption" suffix="USD / kWh" value={inputs.utilityRate} step="0.01" onChange={v => onChange("utilityRate", v)} hint="Demo rate only; enter your actual bill rate." max="1000"/>
        <Field label="Estimated system cost" suffix="USD" value={inputs.systemCost} onChange={v => onChange("systemCost", v)} hint="Use a quote from a qualified installer." max="100000000"/>
        <Field label="Incentive assumption" suffix="%" value={inputs.incentiveRate * 100} onChange={v => onChange("incentiveRate", String(Number(v) / 100))} hint="Default is 0%; verify eligibility locally." max="90"/>
      </div>
      <div className="form-section-label">Roof & site assumptions</div>
      <div className="estimate-grid">
        <Field label="Approximate roof area" suffix="sq ft" value={inputs.roofAreaSqFt} onChange={v => onChange("roofAreaSqFt", v)} hint="Sample estimate; confirm with a site survey." max="1000000"/>
        <Field label="Usable roof area" suffix="%" value={inputs.usableRoofPercent} onChange={v => onChange("usableRoofPercent", v)} hint="Share remaining after setbacks and obstructions." max="100"/>
        <Field label="Peak sun-hours assumption" suffix="hours / day" value={inputs.sunHours} step="0.1" onChange={v => onChange("sunHours", v)} hint="Not a live irradiance reading." max="12"/>
        <Field label="Roof orientation factor" suffix="%" value={inputs.orientationFactor * 100} step="1" onChange={v => onChange("orientationFactor", String(Number(v) / 100))} hint="Generic model factor; ask an installer to assess." min="10" max="100"/>
        <Field label="Shade factor" suffix="%" value={inputs.shadingFactor * 100} step="1" onChange={v => onChange("shadingFactor", String(Number(v) / 100))} hint="100% means no modeled shade loss." min="10" max="100"/>
        <Field label="Bill offset assumption" suffix="%" value={inputs.selfConsumption * 100} onChange={v => onChange("selfConsumption", String(Number(v) / 100))} hint="Share of bill modeled as offset by solar." max="100"/>
        <Field label="Annual bill increase" suffix="% / year" value={inputs.electricityEscalation * 100} step="0.1" onChange={v => onChange("electricityEscalation", String(Number(v) / 100))} hint="Illustrative assumption, not a tariff forecast." max="20"/>
      </div>
      <div className="form-footer"><span><ShieldCheck size={13} aria-hidden="true"/> Calculated locally · no account required</span><button className="save-button" type="submit"><Check size={13} aria-hidden="true"/> Update estimate</button></div>
    </form>
  </section>;
}

function Field({ label, suffix, value, onChange, hint, step = "1", min = "0", max }: { label: string; suffix: string; value: number; onChange: (value: string) => void; hint: string; step?: string; min?: string; max: string }) {
  const id = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className="field"><label htmlFor={id}>{label}<span>{suffix}</span></label><input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={Number(value.toFixed(2))} onChange={event => onChange(event.target.value)} aria-describedby={`${id}-hint`}/><div className="hint" id={`${id}-hint`}>{hint}</div></div>;
}
