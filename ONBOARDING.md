# Developer onboarding

Use this page to get from a fresh clone to a safe first change.

## First hour

Prerequisites: Node 24+, npm, Python 3, and Chromium installed through Playwright.

```bash
npm ci
npm run setup:browsers
npm run dev
```

Open `http://localhost:5173`. The first development-server start clears `cr.*` browser storage by design so first-run flows are reproducible; refreshes and hot reloads preserve state.

Before changing code, run a small confidence check:

```bash
npm run typecheck
npm run test:unit
```

Before release or merge, run:

```bash
npm run release:check
```

## Repository map

| Path | Purpose |
| --- | --- |
| `apps/web/` | React/Vite student experience and browser tests |
| `packages/skill-graph/` | Authoritative nodes, prerequisites, scope, and lesson mapping |
| `packages/shared-*` | Shared state, mastery, checking, and UI contracts |
| `engines/` | Diagnostic, lesson, and game domain logic |
| `services/scorer/` | Server-side authoritative scoring boundary |
| `docs/` | Product contracts, architecture, operations, and historical design records |
| `output/` | Ignored QA output, except canonical `imagegen` briefs/manifests; keep reusable capture tooling in `scripts/` |

The highest-value reading order is:

1. [docs/Contracts.md](docs/Contracts.md) — authoritative shared behavior.
2. [docs/Architecture.md](docs/Architecture.md) — system boundaries.
3. [docs/README.md](docs/README.md) — status and authority of deeper design documents.

## Branches and changes

- `integration`: shared development line.
- `main`: stable/demo line.

Start from the branch appropriate to the work, create a focused branch, and keep unrelated generated evidence out of the commit. Avoid changing `packages/shared-*` casually because those packages define cross-system contracts.

For a UI change, add or update a nearby `*.browser.test.tsx`; for pure logic, add a `*.test.ts`. Keep touch targets at least 44×44 CSS pixels, preserve keyboard navigation and visible focus, and honor reduced-motion settings. The beta audience is high-school and college students, so labels and recovery instructions should be direct and jargon-free.

## Runtime configuration

Copy `.env.example` to `.env.local` only when connecting a hosted backend, and never commit credentials. Local development needs no credentials and uses the documented development paths.

## Definition of done

A change is ready only when its focused tests pass, `npm run release:check` passes, user-facing error paths are understandable, and the relevant docs are updated.
