"use client";

import type { CategoryStat } from "@/lib/types";
import { CATEGORY_COLORS } from "./category-selector";

interface StatCardsProps {
  stats: CategoryStat[];
  compact?: boolean;
}

export function StatCards({ stats, compact }: StatCardsProps) {
  if (stats.length === 0) return null;

  const stat = stats[0];

  const metrics = [
    { label: "Active", value: stat.totalActive.toLocaleString() },
    { label: "Avg/mo", value: stat.avgMonthlyRate.toString() },
    { label: "Peak", value: stat.peakMonth },
    {
      label: "Momentum",
      value: stat.trendDirection === "up" ? `+${stat.recentMonthlyChange}%` : `${stat.recentMonthlyChange}%`,
      color: stat.trendDirection === "up" ? "#059669" : stat.trendDirection === "down" ? "#e11d48" : "#78716c",
    },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase">{m.label}</span>
            <span
              className="text-[12px] font-mono font-bold tabular-nums"
              style={{ color: m.color || CATEGORY_COLORS[0] }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m, i) => (
        <div key={m.label} className={`panel-card p-4 animate-fade-up stagger-${i + 1}`}>
          <p className="text-[10px] font-mono font-medium tracking-widest text-muted-foreground mb-2">
            {m.label.toUpperCase()}
          </p>
          <p className="text-xl font-mono font-bold tabular-nums tracking-tight" style={{ color: m.color || CATEGORY_COLORS[0] }}>
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
