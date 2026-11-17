import type { GuideCategory, IssueReference, Publisher, ReadingGuide, ReadingOrder } from "./model";

export const PAGE_SIZE = 20;
const MEMORY_TTL_MS = 30 * 60 * 1000;
const PERSISTED_TTL_MS = 6 * 60 * 60 * 1000;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const optNumber = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

const CATEGORIES: GuideCategory[] = ["event", "character", "creator", "chronology", "series", "era"];
const ORDERS: ReadingOrder[] = ["publication", "recommended", "chronological"];

/** Accepts `[...]` or `{ guides: [...] }`; silently drops malformed guides and issues. */
export function parseGuides(raw: unknown): ReadingGuide[] {
  const list = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.guides) ? raw.guides : [];
  const seen = new Set<string>();
  const guides: ReadingGuide[] = [];

  for (const item of list) {
    if (!isObj(item)) continue;
    const id = text(item.id);
    const title = text(item.title);
    const publisher = item.publisher === "Marvel" || item.publisher === "DC" ? (item.publisher as Publisher) : undefined;
    if (!id || !title || !publisher || seen.has(id)) continue;

    const issues: IssueReference[] = [];
    for (const rawIssue of Array.isArray(item.issues) ? item.issues : []) {
      if (!isObj(rawIssue)) continue;
      const issueId = text(rawIssue.id);
      const series = text(rawIssue.series);
      const issueNumber = text(rawIssue.issueNumber);
      if (!issueId || !series || !issueNumber) continue;
      issues.push({
        id: issueId,
        publisher,
        series,
        issueNumber,
        year: optNumber(rawIssue.year),
        volumeYear: optNumber(rawIssue.volumeYear),
        readingNote: text(rawIssue.readingNote) || undefined,
        optional: rawIssue.optional === true ? true : undefined,
      });
    }
    if (issues.length === 0) continue;

    seen.add(id);
    guides.push({
      id,
      publisher,
      title,
      subtitle: text(item.subtitle) || undefined,
      category: CATEGORIES.includes(item.category as GuideCategory) ? (item.category as GuideCategory) : "event",
      tags: Array.isArray(item.tags) ? item.tags.map(text).filter(Boolean) : undefined,
      popular: item.popular === true,
      description: text(item.description),
      readingOrder: ORDERS.includes(item.readingOrder as ReadingOrder) ? (item.readingOrder as ReadingOrder) : "recommended",
      issues,
      sourceAttribution: Array.isArray(item.sourceAttribution) ? item.sourceAttribution.map(text).filter(Boolean) : [],
      updatedAt: text(item.updatedAt),
    });
  }
  return guides;
}

export interface SectionDef {
  id: string;
  title: string;
  prominent?: boolean;
  matches: (guide: ReadingGuide) => boolean;
}

export const SECTION_DEFS: SectionDef[] = [
  { id: "popular", title: "Popular events", prominent: true, matches: (g) => g.popular === true },
  { id: "marvel", title: "Marvel", matches: (g) => g.publisher === "Marvel" },
  { id: "dc", title: "DC", matches: (g) => g.publisher === "DC" },
  { id: "events", title: "Events", matches: (g) => g.category === "event" },
  { id: "creators", title: "Creator runs", matches: (g) => g.category === "creator" },
  { id: "characters", title: "Characters", matches: (g) => g.category === "character" },
  { id: "eras", title: "Eras & chronology", matches: (g) => g.category === "chronology" || g.category === "era" },
  { id: "series", title: "Series", matches: (g) => g.category === "series" },
];

export function guidesForSection(guides: ReadingGuide[], sectionId: string): ReadingGuide[] {
  const def = SECTION_DEFS.find((s) => s.id === sectionId);
  return def ? guides.filter(def.matches) : [];
}

export function searchGuides(guides: ReadingGuide[], query: string): ReadingGuide[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return guides;
  return guides.filter(
    (g) =>
      g.title.toLowerCase().includes(needle) ||
      (g.subtitle ?? "").toLowerCase().includes(needle) ||
      (g.tags ?? []).some((t) => t.toLowerCase().includes(needle)) ||
      g.issues.some((i) => i.series.toLowerCase().includes(needle)),
  );
}

export function paginate<T>(items: T[], offset: number, size = PAGE_SIZE): { items: T[]; nextOffset?: number } {
  const start = Math.max(0, Math.floor(offset));
  const slice = items.slice(start, start + size);
  const next = start + size;
  return { items: slice, nextOffset: next < items.length ? next : undefined };
}

export interface GuideStore {
  read(): { fetchedAt: number; guides: ReadingGuide[] } | undefined;
  write(value: { fetchedAt: number; guides: ReadingGuide[] }): void;
  clear(): void;
}

export interface LoadOptions {
  url: string;
  getJson: (url: string) => Promise<unknown>;
  store: GuideStore;
  fallback: ReadingGuide[];
  now?: () => number;
}

let memory: { key: string; fetchedAt: number; guides: ReadingGuide[] } | undefined;

export function resetGuidesCache(store?: GuideStore): void {
  memory = undefined;
  store?.clear();
}

/** memory (30 min) -> persisted (6 h) -> network -> stale persisted -> bundled fallback. */
export async function loadGuides(options: LoadOptions): Promise<ReadingGuide[]> {
  const now = options.now ?? Date.now;
  const key = options.url;
  if (memory && memory.key === key && now() - memory.fetchedAt < MEMORY_TTL_MS) return memory.guides;

  const persisted = options.store.read();
  if (persisted && now() - persisted.fetchedAt < PERSISTED_TTL_MS) {
    memory = { key, fetchedAt: persisted.fetchedAt, guides: persisted.guides };
    return persisted.guides;
  }

  try {
    const guides = parseGuides(await options.getJson(options.url));
    if (guides.length > 0) {
      memory = { key, fetchedAt: now(), guides };
      options.store.write({ fetchedAt: now(), guides });
      return guides;
    }
  } catch {
    // fall through to stale cache / bundled data
  }
  return persisted?.guides ?? options.fallback;
}
