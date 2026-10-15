# Development notes

Internal notes kept from the team's original README. For a project overview, see the [README](../README.md).

## Run locally

Prerequisites: Node 24+, npm, and Python 3.

```bash
npm ci
npm run setup:browsers  # one-time Chromium install for parity tests
npm run dev       # Vite app at http://localhost:5173
npm run check     # format, lint, types, Node/Chromium tests, graph invariants
npm run build     # full typecheck + production web build
npm run release:check # authoritative local release gate while hosted CI is offline
```

Copy `.env.example` to `.env.local` only when connecting a hosted backend.
The current web shell uses registry data locally and needs no credentials.

### Starting a dev server resets your saved city (dev only)

**This is deliberate, not data loss.** Each `vite` process mints a run id at boot; the app
compares it against the copy in `localStorage` and, when it differs, deletes every `cr.*`
key — the saved city and wallet, the dev identity, the first-run demo reel's "seen" flag,
dismissed coach marks, best-streak high-water marks, audio preferences. So each dev server
you start gives you a genuine **first run**, which is what content authoring needs.

Per **server run**, not per page load:

| You did this | Your city |
|---|---|
| Restarted `npm run dev` (or `npx vite`) | **wiped** |
| Refreshed the page | kept |
| Saved a file and let HMR reload | kept |

It always says which happened, tagged `[cr:dev-reset]` in the browser console, naming every
key it removed, so a wipe is never mistaken for a bug. To keep state across a restart there
is nothing to disable — don't restart the server, and reload freely. The older `?reset`
query param is unchanged and still narrower: it clears the saved city and wallet only, not
coach marks, streaks or audio preferences.

**It cannot happen in a production build**, on two independent guards: the call site is
behind `import.meta.env.DEV`, so Vite drops the whole thing from a built bundle (covered by
`apps/web/src/devPersistence/devServerResetBoot.test.ts`), and the run id is defined as `null` by
anything that is not a live dev server. Implementation and reasoning:
`apps/web/src/devPersistence/devServerReset.ts`.

## Layout
```
docs/                         all design docs (see docs/README.md manifest)
  archive/reviews/            historical review triage (NOT implementation source)
apps/web/                      runnable React/Vite shell over registry-backed lanes
packages/                     FROZEN shared code (change = all-hands, not a casual commit)
  shared-state-schema/        the state + assessment types (Contracts 1-2)
  shared-mastery-service/     the ONE writer of mastery (Contracts 4.1)
  shared-components/          graph widget, math input/checkAnswer, state client (Contracts 4.2-4.4)
  skill-graph/                src/skill_graph.json = SOURCE OF TRUTH for nodes/edges/scope/lessons
                              test/graph_invariants.py = the CI guard
engines/                      the three work lanes (disjoint by construction)
  diagnostic/                 Gabe: placement/pretest + graph widget impl
  lesson/                     Anthony: lesson engine + content packs
  game/                       Evan: city-builder, storms, checkpoints
services/scorer/              authoritative scoring boundary for the AWS Lambda adapter
services/diagnostic-api/      deployable Lambda API (Hono): diagnostic + city + measurement
packages/db/                  RDS Data API client (@cr/db) + hand-written row types
db/migrations/                Aurora Postgres schema + least-privilege grants (via db/apply.mjs)
content/                      offline-authored D1 item and lesson pack layout
.cursor/skills/               10 project skills, invoked as /<name>
  author, lesson-qa           author a whole domain's lesson pack; review an authored one
  interactive-visuals, svg    gated lesson widgets; diagrams and animations
  lesson-katex                KaTeX conventions for every learner-visible math string
  practice-templates          item-bank practice templates, end to end
  practice-hints              progressive hints + worked-solution step arrays
  worked-solution-svg         parameterized SVGs for revealed worked solutions
  era-infinite-practice       era-level interleaved endless drill
  era-building-briefs         image-generation briefs for one era's buildings
.cursor/agents/               lesson-planner subagent brief
scripts/                      one-shot migrations (apply_scope_and_lessons.py, already applied)
.github/workflows/            CI (invariants.yml)
```

## The merge-safety model (why it's split this way)
Conflicts come from shared *files*, not shared concepts. So: anything touched by more than one person is a **frozen interface in its own package**; implementation happens behind it in each lane. Rules (from Architecture sec6 / Contracts):
- The `packages/*` interfaces are frozen Day 1. Changing one is a deliberate all-hands event.
- Each engine lane owns its own directory + its own data files. Two people authoring different domains never touch the same file.
- Short-lived feature branches off a daily `integration` branch; merge small and often, not one big-bang merge at the end.
- `skill_graph.json` is data, edited deliberately; the invariant test gates every change to it.

