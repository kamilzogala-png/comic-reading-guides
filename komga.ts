import type { LibraryBook, LibraryProvider, LibrarySeries } from "./matching";

/** Performs an authenticated GET and returns parsed JSON. Throws on non-2xx. */
export type JsonGet = (url: string) => Promise<unknown>;

export interface KomgaPage {
  number: number;
  mediaType: string;
}

const BROWSER_SAFE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** "192.168.1.5:25600/" -> "http://192.168.1.5:25600". Returns "" for empty input. */
export function normalizeBaseUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, "").replace(/\/api(\/.*)?$/i, "");
}

export class KomgaProvider implements LibraryProvider {
  constructor(
    readonly baseUrl: string,
    private readonly getJson: JsonGet,
  ) {}

  async testConnection(): Promise<string> {
    const me = await this.getJson(`${this.baseUrl}/api/v2/users/me`);
    const email = isObj(me) && typeof me.email === "string" ? me.email : "OK";
    return `Połączono (${email})`;
  }

  async searchSeries(query: string): Promise<LibrarySeries[]> {
    const data = await this.getJson(
      `${this.baseUrl}/api/v1/series?search=${encodeURIComponent(query)}&size=50`,
    );
    const content = isObj(data) ? asArray(data.content) : [];
    const result: LibrarySeries[] = [];
    for (const item of content) {
      if (!isObj(item) || typeof item.id !== "string") continue;
      const title = isObj(item.metadata) && typeof item.metadata.title === "string" ? item.metadata.title : "";
      const folderName = typeof item.name === "string" ? item.name : "";
      const name = title || folderName;
      if (!name) continue;
      result.push({ id: item.id, name, aliases: folderName && folderName !== name ? [folderName] : [] });
    }
    return result;
  }

  async listBooks(seriesId: string): Promise<LibraryBook[]> {
    const data = await this.getJson(
      `${this.baseUrl}/api/v1/series/${encodeURIComponent(seriesId)}/books?size=1000&sort=metadata.numberSort,asc`,
    );
    const content = isObj(data) ? asArray(data.content) : [];
    const result: LibraryBook[] = [];
    for (const item of content) {
      if (!isObj(item) || typeof item.id !== "string") continue;
      const meta = isObj(item.metadata) ? item.metadata : {};
      const number = typeof meta.number === "string" ? meta.number : "";
      if (!number) continue;
      const date = typeof meta.releaseDate === "string" ? Number(meta.releaseDate.slice(0, 4)) : NaN;
      result.push({ id: item.id, number, releaseYear: Number.isFinite(date) ? date : undefined });
    }
    return result;
  }

  async listPages(bookId: string): Promise<KomgaPage[]> {
    const data = await this.getJson(`${this.baseUrl}/api/v1/books/${encodeURIComponent(bookId)}/pages`);
    const pages: KomgaPage[] = [];
    for (const item of asArray(data)) {
      if (!isObj(item) || typeof item.number !== "number") continue;
      pages.push({ number: item.number, mediaType: typeof item.mediaType === "string" ? item.mediaType : "" });
    }
    return pages.sort((a, b) => a.number - b.number);
  }

  pageUrl(bookId: string, page: KomgaPage): string {
    const base = `${this.baseUrl}/api/v1/books/${encodeURIComponent(bookId)}/pages/${page.number}`;
    return BROWSER_SAFE_TYPES.includes(page.mediaType) ? base : `${base}?convert=jpeg`;
  }
}
