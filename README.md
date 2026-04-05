# NPRG045 — Data Curation Tool

Bachelor's thesis project (NPRG045 Software Project) at Charles University, Faculty of Mathematics and Physics.

A client-side text curation tool for NLP-assisted annotation of Holocaust testimonies, built as part of the [Memorise]([https://memorise.eu/](https://memorise.sdu.dk/about-memorise/)) digital humanities initiative.

## Repository Structure

| Path | Description |
|------|-------------|
| `memorise-ui/` | Main application source code (React + TypeScript) |
| `memorise-ui/src/` | Application source — see `memorise-ui/README.md` for architecture details |
| `memorise-ui/Dockerfile` | Multi-stage Docker build (Node → nginx) |
| `.github/workflows/` | CI/CD pipeline — type-check, lint, test, build, deploy to GitHub Pages |
| `Specification_Draft.md` | Initial project specification |
| `Styleguide Memorise_compressed.pdf` | Visual design reference from the Memorise project |
| `memorise_api_demo.py` | Python demo script for the NLP API endpoints |

## Getting Started

See [`memorise-ui/README.md`](memorise-ui/README.md) for setup instructions, environment variables, and Docker usage.

## CI/CD

GitHub Actions pipeline runs on every push and PR to `main`:
1. Type-check (`tsc --noEmit`)
2. Lint (`eslint`)
3. Test (`vitest`)
4. Build (Vite production build + Docker image)
5. Deploy to GitHub Pages (main branch only)
