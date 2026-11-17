import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

type Req = { url: string; method: string; headers?: Record<string, string> };

// ---- A fake Paperback runtime (Application global) -------------------------------------------
const state = new Map<string, unknown>();
const secure = new Map<string, unknown>();
const requests: Req[] = [];
let interceptors: Array<(r: Req) => Promise<Req>> = [];
let server: (url: URL, headers: Record<string, string>) => { status: number; body: unknown };
const selectors: Array<{ obj: object; name: string }> = [];

(globalThis as Record<string, unknown>).Application = {
  getState: (k: string) => state.get(k),
  setState: (v: unknown, k: string) => (v === undefined ? state.delete(k) : state.set(k, v)),
  getSecureState: (k: string) => secure.get(k),
  setSecureState: (v: unknown, k: string) => secure.set(k, v),
  base64Encode: (v: string) => Buffer.from(v).toString("base64"),
  arrayBufferToUTF8String: (b: ArrayBuffer) => Buffer.from(b).toString("utf8"),
  Selector: (obj: object, name: string) => {
    selectors.push({ obj, name });
    return `selector:${name}`;
  },
  registerInterceptor: (_id: string, _req: string, _res: string) => {
    // the real app routes requests through the registered interceptor; do the same
    interceptors.push(async (r) => {
      const { AuthInterceptor } = await import("./network");
      return new AuthInterceptor("auth").interceptRequest(r);
    });
  },
  unregisterInterceptor: () => {},
  scheduleRequest: async (request: Req) => {
    let r = request;
    for (const i of interceptors) r = await i(r);
    requests.push(r);
    const { status, body } = server(new URL(r.url), r.headers ?? {});
    const data = Buffer.from(JSON.stringify(body));
    return [{ status }, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)];
  },
};

const SERVER = "http://192.168.1.10:25600";
const GUIDES_URL = "https://example.test/guides.json";
const guidesJson = {
  guides: [
    {
      id: "g-cw", publisher: "Marvel", title: "Civil War", category: "event", popular: true,
      readingOrder: "recommended", description: "desc", updatedAt: "2026-11-17", sourceAttribution: ["src"],
      issues: [
        { id: "cw-1", series: "Civil War", issueNumber: "1", volumeYear: 2006 },
        { id: "cw-2", series: "Amazing Spider-Man", issueNumber: "532", volumeYear: 1963 },
        { id: "cw-3", series: "Fantastic Four", issueNumber: "536", volumeYear: 1961 },
      ],
    },
    {
      id: "g-fp", publisher: "DC", title: "Flashpoint", category: "event",
      readingOrder: "publication", description: "", updatedAt: "",
      issues: [{ id: "fp-1", series: "Flashpoint", issueNumber: "1" }],
    },
  ],
};

function komga(url: URL, headers: Record<string, string>) {
  if (url.href.startsWith(GUIDES_URL)) return { status: 200, body: guidesJson };
  if (headers["X-API-Key"] !== "secret-key") return { status: 401, body: {} };
  if (url.pathname === "/api/v1/series") {
    const q = (url.searchParams.get("search") ?? "").toLowerCase();
    const all = [
      { id: "s-cw", name: "Civil War (2006)" },
      { id: "s-asm", name: "Amazing Spider-Man (1963)" },
    ];
    return { status: 200, body: { content: all.filter((s) => s.name.toLowerCase().includes(q)) } };
  }
  if (url.pathname === "/api/v1/series/s-cw/books") return { status: 200, body: { content: [{ id: "cw-book-1", metadata: { number: "001" } }] } };
  if (url.pathname === "/api/v1/series/s-asm/books") return { status: 200, body: { content: [{ id: "asm-532", metadata: { number: "532" } }] } };
  if (url.pathname === "/api/v1/books/asm-532/pages") return { status: 200, body: [{ number: 1, mediaType: "image/jpeg" }, { number: 2, mediaType: "image/jpeg" }] };
  if (url.pathname === "/api/v1/books/cw-book-1/pages") return { status: 200, body: [] };
  return { status: 404, body: {} };
}

beforeEach(async () => {
  state.clear(); secure.clear(); requests.length = 0; interceptors = []; selectors.length = 0;
  server = komga;
  state.set("guidesUrl", GUIDES_URL);
  (await import("./guides")).resetGuidesCache();
  (await import("./library")).resetMatcherCache();
});

async function boot() {
  const { ReadingGuidesExtension } = await import("./main");
  const ext = new ReadingGuidesExtension();
  await ext.initialise();
  return ext;
}

const manga = (id: string) => ({ mangaId: id, mangaInfo: {} as never });

test("discover sections come from the downloaded guides and skip empty ones", async () => {
  const ext = await boot();
  const sections = await ext.getDiscoverSections();
  assert.deepEqual(sections.map((s) => s.id), ["popular", "marvel", "dc", "events"]);
  const items = await ext.getDiscoverSectionItems(sections.find((s) => s.id === "dc")!, undefined);
  assert.equal(items.items.length, 1);
  assert.equal(items.metadata, undefined);
});

test("search finds guides by title or an issue's series", async () => {
  const ext = await boot();
  const byTitle = await ext.getSearchResults({ title: "flash" }, undefined);
  assert.deepEqual(byTitle.items.map((i) => i.mangaId), ["g-fp"]);
  const bySeries = await ext.getSearchResults({ title: "fantastic" }, undefined);
  assert.deepEqual(bySeries.items.map((i) => i.mangaId), ["g-cw"]);
});

test("without a server, chapters have plain titles and open a harmless info page", async () => {
  const ext = await boot();
  const chapters = await ext.getChapters(manga("g-cw"));
  assert.deepEqual(chapters.map((c) => c.title), ["Civil War #1", "Amazing Spider-Man #532", "Fantastic Four #536"]);
  const details = await ext.getChapterDetails(chapters[0]!);
  assert.equal(details.type === undefined || details.type === "images", true);
  assert.equal(requests.some((r) => r.url.startsWith(SERVER)), false);
});

test("with a server: marks owned / missing issues and keeps stable chapter ids", async () => {
  state.set("linkLibrary", true);
  state.set("serverUrl", "192.168.1.10:25600/");
  secure.set("apiKey", "secret-key");
  const ext = await boot();
  const chapters = await ext.getChapters(manga("g-cw"));
  assert.deepEqual(chapters.map((c) => c.title), [
    "[✓] Civil War #1",
    "[✓] Amazing Spider-Man #532",
    "[Brak w bibliotece] Fantastic Four #536",
  ]);
  assert.deepEqual(chapters.map((c) => c.chapterId), ["cw-1", "cw-2", "cw-3"]);
  assert.ok(requests.filter((r) => r.url.startsWith(SERVER)).every((r) => r.headers?.["X-API-Key"] === "secret-key"));
});

test("reading an owned issue returns authenticated page URLs; missing or empty throw clear errors", async () => {
  state.set("linkLibrary", true);
  state.set("serverUrl", SERVER);
  secure.set("apiKey", "secret-key");
  const ext = await boot();
  const chapters = await ext.getChapters(manga("g-cw"));
  const ok = await ext.getChapterDetails(chapters[1]!);
  assert.deepEqual("pages" in ok && ok.pages, [`${SERVER}/api/v1/books/asm-532/pages/1`, `${SERVER}/api/v1/books/asm-532/pages/2`]);
  await assert.rejects(ext.getChapterDetails(chapters[2]!), /Brak w bibliotece: Fantastic Four #536/);
  await assert.rejects(ext.getChapterDetails(chapters[0]!), /nie ma stron/);
});

test("wrong credentials show [Błąd serwera] instead of 'missing'", async () => {
  state.set("linkLibrary", true);
  state.set("serverUrl", SERVER);
  secure.set("apiKey", "wrong");
  const ext = await boot();
  const chapters = await ext.getChapters(manga("g-cw"));
  assert.ok(chapters.every((c) => c.title!.startsWith("[Błąd serwera]")));
  await assert.rejects(ext.getChapterDetails(chapters[0]!), /Błąd serwera: Brak autoryzacji/);
});

test("basic auth header is built from username and password", async () => {
  state.set("linkLibrary", true);
  state.set("serverUrl", SERVER);
  state.set("useApiKey", false);
  state.set("username", "kamil");
  secure.set("password", "pw");
  server = (_url, headers) => ({ status: headers["Authorization"] === `Basic ${Buffer.from("kamil:pw").toString("base64")}` ? 200 : 401, body: { email: "kamil@x" } });
  const ext = await boot();
  const form = (await ext.getSettingsForm()) as unknown as { testConnection(): Promise<void>; status: string };
  await form.testConnection();
  assert.equal(form.status, "Połączono (kamil@x)");
});

test("settings form renders and hides the fields of the unused auth mode", async () => {
  const ext = await boot();
  const form = await ext.getSettingsForm();
  const sections = form.getSections() as Array<{ id: string; items: Array<{ id: string; isHidden?: boolean }> }>;
  assert.deepEqual(sections.map((s) => s.id), ["server", "guides"]);
  const server = sections[0]!.items;
  assert.equal(server.find((i) => i.id === "apiKey")!.isHidden, false);
  assert.equal(server.find((i) => i.id === "password")!.isHidden, true);
  // every handler the form refers to exists on the form object
  for (const { obj, name } of selectors) assert.equal(typeof (obj as Record<string, unknown>)[name], "function", name);
});
