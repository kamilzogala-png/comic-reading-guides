# Comic Reading Guides

A Marvel + DC reading-guide companion project intended for Paperback 0.9.

> **Project status: working Paperback 0.9 extension (starter sample).**
> It lists reading guides and their issues in order. It does not open issues from other sources: no documented Paperback API for that has been verified (see PAPERBACK-INTEGRATION.md).

## Install in Paperback 0.9

1. In the GitHub repo: Settings → Pages → Source: "Deploy from a branch", branch `gh-pages`, folder `/ (root)`.
2. Wait for the "Build and Deploy" action (Actions tab) to finish.
3. In Paperback: Settings → Extensions → Add Repository, and paste:

```text
https://kamilzogala-png.github.io/comic-reading-guides/0.9/stable
```

4. Install "Comic Reading Guides" from that repository.

## What is included

- Marvel and DC reading-guide data model.
- Sample event guides for *Civil War* and *Flashpoint* (short examples, not exhaustive reading orders).
- Conservative matching of guide issues to chapter candidates.
- Read / reading / unread progress helpers.
- JSON guide validation script.
- Paperback extension (`main.ts`, `pbconfig.ts`) built and published by GitHub Actions.
- Paperback integration checklist and data/copyright policy.

## Planned user experience

1. Browse guides by publisher, event, character, creator, or chronology.
2. Open a guide and see its ordered issues, metadata, notes, and references.
3. Match an issue to an installed source only where the SDK supports it.
4. Open the matched chapter only through a verified Paperback-supported action or deep link.
5. Track progress without falsely claiming that it synchronizes with another source.

## Requirements

- Node.js 20 or newer.
- npm.

## Quick start

```sh
npm install
npm run validate
npm run typecheck
```

The GitHub Actions workflow (`.github/workflows/build.yml`) copies the extension files into `src/ReadingGuides/` before bundling, so the repo can stay flat.

## Repository layout

All files live in the repository root (flat layout, so it can be uploaded from a phone):

```text
├── guides.json                 # Reading-guide data
├── model.ts, matching.ts,
│   normalize.ts, progress.ts,
│   index.ts                    # TypeScript domain logic
├── main.ts, pbconfig.ts        # Paperback extension
├── icon.png, cover.png, page.png
├── validate-guides.mjs         # Data validation script
├── PAPERBACK-INTEGRATION.md    # SDK checklist
├── DATA-SOURCES.md             # Data and copyright policy
├── LICENSE
├── package.json
└── tsconfig.json
```

## Important integration boundary

Do not assume an extension can enumerate, search, open, or update read state in other installed Paperback sources. Those capabilities must be confirmed in the official SDK and tested in Paperback 0.9. If cross-source APIs are unavailable, this project can still work as a companion guide source with its own progress tracking.

See:
- [Paperback integration checklist](PAPERBACK-INTEGRATION.md)
- [Data sourcing and copyright policy](DATA-SOURCES.md)

## License

The source code in this repository is licensed under the MIT License. The sample reading-order data is editorial sample content and does not grant rights to third-party trademarks, comic books, covers, or other copyrighted material. See [LICENSE](LICENSE).
