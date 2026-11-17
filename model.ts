export type Publisher = "Marvel" | "DC";
export type ProgressState = "unread" | "reading" | "read";
export type GuideCategory = "event" | "character" | "creator" | "chronology" | "series" | "era";
export type ReadingOrder = "publication" | "recommended" | "chronological";

export interface IssueReference {
  id: string;
  publisher: Publisher;
  series: string;
  issueNumber: string;
  /** Year this issue was published (tie-breaker only). */
  year?: number;
  /** Year the volume/series started, e.g. 1963 for Amazing Spider-Man vol. 1. */
  volumeYear?: number;
  title?: string;
  readingNote?: string;
  optional?: boolean;
}

export interface ReadingGuide {
  id: string;
  publisher: Publisher;
  title: string;
  subtitle?: string;
  category: GuideCategory;
  tags?: string[];
  popular?: boolean;
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
