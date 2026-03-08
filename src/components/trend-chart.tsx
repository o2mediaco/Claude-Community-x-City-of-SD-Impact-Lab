"use client";

import { useCallback, useMemo } from "react";
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { MonthlyDataPoint, MilestoneEvent } from "@/lib/types";
import { CATEGORY_COLORS } from "./category-selector";

interface TrendChartProps {
  data: MonthlyDataPoint[];
  categories: string[];
  events: MilestoneEvent[];
  onExpand?: () => void;
  expanded?: boolean;
  onHoverMonth?: (month: string | null) => void;
}

function getSmartTickInterval(dataLength: number): number {
  if (dataLength <= 12) return 0;
  if (dataLength <= 24) return 2;
  if (dataLength <= 48) return 5;
  if (dataLength <= 96) return 11;
  if (dataLength <= 180) return 23;
  return Math.ceil(dataLength / 8) - 1;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white/95 backdrop-blur-sm px-3 py-2.5 shadow-xl shadow-black/10">
      <p className="font-mono text-[11px] font-bold text-foreground/70 mb-1.5 tracking-wide">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-6 text-[12px] py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full ring-2 ring-white" style={{ backgroundColor: entry.color }} />
            <span className="text-foreground/90 truncate max-w-[180px]">{entry.name}</span>
          </div>
          <span className="font-mono font-bold tabular-nums" style={{ color: entry.color }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data, categories, events, onExpand, expanded, onHoverMonth }: TrendChartProps) {
  const isAggregate = categories.length === 0;
  const dataKeys = isAggregate ? ["total"] : categories;
  const colors = isAggregate ? ["#0369a1"] : CATEGORY_COLORS;
  const labels = isAggregate ? ["All Categories"] : categories;

  const handleMouseMove = useCallback((state: any) => {
    if (onHoverMonth && state?.activeLabel) {
      onHoverMonth(state.activeLabel);
    }
  }, [onHoverMonth]);

  const handleMouseLeave = useCallback(() => {
    if (onHoverMonth) onHoverMonth(null);
  }, [onHoverMonth]);

  // Smart event filtering:
  // - No categories selected: show only global events (categories: [])
  // - Categories selected: show events that have overlap with selected categories, OR global events
  const chartEvents = useMemo(() => {
    return events.filter((e) => {
      const isGlobal = e.categories.length === 0;
      if (categories.length === 0) return isGlobal;
      return isGlobal || e.categories.some((c) => categories.includes(c));
    });
  }, [events, categories]);

  // Deduplicate events on same month — combine titles
  const eventMarkers = useMemo(() => {
    const byMonth = new Map<string, string[]>();
    for (const e of chartEvents) {
      const month = e.date.slice(0, 7);
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(e.title);
    }
    return Array.from(byMonth.entries()).map(([month, titles]) => ({
      month,
      title: titles.length === 1 ? titles[0] : titles.map((t, i) => `${i + 1}. ${t}`).join("  "),
      count: titles.length,
    }));
  }, [chartEvents]);

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.04] flex-shrink-0">
          <h3 className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase">Trends</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-mono text-muted-foreground/40">Loading...</span>
        </div>
      </div>
    );
  }

  const tickInterval = getSmartTickInterval(data.length);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase">Trends</h3>
          <span className="text-[10px] font-mono text-muted-foreground/70">
            {isAggregate ? "All Categories" : dataKeys.join(", ")}
          </span>
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
      <div className="flex-1 min-h-0 p-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 24, right: 12, left: 0, bottom: 4 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {dataKeys.map((key, i) => (
                <linearGradient key={key} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[i]} stopOpacity={0.35} />
                  <stop offset="40%" stopColor={colors[i]} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={colors[i]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#78716c", fontSize: 10, fontFamily: "var(--font-jetbrains)" }} interval={tickInterval} axisLine={false} tickLine={false} dy={4} />
            <YAxis tick={{ fill: "#78716c", fontSize: 10, fontFamily: "var(--font-jetbrains)" }} axisLine={false} tickLine={false} dx={-2} width={36} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(3,105,161,0.12)", strokeWidth: 1, strokeDasharray: "4 4" }} />
            {eventMarkers.map((ev) => (
              <ReferenceLine
                key={ev.month}
                x={ev.month}
                stroke="#d97706"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                strokeOpacity={0.6}
                label={{
                  value: ev.count > 1 ? `${ev.count} events` : ev.title,
                  position: "top",
                  fill: "#92400e",
                  fontSize: 9,
                  fontWeight: 600,
                  fontFamily: "var(--font-jetbrains)",
                }}
              />
            ))}
            {dataKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                name={labels[i]}
                stroke={colors[i]}
                strokeWidth={2}
                fill={`url(#gradient-${i})`}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 2.5, stroke: "#ffffff", fill: colors[i] }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
