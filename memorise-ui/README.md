# Memorise UI

A client-side text curation tool for NLP-assisted annotation of Holocaust testimonies. Built with React, TypeScript, and MUI .

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

App runs at `http://localhost:5173/NPRG045/`.

## Environment Variables

Copy `.env.example` to `.env` to override defaults:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_BASE_PATH` | `/NPRG045/` | URL base path (set to `/` for Docker) |
| `VITE_NER_API_URL` | `https://ner-api.dev.memorise.sdu.dk/recognize` | NER endpoint |
| `VITE_SEGMENT_API_URL` | `https://textseg-api.dev.memorise.sdu.dk/segment` | Segmentation endpoint |
| `VITE_CLASSIFY_API_URL` | `https://semtag-api.dev.memorise.sdu.dk/classify` | Classification endpoint |
| `VITE_TRANSLATION_API_URL` | `https://mt-api.dev.memorise.sdu.dk` | Translation endpoint |

## Docker

```bash
docker compose up
```

App accessible at `http://localhost:3000`. API endpoints are configurable via environment variables in `docker-compose.yml`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Type-check + production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | ESLint check |
| `npm run docs` | Generate API docs (TypeDoc) → `docs/api/` |
| `npm run build:thesaurus` | Build thesaurus search index from full JSON |

## Architecture

Four layers:

```
src/
  core/           Domain logic (entities, interfaces, use cases, services)
  infrastructure/ External integrations (localStorage, HTTP APIs, providers)
  application/    Workflow services that orchestrate use cases
  presentation/   React components, hooks, Zustand stores
  types/          Shared TypeScript DTOs
  shared/         Theme, constants, utilities
```

**Data flow:** UI event → hook → workflow service → entity/repository → Zustand store → re-render.

**Key design decisions:**
- `Workspace` entity uses immutable builder pattern (`with*()` methods) with `fromDto()`/`toDto()` for persistence
- Tags and translations are plain DTOs — no entity wrappers
- Zustand stores hold DTOs; workflow services operate on DTOs
- Storage is abstracted via `WorkspaceRepository` interface for future backend migration
- NER spans are split into user-created and API-generated collections for conflict resolution

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

