"use client";

import { Pause, Play, SkipForward } from "lucide-react";

import { TimelineBucket } from "@/lib/api";
import { formatHour, phaseLabel } from "@/lib/format";

interface Props {
  timeline: TimelineBucket[];
  timeIndex: number;
  peakIndex: number;
  playing: boolean;
  onScrub: (i: number) => void;
  onPlayToggle: () => void;
  onJumpPeak: () => void;
}

export default function TimeSlider({
  timeline,
  timeIndex,
  peakIndex,
  playing,
  onScrub,
  onPlayToggle,
  onJumpPeak,
}: Props) {
  const bucket = timeline[timeIndex];
  if (!bucket) return null;

  return (
    <div className="panel px-4 py-3 shadow-xs">
      {/* Controls + readout — wrap as blocks so nothing clips on small screens */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          onClick={onPlayToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md transition hover:opacity-90 cursor-pointer"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>

        <button
          onClick={onJumpPeak}
          className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-edge bg-panel px-3.5 text-[11px] font-bold text-muted transition hover:text-foreground hover:bg-panel-2 shadow-xs cursor-pointer"
          title="Jump to peak impact"
        >
          <SkipForward size={12} /> Peak
        </button>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-sans text-[15px] font-extrabold tabular-nums text-foreground">
            {bucket.label}
          </span>
          <span className="text-[12px] font-bold text-muted">
            {formatHour(bucket.clockHour)}
          </span>
          <span className="whitespace-nowrap rounded-full border border-edge bg-panel-2 px-2.5 py-0.5 text-[10.5px] font-bold text-foreground">
            {phaseLabel(bucket.phase)}
          </span>
        </div>

        <span className="ml-auto whitespace-nowrap text-[11px] font-bold text-muted">
          avg{" "}
          <b className="text-foreground font-extrabold">{bucket.avgCongestion.toFixed(0)}</b> · peak{" "}
          <b className="text-foreground font-extrabold">{bucket.maxCongestion.toFixed(0)}</b> ·{" "}
          <b className="text-foreground font-extrabold">{bucket.junctionsAffected}</b> jns
        </span>
      </div>

      {/* Slider — always full width */}
      <div className="relative mt-3">
        <input
          type="range"
          min={0}
          max={timeline.length - 1}
          step={1}
          value={timeIndex}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="w-full cursor-pointer"
        />
        {/* peak marker */}
        <div
          className="pointer-events-none absolute -top-0.5 h-3 w-0.5 bg-foreground"
          style={{
            left: `${(peakIndex / (timeline.length - 1)) * 100}%`,
          }}
          title="Peak impact"
        />
      </div>
    </div>
  );
}
