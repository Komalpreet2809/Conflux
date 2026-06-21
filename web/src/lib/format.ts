// Shared formatting + congestion color scale.

export const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const RAIN_LABELS = ["Clear", "Light Rain", "Heavy Rain"];

/** Congestion (0-100) -> color. Calm green (free) -> brand scarlet (gridlock). */
export function congestionColor(v: number): string {
  if (v >= 85) return "#e11d48"; // rose-600  (gridlock)
  if (v >= 70) return "#f43f5e"; // rose-500  (severe — brand accent)
  if (v >= 55) return "#fb923c"; // orange-400 (heavy)
  if (v >= 40) return "#facc15"; // yellow-400 (moderate)
  if (v >= 25) return "#a3e635"; // lime-400  (light)
  return "#34d399"; // emerald-400 (free-flow)
}

export function congestionLabel(v: number): string {
  if (v >= 85) return "Gridlock";
  if (v >= 70) return "Severe";
  if (v >= 55) return "Heavy";
  if (v >= 40) return "Moderate";
  if (v >= 25) return "Light";
  return "Free-flow";
}

/** Marker radius (px) scaled by congestion. */
export function congestionRadius(v: number): number {
  return 5 + (v / 100) * 13;
}

export function formatHour(h: number): string {
  const hour = Math.floor(h) % 24;
  const min = Math.round((h - Math.floor(h)) * 60);
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

export function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function phaseColor(phase: string): string {
  switch (phase) {
    case "arrival":
      return "#38bdf8"; // sky-400
    case "during":
      return "#a78bfa"; // violet-400
    case "dispersal":
      return "#fb7185"; // rose-400
    default:
      return "#94a3b8";
  }
}

export function phaseLabel(phase: string): string {
  switch (phase) {
    case "arrival":
      return "Arrival surge";
    case "during":
      return "Event in progress";
    case "dispersal":
      return "Dispersal surge";
    default:
      return phase;
  }
}
