import type { GuideStore } from "./guides";

const KEY = "guidesCache";

/** Persists the downloaded guides in the app's regular (non-secure) state. */
export const guideStore: GuideStore = {
  read() {
    const value = Application.getState(KEY);
    if (typeof value !== "object" || value === null) return undefined;
    const v = value as { fetchedAt?: unknown; guides?: unknown };
    return typeof v.fetchedAt === "number" && Array.isArray(v.guides)
      ? (v as ReturnType<GuideStore["read"]>)
      : undefined;
  },
  write(value) {
    try {
      Application.setState(value, KEY);
    } catch {
      // storage is best-effort
    }
  },
  clear() {
    try {
      Application.setState(undefined, KEY);
    } catch {
      // storage is best-effort
    }
  },
};
