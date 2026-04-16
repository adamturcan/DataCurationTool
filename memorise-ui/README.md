# Memorise UI

A client-side text curation tool for NLP-assisted annotation of Holocaust testimonies. Built with React, TypeScript, and MUI.

## Features

- **Text Editor** with CodeMirror 6 — per-segment editing with live span decorations
- **Named Entity Recognition** — API-powered NER with conflict resolution for overlapping spans
- **Segmentation** — split text into sentences via API, drag-to-reorder, merge/split segments
- **Translation** — per-segment machine translation with independent NER per language
- **Semantic Tagging** — API classification with thesaurus-backed hierarchical tag system
- **Workspace Management** — create, rename, delete workspaces with localStorage persistence

## Quick Start

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173/DataCurationTool/` by default (the base path is configurable — see below).

## Environment Variables

All configuration goes through `VITE_*` env vars. Copy `.env.example` to `.env` to override any defaults locally:

| Variable | Default (from `vite.config.ts`) | Purpose |
|----------|--------------------------------|---------|
| `VITE_BASE_PATH` | `/DataCurationTool/` | URL base path. Set to `/` for Docker/standalone; GitHub Pages deploys use the default. |
| `VITE_NER_API_URL` | `https://ner-api.dev.memorise.sdu.dk/recognize` | NER endpoint |
| `VITE_SEGMENT_API_URL` | `https://textseg-api.dev.memorise.sdu.dk/segment` | Segmentation endpoint |
| `VITE_CLASSIFY_API_URL` | `https://semtag-api.dev.memorise.sdu.dk/classify` | Classification endpoint |
| `VITE_TRANSLATION_API_URL` | `https://mt-api.dev.memorise.sdu.dk` | Translation endpoint |

## Docker

```bash
docker compose up -d --build
```

App listens on host port **3000** (plain HTTP, container port 80). TLS and reverse-proxying are deployment concerns, not handled by the image.

### Project-specific deployment notes

- **Config is baked in at build time.** This is a static SPA — there is no runtime config. Any change to a `VITE_*` variable requires a rebuild. Always use `docker compose up -d --build` when pulling new code or changing config; `docker compose up` alone reuses the cached image and silently serves stale bundles.
- **Override endpoints for production.** The defaults in `docker-compose.yml` point at `*.dev.memorise.sdu.dk`. For a production deployment, set the four `VITE_*_API_URL` variables (see the [Environment Variables](#environment-variables) table) in a `.env` file next to `docker-compose.yml`, or export them in the shell before `docker compose up`. Compose picks them up via `${VAR:-default}` substitution.
- **`VITE_BASE_PATH` matters.** Use `/` (the Docker default) when the app is served from the root of a dedicated subdomain. Use `/some-prefix/` when served under a subpath of a shared domain. Mismatches produce a blank page with 404s on every asset.
- **CORS requires coordination with the NLP API owners.** The browser calls `VITE_NER_API_URL`, `VITE_SEGMENT_API_URL`, `VITE_CLASSIFY_API_URL`, and `VITE_TRANSLATION_API_URL` directly — there is no backend proxy. Each of those APIs must include the UI's production origin in their `Access-Control-Allow-Origin` response header, otherwise the corresponding feature fails silently (error visible only in the browser console). This is the single most likely deployment failure mode.
- **No persistent storage.** All workspace state lives in the user's browser `localStorage`. The container has no volumes, no database, and nothing to back up at the infrastructure layer. Clearing browser data on the client side means data loss — document this for end users if relevant.
- **No server-side auth.** The bundled `LoginPage` is a UI affordance, not a security boundary. If access control is required, enforce it at the reverse proxy (SSO, Basic Auth, OAuth2 proxy).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:ui` | Vitest browser UI |
| `npm run lint` | ESLint check |
| `npm run build:docs` | Generate API docs (TypeDoc) → `docs/api/` |
| `npm run build:thesaurus` | Build thesaurus search index from full JSON |

## Architecture

Four layers, with a thin shared kernel:

```
src/
  core/           Domain logic (entities, interfaces, use cases, pure services)
  application/    Facade + workflow services + error presenter
    WorkspaceApplicationService.ts    CRUD facade over use cases
    workflows/                        Per-feature orchestration (NER, translation, segmentation, tagging, export)
    errors/                           presentAppError + catchApiError helper
  infrastructure/ External integrations (localStorage repo, HTTP API service, providers)
  presentation/   React components, hooks, Zustand stores
  shared/         Layer-neutral kernel: error primitives, theme, constants, utilities
    errors/                           AppError type, normalizers, logger
  types/          Shared TypeScript DTOs
```

**Data flow:** UI event → hook → workflow service → use case → entity/repository → Zustand store → re-render.

**Key design decisions:**
- `Workspace` entity uses an immutable builder pattern (`with*()` methods) with `fromDto()`/`toDto()` for persistence
- Tags and translations are plain DTOs — no entity wrappers
- Zustand stores hold DTOs; workflow services operate on DTOs
- Storage is abstracted via `WorkspaceRepository` interface for future backend migration
- NER spans are split into user-created and API-generated collections so conflicts can be resolved explicitly
- Unified error handling: any raw error (HTTP / network / validation / repository) is normalized to an `AppError` in `shared/errors`; the application layer converts that to a user-facing `Notice` via `presentAppError`, so UX messages live in one catalog

## Testing

Unit tests live in `src/__tests__/` (flat). The suite covers one representative per architectural layer — domain entity, domain algorithm, validators, error pipeline, application facade, infrastructure adapter. Presentation components are covered separately via E2E (out of scope for this repo).

```bash
npm test
```

## Tech Stack

- **React 19** + **TypeScript 5.8**
- **Vite 6** — build tooling
- **MUI 7** — component library + theming
- **Zustand 5** — state management
- **CodeMirror 6** — text editor
- **Fuse.js** — fuzzy thesaurus search (Web Worker)
- **Vitest** — unit testing
- **TypeDoc** — API documentation generation
- **Docker** (nginx:alpine) — containerized deployment
- **GitHub Actions** — CI/CD with type-check, lint, test, build, deploy

## Thesaurus

The semantic tagging feature uses a hierarchical thesaurus index. To rebuild from the full JSON:

1. Place `thesaurus-full.json` in `public/`
2. Run `npm run build:thesaurus`
3. Output: `public/thesaurus-index.json` (loaded by Web Worker at runtime)
