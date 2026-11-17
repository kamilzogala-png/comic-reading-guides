import {
  ContentRating,
  DiscoverSectionType,
  type Chapter,
  type ChapterDetails,
  type DiscoverSection,
  type DiscoverSectionItem,
  type ExtensionImpl,
  type Form,
  type Metadata,
  type PagedResults,
  type SearchQuery,
  type SearchResultItem,
  type SortingOption,
  type SourceManga,
  type Tag,
  type TagSection,
} from "@paperback/types";

import fallbackData from "./guides.json";
import { SECTION_DEFS, guidesForSection, loadGuides, paginate, parseGuides, searchGuides } from "./guides";
import { getLibrary } from "./library";
import type { MatchResult } from "./matching";
import type { ReadingGuide } from "./model";
import { AuthInterceptor, httpGetJson } from "./network";
import type ReadingGuidesConfig from "./pbconfig";
import { readSettings } from "./config";
import { SettingsForm } from "./settings";
import { guideStore } from "./storage";

const BASE_URL = "https://kamilzogala-png.github.io/comic-reading-guides/0.9/stable";
const COVER_URL = `${BASE_URL}/cover.png`;
const PAGE_URL = `${BASE_URL}/page.png`;
const FALLBACK_GUIDES = parseGuides(fallbackData);

const offsetOf = (metadata: Metadata | undefined): number =>
  typeof metadata === "object" && metadata !== null && !Array.isArray(metadata) && typeof metadata.offset === "number"
    ? metadata.offset
    : 0;

const nextMetadata = (next: number | undefined): Metadata | undefined =>
  next === undefined ? undefined : { offset: next };

async function getGuides(): Promise<ReadingGuide[]> {
  return loadGuides({
    url: readSettings().guidesUrl,
    getJson: httpGetJson,
    store: guideStore,
    fallback: FALLBACK_GUIDES,
  });
}

async function getGuide(id: string): Promise<ReadingGuide> {
  const guide = (await getGuides()).find((g) => g.id === id);
  if (!guide) throw new Error("Nie znaleziono przewodnika. Odśwież listę przewodników w ustawieniach.");
  return guide;
}

const guideTitle = (g: ReadingGuide): string => `${g.publisher}: ${g.title}`;

function chapterPrefix(result: MatchResult | undefined): string {
  switch (result?.status) {
    case "matched":
      return "[✓] ";
    case "missing":
      return "[Brak w bibliotece] ";
    case "ambiguous":
      return "[? kilka dopasowań] ";
    case "error":
      return "[Błąd serwera] ";
    default:
      return "";
  }
}

export class ReadingGuidesExtension implements ExtensionImpl<typeof ReadingGuidesConfig> {
  async initialise(): Promise<void> {
    new AuthInterceptor("auth").registerInterceptor();
  }

  async getSettingsForm(): Promise<Form> {
    return new SettingsForm();
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    const guides = await getGuides();
    return SECTION_DEFS.filter((def) => guides.some(def.matches)).map((def) => ({
      id: def.id,
      title: def.title,
      type: def.prominent ? DiscoverSectionType.prominentCarousel : DiscoverSectionType.simpleCarousel,
    }));
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata?: Metadata,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const guides = guidesForSection(await getGuides(), section.id);
    const page = paginate(guides, offsetOf(metadata));
    const prominent = SECTION_DEFS.find((d) => d.id === section.id)?.prominent === true;
    return {
      items: page.items.map(
        (g) =>
          ({
            type: prominent ? "prominentCarouselItem" : "simpleCarouselItem",
            mangaId: g.id,
            title: guideTitle(g),
            subtitle: `${g.issues.length} issues · ${g.readingOrder} order`,
            imageUrl: COVER_URL,
          }) as DiscoverSectionItem,
      ),
      metadata: nextMetadata(page.nextOffset),
    };
  }

  async getSearchResults(
    query: SearchQuery<Metadata>,
    metadata: Metadata | undefined,
    sortingOption?: SortingOption,
  ): Promise<PagedResults<SearchResultItem>> {
    void sortingOption;
    const matches = searchGuides(await getGuides(), query.title);
    const page = paginate(matches, offsetOf(metadata));
    return {
      items: page.items.map((g) => ({
        mangaId: g.id,
        title: guideTitle(g),
        subtitle: g.subtitle ?? "",
        imageUrl: COVER_URL,
      })),
      metadata: nextMetadata(page.nextOffset),
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const guide = await getGuide(mangaId);
    const synopsis = [
      guide.description,
      `Reading order: ${guide.readingOrder}. Updated: ${guide.updatedAt || "n/a"}.`,
      ...guide.sourceAttribution,
      "Guides list issues only. Link your Komga library in the extension settings to read them here.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const info: TagSection = {
      id: "info",
      title: "Guide",
      tags: [
        { id: guide.publisher.toLowerCase(), title: guide.publisher },
        { id: guide.category, title: guide.category },
        ...(guide.tags ?? []).map((t) => ({ id: t.toLowerCase().replace(/\s+/g, "-"), title: t })),
      ] satisfies Tag[],
    };

    return {
      mangaId,
      mangaInfo: {
        thumbnailUrl: COVER_URL,
        synopsis,
        primaryTitle: guideTitle(guide),
        secondaryTitles: guide.subtitle ? [guide.subtitle] : [],
        contentRating: ContentRating.EVERYONE,
        status: "Reading guide",
        author: guide.publisher,
        tagGroups: [info],
        artworkUrls: [COVER_URL],
        additionalInfo: { Issues: String(guide.issues.length), "Reading order": guide.readingOrder },
      },
    };
  }

  async getChapters(sourceManga: SourceManga, sinceDate?: Date): Promise<Chapter[]> {
    void sinceDate;
    const guide = await getGuide(sourceManga.mangaId);
    const library = getLibrary();
    const matches = library ? await library.matcher.matchGuide(guide.issues) : undefined;

    return guide.issues.map((issue, index) => ({
      chapterId: issue.id,
      sourceManga,
      langCode: "EN",
      chapNum: index + 1,
      title:
        `${chapterPrefix(matches?.get(issue.id))}${issue.series} #${issue.issueNumber}` +
        `${issue.year ? ` (${issue.year})` : ""}${issue.optional ? " (optional)" : ""}` +
        `${issue.readingNote ? ` — ${issue.readingNote}` : ""}`,
    }));
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const guide = await getGuide(chapter.sourceManga.mangaId);
    const issue = guide.issues.find((i) => i.id === chapter.chapterId);
    if (!issue) throw new Error("Nie znaleziono zeszytu w przewodniku.");

    const library = getLibrary();
    if (!library) {
      // No server linked: keep the chapter harmless and explain what to do.
      return { id: chapter.chapterId, mangaId: guide.id, pages: [PAGE_URL] };
    }

    const label = `${issue.series} #${issue.issueNumber}`;
    const result = await library.matcher.matchIssue(issue);
    switch (result.status) {
      case "matched": {
        const pages = await library.provider.listPages(result.bookId);
        if (pages.length === 0) throw new Error(`Zeszyt ${label} nie ma stron na serwerze.`);
        return {
          id: chapter.chapterId,
          mangaId: guide.id,
          pages: pages.map((p) => library.provider.pageUrl(result.bookId, p)),
        };
      }
      case "missing":
        throw new Error(`Brak w bibliotece: ${label}`);
      case "ambiguous":
        throw new Error(
          `Kilka serii pasuje do ${label}. Dodaj rok w nazwie serii lub metadanych, aby zeszyt był jednoznaczny.`,
        );
      case "error":
        throw new Error(`Błąd serwera: ${result.message}`);
    }
  }
}

export const ReadingGuides = new ReadingGuidesExtension();
