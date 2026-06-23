"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Radio, TriangleAlert, Sun, Moon } from "lucide-react";

import {
  EventTypeOption,
  HistoricalEvent,
  ModelMetrics,
  ReplayResponse,
  RoadGraph,
  ScenarioInput,
  SimulateResponse,
  Venue,
  WeatherOption,
  getEventTypes,
  getGraph,
  getHistoricalEvents,
  getMetrics,
  getReplay,
  getVenues,
  getWeatherOptions,
  simulate,
} from "@/lib/api";
import { DOW_LABELS, RAIN_LABELS, formatHour } from "@/lib/format";
import type { MapLayers } from "@/components/MapView";
import ScenarioPanel from "@/components/ScenarioPanel";
import TimeSlider from "@/components/TimeSlider";
import KpiBar from "@/components/KpiBar";
import TimelineChart from "@/components/TimelineChart";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import AccuracyPanel from "@/components/AccuracyPanel";
import { Badge } from "@/components/ui";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      Loading map…
    </div>
  ),
});

const DEFAULT_SCENARIO: ScenarioInput = {
  venueId: "chinnaswamy",
  eventType: "cricket",
  attendance: 36000,
  startHour: 19.5,
  dow: 5,
  isHoliday: false,
  rain: 0,
  tempC: 28,
  durationMin: 210,
  manpowerBudget: 60,
};

const LEGEND = [
  { c: "#34d399", l: "Free" },
  { c: "#a3e635", l: "Light" },
  { c: "#facc15", l: "Moderate" },
  { c: "#fb923c", l: "Heavy" },
  { c: "#f43f5e", l: "Severe" },
  { c: "#e11d48", l: "Gridlock" },
];

export default function Dashboard() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as "light" | "dark" | null;
      if (saved) return saved;
      if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [weatherOptions, setWeatherOptions] = useState<WeatherOption[]>([]);
  const [historical, setHistorical] = useState<HistoricalEvent[]>([]);
  const [graph, setGraph] = useState<RoadGraph | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);

  const [scenario, setScenario] = useState<ScenarioInput>(DEFAULT_SCENARIO);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const [replay, setReplay] = useState<ReplayResponse | null>(null);
  const [mode, setMode] = useState<"simulate" | "replay">("simulate");

  const [timeIndex, setTimeIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"plan" | "accuracy">("plan");
  const [layers, setLayers] = useState<MapLayers>({
    manpower: true,
    barricades: true,
    diversions: true,
  });

  const forecast =
    mode === "replay" ? replay?.forecast ?? null : result?.forecast ?? null;
  const plan = mode === "replay" ? replay?.plan ?? null : result?.plan ?? null;
  const activeReplayId = mode === "replay" ? replay?.meta.id ?? null : null;

  const runSimulate = useCallback(async (s: ScenarioInput) => {
    setLoading(true);
    setError(null);
    setPlaying(false);
    try {
      const r = await simulate(s);
      setResult(r);
      setReplay(null);
      setMode("simulate");
      setRightTab("plan");
      setTimeIndex(r.forecast.peakIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReplay = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setPlaying(false);
    try {
      const r = await getReplay(id);
      setReplay(r);
      setMode("replay");
      setRightTab("accuracy");
      const ev = r.forecast.event;
      setScenario((s) => ({
        ...s,
        venueId: ev.venueId,
        eventType: ev.eventType,
        attendance: ev.attendance,
        startHour: ev.startHour,
        dow: ev.dow,
        isHoliday: ev.isHoliday,
        rain: ev.rain,
        durationMin: ev.durationMin,
      }));
      setTimeIndex(r.forecast.peakIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Boot: load metadata, then run the default scenario.
  useEffect(() => {
    (async () => {
      try {
        const [v, et, wo, hist, g, m] = await Promise.all([
          getVenues(),
          getEventTypes(),
          getWeatherOptions(),
          getHistoricalEvents(),
          getGraph(),
          getMetrics().catch(() => null),
        ]);
        setVenues(v);
        setEventTypes(et);
        setWeatherOptions(wo);
        setHistorical(hist);
        setGraph(g);
        setMetrics(m);
        await runSimulate(DEFAULT_SCENARIO);
      } catch (e) {
        setError(
          (e instanceof Error ? e.message : String(e)) +
            " — is the API running on " +
            (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000") +
            "?"
        );
      } finally {
        setBooting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Playback animation.
  useEffect(() => {
    if (!playing || !forecast) return;
    const id = setInterval(() => {
      setTimeIndex((i) => (i + 1) % forecast.timeline.length);
    }, 650);
    return () => clearInterval(id);
  }, [playing, forecast]);

  const patchScenario = useCallback(
    (patch: Partial<ScenarioInput>) => {
      setScenario((s) => {
        const next = { ...s, ...patch };
        if (patch.venueId) {
          const v = venues.find((x) => x.id === patch.venueId);
          if (v) {
            const max = Math.round(v.capacity * 1.25);
            if (next.attendance > max) next.attendance = max;
          }
        }
        return next;
      });
    },
    [venues]
  );

  const toggleLayer = (key: keyof MapLayers) =>
    setLayers((l) => ({ ...l, [key]: !l[key] }));

  const eventTypeLabel = useMemo(() => {
    if (!forecast) return "";
    return (
      eventTypes.find((t) => t.key === forecast.event.eventType)?.label ??
      forecast.event.eventType
    );
  }, [forecast, eventTypes]);

  if (booting) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <div className="text-2xl font-bold tracking-tight">
          Con<span className="text-accent font-semibold">flux</span>
        </div>
        <div className="text-sm text-muted">Booting command center…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge bg-panel px-5 shadow-xs backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center text-foreground shrink-0 select-none">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Converging highway paths (conflux) */}
              <path d="M3 5c4 0 6 7 10 7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              <path d="M3 19c4 0 6-7 10-7h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              <path d="M2 12h19" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
              {/* Glowing confluence junction node */}
              <circle cx="13" cy="12" r="3.5" fill="#f43f5e" stroke="var(--background)" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div className="text-[17px] font-extrabold leading-none tracking-tight text-foreground">
              Con<span className="text-accent font-semibold">flux</span>
            </div>
            <div className="text-[11px] text-muted font-semibold mt-1 transition-colors duration-300">
              Event Traffic Command Center · Bengaluru
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {metrics && (
              <Badge color="#71717a">
                <Radio size={11} className="animate-pulse" /> Model R² {metrics.targets.congestion.r2.toFixed(2)}
              </Badge>
            )}
            <Badge color="#71717a">GRiDLOCK Hackathon 2.0</Badge>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted font-bold transition-colors duration-300">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-accent" />
            LIVE
          </div>
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge bg-panel hover:bg-panel-2 text-foreground transition cursor-pointer shadow-xs ml-1"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun size={14} fill="currentColor" /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30 px-4 py-2 text-[12px] text-red-700 dark:text-red-400 font-medium">
          <TriangleAlert size={14} /> {error}
        </div>
      )}

      {/* Body */}
      <div className="grid grid-cols-1 gap-4 p-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[290px_1fr_350px] xl:grid-cols-[330px_1fr_390px]">
        {/* Left: scenario */}
        <aside className="panel p-4 lg:min-h-0 lg:overflow-hidden">
          <ScenarioPanel
            scenario={scenario}
            venues={venues}
            eventTypes={eventTypes}
            weatherOptions={weatherOptions}
            historical={historical}
            activeReplayId={activeReplayId}
            loading={loading}
            onChange={patchScenario}
            onRun={() => runSimulate(scenario)}
            onLoadReplay={loadReplay}
          />
        </aside>

        {/* Center: KPIs + map + slider + chart */}
        <main className="flex flex-col gap-4 lg:min-h-0 lg:min-w-0">
          {forecast && plan && <KpiBar kpis={forecast.kpis} plan={plan} />}

          <div className="panel relative overflow-hidden h-[55vh] min-h-[360px] lg:h-auto lg:min-h-0 lg:flex-1">
            <MapView
              forecast={forecast}
              graph={graph}
              barricades={plan?.barricades ?? []}
              diversions={plan?.diversions ?? []}
              officers={plan?.manpower.officers ?? []}
              timeIndex={timeIndex}
              layers={layers}
              theme={theme}
            />
            {/* Legend overlay */}
            <div className="pointer-events-none absolute bottom-4 left-4 z-[500] rounded-xl border border-edge bg-panel/95 px-3 py-2 shadow-md backdrop-blur transition-colors duration-300">
              <div className="mb-1 flex items-center gap-1 text-[10px] uppercase font-bold tracking-wide text-muted">
                <Layers size={10} /> Congestion
              </div>
              <div className="flex items-center gap-2">
                {LEGEND.map((x) => (
                  <div key={x.l} className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full border border-black/5 dark:border-white/10"
                      style={{ background: x.c }}
                    />
                    <span className="text-[10px] text-muted font-semibold">{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {forecast && (
            <TimeSlider
              timeline={forecast.timeline}
              timeIndex={timeIndex}
              peakIndex={forecast.peakIndex}
              playing={playing}
              onScrub={setTimeIndex}
              onPlayToggle={() => setPlaying((p) => !p)}
              onJumpPeak={() => {
                setPlaying(false);
                setTimeIndex(forecast.peakIndex);
              }}
            />
          )}

          {forecast && (
            <div className="panel h-40 shrink-0 p-3">
              <TimelineChart
                timeline={forecast.timeline}
                timeIndex={timeIndex}
                durationMin={forecast.event.durationMin}
                onScrub={setTimeIndex}
                theme={theme}
              />
            </div>
          )}
        </main>

        {/* Right: event summary + plan/accuracy */}
        <aside className="flex flex-col gap-4 lg:min-h-0">
          {forecast && (
            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-foreground">
                  {forecast.event.venueName}
                </h3>
                <Badge color={mode === "replay" ? "#71717a" : "#a1a1aa"}>
                  {mode === "replay" ? "Replay" : "Forecast"}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted font-semibold transition-colors duration-300">
                <span className="text-foreground">{eventTypeLabel}</span>
                <span>·</span>
                <span>{(forecast.event.attendance / 1000).toFixed(0)}k attendees</span>
                <span>·</span>
                <span>
                  {DOW_LABELS[forecast.event.dow]} {formatHour(forecast.event.startHour)}
                </span>
                <span>·</span>
                <span>{RAIN_LABELS[forecast.event.rain]}</span>
                {forecast.event.isHoliday && (
                  <>
                    <span>·</span>
                    <span className="text-neutral-500 dark:text-neutral-400 font-bold">Holiday</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-edge bg-panel-2 p-0.5 transition-colors duration-300">
            {(["plan", "accuracy"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold capitalize transition cursor-pointer ${
                  rightTab === t ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {t === "plan" ? "Deployment Plan" : "Accuracy"}
              </button>
            ))}
          </div>

          <div className="panel overflow-hidden p-4 min-h-[460px] lg:min-h-0 lg:flex-1">
            {rightTab === "plan" && plan ? (
              <RecommendationsPanel
                plan={plan}
                layers={layers}
                onToggleLayer={toggleLayer}
              />
            ) : null}
            {rightTab === "accuracy" ? (
              <AccuracyPanel metrics={metrics} replay={mode === "replay" ? replay : null} theme={theme} />
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
