"use client";

import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { WorkspaceTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ToolView({ children }: { children: ReactNode }) {
  return <div className="tool-view">{children}</div>;
}

export function ToolSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("tool-card", className)}>
      <CardPanel className="tool-card-panel">
        {(title || actions) && (
          <header className="tool-section-head">
            <div className="tool-section-copy">
              {title ? <h3 className="tool-section-title">{title}</h3> : null}
              {description ? (
                <p className="tool-section-desc">{description}</p>
              ) : null}
            </div>
            {actions ? (
              <div className="tool-section-actions">{actions}</div>
            ) : null}
          </header>
        )}
        {children}
      </CardPanel>
    </Card>
  );
}

export function ToolField({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Field className={cn("tool-field", className)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

export function ToolTextarea({ className, ...props }: TextareaProps) {
  return (
    <Textarea
      unstyled
      spellCheck={false}
      className={cn("tool-textarea", className)}
      {...props}
    />
  );
}

export function ToolOutput({
  value,
  placeholder = "Result will appear here.",
  className,
}: {
  value: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <pre
      className={cn("tool-output", !value && "is-empty", className)}
      aria-live="polite"
      data-empty={!value ? "true" : undefined}
    >
      {value || placeholder}
    </pre>
  );
}

export function ToolPane({
  label,
  actions,
  children,
  className,
  bodyClassName,
}: {
  label: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("tool-pane", className)}>
      <div className="tool-pane-head">
        <span className="tool-pane-label">{label}</span>
        {actions ? <div className="tool-pane-actions">{actions}</div> : null}
      </div>
      <div className={cn("tool-pane-body", bodyClassName)}>{children}</div>
    </div>
  );
}

export function ToolCopyButton({
  value,
  label = "Copy",
  disabled = false,
}: {
  value: string;
  label?: string;
  disabled?: boolean;
}) {
  const isDisabled = disabled || !value;
  const copy = () => {
    if (isDisabled) return;
    if (!navigator.clipboard) {
      toast.error("Clipboard is unavailable", { duration: 2500 });
      return;
    }
    void navigator.clipboard.writeText(value).then(
      () => toast.success("Copied to clipboard", { duration: 2500 }),
      () => toast.error("Could not copy", { duration: 2500 }),
    );
  };
  return (
    <WorkspaceTooltip label={label} side="bottom" align="end">
      <Button
        variant="ghost"
        size="icon-sm"
        className="tool-icon-btn"
        onClick={copy}
        disabled={isDisabled}
        aria-label={label}
      >
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} size={14} />
      </Button>
    </WorkspaceTooltip>
  );
}

export type ToolStatusTone = "neutral" | "success" | "warning" | "error";

export function ToolStatus({
  tone = "neutral",
  children,
}: {
  tone?: ToolStatusTone;
  children: ReactNode;
}) {
  const Icon =
    tone === "error" || tone === "warning"
      ? Alert02Icon
      : tone === "success"
        ? CheckmarkCircle02Icon
        : null;
  return (
    <div
      className={cn("tool-status", `is-${tone}`)}
      role={tone === "error" ? "alert" : "status"}
    >
      {Icon ? (
        <HugeiconsIcon icon={Icon} strokeWidth={2} size={14} aria-hidden />
      ) : null}
      <span>{children}</span>
    </div>
  );
}

export function ToolActions({ children }: { children: ReactNode }) {
  return <div className="tool-actions">{children}</div>;
}

export function ToolOption({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="tool-option">
      <div className="tool-option-copy">
        <span className="tool-option-label">{label}</span>
        {hint ? <span className="tool-option-hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function ToolNumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  error,
  min,
  max,
  step,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: string;
  error?: string | null;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <ToolField label={label} hint={hint} error={error} className={className}>
      <div className={cn("tool-number-wrap", unit && "has-unit")}>
        <Input
          unstyled
          nativeInput
          type="number"
          className="tool-input"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          inputMode="decimal"
        />
        {unit ? <span className="tool-number-unit">{unit}</span> : null}
      </div>
    </ToolField>
  );
}

export type ToolSelectItem = { value: string; label: string };

export function ToolSelectField({
  label,
  items,
  value,
  onValueChange,
  hint,
  placeholder = "Choose…",
  className,
}: {
  label: string;
  items: readonly ToolSelectItem[];
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <ToolField label={label} hint={hint} className={className}>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next);
        }}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectPopup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </ToolField>
  );
}

export function ToolResultGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("tool-result-grid", className)}>{children}</div>;
}

export function ToolResultCard({
  label,
  value,
  unit,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tone?: ToolStatusTone;
}) {
  return (
    <div className={cn("tool-result-card", `is-${tone}`)}>
      <span className="tool-result-label">{label}</span>
      <div className="tool-result-value-row">
        <span className="tool-result-value">{value}</span>
        {unit ? <span className="tool-result-unit">{unit}</span> : null}
      </div>
      {detail ? <span className="tool-result-detail">{detail}</span> : null}
    </div>
  );
}

export function ToolComplianceRow({
  label,
  threshold,
  pass,
}: {
  label: string;
  threshold: string;
  pass: boolean;
}) {
  const Icon = pass ? CheckmarkCircle02Icon : Cancel01Icon;
  return (
    <div className={cn("tool-compliance-row", pass ? "is-pass" : "is-fail")}>
      <span className="tool-compliance-label">{label}</span>
      <span className="tool-compliance-threshold">{threshold}</span>
      <span className="tool-compliance-state">
        <HugeiconsIcon icon={Icon} strokeWidth={2} size={14} aria-hidden />
        {pass ? "Pass" : "Fail"}
      </span>
    </div>
  );
}

export function ToolColorField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <ToolField
      label={label}
      hint="Three- or six-digit hex, with or without the leading #."
      error={error}
    >
      <div className="tool-color-row">
        <input
          type="color"
          className="tool-color-picker"
          value={pickerValue}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-label={`${label} picker`}
        />
        <Input
          unstyled
          nativeInput
          className="tool-input"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          spellCheck={false}
          placeholder="#000000"
        />
      </div>
    </ToolField>
  );
}

export function ToolBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ToolStatusTone;
}) {
  return <span className={cn("tool-badge", `is-${tone}`)}>{children}</span>;
}

export function formatDecimal(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0";
  return Number(value.toFixed(digits)).toString();
}
