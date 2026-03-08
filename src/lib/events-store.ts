import fs from "fs/promises";
import path from "path";
import type { MilestoneEvent } from "./types";

const EVENTS_PATH = path.join(process.cwd(), "events.json");

async function readEvents(): Promise<MilestoneEvent[]> {
  try {
    const content = await fs.readFile(EVENTS_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeEvents(events: MilestoneEvent[]): Promise<void> {
  await fs.writeFile(EVENTS_PATH, JSON.stringify(events, null, 2));
}

export async function getEvents(): Promise<MilestoneEvent[]> {
  return readEvents();
}

export async function addEvent(event: MilestoneEvent): Promise<MilestoneEvent> {
  const events = await readEvents();
  events.push(event);
  await writeEvents(events);
  return event;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const events = await readEvents();
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;
  await writeEvents(filtered);
  return true;
}
