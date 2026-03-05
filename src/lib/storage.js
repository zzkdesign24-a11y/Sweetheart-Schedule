import { parseISODate } from "./date";

const KEY = "vibe-richeng-events-v1";

export function loadEvents() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEvent).sort(sortByDateTime);
  } catch {
    return [];
  }
}

export function saveEvents(events) {
  localStorage.setItem(KEY, JSON.stringify(events));
}

export function upsertEvent(events, event) {
  const idx = events.findIndex((e) => e.id === event.id);
  const next = [...events];
  if (idx >= 0) next[idx] = event;
  else next.push(event);
  next.sort(sortByDateTime);
  return next;
}

export function deleteEvent(events, id) {
  return events.filter((e) => e.id !== id);
}

export function eventsByDate(events) {
  const map = new Map();
  for (const e of events) {
    const key = e.date;
    const list = map.get(key) || [];
    list.push(e);
    map.set(key, list);
  }
  for (const [, list] of map) list.sort(sortByDateTime);
  return map;
}

export function hasEventsOn(events, isoDate) {
  return events.some((e) => e.date === isoDate);
}

export function getEventsOn(events, isoDate) {
  return events.filter((e) => e.date === isoDate).sort(sortByDateTime);
}

function sortByDateTime(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.time || "").localeCompare(b.time || "");
}

function isValidEvent(e) {
  if (!e || typeof e !== "object") return false;
  if (typeof e.id !== "string") return false;
  if (!parseISODate(e.date)) return false;
  if (typeof e.title !== "string" || !e.title.trim()) return false;
  if (typeof e.color !== "string" || !e.color) return false;
  if (e.time != null && typeof e.time !== "string") return false;
  if (e.notes != null && typeof e.notes !== "string") return false;
  return true;
}

