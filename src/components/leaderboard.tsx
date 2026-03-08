"use client";

import { useEffect, useState, useRef } from "react";
import type { LeaderboardEntry } from "@/lib/types";
import { CATEGORY_COLORS } from "./category-selector";

interface LeaderboardProps {
  months: number;
  selectedCategories: string[];
  onCategoryClick: (category: string) => void;
  onClearCategories: () => void;
  onExpand?: () => void;
  expanded?: boolean;
}

export function Leaderboard({ months, selectedCategories, onCategoryClick, onClearCategories, onExpand, expanded }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [allCategories, setAllCategories] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?months=${months}&limit=500`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [months]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setAllCategories);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const maxCount = data.length > 0 ? data[0].count : 1;

  function getSelectedColor(category: string): string | null {
    const idx = selectedCategories.indexOf(category);
    return idx >= 0 ? CATEGORY_COLORS[idx] : null;
  }

  const searchResults = search.length > 0
    ? allCategories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-3 py-2 border-b border-black/[0.04] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase">Categories</h3>
            {selectedCategories.length > 0 && (
              <span className="text-[10px] font-mono font-medium text-[var(--color-ocean)]">{selectedCategories.length}/3</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedCategories.length > 0 && (
              <button
                onClick={onClearCategories}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-muted-foreground hover:text-[var(--color-coral)] hover:bg-[var(--color-coral)]/5 transition-all"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                Clear
              </button>
            )}
            {onExpand && (
              <button onClick={onExpand} className="p-1 rounded hover:bg-black/[0.04] text-muted-foreground hover:text-foreground transition-all" title={expanded ? "Collapse" : "Expand"}>
                {expanded ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v5m0-5h5m6 6l5 5m0 0v-5m0 5h-5" /></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6l7-7" /></svg>
                )}
              </button>
            )}
          </div>
        </div>
        <div ref={searchRef} className="relative">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-3 h-3 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => search.length > 0 && setSearchOpen(true)}
            className="w-full h-7 pl-7 pr-2 rounded bg-black/[0.02] border border-black/[0.06] text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--color-ocean)]/30 transition-all font-mono"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded border border-black/[0.08] bg-white shadow-lg shadow-black/8">
              {searchResults.map((cat) => {
                const color = getSelectedColor(cat.name);
                const isSelected = color !== null;
                const isMaxed = selectedCategories.length >= 3 && !isSelected;
                return (
                  <button
                    key={cat.name}
                    className={`w-full text-left px-2 py-1.5 text-[10px] flex justify-between items-center gap-2 transition-colors border-b border-black/[0.02] last:border-0 ${isMaxed ? "opacity-30 cursor-not-allowed" : "hover:bg-black/[0.02] cursor-pointer"}`}
                    disabled={isMaxed}
                    onClick={() => { onCategoryClick(cat.name); setSearch(""); setSearchOpen(false); }}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color! }} />}
                      <span className={isSelected ? "font-semibold" : "text-foreground/80"} style={isSelected ? { color: color! } : undefined}>{cat.name}</span>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60 flex-shrink-0">{cat.count.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {loading ? (
          <div className="space-y-0.5 p-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-6 bg-black/[0.02] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {data.map((entry) => {
              const selectedColor = getSelectedColor(entry.category);
              const isSelected = selectedColor !== null;
              const isMaxed = selectedCategories.length >= 3 && !isSelected;
              return (
                <button
                  key={entry.category}
                  onClick={() => onCategoryClick(entry.category)}
                  disabled={isMaxed}
                  className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 transition-all group ${isSelected ? "bg-black/[0.03]" : isMaxed ? "opacity-30 cursor-not-allowed" : "hover:bg-black/[0.02] cursor-pointer"}`}
                >
                  <span className="w-4 text-right font-mono text-[10px] tabular-nums text-muted-foreground/50 flex-shrink-0">{entry.rank}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: selectedColor! }} />}
                      <span className={`text-[12px] truncate transition-colors ${isSelected ? "font-semibold" : "text-foreground/80 group-hover:text-foreground"}`} style={isSelected ? { color: selectedColor! } : undefined}>
                        {entry.category}
                      </span>
                      <span className="text-[10px] font-mono font-medium tabular-nums text-muted-foreground/60 ml-auto flex-shrink-0">{entry.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-[1px] rounded-full bg-black/[0.04] overflow-hidden mt-0.5">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(entry.count / maxCount) * 100}%`, backgroundColor: isSelected ? selectedColor! : "rgba(0,0,0,0.08)" }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
