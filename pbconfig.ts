import { ContentRating, SourceIntents, type ExtensionInfo } from "@paperback/types";

export default {
  name: "Comic Reading Guides",
  description: "Marvel and DC reading guides. Optionally links issues to your own Komga library.",
  version: "0.2.0",
  icon: "icon.png",
  language: "en",
  contentRating: ContentRating.EVERYONE,
  capabilities: [
    SourceIntents.SETTINGS_FORM_PROVIDING,
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
