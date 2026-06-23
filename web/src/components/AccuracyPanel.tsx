"use client";

import { Brain, Target } from "lucide-react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { ModelMetrics, ReplayResponse } from "@/lib/api";
import { Stat } from "@/components/ui";

interface Props {
  metrics: ModelMetrics | null;
  replay: ReplayResponse | null;
  theme?: "light" | "dark";
}

export default function AccuracyPanel({ metrics, replay, theme = "dark" }: Props) {
  const isReplay = !!replay;
  const isDark = theme === "dark";
  const scatterData = isReplay
    ? replay!.comparison.map((c) => ({ x: c.actual, y: c.predicted, name: c.name }))
    : (metrics?.scatter ?? []).map((s) => ({ x: s.actual, y: s.predicted, name: "" }));

  const gridColor = isDark ? "#262421" : "#e8e6df";
  const tickColor = isDark ? "#8d8980" : "#6d685e";
  const scatterFill = isDark ? (isReplay ? "#f43f5e" : "#b5b0a5") : (isReplay ? "#f43f5e" : "#6b675e");

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        {isReplay ? (
          <Target size={15} className="text-foreground" />
        ) : (
          <Brain size={15} className="text-foreground" />
        )}
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-foreground/90">
          {isReplay ? "Predicted vs Actual" : "Model Performance"}
        </h3>
      </div>

      {isReplay ? (
        <div className="mb-2 grid grid-cols-3 gap-2">
          <Stat label="MAE" value={`${replay!.accuracy.mae}`} sub="pts / 100" />
          <Stat
            label="Within 10"
            value={`${replay!.accuracy.within10pts}%`}
            sub="of junctions"
          />
          <Stat
            label="Within 5"
            value={`${replay!.accuracy.within5pts}%`}
            sub="of junctions"
          />
        </div>
      ) : metrics ? (
        <div className="mb-2 grid grid-cols-3 gap-2">
          <Stat
            label="Congestion R²"
            value={metrics.targets.congestion.r2.toFixed(2)}
            sub={`MAE ${metrics.targets.congestion.mae}`}
          />
          <Stat
            label="Delay R²"
            value={metrics.targets.delay.r2.toFixed(2)}
            sub={`MAE ${metrics.targets.delay.mae}m`}
          />
          <Stat
            label="Skill"
            value={`+${metrics.targets.congestion.skill_vs_baseline_pct.toFixed(0)}%`}
            sub="vs mean baseline"
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 4" />
            <XAxis
              type="number"
              dataKey="x"
              name="Actual"
              domain={[0, 100]}
              tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              label={{
                value: "Actual",
                position: "insideBottom",
                offset: -2,
                fill: tickColor,
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Predicted"
              domain={[0, 100]}
              tick={{ fill: tickColor, fontSize: 10, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <ZAxis range={[28, 28]} />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ]}
              stroke={isDark ? "#52525b" : "#d4d4d8"}
              strokeDasharray="4 4"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                background: isDark ? "#18181b" : "#ffffff",
                border: `1px solid ${gridColor}`,
                borderRadius: 12,
                fontSize: 12,
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
              }}
              labelStyle={{ color: isDark ? "#f4f4f5" : "#09090b", fontWeight: "bold" }}
              formatter={(v: number, n: string) => [`${Number(v).toFixed(0)}`, n]}
            />
            <Scatter
              data={scatterData}
              fill={scatterFill}
              fillOpacity={isDark ? 0.7 : 0.6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
        {isReplay
          ? "Each dot is a junction: model forecast vs observed peak congestion. Points on the dashed line are perfect predictions."
          : `Held-out test set (${metrics?.n_test_events ?? 0} unseen events, ${
              metrics?.targets.congestion.n_test_rows ?? 0
            } samples). Closer to the diagonal = more accurate.`}
      </p>
    </div>
  );
}
