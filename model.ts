export type Publisher = "Marvel" | "DC";
export type ProgressState = "unread" | "reading" | "read";
export type GuideCategory = "event" | "character" | "creator" | "chronology";
export type ReadingOrder = "publication" | "recommended" | "chronological";

export interface IssueReference {
  id: string;
  publisher: Publisher;
  series: string;
  issueNumber: string;
  year?: number;
  title?: string;
  readingNote?: string;
  /** A public metadata/reference URL, not a comic-page download URL. */
  metadataUrl?: string;
  /** Set only after the target application's deep-link format is verified. */
  paperbackDeepLink?: string;
  /** Provider-specific identifier, only when obtained through a supported API. */
  matchedSourceId?: string;
}

export interface ReadingGuide {
  id: string;
  publisher: Publisher;
  title: string;
  subtitle?: string;
  category: GuideCategory;
  description: string;
  readingOrder: ReadingOrder;
  issues: IssueReference[];
  sourceAttribution: string[];
  updatedAt: string;
}

export interface IssueProgress {
  issueId: string;
  state: ProgressState;
  updatedAt: string;
}

export interface GuideProgress {
  guideId: string;
  issues: Record<string, IssueProgress>;
}

export interface InstalledChapterCandidate {
  sourceId: string;
  seriesTitle: string;
  chapterNumber: string;
  year?: number;
  /** Only populate from a documented, verified Paperback API. */
  openUrl?: string;
}
