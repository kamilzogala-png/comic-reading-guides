import { KomgaProvider } from "./komga";
import { IssueMatcher } from "./matching";
import { httpGetJson } from "./network";
import { isLibraryConfigured, readSettings, type Settings } from "./config";

const MATCHER_TTL_MS = 5 * 60 * 1000;

let current: { key: string; createdAt: number; provider: KomgaProvider; matcher: IssueMatcher } | undefined;

export function resetMatcherCache(): void {
  current = undefined;
}

export interface Library {
  provider: KomgaProvider;
  matcher: IssueMatcher;
}

/** Returns undefined when no library is configured. Caches series/book lookups for a few minutes. */
export function getLibrary(settings: Settings = readSettings()): Library | undefined {
  if (!isLibraryConfigured(settings)) return undefined;
  const key = [settings.serverUrl, settings.useApiKey, settings.apiKey, settings.username, settings.password].join("|");
  if (!current || current.key !== key || Date.now() - current.createdAt > MATCHER_TTL_MS) {
    const provider = new KomgaProvider(settings.serverUrl, httpGetJson);
    current = { key, createdAt: Date.now(), provider, matcher: new IssueMatcher(provider) };
  }
  return { provider: current.provider, matcher: current.matcher };
}
