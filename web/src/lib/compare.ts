"use client";

// Compare-list state, persisted in localStorage and synced across components
// via a custom window event.
const KEY = "davaorent_compare";
export const COMPARE_LIMIT = 4;
export const COMPARE_EVENT = "davaorent:compare-changed";

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, COMPARE_LIMIT) : [];
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, COMPARE_LIMIT)));
  window.dispatchEvent(new Event(COMPARE_EVENT));
}

export function toggleCompare(id: string): { ids: string[]; added: boolean; full: boolean } {
  const ids = getCompareIds();
  if (ids.includes(id)) {
    const next = ids.filter((x) => x !== id);
    save(next);
    return { ids: next, added: false, full: false };
  }
  if (ids.length >= COMPARE_LIMIT) return { ids, added: false, full: true };
  const next = [...ids, id];
  save(next);
  return { ids: next, added: true, full: false };
}

export function removeCompare(id: string) {
  save(getCompareIds().filter((x) => x !== id));
}

export function clearCompare() {
  save([]);
}
