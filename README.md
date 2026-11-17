# Comic Reading Guides

A Marvel + DC reading-guide companion project intended for Paperback 0.9.

> **Project status: starter implementation, not a ready-to-install Paperback extension.**
> The exact Paperback 0.9 extension SDK integration is intentionally not fabricated. The project currently provides typed guide data, sample guide entries, issue matching, progress-state helpers, and validation. A host adapter can be added once the relevant SDK capabilities are verified.

## What is included

- Marvel and DC reading-guide data model.
- Sample event guides for *Civil War* and *Flashpoint* (short examples, not exhaustive reading orders).
- Conservative matching of guide issues to chapter candidates.
- Read / reading / unread progress helpers.
- JSON guide validation script.
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

## Repository layout

All files live in the repository root (flat layout, so it can be uploaded from a phone):

```text
├── guides.json                 # Reading-guide data
├── model.ts, matching.ts,
│   normalize.ts, progress.ts,
│   index.ts                    # TypeScript domain logic
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
