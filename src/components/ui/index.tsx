"use client";

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type MouseEventHandler, type ReactNode, type SelectHTMLAttributes } from "react";
import { X } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" };
export function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()} {...props}/>;
}
export function ButtonLink({ href, children, className = "", variant = "primary", onClick }: { href: string; children: ReactNode; className?: string; variant?: ButtonVariant; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return <a href={href} className={`ui-button ui-button-${variant} ui-button-md ${className}`.trim()} onClick={onClick}>{children}</a>;
}

export function Card({ as: Tag = "div", className = "", children, ...props }: HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" | "aside" }) { return <Tag className={`ui-card ${className}`.trim()} {...props}>{children}</Tag>; }
export function Badge({ children, variant = "neutral" }: { children: ReactNode; variant?: "neutral" | "success" | "warning" | "outline" }) { return <span className={`ui-badge ui-badge-${variant}`}>{children}</span>; }

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };
export function TextField({ label, hint, error, id, className = "", required = false, ...props }: TextFieldProps) {
  const fieldId = id ?? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const describedBy = [hint ? `${fieldId}-hint` : "", error ? `${fieldId}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div className="ui-field"><label htmlFor={fieldId}>{label}{required && <> <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> required</span></>}</label><input id={fieldId} required={required} className={`ui-input ${error ? "has-error" : ""} ${className}`.trim()} aria-invalid={!!error} aria-describedby={describedBy} {...props}/>{hint && <small id={`${fieldId}-hint`}>{hint}</small>}{error && <small id={`${fieldId}-error`} className="field-error" role="alert">{error}</small>}</div>;
}
export function SelectField({ label, options, id, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Array<{ value: string; label: string }> }) {
  const fieldId = id ?? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className="ui-field"><label htmlFor={fieldId}>{label}</label><select id={fieldId} className="ui-input" {...props}>{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>;
}
export function CheckboxField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="ui-checkbox"><input type="checkbox" {...props}/><span>{label}</span></label>; }

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const id = `tooltip-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <span className="ui-tooltip-wrap"><button type="button" className="ui-tooltip-trigger" aria-label={label} aria-describedby={id}>?</button><span role="tooltip" id={id} className="ui-tooltip">{children}</span></span>;
}

export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="ui-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}><div className="dialog-heading"><h2 id={titleId}>{title}</h2><Button variant="quiet" size="sm" aria-label="Close dialog" onClick={onClose}><X size={18}/></Button></div>{children}</dialog>;
}

export function ProgressIndicator({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  return <div className="ui-progress-wrap"><div className="ui-progress-label"><span>{label}</span><span>{Math.round(safeValue / safeMax * 100)}%</span></div><progress className="ui-progress" value={safeValue} max={safeMax} aria-label={label}/></div>;
}
export function ChartContainer({ title, description, children, className = "", id }: { title: string; description: string; children: ReactNode; className?: string; id?: string }) { return <section id={id} className={`ui-chart-container ${className}`} aria-label={`${title}. ${description}`}><div className="ui-chart-heading"><h2>{title}</h2><p>{description}</p></div>{children}</section>; }
export function Alert({ title, children, variant = "info" }: { title?: string; children: ReactNode; variant?: "info" | "success" | "warning" | "error" }) { return <div className={`ui-alert ui-alert-${variant}`} role={variant === "error" ? "alert" : "status"}>{title && <strong>{title}</strong>}<div>{children}</div></div>; }
export function Notification({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) { return <div className="ui-notification" role="status"><span>{children}</span><Button variant="quiet" size="sm" aria-label="Dismiss notification" onClick={onDismiss}><X size={15}/></Button></div>; }
export function Skeleton({ className = "" }: { className?: string }) { return <span className={`ui-skeleton ${className}`.trim()} aria-hidden="true"/>; }
export function LoadingIndicator({ label = "Loading" }: { label?: string }) { return <span className="ui-loading" role="status"><span className="ui-spinner" aria-hidden="true"/><span>{label}</span></span>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="ui-empty-state"><span className="ui-empty-mark" aria-hidden="true">☀</span><h3>{title}</h3><p>{description}</p>{action}</div>; }
