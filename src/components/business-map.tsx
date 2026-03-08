"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { CATEGORY_COLORS } from "./category-selector";

const SD_CENTER: [number, number] = [-117.1611, 32.7157];
const SD_ZOOM = 10.5;
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

// Generate a heatmap color ramp from a hex color with configurable density→opacity stops
function colorRamp(hex: string, stops: [number, number][]): any[] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const result: any[] = ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)"];
  for (const [density, opacity] of stops) {
    result.push(density, `rgba(${r},${g},${b},${opacity})`);
  }
  return result;
}

const BASE_STOPS: [number, number][] = [[0.1, 0.08], [0.25, 0.18], [0.4, 0.32], [0.6, 0.48], [0.8, 0.65], [1, 0.85]];
const HIGHLIGHT_STOPS: [number, number][] = [[0.1, 0.25], [0.3, 0.45], [0.5, 0.65], [0.7, 0.8], [1, 1]];

// Default multi-color ramp when no categories selected
const DEFAULT_HEAT_RAMP: any[] = [
  "interpolate", ["linear"], ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.1, "rgba(14,165,233,0.12)",
  0.25, "rgba(3,105,161,0.25)",
  0.4, "rgba(5,150,105,0.4)",
  0.6, "rgba(16,185,129,0.55)",
  0.8, "rgba(217,119,6,0.7)",
  1, "rgba(251,191,36,0.85)",
];

const DEFAULT_HIGHLIGHT_RAMP: any[] = [
  "interpolate", ["linear"], ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.1, "rgba(251,191,36,0.3)",
  0.3, "rgba(245,158,11,0.5)",
  0.5, "rgba(217,119,6,0.7)",
  0.7, "rgba(194,65,12,0.85)",
  1, "rgba(234,88,12,1)",
];

interface BusinessMapProps {
  selectedCategories: string[];
  onExpand?: () => void;
  expanded?: boolean;
  highlightMonth?: string | null;
}

export function BusinessMap({ selectedCategories, onExpand, expanded, highlightMonth }: BusinessMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [pointCount, setPointCount] = useState<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: LIGHT_STYLE,
      center: SD_CENTER,
      zoom: SD_ZOOM,
      pitch: 20,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("businesses", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      // Base heatmap — all points, shown when not hovering
      map.addLayer({
        id: "business-heat", type: "heatmap", source: "businesses",
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 13, 2],
          "heatmap-color": DEFAULT_HEAT_RAMP as any,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 8, 13, 20],
          "heatmap-opacity": 0.7,
        },
      });

      // Highlight heatmap — only hovered month's points
      map.addLayer({
        id: "business-heat-highlight", type: "heatmap", source: "businesses",
        filter: ["==", ["get", "month"], ""],
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 1, 13, 3],
          "heatmap-color": DEFAULT_HIGHLIGHT_RAMP as any,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 12, 13, 28],
          "heatmap-opacity": 0.9,
        },
      });

      // Circle layer
      map.addLayer({
        id: "business-points", type: "circle", source: "businesses", minzoom: 12,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 2, 15, 5],
          "circle-color": "#0369a1", "circle-opacity": 0.5,
          "circle-stroke-width": 0.5, "circle-stroke-color": "#0369a1", "circle-stroke-opacity": 0.3,
        },
      });

      // Highlighted circle layer
      map.addLayer({
        id: "business-points-highlight", type: "circle", source: "businesses", minzoom: 12,
        filter: ["==", ["get", "month"], ""],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 4, 15, 8],
          "circle-color": "#d97706", "circle-opacity": 0.8,
          "circle-stroke-width": 1, "circle-stroke-color": "#d97706", "circle-stroke-opacity": 0.5,
        },
      });

      setMapReady(true);
    });

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (mapInstance.current) setTimeout(() => mapInstance.current?.resize(), 100);
  }, [expanded]);

  // Fetch data
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const params = new URLSearchParams();
    selectedCategories.forEach((c) => params.append("category", c));
    fetch(`/api/locations?${params}`)
      .then((r) => r.json())
      .then((geojson) => {
        const source = mapInstance.current?.getSource("businesses") as any;
        if (source) { source.setData(geojson); setPointCount(geojson.features?.length ?? null); }
      });
  }, [selectedCategories, mapReady]);

  // Update heatmap + circle colors to match selected category colors
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;

    if (selectedCategories.length === 0) {
      // No categories — use default multi-color ramp
      map.setPaintProperty("business-heat", "heatmap-color", DEFAULT_HEAT_RAMP);
      map.setPaintProperty("business-heat-highlight", "heatmap-color", DEFAULT_HIGHLIGHT_RAMP);
      map.setPaintProperty("business-points", "circle-color", "#0369a1");
      map.setPaintProperty("business-points", "circle-stroke-color", "#0369a1");
      map.setPaintProperty("business-points-highlight", "circle-color", "#d97706");
      map.setPaintProperty("business-points-highlight", "circle-stroke-color", "#d97706");
    } else if (selectedCategories.length === 1) {
      // Single category — tint everything to that category's color
      const color = CATEGORY_COLORS[0];
      map.setPaintProperty("business-heat", "heatmap-color", colorRamp(color, BASE_STOPS));
      map.setPaintProperty("business-heat-highlight", "heatmap-color", colorRamp(color, HIGHLIGHT_STOPS));
      map.setPaintProperty("business-points", "circle-color", color);
      map.setPaintProperty("business-points", "circle-stroke-color", color);
      map.setPaintProperty("business-points-highlight", "circle-color", color);
      map.setPaintProperty("business-points-highlight", "circle-stroke-color", color);
    } else {
      // Multiple categories — use data-driven circle colors, first category color for heatmap
      const primaryColor = CATEGORY_COLORS[0];
      map.setPaintProperty("business-heat", "heatmap-color", colorRamp(primaryColor, BASE_STOPS));
      map.setPaintProperty("business-heat-highlight", "heatmap-color", colorRamp(primaryColor, HIGHLIGHT_STOPS));

      // Build match expression for circle colors based on category
      const matchExpr: any[] = ["match", ["get", "category"]];
      selectedCategories.forEach((cat, i) => {
        matchExpr.push(cat, CATEGORY_COLORS[i]);
      });
      matchExpr.push(CATEGORY_COLORS[0]); // fallback
      map.setPaintProperty("business-points", "circle-color", matchExpr);
      map.setPaintProperty("business-points", "circle-stroke-color", matchExpr);
      map.setPaintProperty("business-points-highlight", "circle-color", matchExpr);
      map.setPaintProperty("business-points-highlight", "circle-stroke-color", matchExpr);
    }
  }, [selectedCategories, mapReady]);

  // Update highlight filter when hovered month changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;

    if (highlightMonth) {
      // Show highlight layers for the hovered month, dim the base
      map.setFilter("business-heat-highlight", ["==", ["get", "month"], highlightMonth]);
      map.setFilter("business-points-highlight", ["==", ["get", "month"], highlightMonth]);
      map.setPaintProperty("business-heat", "heatmap-opacity", 0.15);
      map.setPaintProperty("business-points", "circle-opacity", 0.15);
    } else {
      // Reset — hide highlights, restore base
      map.setFilter("business-heat-highlight", ["==", ["get", "month"], ""]);
      map.setFilter("business-points-highlight", ["==", ["get", "month"], ""]);
      map.setPaintProperty("business-heat", "heatmap-opacity", 0.7);
      map.setPaintProperty("business-points", "circle-opacity", 0.5);
    }
  }, [highlightMonth, mapReady]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase">Map</h3>
          {pointCount !== null && (
            <span className="text-[10px] font-mono font-medium tabular-nums px-1.5 py-0.5 rounded bg-[var(--color-ocean)]/12 text-[var(--color-ocean)]">
              {pointCount.toLocaleString()}
            </span>
          )}
          {highlightMonth && (
            <span className="text-[10px] font-mono font-medium tabular-nums px-1.5 py-0.5 rounded bg-[var(--color-sand)]/12 text-[var(--color-sand)]">
              {highlightMonth}
            </span>
          )}
        </div>
        {onExpand && (
          <button onClick={onExpand} className="p-1 rounded hover:bg-black/[0.04] text-muted-foreground/40 hover:text-muted-foreground transition-all" title={expanded ? "Collapse" : "Expand"}>
            {expanded ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v5m0-5h5m6 6l5 5m0 0v-5m0 5h-5" /></svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" /></svg>
            )}
          </button>
        )}
      </div>
      <div className="relative flex-1">
        {!mapReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <span className="text-xs font-mono text-muted-foreground/40">Loading map...</span>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </div>
  );
}
