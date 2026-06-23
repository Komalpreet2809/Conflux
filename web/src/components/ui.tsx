"use client";

import { ReactNode, useEffect, useState } from "react";



export function Stat({
  label,
  value,
  sub,
  accent = "text-foreground",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="panel-2 min-w-0 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted">
        {icon && <span className="shrink-0 opacity-70">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 break-words text-[26px] font-bold leading-tight tracking-tight ${accent}`}>
        {value}
      </div>
      {sub ? <div className="mt-1 break-words text-[11px] leading-snug text-muted">{sub}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-muted">{label}</span>
        {hint ? <span className="text-[11px] text-muted/70">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-muted">{label}</span>
        <span className="text-[12px] font-bold text-foreground tabular-nums">
          {display}
        </span>
      </div>
      <div className="relative flex items-center h-4 w-full">
        {/* Custom Track Background */}
        <div className="absolute left-0 right-0 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 transition-colors duration-300" />
        {/* Custom Track Active Fill */}
        <div
          className="absolute left-0 h-1 rounded-full bg-accent transition-all duration-75"
          style={{ width: `${pct}%` }}
        />
        {/* Native Input Overlay */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 w-full h-full cursor-pointer opacity-100"
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg border border-edge bg-panel-2 p-0.5 transition-colors duration-300">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1 text-[12px] font-semibold transition cursor-pointer ${
            value === o.value
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({
  children,
  color = "#38bdf8",
}: {
  children: ReactNode;
  color?: string;
}) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const textCol = color === "#71717a" || color === "#a1a1aa"
    ? (isDark ? "#b5b0a5" : "#6b675e")
    : "#f43f5e";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold transition-all duration-300"
      style={{
        color: textCol,
        background: isDark ? `${textCol}1a` : `${textCol}0d`,
        border: `1.2px solid ${isDark ? `${textCol}33` : `${textCol}22`}`,
      }}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
        {children}
      </h3>
      {right}
    </div>
  );
}
