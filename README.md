# NeoSite

NeoSite is a lightweight AI-assisted landing page builder that runs entirely on the edge. The web experience lets founders describe their idea in a single prompt, instantly previews a responsive page, and delivers a downloadable ZIP bundle containing production-ready HTML, CSS, JavaScript, and SVG assets. A companion Expo mobile client mirrors the same flow so users can generate, preview, and export bundles directly from their phone.

> **Stack headlines**
>
> - Web app: Hono + Vite deployed to Cloudflare Pages (Workers runtime)
> - Asset packaging: Dynamic site generator + JSZip running server-side, Tailwind (CDN) on the client
> - Mobile app: Expo + React Navigation + WebView + FileSystem/Sharing bridges
> - Target hosting for exported sites: InfinityFree, Netlify, Vercel static, GitHub Pages, etc.

## Repository layout

```
webapp/
├── public/                  # Static assets served from Cloudflare Pages
├── src/                     # Hono app (API + server-rendered shell)
│   ├── generator.ts         # Spec, layout, CSS, asset + ZIP generation logic
│   ├── index.tsx            # Routes (/ and /api/generate)
│   └── renderer.tsx         # Shared HTML shell with Tailwind CDN & scripts
├── mobile/                  # Expo managed React Native client
│   ├── App.js               # Navigation container
│   ├── src/screens/         # Prompt + Preview screens
│   └── app.json             # Expo configuration
├── dist/                    # Build output (created by `npm run build`)
├── package.json             # Web workspace scripts & deps
├── wrangler.jsonc           # Cloudflare Pages configuration
└── README.md
```

## Key capabilities

- **Prompt → Spec expansion** – Deterministic heuristics extract keywords, build a landing page spec (sections, copy, CTAs) and estimate token usage. Ready to swap for real LLM calls later.
- **Responsive layout & theming** – Generates tailored HTML, CSS, and lightweight JS with configurable theme (`auto`/`light`/`dark`), primary color palette, and layout variant (`hero+features`, `single-column`, `spotlight`).
- **Asset generation** – Creates hero and feature SVG illustrations on the fly and packages them alongside the code bundle.
- **ZIP bundling** – Uses JSZip in the Worker to emit a base64 ZIP payload (`index.html`, `styles.css`, `script.js`, `images/*`).
- **Live preview** – Client loads the returned `previewHtml` into an iframe, with desktop/mobile viewport toggles.
- **Download/export** – Browser downloads via base64 → blob. Mobile app writes the ZIP to cache and triggers the native share sheet.
- **Health check** – `/api/health` returns status metadata for uptime monitors.

## Web application

### Install & develop

```bash
# install dependencies
cd /home/user/webapp
npm install

# rebuild worker bundle
npm run build

# start Cloudflare Pages dev server on port 3000 (ideal for pm2 in sandbox)
npm run dev:sandbox
# or use the default vite dev server locally
e npm run dev
```

> **Sandbox workflow tip:** follow the standard sequence: clean port → `npm run build` → `pm2 start ecosystem.config.cjs` (if you add one) → `curl http://localhost:3000`.

### API surface

| Method | Path            | Description                                      |
|--------|-----------------|--------------------------------------------------|
| GET    | `/api/health`   | Returns `{ status, timestamp }` for monitoring   |
| POST   | `/api/generate` | Generates the landing page bundle                |

**POST /api/generate**

Request body:

```json
{
  "prompt": "AI wellness coach for busy founders...",
  "options": {
    "theme": "auto",          // "auto" | "light" | "dark"
    "primaryColor": "#2563eb",
    "layout": "hero+features"  // also "single-column" | "spotlight"
  }
}
```

Successful response:

```json
{
  "status": "ok",
  "spec": { /* structured copy + sections */ },
  "options": { /* normalized palette + layout */ },
  "files": [
    { "path": "index.html", "mimeType": "text/html", "contents": "<!DOCTYPE html>..." },
    { "path": "styles.css", "mimeType": "text/css", "contents": ":root {...}" },
    { "path": "script.js", "mimeType": "application/javascript", "contents": "'use strict'..." }
  ],
  "images": [
    { "key": "hero", "alt": "Hero illustration...", "dataUri": "data:image/svg+xml;base64,..." }
  ],
  "previewHtml": "<!DOCTYPE html>...",     // Inline CSS/JS, data URI images
  "zipBase64": "UEsDBAoAAAAAA...",        // Downloadable bundle
  "zipSize": 158302,
  "metrics": {
    "generationMs": 142,
    "htmlChars": 4891,
    "cssChars": 3421,
    "promptChars": 118,
    "estimatedTokens": 2103
  }
}
```

Errors return `{ "status": "error", "error": "message" }` with appropriate HTTP codes (400 for validation, 500 for runtime failures).

### AI provider integration roadmap

The current implementation is deterministic (no external APIs) to keep the sandbox buildable. To plug in real AI services:

1. **Create provider wrappers** inside `src/generator.ts` or a new `src/providers/` module. Expect to call a code model (DeepSeek, GLM-4.7, OpenAI) and an image model (Pollinations, Stability, etc.).
2. **Store credentials** as Cloudflare Pages secrets (`wrangler pages secret put`) and read them via `c.env` in the Hono route.
3. **Swap heuristics for API calls** in `generateSite`. Preserve the output schema so the front-end and mobile clients remain unchanged.
4. **Add moderation/limits** (token caps, retries, rate limiting) before enabling for public users.

### Verification

- `npm run build` → ✅ `dist/_worker.js` (174 kB) generated successfully.
- `POST /api/generate` manual tests via script confirmed JSON payload + base64 ZIP (see `src/generator.ts`).

## Expo mobile client

### Getting started

```bash
cd /home/user/webapp/mobile
npm install                 # already executed during scaffold, repeat if needed

# point the client to your running API (Cloudflare Pages dev server or deployed URL)
export EXPO_PUBLIC_API_URL="http://127.0.0.1:3000"

npm run start               # open Expo CLI
# or target a platform directly
e npm run ios
npm run android
npm run web
```

Screens:

- **PromptScreen** – Mirrors the web inputs (prompt, theme, color, layout). Calls `/api/generate` and navigates on success.
- **PreviewScreen** – Embeds the returned HTML inside a `WebView`, shows spec & metrics, and exports the base64 ZIP via `expo-file-system` + `expo-sharing`.

Design considerations:

- Safe-area aware layout, gradient accent derived from chosen primary color.
- Works offline with deterministic generation, ready to point at production API.
- Sharing fallback: if `expo-sharing` is unavailable (e.g., in simulators), the bundle path is displayed via `Alert`.

## Deployment

1. Build the worker: `npm run build`
2. (Optional) dry-run locally: `npm run dev:sandbox`
3. Deploy to Cloudflare Pages: `npm run deploy`
4. Set secrets / env vars using `wrangler pages secret put`

> Remember to read/write the `cloudflare_project_name` via the provided `meta_info` tool before/after deploying from this sandbox.

## Outstanding follow-ups

- Swap deterministic generators for pluggable AI providers (LLM + image).
- Add persistence for usage analytics (Cloudflare D1/KV) if needed.
- Build additional layouts (pricing tables, FAQ, testimonials) and allow partial edits.
- Implement authentication or rate-limiting if exposing publicly.
- Add automated tests (unit snapshots for `generateSite`, integration tests via Miniflare).

## Changelog

- **2025-12-30** – Initial NeoSite implementation: Hono edge app, asset packaging, Expo mobile companion.
