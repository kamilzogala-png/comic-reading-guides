# Comic Reading Guides

A Paperback 0.9 extension with Marvel and DC reading guides. It can optionally link every issue in a guide to your own **Komga** library, so you read the guide in order, inside Paperback.

## Install in Paperback 0.9

1. GitHub repo → Settings → Pages → Source: "Deploy from a branch", branch `gh-pages`, folder `/ (root)`.
2. Wait for the "Build and Deploy" run in the Actions tab.
3. Paperback → Settings → Extensions → Add Repository:

```text
https://kamilzogala-png.github.io/comic-reading-guides/0.9/stable
```

4. Install "Comic Reading Guides".

## Link your Komga library

Open the extension's settings in Paperback:

1. Turn on **Połącz z moją biblioteką**.
2. **Adres serwera**, e.g. `http://192.168.1.10:25600` (or your Tailscale / domain address).
3. Sign in with an **API key** (Komga → Account Settings → API Keys) or switch the toggle off and use username and password. Secrets are kept in Paperback's secure storage.
4. Tap **Sprawdź połączenie**.

In a guide, each issue is labelled:

| Label | Meaning |
| --- | --- |
| `[✓]` | Found in your library. Tapping it opens it in the Paperback reader. |
| `[Brak w bibliotece]` | Not found. It stays in the list so the order is complete. |
| `[? kilka dopasowań]` | Several series contain this issue. Add `volumeYear` to the guide, or a year to the series name. |
| `[Błąd serwera]` | The server could not be reached or rejected the login. |
| (no label) | No library linked. |

Matching uses the series title, the issue number and the volume year. It ignores `#001` vs `#1`, `Vol. 1`, `(1963)` in series names, accents and punctuation. Komga's series title and folder name are both checked.

Komga is the only supported server for now. The server-specific code is in `komga.ts` and the matcher only needs two functions (`searchSeries`, `listBooks`), so another server can be added next to it.

## Guide data (`guides.json`)

The extension downloads `guides.json` from the project's GitHub Pages site (cached for a few hours, with the bundled copy as an offline fallback). To add or fix guides, edit `guides.json` in this repo: the workflow republishes it automatically. A different URL can be set in the extension settings.

```json
{
  "schemaVersion": 2,
  "updatedAt": "2026-11-17",
  "guides": [
    {
      "id": "marvel-civil-war-2006",
      "publisher": "Marvel",
      "title": "Civil War",
      "subtitle": "optional",
      "category": "event",
      "tags": ["Avengers"],
      "popular": true,
      "description": "…",
      "readingOrder": "recommended",
      "updatedAt": "2026-11-17",
      "sourceAttribution": ["where the order comes from"],
      "issues": [
        { "id": "marvel-cw-001", "publisher": "Marvel", "series": "Civil War",
          "issueNumber": "1", "year": 2006, "volumeYear": 2006, "readingNote": "optional" }
      ]
    }
  ]
}
```

- `category`: `event`, `character`, `creator`, `chronology`, `series` or `era`. The home page shows Popular events, Marvel, DC, Events, Creator runs, Characters, Eras & chronology and Series (empty sections are hidden, each section is paginated).
- Issue `id` values must be unique and must never change: Paperback uses them to remember what you've read.
- `volumeYear` is the year the series started (1963 for Amazing Spider-Man vol. 1). Set it whenever a title has several volumes.
- The bundled guides are a starter list: main series only, no tie-ins (apart from the Civil War sample). Check them against a public reading-order source before relying on them. See `DATA-SOURCES.md`.

## Development

```sh
npm install
npm run validate   # check guides.json
npm run typecheck
npm test           # matcher, Komga client, guide loading and the extension itself
```

The GitHub Actions workflow (`.github/workflows/build.yml`) runs all three, copies the extension files into `src/ReadingGuides/` and bundles them, so the repository can stay flat.

## License

The source code is licensed under the MIT License. The guide data is editorial content and does not grant rights to third-party trademarks, comic books, covers or other copyrighted material. See [LICENSE](LICENSE).
