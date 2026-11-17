/** Normalize series names for conservative exact matching. */
export function normalizeSeries(value: string): string {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeIssueNumber(value: string): string {
  return value.trim().replace(/^#/, "").replace(/\.0+$/, "");
}
