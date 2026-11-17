import assert from "node:assert/strict";
import { test } from "node:test";
import { KomgaProvider, normalizeBaseUrl } from "./komga";
import { paginate, parseGuides, searchGuides, loadGuides, resetGuidesCache, type GuideStore } from "./guides";
import { IssueMatcher } from "./matching";
import type { IssueReference } from "./model";
import { normalizeIssueNumber, parseSeriesName } from "./normalize";

const issue = (series: string, issueNumber: string, extra: Partial<IssueReference> = {}): IssueReference => ({
  id: `${series}-${issueNumber}`,
  publisher: "Marvel",
  series,
  issueNumber,
  ...extra,
});

/** A fake Komga: serves the JSON shapes the real API returns. */
function fakeKomga(
  library: Record<string, { name: string; title?: string; books: { id: string; number: string; date?: string }[] }>,
  log: string[] = [],
) {
  return async (url: string): Promise<unknown> => {
    log.push(url);
    const u = new URL(url);
    if (u.pathname === "/api/v1/series") {
      const q = (u.searchParams.get("search") ?? "").toLowerCase();
      const content = Object.entries(library)
        .filter(([, s]) => (s.title ?? s.name).toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
        .map(([id, s]) => ({ id, name: s.name, metadata: { title: s.title ?? s.name } }));
      return { content };
    }
    const books = /^\/api\/v1\/series\/([^/]+)\/books$/.exec(u.pathname);
    if (books) {
      const s = library[books[1] as string];
      if (!s) throw new Error("HTTP 404");
      return {
        content: s.books.map((b) => ({ id: b.id, metadata: { number: b.number, releaseDate: b.date } })),
      };
    }
    const pages = /^\/api\/v1\/books\/([^/]+)\/pages$/.exec(u.pathname);
    if (pages) {
      return [
        { number: 2, mediaType: "image/jpeg" },
        { number: 1, mediaType: "image/jpeg" },
        { number: 3, mediaType: "image/avif" },
      ];
    }
    if (u.pathname === "/api/v2/users/me") return { email: "me@example.com" };
    throw new Error("HTTP 404");
  };
}

const library = {
  s1: { name: "Amazing Spider-Man (1963)", books: [{ id: "b529", number: "529" }, { id: "b532", number: "532" }, { id: "b001", number: "001" }] },
  s2: { name: "New Avengers (2005)", books: [{ id: "na21", number: "21" }] },
  s3: { name: "Civil War (2006)", title: "Civil War", books: [{ id: "cw1", number: "1" }] },
  b1: { name: "Batman (1940)", books: [{ id: "bat1-1940", number: "1", date: "1940-04-25" }] },
  b2: { name: "Batman (2011)", books: [{ id: "bat1-2011", number: "1", date: "2011-11-02" }] },
};

test("normalizeIssueNumber handles padding, hashes and .0", () => {
  assert.equal(normalizeIssueNumber("#001"), "1");
  assert.equal(normalizeIssueNumber("529"), "529");
  assert.equal(normalizeIssueNumber("1.0"), "1");
  assert.equal(normalizeIssueNumber("0"), "0");
  assert.equal(normalizeIssueNumber("12AU"), "12au");
});

test("parseSeriesName extracts base and volume year", () => {
  assert.deepEqual(parseSeriesName("The Amazing Spider-Man Vol. 1 (1963-1998) (Digital)"), {
    base: "amazing spider man",
    year: 1963,
  });
  assert.deepEqual(parseSeriesName("Amazing Spider-Man"), { base: "amazing spider man", year: undefined });
  assert.deepEqual(parseSeriesName("Marvel Super-Heroes & Friends"), {
    base: "marvel super heroes and friends",
    year: undefined,
  });
});

test("normalizeBaseUrl", () => {
  assert.equal(normalizeBaseUrl("192.168.1.5:25600/"), "http://192.168.1.5:25600");
  assert.equal(normalizeBaseUrl("https://komga.example.com/api/v1/"), "https://komga.example.com");
  assert.equal(normalizeBaseUrl("  "), "");
});

test("matches padded numbers, year-suffixed series names and volumeYear", async () => {
  const matcher = new IssueMatcher(new KomgaProvider("http://x", fakeKomga(library)));
  const asm = await matcher.matchIssue(issue("Amazing Spider-Man", "529", { volumeYear: 1963 }));
  assert.deepEqual(asm, { status: "matched", seriesId: "s1", seriesName: "Amazing Spider-Man (1963)", bookId: "b529" });
  const padded = await matcher.matchIssue(issue("Amazing Spider-Man", "1"));
  assert.equal(padded.status, "matched");
  const cw = await matcher.matchIssue(issue("Civil War", "1", { volumeYear: 2006 }));
  assert.equal(cw.status, "matched");
});

test("reports missing issues and wrong volumes", async () => {
  const matcher = new IssueMatcher(new KomgaProvider("http://x", fakeKomga(library)));
  assert.equal((await matcher.matchIssue(issue("Amazing Spider-Man", "530"))).status, "missing");
  assert.equal((await matcher.matchIssue(issue("Amazing Spider-Man", "529", { volumeYear: 1999 }))).status, "missing");
  assert.equal((await matcher.matchIssue(issue("Unknown Series", "1"))).status, "missing");
});

test("never picks silently between volumes; uses volumeYear or release year to disambiguate", async () => {
  const matcher = new IssueMatcher(new KomgaProvider("http://x", fakeKomga(library)));
  assert.deepEqual(await matcher.matchIssue(issue("Batman", "1")), { status: "ambiguous", candidates: 2 });
  const byVolume = await matcher.matchIssue(issue("Batman", "1", { volumeYear: 2011 }));
  assert.equal(byVolume.status === "matched" && byVolume.bookId, "bat1-2011");
  const byYear = await matcher.matchIssue(issue("Batman", "1", { year: 1940 }));
  assert.equal(byYear.status === "matched" && byYear.bookId, "bat1-1940");
});

test("matchGuide returns a result per issue and caches lookups", async () => {
  const log: string[] = [];
  const matcher = new IssueMatcher(new KomgaProvider("http://x", fakeKomga(library, log)), 3);
  const issues = [
    issue("Amazing Spider-Man", "529"),
    issue("Amazing Spider-Man", "532"),
    issue("New Avengers", "21"),
    issue("New Avengers", "99"),
  ];
  const results = await matcher.matchGuide(issues);
  assert.deepEqual(
    issues.map((i) => results.get(i.id)?.status),
    ["matched", "matched", "matched", "missing"],
  );
  const booksCalls = log.filter((u) => u.includes("/books")).length;
  assert.equal(booksCalls, 2, "each series' books are fetched once");
});

test("server errors become an error status and are not cached", async () => {
  let fail = true;
  const get = fakeKomga(library);
  const matcher = new IssueMatcher(
    new KomgaProvider("http://x", async (url) => {
      if (fail) throw new Error("HTTP 401");
      return get(url);
    }),
  );
  const first = await matcher.matchIssue(issue("Civil War", "1"));
  assert.deepEqual(first, { status: "error", message: "HTTP 401" });
  fail = false;
  assert.equal((await matcher.matchIssue(issue("Civil War", "1"))).status, "matched");
});

test("Komga pages are sorted and non-browser formats are converted", async () => {
  const provider = new KomgaProvider("http://x", fakeKomga(library));
  const pages = await provider.listPages("b529");
  assert.deepEqual(
    pages.map((p) => provider.pageUrl("b529", p)),
    [
      "http://x/api/v1/books/b529/pages/1",
      "http://x/api/v1/books/b529/pages/2",
      "http://x/api/v1/books/b529/pages/3?convert=jpeg",
    ],
  );
  assert.equal(await provider.testConnection(), "Połączono (me@example.com)");
});

test("parseGuides accepts both formats and drops malformed entries", () => {
  const good = {
    id: "g1", publisher: "DC", title: "T", category: "event", readingOrder: "publication",
    description: "d", updatedAt: "2026-01-01",
    issues: [{ id: "i1", series: "S", issueNumber: 1 }, { id: "", series: "S", issueNumber: "2" }],
  };
  assert.equal(parseGuides([good]).length, 1);
  assert.equal(parseGuides({ guides: [good, good, { id: "x" }, null, "nope"] }).length, 1);
  assert.equal(parseGuides([good])[0]?.issues.length, 1);
  assert.equal(parseGuides([good])[0]?.issues[0]?.issueNumber, "1");
  assert.deepEqual(parseGuides("garbage"), []);
});

test("search and pagination", () => {
  const guides = parseGuides(
    Array.from({ length: 45 }, (_, i) => ({
      id: `g${i}`, publisher: "Marvel", title: i === 7 ? "Needle Event" : `Event ${i}`, category: "event",
      readingOrder: "recommended", description: "", updatedAt: "",
      issues: [{ id: `i${i}`, series: i === 9 ? "Hidden Series" : "S", issueNumber: "1" }],
    })),
  );
  assert.equal(searchGuides(guides, "needle").length, 1);
  assert.equal(searchGuides(guides, "hidden series").length, 1);
  assert.equal(searchGuides(guides, "").length, 45);
  const p1 = paginate(guides, 0);
  assert.equal(p1.items.length, 20);
  assert.equal(p1.nextOffset, 20);
  const p3 = paginate(guides, 40);
  assert.equal(p3.items.length, 5);
  assert.equal(p3.nextOffset, undefined);
});

test("loadGuides: network, persisted cache, stale fallback, bundled fallback", async () => {
  let stored: { fetchedAt: number; guides: ReturnType<typeof parseGuides> } | undefined;
  const store: GuideStore = { read: () => stored, write: (v) => (stored = v), clear: () => (stored = undefined) };
  const raw = { guides: [{ id: "g", publisher: "DC", title: "T", category: "event", readingOrder: "publication", description: "", updatedAt: "", issues: [{ id: "i", series: "S", issueNumber: "1" }] }] };
  const fallback = parseGuides(raw).map((g) => ({ ...g, id: "fallback" }));
  let now = 1_000_000;
  let calls = 0;
  let online = true;
  const opts = () => ({
    url: "http://u", store, fallback, now: () => now,
    getJson: async () => { calls++; if (!online) throw new Error("offline"); return raw; },
  });

  resetGuidesCache(store);
  assert.equal((await loadGuides(opts()))[0]?.id, "g");
  assert.equal(calls, 1);
  assert.equal((await loadGuides(opts()))[0]?.id, "g");
  assert.equal(calls, 1, "served from memory");

  resetGuidesCache(); // simulate app restart: memory gone, persisted cache stays
  now += 60 * 60 * 1000;
  await loadGuides(opts());
  assert.equal(calls, 1, "served from fresh persisted cache");

  resetGuidesCache();
  now += 7 * 60 * 60 * 1000;
  online = false;
  assert.equal((await loadGuides(opts()))[0]?.id, "g", "stale cache beats failure");

  resetGuidesCache(store);
  assert.equal((await loadGuides(opts()))[0]?.id, "fallback", "bundled data as last resort");
});
