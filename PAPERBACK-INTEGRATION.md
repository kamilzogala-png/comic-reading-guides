# Paperback 0.9 integration notes

## How the extension is built

- Extension API: Paperback 0.9 (`@paperback/types` and `@paperback/toolchain` 1.0.0-alpha). Capabilities: settings form, discover sections, search and chapters.
- Guides are served as one title each, their issues as chapters (stable chapter id = issue id, so read progress survives list updates).
- The extension does **not** use any other Paperback source. Extensions are sandboxed and no API for reading another source's library was verified. Instead it talks straight to the user's Komga server over HTTP (`komga.ts`) with credentials from its own settings, added to requests by an interceptor (`network.ts`) only for the configured server address.

## Komga endpoints used

- `GET /api/v2/users/me` (connection test)
- `GET /api/v1/series?search=…` (find series)
- `GET /api/v1/series/{id}/books` (find the issue by number)
- `GET /api/v1/books/{id}/pages` and `GET /api/v1/books/{id}/pages/{n}` (reading; `?convert=jpeg` for formats other than JPEG/PNG/WebP/GIF)

Authentication: `X-API-Key` header, or HTTP Basic.

## Things to check on a real device

- [ ] Plain `http://` addresses on a local network load pages in the reader. If not, use an HTTPS address (reverse proxy or Tailscale HTTPS).
- [ ] The settings form fields keep their values after the app restarts.
- [ ] A large guide (dozens of series) opens in acceptable time. Lookups run four at a time and are cached for five minutes.

## Not implemented

- Servers other than Komga (Kavita, Lanraragi, OPDS).
- Filters in advanced search (publisher, category).
- Fuzzy matching beyond exact normalized titles: a series with a different title in the library is reported as missing rather than guessed.
