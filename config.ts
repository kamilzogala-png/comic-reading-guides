import { normalizeBaseUrl } from "./komga";

export const DEFAULT_GUIDES_URL =
  "https://kamilzogala-png.github.io/comic-reading-guides/0.9/stable/guides.json";

export interface Settings {
  linkLibrary: boolean;
  serverUrl: string;
  useApiKey: boolean;
  apiKey: string;
  username: string;
  password: string;
  guidesUrl: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function readSettings(): Settings {
  const useApiKey = Application.getState("useApiKey");
  return {
    linkLibrary: Application.getState("linkLibrary") === true,
    serverUrl: normalizeBaseUrl(str(Application.getState("serverUrl"))),
    useApiKey: useApiKey === undefined ? true : useApiKey === true,
    apiKey: str(Application.getSecureState("apiKey")),
    username: str(Application.getState("username")),
    password: str(Application.getSecureState("password")),
    guidesUrl: str(Application.getState("guidesUrl")).trim() || DEFAULT_GUIDES_URL,
  };
}

export function isLibraryConfigured(s: Settings): boolean {
  if (!s.linkLibrary || !s.serverUrl) return false;
  return s.useApiKey ? s.apiKey !== "" : s.username !== "" && s.password !== "";
}
