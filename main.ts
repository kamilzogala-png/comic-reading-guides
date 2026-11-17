import {
  ContentRating,
  DiscoverSectionType,
  type Chapter,
  type ChapterDetails,
  type DiscoverSection,
  type DiscoverSectionItem,
  type ExtensionImpl,
  type PagedResults,
  type SearchQuery,
  type SearchResultItem,
  type SortingOption,
  type SourceManga,
  type Tag,
  type TagSection,
} from "@paperback/types";

import guidesData from "./guides.json";
import type ReadingGuidesConfig from "./pbconfig";

// Files published next to the bundle by the GitHub Actions workflow.
const BASE_URL = "https://kamilzogala-png.github.io/comic-reading-guides/0.9/stable";
const COVER_URL = `${BASE_URL}/cover.png`;
const PAGE_URL = `${BASE_URL}/page.png`;

type GuideIssue = { id: string; series: string; issueNumber: string; year?: number; readingNote?: string };
type Guide = {
  id: string;
  publisher: string;
  title: string;
  subtitle?: string;
  category: string;
  description: string;
  readingOrder: string;
  updatedAt: string;
  sourceAttribution: string[];
  issues: GuideIssue[];
};

const guides = guidesData as Guide[];

const findGuide = (id: string): Guide => {
  const guide = guides.find((g) => g.id === id);
  if (!guide) throw new Error("No guide with this id exists");
  return guide;
};

const toItem = (
  guide: Guide,
  type: "simpleCarouselItem" | "prominentCarouselItem",
): DiscoverSectionItem =>
  ({
    mangaId: guide.id,
    title: `${guide.publisher}: ${guide.title}`,
    subtitle: `${guide.issues.length} issues · ${guide.readingOrder} order`,
    imageUrl: COVER_URL,
    type,
  }) as DiscoverSectionItem;

export class ReadingGuidesExtension implements ExtensionImpl<typeof ReadingGuidesConfig> {
  async initialise(): Promise<void> {}

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      { id: "marvel", title: "Marvel guides", type: DiscoverSectionType.simpleCarousel },
      { id: "dc", title: "DC guides", type: DiscoverSectionType.simpleCarousel },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: number | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    void metadata;
    const publisher = section.id === "dc" ? "DC" : "Marvel";
    return {
      items: guides.filter((g) => g.publisher === publisher).map((g) => toItem(g, "simpleCarouselItem")),
    };
  }

  async getSearchResults(
    query: SearchQuery<Record<string, string>>,
    metadata?: number,
    sortingOption?: SortingOption,
  ): Promise<PagedResults<SearchResultItem>> {
    void metadata;
    void sortingOption;
    const needle = query.title.trim().toLowerCase();
    const matches = guides.filter(
      (g) =>
        needle === "" ||
        g.title.toLowerCase().includes(needle) ||
        g.issues.some((i) => i.series.toLowerCase().includes(needle)),
    );
    return {
      items: matches.map((g) => ({
        mangaId: g.id,
        title: `${g.publisher}: ${g.title}`,
        subtitle: g.subtitle ?? "",
        imageUrl: COVER_URL,
      })),
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const guide = findGuide(mangaId);
    const notes = [
      guide.description,
      `Reading order: ${guide.readingOrder}. Updated: ${guide.updatedAt}.`,
      ...guide.sourceAttribution,
      "This guide only lists issues. Open each issue in your own comic source.",
    ].join("\n\n");

    const tags: TagSection = {
      id: "info",
      title: "Guide",
      tags: [
        { id: guide.publisher.toLowerCase(), title: guide.publisher },
        { id: guide.category, title: guide.category },
      ] satisfies Tag[],
    };

    return {
      mangaId,
      mangaInfo: {
        thumbnailUrl: COVER_URL,
        synopsis: notes,
        primaryTitle: `${guide.publisher}: ${guide.title}`,
        secondaryTitles: guide.subtitle ? [guide.subtitle] : [],
        contentRating: ContentRating.EVERYONE,
        status: "Starter sample",
        author: guide.publisher,
        tagGroups: [tags],
        artworkUrls: [COVER_URL],
      },
    };
  }

  async getChapters(sourceManga: SourceManga, sinceDate?: Date): Promise<Chapter[]> {
    void sinceDate;
    const guide = findGuide(sourceManga.mangaId);
    return guide.issues.map((issue, index) => ({
      chapterId: issue.id,
      sourceManga,
      langCode: "EN",
      chapNum: index + 1,
      title: `${issue.series} #${issue.issueNumber}${issue.year ? ` (${issue.year})` : ""}${
        issue.readingNote ? ` — ${issue.readingNote}` : ""
      }`,
    }));
  }

  // Guides contain no comic pages: show one info page instead of a broken chapter.
  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    findGuide(chapter.sourceManga.mangaId);
    return {
      id: chapter.chapterId,
      mangaId: chapter.sourceManga.mangaId,
      pages: [PAGE_URL],
    };
  }
}

export const ReadingGuides = new ReadingGuidesExtension();
