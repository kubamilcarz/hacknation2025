"use client";

type SpinnerProps = {
  size?: number;
  className?: string;
};

export function Spinner({ size = 24, className = "" }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-(--color-accent) border-t-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
