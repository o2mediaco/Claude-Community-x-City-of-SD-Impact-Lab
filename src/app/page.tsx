"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { TrendChart } from "@/components/trend-chart";
import { EventBar } from "@/components/event-bar";
import { StatCards } from "@/components/stat-cards";
import { Leaderboard } from "@/components/leaderboard";
import { BusinessMap } from "@/components/business-map";
import { AskPanel } from "@/components/ask-panel";
import type { MonthlyDataPoint, CategoryStat, MilestoneEvent } from "@/lib/types";

const DATE_RANGES: { label: string; months: number | null }[] = [
  { label: "1Y", months: 12 },
  { label: "3Y", months: 36 },
  { label: "5Y", months: 60 },
  { label: "ALL", months: null },
];

function getMonthRange(months: number | null): { startMonth?: string; endMonth?: string } {
  if (!months) return {};
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return {
    startMonth: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

type ExpandedPanel = "categories" | "chart" | "map" | null;

export default function Home() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<number | null>(36);
  const [trendData, setTrendData] = useState<MonthlyDataPoint[]>([]);
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [events, setEvents] = useState<MilestoneEvent[]>([]);
  const [visibleEventIds, setVisibleEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const { startMonth, endMonth } = getMonthRange(dateRange);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((evts: MilestoneEvent[]) => {
        setEvents(evts);
        setVisibleEventIds(new Set(evts.map((e) => e.id)));
      });
  }, []);

  useEffect(() => {
    setLoading(true);

    if (selectedCategories.length === 0) {
      const params = new URLSearchParams();
      if (startMonth) params.set("startMonth", startMonth);
      if (endMonth) params.set("endMonth", endMonth);

      fetch(`/api/market?${params}`)
        .then((r) => r.json())
        .then((data: MonthlyDataPoint[]) => {
          setTrendData(data);
          const values = data.map((d) => (d.total as number) || 0);
          const totalAll = values.reduce((a, b) => a + b, 0);
          const avg = values.length > 0 ? Math.round(totalAll / values.length) : 0;
          const peakVal = Math.max(...values, 0);
          const peakIdx = values.indexOf(peakVal);
          const peakMonth = peakIdx >= 0 ? data[peakIdx]?.month || "-" : "-";
          const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
          const prior = values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
          const change = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : 0;

          setStats([{
            category: "All Categories",
            totalActive: totalAll,
            avgMonthlyRate: avg,
            peakMonth,
            peakCount: peakVal,
            trendDirection: change > 0 ? "up" : change < 0 ? "down" : "flat",
            recentMonthlyChange: change,
          }]);
          setLoading(false);
        });
      return;
    }

    const params = new URLSearchParams();
    selectedCategories.forEach((c) => params.append("category", c));
    if (startMonth) params.set("startMonth", startMonth);
    if (endMonth) params.set("endMonth", endMonth);

    fetch(`/api/trends?${params}`)
      .then((r) => r.json())
      .then((result) => {
        setTrendData(result.data);
        setStats(result.stats);
        setLoading(false);
      });
  }, [selectedCategories, startMonth, endMonth]);

  const handleAddEvent = useCallback((event: MilestoneEvent) => {
    // Normalize legacy category field to categories array
    const normalized = {
      ...event,
      categories: event.categories ?? ((event as any).category ? [(event as any).category] : []),
    };
    setEvents((prev) => [...prev, normalized]);
    setVisibleEventIds((prev) => new Set([...prev, normalized.id]));
  }, []);

  const handleDeleteEvent = useCallback(async (id: string) => {
    const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setVisibleEventIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const handleToggleEvent = useCallback((id: string) => {
    setVisibleEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) return prev.filter((c) => c !== category);
      if (prev.length < 3) return [...prev, category];
      return prev;
    });
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((e) => visibleEventIds.has(e.id)),
    [events, visibleEventIds]
  );

  const handleSetCategories = useCallback((categories: string[]) => {
    setSelectedCategories(categories.slice(0, 3));
  }, []);

  const handleClearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const leaderboardMonths = dateRange || 120;

  const togglePanel = useCallback((panel: ExpandedPanel) => {
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedPanel((prev) => (prev ? null : prev));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fullscreen expanded panel
  if (expandedPanel) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-3 overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            {expandedPanel === "categories" && "Categories"}
            {expandedPanel === "chart" && "Trends"}
            {expandedPanel === "map" && "Map"}
          </span>
          <button
            onClick={() => setExpandedPanel(null)}
            className="p-1 rounded hover:bg-black/[0.04] text-muted-foreground hover:text-foreground transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="h-[calc(100vh-3.5rem)]">
          {expandedPanel === "categories" && (
            <Leaderboard months={leaderboardMonths} selectedCategories={selectedCategories} onCategoryClick={handleCategoryClick} onClearCategories={handleClearCategories} onExpand={() => togglePanel("categories")} expanded />
          )}
          {expandedPanel === "chart" && (
            <TrendChart data={trendData} categories={selectedCategories} events={visibleEvents} onExpand={() => togglePanel("chart")} expanded onHoverMonth={setHoveredMonth} />
          )}
          {expandedPanel === "map" && (
            <BusinessMap selectedCategories={selectedCategories} onExpand={() => togglePanel("map")} expanded highlightMonth={hoveredMonth} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Compact header bar */}
      <header className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.06] bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold tracking-tight">SD Business Growth Explorer</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats inline */}
          {stats.length > 0 && !loading && (
            <StatCards stats={stats} compact />
          )}
          <div className="flex items-center gap-0.5 p-0.5 rounded bg-black/[0.03] border border-black/[0.06]">
            {DATE_RANGES.map((range) => (
              <button
                key={range.label}
                onClick={() => setDateRange(range.months)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                  dateRange === range.months
                    ? "bg-[var(--color-ocean)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content — fills remaining viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[23%_1fr] gap-px bg-black/[0.06] overflow-hidden">
        {/* LEFT column: Categories top half, Events bottom half */}
        <div className="flex flex-col bg-background overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <Leaderboard
              months={leaderboardMonths}
              selectedCategories={selectedCategories}
              onCategoryClick={handleCategoryClick}
              onClearCategories={handleClearCategories}
              onExpand={() => togglePanel("categories")}
            />
          </div>
          <div className="flex-1 min-h-0 border-t border-black/[0.06] overflow-hidden">
            <EventBar
              events={events}
              visibleEventIds={visibleEventIds}
              selectedCategories={selectedCategories}
              onToggleEvent={handleToggleEvent}
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              onCategoryClick={handleCategoryClick}
            />
          </div>
        </div>

        {/* RIGHT area: Map+AI on top, Chart below */}
        <div className="flex flex-col bg-background overflow-hidden">
          <div className="flex-1 min-h-0 flex border-b border-black/[0.06]">
            <div className="flex-1 min-w-0 border-r border-black/[0.06]">
              <BusinessMap
                selectedCategories={selectedCategories}
                onExpand={() => togglePanel("map")}
                highlightMonth={hoveredMonth}
              />
            </div>
            <div className="w-[400px] flex-shrink-0">
              <AskPanel onSelectCategories={handleSetCategories} />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="h-full bg-white animate-pulse" />
            ) : (
              <TrendChart
                data={trendData}
                categories={selectedCategories}
                events={visibleEvents}
                onExpand={() => togglePanel("chart")}
                onHoverMonth={setHoveredMonth}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
