"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useEffect, useMemo, useState } from "react";

// Clean default leaflet icon settings to prevent double-rendered blue/black pins on dynamic updates
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>",
    shadowUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>",
  });
}
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import {
  Barricade,
  Diversion,
  Forecast,
  ManpowerOfficer,
  RoadGraph,
} from "@/lib/api";
import { congestionColor, congestionLabel } from "@/lib/format";

/** Build a clean, flat junction marker — small dot, thin ring, no glow. */
function junctionIcon(cong: number) {
  const color = congestionColor(cong);
  const t = Math.min(Math.max(cong, 0), 100) / 100;
  const d = 5 + t * 6; // 5 .. 11 px
  return L.divIcon({
    className: "junction-label",
    html: `<div class="jnode-flat" style="--c:${color};--d:${d.toFixed(1)}px"></div>`,
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
  });
}

export interface MapLayers {
  manpower: boolean;
  barricades: boolean;
  diversions: boolean;
}

interface Props {
  forecast: Forecast | null;
  graph: RoadGraph | null;
  barricades: Barricade[];
  diversions: Diversion[];
  officers: ManpowerOfficer[];
  timeIndex: number;
  layers: MapLayers;
  theme?: "light" | "dark";
}

const BLR_CENTER: [number, number] = [12.9716, 77.5946];

function FitToData({ forecast }: { forecast: Forecast | null }) {
  const map = useMap();
  useEffect(() => {
    if (!forecast) return;
    const pts: [number, number][] = [
      [forecast.event.venueLat, forecast.event.venueLng],
      ...forecast.perJunction
        .filter((p) => p.delta >= 8)
        .map((p) => [p.lat, p.lng] as [number, number]),
    ];
    if (pts.length < 2) return;
    map.fitBounds(L.latLngBounds(pts).pad(0.12), { animate: true });
  }, [forecast, map]);
  return null;
}

function MapZoomListener({ setZoom }: { setZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });
  return null;
}

export default function MapView({
  forecast,
  graph,
  barricades,
  diversions,
  officers,
  timeIndex,
  layers,
  theme = "dark",
}: Props) {
  const nodeCoord = useMemo(() => {
    const m = new Map<string, [number, number]>();
    graph?.nodes.forEach((n) => m.set(n.id, [n.lat, n.lng]));
    return m;
  }, [graph]);

  const [zoom, setZoom] = useState(12);

  const bucket = forecast?.timeline[timeIndex];

  const venueIcon = useMemo(
    () =>
      L.divIcon({
        className: "junction-label",
        html: `
          <div class="venue-pin-svg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="var(--background)" stroke="var(--foreground)" stroke-width="2" />
              <circle cx="12" cy="12" r="5" fill="var(--foreground)" />
            </svg>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  const officerIcon = (n: number) =>
    L.divIcon({
      className: "junction-label",
      html: `<div class="officer-badge-new">${n}</div>`,
      iconSize: [13, 13],
      iconAnchor: [6.5, 6.5],
    });

  const clusterIcon = (n: number) =>
    L.divIcon({
      className: "junction-label",
      html: `<div class="officer-cluster-new">${n}</div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

  const clusterThreshold = useMemo(() => {
    if (zoom < 13) return 0.0045; // Heavy clustering
    if (zoom === 13) return 0.0035;
    if (zoom === 14) return 0.0025;
    if (zoom === 15) return 0.0015;
    if (zoom === 16) return 0.0008;
    return 0.0; // Zoom >= 17: no clustering
  }, [zoom]);

  const mapMarkers = useMemo(() => {
    if (clusterThreshold === 0) {
      return officers.map((o) => ({
        key: `off-${o.junctionId}`,
        lat: o.lat,
        lng: o.lng,
        count: o.officers,
        icon: officerIcon(o.officers),
        tooltip: (
          <div className="text-xs">
            <b>{o.junctionName}</b>
            <br />
            {o.officers} officers · {o.mitigationPct}% mitigation
          </div>
        ),
      }));
    }

    const list: {
      key: string;
      lat: number;
      lng: number;
      count: number;
      isCluster: boolean;
      tooltip: React.ReactNode;
    }[] = [];

    officers.forEach((o) => {
      let matched = false;
      for (const item of list) {
        const dist = Math.sqrt((item.lat - o.lat) ** 2 + (item.lng - o.lng) ** 2);
        if (dist < clusterThreshold) {
          item.count += o.officers;
          item.isCluster = true;
          item.tooltip = (
            <div className="text-xs leading-relaxed max-w-[200px]">
              {item.tooltip}
              <div className="border-t border-edge/60 mt-1 pt-1 flex justify-between">
                <span>{o.junctionName}</span>
                <span className="font-bold">{o.officers} off.</span>
              </div>
            </div>
          );
          matched = true;
          break;
        }
      }
      if (!matched) {
        list.push({
          key: `cluster-${o.junctionId}`,
          lat: o.lat,
          lng: o.lng,
          count: o.officers,
          isCluster: false,
          tooltip: (
            <div className="text-xs leading-relaxed max-w-[200px]">
              <div className="font-bold border-b border-edge/80 pb-0.5 mb-1 text-[11px] uppercase tracking-wider text-muted">
                Manpower Deployment
              </div>
              <div className="flex justify-between">
                <span>{o.junctionName}</span>
                <span className="font-bold">{o.officers} off.</span>
              </div>
            </div>
          ),
        });
      }
    });

    return list.map((item) => {
      const finalTooltip = item.isCluster ? (
        <div className="text-xs leading-relaxed">
          {item.tooltip}
          <div className="border-t-2 border-edge mt-1.5 pt-1 flex justify-between font-extrabold text-foreground">
            <span>TOTAL ZONE</span>
            <span>{item.count} officers</span>
          </div>
        </div>
      ) : (
        item.tooltip
      );

      return {
        key: item.key,
        lat: item.lat,
        lng: item.lng,
        count: item.count,
        icon: item.isCluster ? clusterIcon(item.count) : officerIcon(item.count),
        tooltip: finalTooltip,
      };
    });
  }, [officers, clusterThreshold]);

  const barricadeIcon = useMemo(
    () =>
      L.divIcon({
        className: "junction-label",
        html: `
          <div class="barricade-pin-svg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7v6c0 5.52 4.48 10 10 10s10-4.48 10-10V7L12 2z" fill="var(--foreground)" />
              <path d="M12 7v6M12 16.5h.01" stroke="var(--background)" stroke-width="2.5" stroke-linecap="round" />
            </svg>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    []
  );

  const isDark = theme === "dark";

  return (
    <MapContainer
      center={BLR_CENTER}
      zoom={12}
      className="h-full w-full"
      zoomControl={false}
      preferCanvas={true}
    >
      <TileLayer
        url={
          isDark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        }
        attribution=""
        subdomains="abcd"
        maxZoom={19}
      />

      <FitToData forecast={forecast} />
      <MapZoomListener setZoom={setZoom} />

      {/* Base road network */}
      {graph?.edges.map((e, i) => {
        const a = nodeCoord.get(e.from);
        const b = nodeCoord.get(e.to);
        if (!a || !b) return null;
        return (
          <Polyline
            key={`edge-${i}`}
            positions={[a, b]}
            pathOptions={{
              color: isDark ? "#27272a" : "#e4e4e7",
              weight: Math.max(1, e.lanes / 3),
              opacity: isDark ? 0.75 : 0.45,
            }}
          />
        );
      })}

      {/* Diversions */}
      {layers.diversions &&
        diversions.map((d, i) => (
          <Fragment key={`div-${i}`}>
            <Polyline
              positions={d.originalRoute}
              pathOptions={{ color: isDark ? "#52525b" : "#d4d4d8", weight: 3, opacity: 0.5, dashArray: "4 6" }}
            />
            <Polyline
              positions={d.suggestedRoute}
              pathOptions={{
                color: "#f43f5e",
                weight: 4.5,
                opacity: 0.95,
                className: "diversion-flow",
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <b>Diversion:</b> {d.from} → {d.to}
                  <br />
                  Avoids: {d.avoids.join(", ")}
                </div>
              </Tooltip>
            </Polyline>
          </Fragment>
        ))}

      {/* Barricades */}
      {layers.barricades &&
        barricades.map((b, i) => {
          const mid: [number, number] = [
            (b.route[0][0] + b.route[1][0]) / 2,
            (b.route[0][1] + b.route[1][1]) / 2,
          ];
          return (
            <Fragment key={`bar-${i}`}>
              <Polyline
                positions={b.route}
                pathOptions={{ color: isDark ? "#d4d4d8" : "#52525b", weight: 6, opacity: 0.85, dashArray: "2 8" }}
              />
              <Marker position={mid} icon={barricadeIcon}>
                <Tooltip>
                  <div className="text-xs">
                    <b>{b.action}</b>
                    <br />
                    {b.road}
                  </div>
                </Tooltip>
              </Marker>
            </Fragment>
          );
        })}

      {/* Junctions colored by congestion at current time */}
      {forecast?.perJunction.map((p) => {
        const cong = bucket ? bucket.congestion[p.id] ?? p.congestion : p.congestion;
        const delta = bucket ? bucket.delta[p.id] ?? p.delta : p.delta;
        const delay = bucket ? bucket.delay[p.id] ?? p.delay : p.delay;
        const color = congestionColor(cong);
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={junctionIcon(cong)}
            zIndexOffset={Math.round(cong)}
          >
            <Tooltip>
              <div className="text-xs leading-relaxed">
                <b>{p.name}</b>
                <br />
                Congestion: <b style={{ color }}>{cong.toFixed(0)}/100</b> (
                {congestionLabel(cong)})
                <br />
                Event impact: +{delta.toFixed(0)} pts
                <br />
                Avg delay: {delay.toFixed(1)} min
              </div>
            </Tooltip>
          </Marker>
        );
      })}

      {/* Officer placements */}
      {layers.manpower &&
        mapMarkers.map((m) => (
          <Marker key={m.key} position={[m.lat, m.lng]} icon={m.icon} zIndexOffset={1000}>
            <Tooltip>{m.tooltip}</Tooltip>
          </Marker>
        ))}

      {/* Venue */}
      {forecast && (
        <Marker
          position={[forecast.event.venueLat, forecast.event.venueLng]}
          icon={venueIcon}
          zIndexOffset={2000}
        >
          <Tooltip permanent direction="top" offset={[0, -10]} className="venue-tooltip-custom">
            <span className="uppercase">{forecast.event.venueName}</span>
          </Tooltip>
        </Marker>
      )}
    </MapContainer>
  );
}
