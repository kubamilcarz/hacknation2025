"use client";

import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";

type BaseProps = {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  aiSuggestion?: ReactNode;
  hideLabel?: boolean;
};

type InputProps = BaseProps & {
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  component?: "input";
  autoComplete?: string;
  maxLength?: number;
};

type TextareaProps = BaseProps & {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  component: "textarea";
};

export type IncidentTextFieldProps = InputProps | TextareaProps;

export function IncidentTextField(props: IncidentTextFieldProps) {
  const { label, name, hint, error, optional, aiSuggestion, hideLabel } = props;
  const inputId = `${name}-input`;
  const descriptionId = hint ? `${name}-description` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  const commonProps = {
    id: inputId,
    name,
    "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? "true" : undefined,
    "aria-label": hideLabel ? label : undefined,
    className:
      "w-full rounded-lg border border-subtle bg-input px-4 py-3 text-sm text-foreground shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus-ring) focus-visible:ring-offset-2",
  } as const;

  return (
    <div className="space-y-2">
      {!hideLabel && (
        <label htmlFor={inputId} className="flex items-baseline justify-between text-sm font-medium text-secondary">
          <span>{label}</span>
          {optional && <span className="text-xs text-muted">Opcjonalne</span>}
        </label>
      )}
      <div className="space-y-2">
        {props.component === "textarea" ? (
          <textarea {...commonProps} rows={props.rows ?? 6} value={props.value} onChange={props.onChange} />
        ) : (
          <input
            {...commonProps}
            type={props.type ?? "text"}
            value={props.value}
            onChange={props.onChange}
            autoComplete={props.autoComplete}
            maxLength={props.maxLength}
          />
        )}
        {hint && (
          <p id={descriptionId} className="text-xs text-muted">
            {hint}
          </p>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-(--color-error)">
          {error}
        </p>
      )}
      {aiSuggestion}
    </div>
  );
}
