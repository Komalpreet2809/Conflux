"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TimelineBucket } from "@/lib/api";

interface Props {
  timeline: TimelineBucket[];
  timeIndex: number;
  durationMin: number;
  onScrub?: (i: number) => void;
  theme?: "light" | "dark";
}

export default function TimelineChart({
  timeline,
  timeIndex,
  durationMin,
  onScrub,
  theme = "dark",
}: Props) {
  const data = timeline.map((b, i) => ({
    i,
    label: b.label,
    minutes: b.minutes,
    avg: b.avgCongestion,
    max: b.maxCongestion,
  }));

  const current = data[timeIndex];
  const isDark = theme === "dark";

  const peakColor = "#f43f5e";
  const avgColor = isDark ? "#8d8980" : "#6d685e";
  const gridColor = isDark ? "#262421" : "#e8e6df";
  const tickColor = isDark ? "#8d8980" : "#6d685e";
  const refLineColor = isDark ? "#383632" : "#d8d6cf";
  const currentRefColor = "#f43f5e";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 6, right: 10, left: 0, bottom: 0 }}
        onClick={(e) => {
          if (onScrub && e && typeof e.activeTooltipIndex === "number") {
            onScrub(e.activeTooltipIndex);
          }
        }}
      >
        <defs>
          <linearGradient id="gMax" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={peakColor} stopOpacity={isDark ? 0.25 : 0.15} />
            <stop offset="100%" stopColor={peakColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={avgColor} stopOpacity={isDark ? 0.2 : 0.1} />
            <stop offset="100%" stopColor={avgColor} stopOpacity={0} />
          </linearGradient>
          <filter id="telemetry-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <CartesianGrid stroke={gridColor} strokeDasharray="3 4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }}
          interval={Math.max(1, Math.floor(data.length / 7))}
          tickLine={false}
          axisLine={{ stroke: gridColor }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          width={34}
        />
        <Tooltip
          contentStyle={{
            background: isDark ? "#18181b" : "#ffffff",
            border: `1px solid ${gridColor}`,
            borderRadius: 12,
            fontSize: 12,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
          }}
          labelStyle={{ color: isDark ? "#f4f4f5" : "#09090b", fontWeight: "bold" }}
        />
        <ReferenceLine x="T+0:00" stroke={refLineColor} strokeDasharray="3 3" />
        <ReferenceLine
          x={data.find((d) => d.minutes >= durationMin)?.label}
          stroke={refLineColor}
          strokeDasharray="3 3"
        />
        {current && <ReferenceLine x={current.label} stroke={currentRefColor} strokeWidth={2} />}
        <Area
          type="monotone"
          dataKey="max"
          name="Peak junction"
          stroke={peakColor}
          fill="url(#gMax)"
          strokeWidth={2}
          filter="url(#telemetry-glow)"
        />
        <Area
          type="monotone"
          dataKey="avg"
          name="City average"
          stroke={avgColor}
          fill="url(#gAvg)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
