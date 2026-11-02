"use client";

import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Field className={cn("tool-field", className)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
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
