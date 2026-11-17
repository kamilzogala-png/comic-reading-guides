import type { InstalledChapterCandidate, IssueReference } from "./model";
import { normalizeIssueNumber, normalizeSeries } from "./normalize";

/**
 * Return strict candidates only. The caller must handle zero or multiple
 * matches; this function never silently chooses an ambiguous chapter.
 */
export function matchIssue(
  issue: IssueReference,
  candidates: InstalledChapterCandidate[],
): InstalledChapterCandidate[] {
  const series = normalizeSeries(issue.series);
  const number = normalizeIssueNumber(issue.issueNumber);

  return candidates.filter((candidate) => {
    if (normalizeSeries(candidate.seriesTitle) !== series) return false;
    if (normalizeIssueNumber(candidate.chapterNumber) !== number) return false;
    if (issue.year && candidate.year && issue.year !== candidate.year) return false;
    return true;
  });
}
