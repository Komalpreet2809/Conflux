// Typed client for the Conflux forecasting/planning API.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

// --- Types (mirror the FastAPI responses) ---------------------------------

export interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  base_radius_km: number;
  typicalEvents: string[];
}

export interface EventTypeOption {
  key: string;
  label: string;
}

export interface WeatherOption {
  value: number;
  label: string;
}

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lanes: number;
  baseVolume: number;
  centrality: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  road: string;
  lanes: number;
  lengthKm: number;
  capacity: number;
}

export interface RoadGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TimelineBucket {
  minutes: number;
  label: string;
  phase: "arrival" | "during" | "dispersal";
  clockHour: number;
  avgCongestion: number;
  maxCongestion: number;
  totalDelay: number;
  junctionsAffected: number;
  congestion: Record<string, number>;
  delta: Record<string, number>;
  delay: Record<string, number>;
}

export interface PerJunction {
  id: string;
  name: string;
  lat: number;
  lng: number;
  congestion: number;
  peakCongestion: number;
  baseline: number;
  delta: number;
  delay: number;
  peakMinutes: number;
  distanceKm: number;
  centrality: number;
}

export interface Kpis {
  peakCongestion: number;
  peakTimeLabel: string;
  peakPhase: string;
  junctionsAffected: number;
  worstJunction: string | null;
  impactRadiusKm: number;
  avgDelayAtPeak: number;
  totalDelayAtPeak: number;
}

export interface EventSummary {
  venueId: string;
  venueName: string;
  venueLat: number;
  venueLng: number;
  venueCapacity: number;
  eventType: string;
  attendance: number;
  attendanceRatio: number;
  startHour: number;
  dow: number;
  isWeekend: boolean;
  isHoliday: boolean;
  rain: number;
  tempC: number;
  durationMin: number;
}

export interface Forecast {
  event: EventSummary;
  timeline: TimelineBucket[];
  peakIndex: number;
  perJunction: PerJunction[];
  kpis: Kpis;
}

export interface ManpowerOfficer {
  junctionId: string;
  junctionName: string;
  lat: number;
  lng: number;
  officers: number;
  priority: number;
  peakCongestion: number;
  eventDelta: number;
  expectedDelayBefore: number;
  expectedDelayAfter: number;
  mitigationPct: number;
  reason: string;
}

export interface Manpower {
  officers: ManpowerOfficer[];
  totalDeployed: number;
  junctionsStaffed: number;
}

export interface Barricade {
  edge: string;
  road: string;
  from: string;
  to: string;
  route: [number, number][];
  action: string;
  impact: number;
  distToVenueKm: number;
  reason: string;
}

export interface Diversion {
  from: string;
  to: string;
  avoids: string[];
  originalRoute: [number, number][];
  suggestedRoute: [number, number][];
  normalTimeMin: number;
  divertedTimeMin: number;
  extraDistanceMin: number;
  reason: string;
}

export interface Plan {
  manpower: Manpower;
  barricades: Barricade[];
  diversions: Diversion[];
  summary: {
    officersDeployed: number;
    junctionsStaffed: number;
    barricadePoints: number;
    diversionRoutes: number;
    manpowerBudget: number;
  };
}

export interface SimulateResponse {
  forecast: Forecast;
  plan: Plan;
}

export interface ModelMetrics {
  targets: {
    congestion: TargetMetric;
    delay: TargetMetric;
  };
  n_rows: number;
  n_events: number;
  n_test_events: number;
  features: string[];
  trained_seconds: number;
  scatter: { actual: number; predicted: number }[];
}

export interface TargetMetric {
  mae: number;
  r2: number;
  baseline_mae: number;
  skill_vs_baseline_pct: number;
  n_test_rows: number;
}

export interface HistoricalEvent {
  id: string;
  name: string;
  date: string;
  venueId: string;
  venueName: string;
  eventType: string;
  eventTypeLabel: string;
  attendance: number;
  startHour: number;
  durationMin: number;
  rain: number;
}

export interface ReplayResponse {
  meta: { id: string; name: string; date: string };
  forecast: Forecast;
  plan: Plan;
  comparison: {
    id: string;
    name: string;
    predicted: number;
    actual: number;
    error: number;
    delta: number;
  }[];
  accuracy: {
    mae: number;
    rmse: number;
    within5pts: number;
    within10pts: number;
    nJunctions: number;
  };
}

export interface ScenarioInput {
  venueId: string;
  eventType: string;
  attendance: number;
  startHour: number;
  dow: number;
  isHoliday: boolean;
  rain: number;
  tempC: number;
  durationMin: number;
  manpowerBudget: number;
}

// --- Fetch helpers ---------------------------------------------------------

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export const getVenues = () => getJSON<Venue[]>("/api/venues");
export const getEventTypes = () => getJSON<EventTypeOption[]>("/api/event-types");
export const getWeatherOptions = () => getJSON<WeatherOption[]>("/api/weather-options");
export const getGraph = () => getJSON<RoadGraph>("/api/graph");
export const getMetrics = () => getJSON<ModelMetrics>("/api/metrics");
export const getHistoricalEvents = () => getJSON<HistoricalEvent[]>("/api/events");
export const getReplay = (id: string) =>
  getJSON<ReplayResponse>(`/api/events/${id}/replay`);

export async function simulate(input: ScenarioInput): Promise<SimulateResponse> {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`simulate failed: ${res.status} ${detail}`);
  }
  return res.json();
}
