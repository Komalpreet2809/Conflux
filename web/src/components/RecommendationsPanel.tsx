"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Route, TrafficCone, Users, Download } from "lucide-react";

import { Plan } from "@/lib/api";
import { MapLayers } from "@/components/MapView";
import { Badge } from "@/components/ui";

type Tab = "manpower" | "barricades" | "diversions";

interface Props {
  plan: Plan;
  layers: MapLayers;
  onToggleLayer: (key: keyof MapLayers) => void;
}

export default function RecommendationsPanel({ plan, layers, onToggleLayer }: Props) {
  const [tab, setTab] = useState<Tab>("manpower");

  const exportPlan = () => {
    let txt = `# CONFLUX DEPLOYMENT PLAN\n\n`;
    txt += `Summary: ${plan.summary.officersDeployed} officers deployed across ${plan.summary.junctionsStaffed} junctions. `;
    txt += `${plan.summary.barricadePoints} barricades and ${plan.summary.diversionRoutes} diversions recommended.\n\n`;
    
    txt += `## 1. MANPOWER ALLOCATION\n\n`;
    if (plan.manpower.officers.length === 0) {
      txt += `No officers required.\n\n`;
    } else {
      plan.manpower.officers.forEach(o => {
        txt += `- **Junction:** ${o.junctionName}\n`;
        txt += `  - Officers Deployed: ${o.officers}\n`;
        txt += `  - Expected Delay: ${o.expectedDelayBefore.toFixed(1)}m -> ${o.expectedDelayAfter.toFixed(1)}m (${o.mitigationPct}% relief)\n`;
        txt += `  - Reason: ${o.reason}\n\n`;
      });
    }
    
    txt += `## 2. BARRICADES\n\n`;
    if (plan.barricades.length === 0) {
      txt += `No barricades recommended.\n\n`;
    } else {
      plan.barricades.forEach(b => {
        txt += `- **Location:** ${b.road} (between ${b.from} and ${b.to})\n`;
        txt += `  - Action: ${b.action}\n`;
        txt += `  - Impact Score: +${b.impact}\n`;
        txt += `  - Reason: ${b.reason}\n\n`;
      });
    }
    
    txt += `## 3. DIVERSIONS\n\n`;
    if (plan.diversions.length === 0) {
      txt += `No diversions recommended.\n\n`;
    } else {
      plan.diversions.forEach(d => {
        txt += `- **Reroute:** ${d.from} to ${d.to}\n`;
        txt += `  - Avoids: ${d.avoids.join(", ")}\n`;
        txt += `  - Travel Time: ${d.normalTimeMin.toFixed(0)}m -> ${d.divertedTimeMin.toFixed(0)}m via diversion\n`;
        txt += `  - Reason: ${d.reason}\n\n`;
      });
    }
    
    const blob = new Blob([txt], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `conflux_deployment_plan.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    {
      key: "manpower",
      label: "Manpower",
      count: plan.manpower.junctionsStaffed,
      icon: <Users size={13} />,
    },
    {
      key: "barricades",
      label: "Barricades",
      count: plan.barricades.length,
      icon: <TrafficCone size={13} />,
    },
    {
      key: "diversions",
      label: "Diversions",
      count: plan.diversions.length,
      icon: <Route size={13} />,
    },
  ];

  const layerKey: keyof MapLayers = tab;
  const layerOn = layers[layerKey];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between transition-colors duration-300">
        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[12px] font-bold transition cursor-pointer ${
                tab === t.key
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-panel-2"
              }`}
            >
              {t.icon}
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                tab === t.key ? "bg-accent-foreground/20 text-accent-foreground" : "bg-panel-2 text-muted border border-edge"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onToggleLayer(layerKey)}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel px-2.5 py-1.5 text-[11px] font-bold text-muted transition hover:text-foreground hover:bg-panel-2 cursor-pointer shadow-xs"
            title="Toggle map layer"
          >
            {layerOn ? <Eye size={12} className="text-foreground" /> : <EyeOff size={12} />}
            Map
          </button>
          <button
            onClick={exportPlan}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel px-2.5 py-1.5 text-[11px] font-bold text-muted transition hover:text-foreground hover:bg-panel-2 cursor-pointer shadow-xs"
            title="Export deployment plan"
          >
            <Download size={12} />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin pr-1">
        {tab === "manpower" && (
          <div className="flex flex-col gap-2">
            {plan.manpower.officers.length === 0 && (
              <Empty text="No officers required — negligible event impact." />
            )}
            {plan.manpower.officers.map((o) => (
              <div key={o.junctionId} className="panel-2 px-3.5 py-3.5 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all duration-300 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-foreground tracking-tight">
                    {o.junctionName}
                  </span>
                  <Badge color="#71717a">
                    <Users size={11} className="mr-1 inline-block" /> {o.officers} officers
                  </Badge>
                </div>
                
                {/* Visual Delay Reduction Indicators */}
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted line-through tabular-nums">{o.expectedDelayBefore.toFixed(1)}m</span>
                    <ArrowRight size={10} className="text-muted" />
                    <span className="text-foreground font-extrabold tabular-nums">{o.expectedDelayAfter.toFixed(1)}m delay</span>
                  </div>
                  <span className="text-foreground font-extrabold">{o.mitigationPct}% relief</span>
                </div>

                {/* Horizontal mitigation progress bar */}
                <div className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${o.mitigationPct}%` }}
                  />
                </div>

                <p className="text-[11px] text-muted leading-relaxed font-medium mt-0.5">{o.reason}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "barricades" && (
          <div className="flex flex-col gap-2">
            {plan.barricades.length === 0 && (
              <Empty text="No barricades recommended." />
            )}
            {plan.barricades.map((b, i) => (
              <div key={i} className="panel-2 px-3.5 py-3.5 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all duration-300 shadow-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-extrabold text-foreground tracking-tight">
                    {b.road}
                  </span>
                  <Badge color="#71717a">+{b.impact} impact</Badge>
                </div>
                
                <div className="flex items-center gap-1.5 text-[11px] text-muted font-bold">
                  <span>{b.from}</span>
                  <ArrowRight size={10} className="text-muted" />
                  <span>{b.to}</span>
                </div>

                <div className="mt-0.5 flex items-center gap-2">
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-[10px] font-extrabold text-foreground uppercase tracking-wider">
                    {b.action}
                  </span>
                </div>
                
                <p className="text-[11px] text-muted leading-relaxed font-medium mt-0.5">{b.reason}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "diversions" && (
          <div className="flex flex-col gap-2">
            {plan.diversions.length === 0 && (
              <Empty text="No diversions needed — through-traffic unaffected." />
            )}
            {plan.diversions.map((d, i) => {
              const diff = d.divertedTimeMin - d.normalTimeMin;
              const increasePct = Math.round((diff / d.normalTimeMin) * 100);
              return (
                <div key={i} className="panel-2 px-3.5 py-3.5 hover:border-neutral-400 dark:hover:border-neutral-700 transition-all duration-300 shadow-xs flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground tracking-tight">
                    {d.from} <ArrowRight size={12} className="text-muted inline-block" /> {d.to}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold mt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 dark:text-neutral-500 line-through tabular-nums">
                        {d.normalTimeMin.toFixed(0)}m normal
                      </span>
                      <ArrowRight size={10} className="text-muted" />
                      <span className="text-foreground font-extrabold tabular-nums">
                        {d.divertedTimeMin.toFixed(0)}m via route
                      </span>
                    </div>
                    {diff > 0 ? (
                      <span className="text-neutral-500 dark:text-neutral-400">+{diff.toFixed(0)}m ({increasePct}%)</span>
                    ) : (
                      <span className="text-neutral-500 dark:text-neutral-400">no delay</span>
                    )}
                  </div>

                  {/* Travel time comparison horizontal bar */}
                  <div className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex">
                    <div
                      className="h-full bg-neutral-400 dark:bg-neutral-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, (d.normalTimeMin / Math.max(d.normalTimeMin, d.divertedTimeMin)) * 100)}%` }}
                    />
                    {diff > 0 && (
                      <div
                        className="h-full bg-accent transition-all duration-500"
                        style={{ width: `${(diff / Math.max(d.normalTimeMin, d.divertedTimeMin)) * 100}%` }}
                      />
                    )}
                  </div>

                  <div className="text-[11px] text-muted font-medium mt-1 leading-relaxed">
                    Keeps clear:{" "}
                    <span className="text-foreground font-extrabold">{d.avoids.join(", ")}</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed font-medium mt-0.5">{d.reason}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-edge bg-panel-2 px-3 py-6 text-center text-[12px] text-muted font-semibold">
      {text}
    </div>
  );
}
