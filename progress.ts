import type { GuideProgress, ProgressState, ReadingGuide } from "./model";

export function emptyProgress(guide: ReadingGuide): GuideProgress {
  return { guideId: guide.id, issues: {} };
}

export function setIssueState(
  progress: GuideProgress,
  issueId: string,
  state: ProgressState,
  now = new Date().toISOString(),
): GuideProgress {
  return {
    ...progress,
    issues: {
      ...progress.issues,
      [issueId]: { issueId, state, updatedAt: now },
    },
  };
}

export function getGuideCounts(guide: ReadingGuide, progress: GuideProgress) {
  const read = guide.issues.filter((issue) => progress.issues[issue.id]?.state === "read").length;
  const reading = guide.issues.filter((issue) => progress.issues[issue.id]?.state === "reading").length;
  return {
    total: guide.issues.length,
    read,
    reading,
    unread: guide.issues.length - read - reading,
    percentRead: guide.issues.length === 0 ? 0 : Math.round((read / guide.issues.length) * 100),
  };
}

/** Serialize progress for a host-provided storage adapter. */
export function serializeProgress(progress: GuideProgress): string {
  return JSON.stringify(progress);
}

/** Parse stored progress defensively; malformed or mismatched data is rejected. */
export function parseProgress(value: string, expectedGuideId: string): GuideProgress | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<GuideProgress>;
    if (candidate.guideId !== expectedGuideId) return null;
    if (!candidate.issues || typeof candidate.issues !== "object" || Array.isArray(candidate.issues)) return null;
    return candidate as GuideProgress;
  } catch {
    return null;
  }
}
