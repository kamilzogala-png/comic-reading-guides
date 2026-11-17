import { ContentRating, SourceIntents, type ExtensionInfo } from "@paperback/types";

export default {
  name: "Comic Reading Guides",
  description: "Marvel and DC reading guides: browse events and read issues in order.",
  version: "0.1.0",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.EVERYONE,
  capabilities: [
    SourceIntents.DISCOVER_SECTION_PROVIDING,
    SourceIntents.SEARCH_RESULT_PROVIDING,
    SourceIntents.CHAPTER_PROVIDING,
  ],
  badges: [],
  developers: [
    {
      name: "kamilzogala-png",
      github: "https://github.com/kamilzogala-png",
    },
  ],
} satisfies ExtensionInfo;
