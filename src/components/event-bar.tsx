"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { MilestoneEvent } from "@/lib/types";

const eventFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventBarProps {
  events: MilestoneEvent[];
  visibleEventIds: Set<string>;
  selectedCategories: string[];
  onToggleEvent: (id: string) => void;
  onAddEvent: (event: MilestoneEvent) => void;
  onDeleteEvent: (id: string) => void;
  onCategoryClick: (category: string) => void;
}

export function EventBar({ events, visibleEventIds, selectedCategories, onToggleEvent, onAddEvent, onDeleteEvent, onCategoryClick }: EventBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EventFormData>({ resolver: zodResolver(eventFormSchema) });

  async function onSubmit(data: EventFormData) {
    const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, categories: [] }) });
    if (res.ok) { const event = await res.json(); onAddEvent(event); reset(); setDialogOpen(false); }
  }

  const filteredEvents = useMemo(
    () => selectedCategories.length === 0
      ? events
      : events.filter((e) => e.categories.length === 0 || e.categories.some((c) => selectedCategories.includes(c))),
    [events, selectedCategories]
  );

  const visibleCount = filteredEvents.filter((e) => visibleEventIds.has(e.id)).length;

  return (
    <div className="bg-white h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase">Events</h3>
          {filteredEvents.length > 0 && (
            <span className="text-[10px] font-mono font-semibold tabular-nums text-muted-foreground">
              {visibleCount} of {filteredEvents.length} on chart
            </span>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<button className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-[var(--color-ocean)] hover:bg-[var(--color-ocean)]/5 transition-all" />}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add
          </DialogTrigger>
          <DialogContent className="bg-white border-black/[0.08]">
            <DialogHeader><DialogTitle className="font-mono text-sm tracking-wide">Add Event</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase block mb-1">Date</label>
                <input placeholder="2025-10-16" {...register("date")} className="w-full h-8 px-2 rounded bg-black/[0.02] border border-black/[0.08] text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--color-ocean)]/30 transition-all" />
                {errors.date && <p className="text-[11px] text-[var(--color-coral)] mt-0.5 font-mono">{errors.date.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase block mb-1">Title</label>
                <input placeholder="Event title..." {...register("title")} className="w-full h-8 px-2 rounded bg-black/[0.02] border border-black/[0.08] text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--color-ocean)]/30 transition-all" />
                {errors.title && <p className="text-[11px] text-[var(--color-coral)] mt-0.5 font-mono">{errors.title.message}</p>}
              </div>
              <div>
                <label className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase block mb-1">Description <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span></label>
                <input {...register("description")} className="w-full h-8 px-2 rounded bg-black/[0.02] border border-black/[0.08] text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--color-ocean)]/30 transition-all" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full h-8 rounded bg-[var(--color-ocean)] text-white text-[11px] font-mono font-semibold hover:bg-[var(--color-ocean)]/90 disabled:opacity-50 transition-all">
                {isSubmitting ? "Adding..." : "Add Event"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <p className="text-[11px] font-mono text-muted-foreground py-4 text-center">No events</p>
        ) : (
          filteredEvents.map((ev) => {
            const isVisible = visibleEventIds.has(ev.id);
            const isGlobal = ev.categories.length === 0;
            return (
              <div
                key={ev.id}
                onClick={() => onToggleEvent(ev.id)}
                className={`group flex items-start gap-2 px-3 py-2 border-b border-black/[0.04] cursor-pointer transition-all ${isVisible ? "bg-white" : "bg-black/[0.02] opacity-50"}`}
              >
                {/* Timeline dot */}
                <div className="flex-shrink-0 mt-1.5 relative">
                  <div className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${isVisible ? "border-[var(--color-sand)] bg-[var(--color-sand)]" : "border-black/20 bg-white"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground/60 flex-shrink-0">{ev.date.slice(0, 10)}</span>
                    <span className="text-[12px] font-medium text-foreground leading-tight">{ev.title}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {isGlobal && (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-black/[0.06] text-foreground/50">ALL</span>
                    )}
                    {ev.categories.map((cat) => {
                      const isCatSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={(e) => { e.stopPropagation(); onCategoryClick(cat); }}
                          className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded truncate max-w-[160px] cursor-pointer transition-all ${isCatSelected ? "bg-[var(--color-ocean)]/15 text-[var(--color-ocean)] hover:bg-[var(--color-ocean)]/25" : "bg-black/[0.06] text-foreground/50 hover:bg-black/[0.1] hover:text-foreground/70"}`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 flex-shrink-0 mt-1 p-0.5 rounded hover:bg-[var(--color-coral)]/10 transition-all"
                  title="Delete"
                >
                  <svg className="w-3 h-3 text-muted-foreground/40 hover:text-[var(--color-coral)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
