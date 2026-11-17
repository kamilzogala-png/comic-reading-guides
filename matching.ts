import type { IssueReference } from "./model";
import { normalizeIssueNumber, parseSeriesName } from "./normalize";

export interface LibrarySeries {
  id: string;
  name: string;
  /** Other names for the same series, e.g. the folder name. */
  aliases?: string[];
}

export interface LibraryBook {
  id: string;
  number: string;
  releaseYear?: number;
}

/** What the matcher needs from a comic server. */
export interface LibraryProvider {
  searchSeries(query: string): Promise<LibrarySeries[]>;
  listBooks(seriesId: string): Promise<LibraryBook[]>;
}

export type MatchResult =
  | { status: "matched"; seriesId: string; seriesName: string; bookId: string }
  | { status: "missing" }
  | { status: "ambiguous"; candidates: number }
  | { status: "error"; message: string };

type Hit = { series: LibrarySeries; book: LibraryBook };

function unique(values: string[]): string[] {
  return [...new Set(values.filter((v) => v.trim() !== ""))];
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function cached<K, V>(cache: Map<K, Promise<V>>, key: K, load: () => Promise<V>): Promise<V> {
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = load().catch((error: unknown) => {
    cache.delete(key); // never cache failures
    throw error;
  });
  cache.set(key, promise);
  return promise;
}

/**
 * Conservative matching of guide issues to a library. Never silently picks
 * between different series that both contain the issue.
 */
export class IssueMatcher {
  private readonly searches = new Map<string, Promise<LibrarySeries[]>>();
  private readonly books = new Map<string, Promise<LibraryBook[]>>();

  constructor(
    private readonly provider: LibraryProvider,
    private readonly concurrency = 4,
  ) {}

  async matchGuide(issues: IssueReference[]): Promise<Map<string, MatchResult>> {
    const results = await mapPool(issues, this.concurrency, (issue) => this.matchIssue(issue));
    return new Map(issues.map((issue, index) => [issue.id, results[index] as MatchResult]));
  }

  async matchIssue(issue: IssueReference): Promise<MatchResult> {
    try {
      const target = parseSeriesName(issue.series).base;
      const number = normalizeIssueNumber(issue.issueNumber);
      if (!target || !number) return { status: "missing" };

      const series = await this.findSeries(issue, target);
      if (series.length === 0) return { status: "missing" };

      const hits: Hit[] = [];
      for (const candidate of series) {
        const books = await cached(this.books, candidate.id, () => this.provider.listBooks(candidate.id));
        for (const book of books) {
          if (normalizeIssueNumber(book.number) === number) hits.push({ series: candidate, book });
        }
      }
      return this.pick(issue, hits);
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async findSeries(issue: IssueReference, target: string): Promise<LibrarySeries[]> {
    for (const query of unique([issue.series, target])) {
      const found = await cached(this.searches, query.toLowerCase(), () => this.provider.searchSeries(query));
      const matching = found.filter((s) => this.seriesMatches(s, target, issue.volumeYear));
      if (matching.length > 0) return matching;
    }
    return [];
  }

  private seriesMatches(series: LibrarySeries, target: string, volumeYear?: number): boolean {
    const parsed = [series.name, ...(series.aliases ?? [])].map(parseSeriesName);
    if (!parsed.some((p) => p.base === target)) return false;
    const year = parsed.find((p) => p.year !== undefined)?.year;
    return volumeYear === undefined || year === undefined || year === volumeYear;
  }

  private pick(issue: IssueReference, hits: Hit[]): MatchResult {
    if (hits.length === 0) return { status: "missing" };
    const seriesIds = new Set(hits.map((h) => h.series.id));
    let pool = hits;
    if (seriesIds.size > 1 && issue.year !== undefined) {
      const byYear = hits.filter((h) => h.book.releaseYear === issue.year);
      if (byYear.length > 0) pool = byYear;
    }
    if (new Set(pool.map((h) => h.series.id)).size > 1) {
      return { status: "ambiguous", candidates: new Set(pool.map((h) => h.series.id)).size };
    }
    const chosen = pool[0] as Hit;
    return {
      status: "matched",
      seriesId: chosen.series.id,
      seriesName: chosen.series.name,
      bookId: chosen.book.id,
    };
  }
}
