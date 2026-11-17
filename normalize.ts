const COMBINING_MARKS = /[\u0300-\u036f]/g;
const YEAR_TAG = /[([]\s*((?:19|20)\d{2})(?:\s*[-–]\s*(?:(?:19|20)\d{2}|present))?\s*[)\]]/i;

/** Lowercase ASCII words separated by single spaces. */
export function normalizeSeries(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Split a library series name such as "Amazing Spider-Man (1963)" or
 * "The Amazing Spider-Man Vol. 1 (1963-1998) (Digital)" into a comparable
 * base name and the volume start year, when present.
 */
export function parseSeriesName(value: string): { base: string; year?: number } {
  const match = YEAR_TAG.exec(value);
  const year = match ? Number(match[1]) : undefined;
  const withoutGroups = value.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
  const withoutVolume = withoutGroups.replace(/\b(?:vol(?:ume)?\.?|v)\s*\d+\b/gi, " ");
  const base = normalizeSeries(withoutVolume).replace(/^the /, "");
  return { base, year };
}

/** "#001" -> "1", "1.0" -> "1", "12AU" -> "12au". */
export function normalizeIssueNumber(value: string): string {
  return value
    .trim()
    .replace(/^#/, "")
    .trim()
    .toLowerCase()
    .replace(/^0+(?=\d)/, "")
    .replace(/\.0+$/, "");
}
