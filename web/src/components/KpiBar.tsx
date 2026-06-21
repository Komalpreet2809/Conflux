"use client";

import {
  AlertTriangle,
  Clock,
  Radius,
  Shield,
  TrafficCone,
  Users,
} from "lucide-react";

import { Kpis, Plan } from "@/lib/api";
import { congestionColor, congestionLabel } from "@/lib/format";
import { Stat } from "@/components/ui";

export default function KpiBar({ kpis, plan }: { kpis: Kpis; plan: Plan }) {
  const peakColor = congestionColor(kpis.peakCongestion);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <Stat
        label="Peak congestion"
        value={
          <span style={{ color: peakColor }}>{kpis.peakCongestion.toFixed(0)}</span>
        }
        sub={`${congestionLabel(kpis.peakCongestion)} · ${kpis.peakTimeLabel}`}
        icon={<AlertTriangle size={12} />}
      />
      <Stat
        label="Worst junction"
        value={
          <span className="text-[15px] font-semibold leading-tight">
            {kpis.worstJunction ?? "—"}
          </span>
        }
        sub={`${kpis.avgDelayAtPeak.toFixed(1)} min avg delay`}
        icon={<TrafficCone size={12} />}
      />
      <Stat
        label="Junctions hit"
        value={kpis.junctionsAffected}
        sub="event-attributable surge"
        icon={<Radius size={12} />}
      />
      <Stat
        label="Impact radius"
        value={
          <>
            {kpis.impactRadiusKm.toFixed(1)}
            <span className="text-base text-muted"> km</span>
          </>
        }
        sub="from venue"
        icon={<Clock size={12} />}
      />
      <Stat
        label="Officers"
        value={plan.summary.officersDeployed}
        sub={`${plan.summary.junctionsStaffed} junctions staffed`}
        icon={<Users size={12} />}
      />
      <Stat
        label="Interventions"
        value={
          <span className="text-foreground">
            {plan.summary.barricadePoints}
            <span className="text-base text-muted"> bar</span> ·{" "}
            {plan.summary.diversionRoutes}
            <span className="text-base text-muted"> div</span>
          </span>
        }
        sub="barricades · diversions"
        icon={<Shield size={12} />}
      />
    </div>
  );
}
