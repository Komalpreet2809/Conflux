"use client";

import {
  CalendarDays,
  CloudRain,
  History,
  Play,
  Users,
  Zap,
} from "lucide-react";

import {
  EventTypeOption,
  HistoricalEvent,
  ScenarioInput,
  Venue,
  WeatherOption,
} from "@/lib/api";
import { DOW_LABELS, formatHour } from "@/lib/format";
import { Field, RangeField, Segmented, SectionTitle } from "@/components/ui";

interface Props {
  scenario: ScenarioInput;
  venues: Venue[];
  eventTypes: EventTypeOption[];
  weatherOptions: WeatherOption[];
  historical: HistoricalEvent[];
  activeReplayId: string | null;
  loading: boolean;
  onChange: (patch: Partial<ScenarioInput>) => void;
  onRun: () => void;
  onLoadReplay: (id: string) => void;
}

const selectClass =
  "w-full rounded-xl border border-edge bg-panel-2 px-3 py-2 text-[13px] text-foreground outline-none focus:border-neutral-400 focus:bg-background transition cursor-pointer";

export default function ScenarioPanel({
  scenario,
  venues,
  eventTypes,
  weatherOptions,
  historical,
  activeReplayId,
  loading,
  onChange,
  onRun,
  onLoadReplay,
}: Props) {
  const venue = venues.find((v) => v.id === scenario.venueId);
  const maxAttendance = venue ? Math.round(venue.capacity * 1.25) : 100000;
  const ratio = venue ? Math.round((scenario.attendance / venue.capacity) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:overflow-y-auto scroll-thin pr-1">
      <div>
        <SectionTitle right={<Zap size={14} className="text-foreground" />}>
          Plan an Event
        </SectionTitle>
        <p className="text-[11px] leading-relaxed text-muted font-medium">
          Configure an event scenario. The model forecasts congestion across the
          city and recommends a deployment plan.
        </p>
      </div>

      <Field label="Venue">
        <select
          className={selectClass}
          value={scenario.venueId}
          onChange={(e) => onChange({ venueId: e.target.value })}
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({(v.capacity / 1000).toFixed(0)}k)
            </option>
          ))}
        </select>
      </Field>

      <Field label="Event type">
        <select
          className={selectClass}
          value={scenario.eventType}
          onChange={(e) => onChange({ eventType: e.target.value })}
        >
          {eventTypes.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <RangeField
        label="Expected attendance"
        value={scenario.attendance}
        min={1000}
        max={maxAttendance}
        step={1000}
        onChange={(v) => onChange({ attendance: v })}
        display={`${(scenario.attendance / 1000).toFixed(0)}k · ${ratio}% cap`}
      />

      <RangeField
        label="Start time"
        value={scenario.startHour}
        min={5.5}
        max={23}
        step={0.5}
        onChange={(v) => onChange({ startHour: v })}
        display={formatHour(scenario.startHour)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Day">
          <select
            className={selectClass}
            value={scenario.dow}
            onChange={(e) => onChange({ dow: Number(e.target.value) })}
          >
            {DOW_LABELS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Duration">
          <select
            className={selectClass}
            value={scenario.durationMin}
            onChange={(e) => onChange({ durationMin: Number(e.target.value) })}
          >
            {[60, 90, 120, 150, 180, 210, 240, 300, 360].map((m) => (
              <option key={m} value={m}>
                {Math.floor(m / 60)}h {m % 60 ? `${m % 60}m` : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Weather">
        <Segmented
          options={weatherOptions.map((w) => ({ label: w.label, value: w.value }))}
          value={scenario.rain}
          onChange={(v) => onChange({ rain: v })}
        />
      </Field>

      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-edge bg-panel-2 px-3.5 py-2 transition hover:bg-neutral-100/50 dark:hover:bg-panel-2/30">
        <span className="flex items-center gap-2 text-[12px] font-semibold text-muted">
          <CalendarDays size={14} /> Public holiday
        </span>
        <input
          type="checkbox"
          checked={scenario.isHoliday}
          onChange={(e) => onChange({ isHoliday: e.target.checked })}
          className="h-4 w-4 accent-accent cursor-pointer"
        />
      </label>

      <RangeField
        label="Manpower budget (officers)"
        value={scenario.manpowerBudget}
        min={0}
        max={200}
        step={5}
        onChange={(v) => onChange({ manpowerBudget: v })}
        display={`${scenario.manpowerBudget}`}
      />

      <button
        onClick={onRun}
        disabled={loading}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-extrabold text-accent-foreground transition hover:opacity-95 shadow-sm disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          "Forecasting…"
        ) : (
          <>
            <Play size={16} fill="currentColor" /> Run Forecast &amp; Plan
          </>
        )}
      </button>

      <div className="mt-2 border-t border-edge pt-3">
        <SectionTitle right={<History size={14} className="text-foreground" />}>
          Replay Real Events
        </SectionTitle>
        <p className="mb-2 text-[11px] leading-relaxed text-muted font-medium">
          Post-event learning: compare the model&apos;s forecast against observed
          outcomes for past Bengaluru events.
        </p>
        <div className="flex flex-col gap-1.5">
          {historical.map((h) => {
            const active = activeReplayId === h.id;
            return (
              <button
                key={h.id}
                onClick={() => onLoadReplay(h.id)}
                className={`rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                  active
                    ? "border-accent/60 bg-accent/10 dark:bg-accent/15 shadow-sm"
                    : "border-edge bg-panel-2 hover:border-neutral-400 hover:bg-neutral-100/30 dark:hover:bg-neutral-800/40"
                }`}
              >
                <div className="text-[12px] font-bold text-foreground">
                  {h.name}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-muted font-medium">
                  <span>{h.date}</span>
                  <span className="flex items-center gap-1">
                    <Users size={10} /> {(h.attendance / 1000).toFixed(0)}k
                  </span>
                  {h.rain > 0 && (
                    <span className="flex items-center gap-1">
                      <CloudRain size={10} /> rain
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
