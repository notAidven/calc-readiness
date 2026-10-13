# Game Architecture Blueprint (full-game design + architecture of record)

_The design and architecture of record for the whole calc-readiness game lane —
not one neighborhood, but the **generic, data-driven engine** that renders any
neighborhood from declarative descriptors, of which **only D1 is populated and
built at MVP**. This is the blueprint the D1 vertical slice is a proof of._

**Status:** architecture locked for the game lane. It builds **against** the
authoritative rules in `docs/Contracts.md` (§1 state, §3 write-mapping, §8
cosmetic economy), the mastery semantics in `docs/Mastery_Scoring_Spec.md`, the
rendering/state decisions in `docs/Architecture.md` §7, and the scope fence in
`docs/MVP_Definition.md`. Where this doc and those disagree, **those win.**
**Owner:** Evan (`engines/game` = `@cr/game`, `apps/web/src/city`).
**Companion (do not duplicate):** `docs/superpowers/specs/D1_City_Builder_Design_Spec.md`
is the concrete design of the **D1 slice** (the six plots, construction rule,
storm rule, cosmetic preview). This blueprint references it as the worked
example of the generic model below; it does not restate D1's per-node detail.

---

## 1. What this document is (and is not)

This is the game lane's answer to one question: **how do we build one deep,
credible neighborhood now (D1) without hard-coding "D1" into the engine**, so
the other eight neighborhoods and the endgame are already *architected* — typed,
documented, and reachable through the same code path — and become features later
by adding **data, not engine branches**.

- **It IS:** the module boundaries, the descriptor data model, the MVP build
  fence (what is built vs. architected-only), the runtime/rendering/session
  model, the storm + endgame "attack" seam, the MVP cosmetic-preview and its §8
  deferral, accessibility/resilience, and the testing/verification strategy.
- **It is NOT:** a second D1 spec (see the D1 slice spec), and it is **not** a
  reintroduction of the persistent economy — that is the ratified **Contracts §8**
  ranked expansion (Gabe-owned, Days 13-24) and is out of scope here.

---

## 2. Core identity and experience pillars

- **Cozy city-builder first.** The default emotional register is calm and
  constructive: a student *builds* a small, legible city by learning. Progress
  is visible as buildings rising on fixed plots. Nothing punishes, nothing is
  lost, learning is never gated behind spending or cosmetics.
- **Storms are non-punishing set-pieces.** The neighborhood "storm" is the
  climactic moment, but it is a *checkpoint*, not a gauntlet: no loss on failure,
  unlimited immediate retries, and a soft timer that only grows a bonus (never
  pass/fail). See §8 and the D1 slice spec §7.
- **The endgame ("Attacks = Calculus I") is framed but not built.** The long-arc
  vision (`docs/MVP_Definition.md` §8a) is that once a student's prerequisite
  city stands, Calculus I concepts (limits, derivatives, integrals) arrive as
  **attacks** the city defends against — a future, still **non-punishing**
  defensive set-piece. At MVP the attack scene is an **architected-only descriptor
  type** (§5.5, §8.4): declared, typed, example-populated, and never built.
- **One deep domain beats nine thin ones.** Per the depth-first MVP decision, D1
  is built richly (distinct building archetypes per answer-type, a real storm, a
  cosmetic preview) rather than nine shallow districts.

---

## 3. Architecture in one picture: a data-driven descriptor registry

The engine is **generic over "a neighborhood."** Everything neighborhood- or
domain-specific is **declarative data** resolved at runtime from two sources of
truth:

1. **The skill-graph registry** (`packages/skill-graph/src/skill_graph.json` via
   `@cr/skill-graph`) — node identity, domain membership, `product_scope`,
   prerequisite edges, lesson archetypes. The game **never hard-codes node ids or
   edges**; it reads them.
2. **Game descriptors** (`engines/game/src/descriptors.ts`) — the authored,
   framework-free game config that is *not* in the registry: isometric plot
   layout, building-visual archetypes keyed to answer-type, storm tuning,
   cosmetic-preview catalog, and the endgame attack-scene declaration.

A single resolver, **`resolveNeighborhood(domain)`**, composes those two into a
`ResolvedNeighborhood` that the pure view-model (`buildCityViewModel`) turns into
render-ready data. **D1 runs through this exact path** — it is not a special
case; it is the one *populated* input to a generic pipeline.

```
skill_graph.json ─┐
                  ├─> resolveNeighborhood(domain) ─> buildCityViewModel(states) ─> CityViewModel
descriptors.ts  ──┘        (pure, @cr/game)              (pure, @cr/game)              │
                                                                                       ▼
                                                          apps/web/src/city (React Three Fiber renderer)
```

Because the specific parts are data, adding a real D2 neighborhood later is
"author a descriptor + flip the registry scope," not "fork the engine."

---

## 4. Module boundaries and dependency rules (frozen)

| Layer | Package / path | May contain | May NOT contain |
| --- | --- | --- | --- |
| Domain engine | `@cr/game` (`engines/game/src`) | Pure TS: descriptors, resolver, construction/blueprint derivation, storm state machine, cosmetic-**preview**, checkpoint writer *interface*, city view-model | three.js / React Three Fiber, React, DOM, network/DB I/O, any economy balance/wallet type |
| Web surface | `apps/web/src/city` | React city surface, the **only** 3D rendering in the repo (`city/three/`, entered at `three/CityCanvasHost.tsx`), the in-memory dev session, DOM mirror, ARIA/announcements | Domain rules that belong in `@cr/game`; direct mastery/placement writes |
| Shared schema | `@cr/state-schema` | Frozen Contracts §1/§2 record types | **Economy types** (wallet/ledger/cosmetic) — those are Gabe's §8, deferred |
| Registry | `@cr/skill-graph` | Nodes/edges/scope (read-only to the game) | Game or rendering concerns |

**Hard rules that must always hold (enforced by tests + review):**

- **Framework-free engine.** `@cr/game` imports no three.js/React/DOM. All
  neighborhood logic is unit-testable without a renderer. (Verified: `@cr/game`'s
  `package.json` has no UI deps; `three` and `@react-three/*` live only in
  `apps/web`.)
- **Frozen write boundary (Contracts §3).** The game **reads**
  `placement_estimate`, `mastery`, `lesson_stage`, `completion_status` and the
  registry. The **only** shared learning-state write the game makes is
  `neighborhood_state.checkpoint_cleared`, and only through the game-owned
  **`CheckpointWriter`** (`engines/game/src/checkpoint.ts`) — never mastery,
  never placement, never through an economy service. The storm **never** calls
  `submitAssessmentEvidence` and is **not** a mastery evidence source.
- **No economy types in `@cr/state-schema`.** The MVP ships a *derived, in-memory*
  cosmetic **preview** only (`engines/game/src/cosmetic-preview.ts`). The
  persistent economy (wallet, grant ledger, owned/equipped cosmetics, grant/spend/
  equip APIs) is the ratified **Contracts §8** expansion, owned by Gabe for Days
  13-24, and is not present in the frozen schema.
- **Rendering split (Architecture §7).** Graphs live only in lessons/diagnostic;
  the city canvas is React Three Fiber only, in `apps/web`. The engine emits
  data; the web layer maps data → pixels.

---

## 5. The descriptor data model (`engines/game/src/descriptors.ts`)

The descriptor layer is the heart of the abstraction. All types are pure data
(framework-free). The resolver is the single choke-point every neighborhood —
D1 today, D2-D9 tomorrow — flows through.

### 5.1 Building-visual archetypes (keyed by answer-type)

Per `docs/MVP_Definition.md` §1, different question/answer types render as
visually distinct **building types**. An archetype is a declarative visual family
the renderer maps to geometry/palette; the engine holds only abstract tokens
(no colors), so it stays framework-free.

```ts
export type BuildingArchetypeId =
  | "numeric"               // numeric-answer skills
  | "multiple_choice"       // selected-response skills
  | "constructed_response"  // expression / free-form entry skills
  | "generic";              // fallback for unassigned / architected slots

export interface BuildingArchetypeDescriptor {
  id: BuildingArchetypeId;
  label: string;                 // human name, surfaced in the DOM mirror
  silhouette: "hall" | "tower" | "workshop" | "block"; // abstract shape family
  accent: string;                // abstract palette token (web maps to a color)
}
```

`BUILDING_ARCHETYPES` maps every id to its descriptor; `getBuildingArchetype(id)`
resolves it. The **web** layer owns the token → concrete color/shape mapping so
the engine never learns about the renderer.

### 5.2 Layout, storm, and cosmetic-preview descriptors

```ts
export interface NeighborhoodLayoutDescriptor {
  // Authored isometric grid positions, applied IN REGISTRY ORDER to the
  // neighborhood's product_scope="mvp" nodes. Empty for architected slots.
  plot_positions: readonly PlotPosition[];
}

export interface StormDescriptor {
  item_count: number;      // default 5 (tunable)
  clear_ratio: number;     // 0.8 fixed rule (see D1 slice spec §7.2)
  timer_budget_ms: number; // soft-timer budget; bonus-only, never pass/fail
}

export interface CosmeticPreviewDescriptor {
  catalog: readonly CosmeticPreviewItem[]; // read-only teaser; NO cost/spend
}
```

D1's storm descriptor reuses the frozen storm constants
(`DEFAULT_STORM_ITEM_COUNT`, `STORM_CLEAR_RATIO`, `DEFAULT_STORM_TIMER_BUDGET_MS`)
so the numbers have one home; the 80% clear threshold is the rule, size is tuning.

### 5.3 The endgame attack-scene descriptor **type** (architected-only)

The "Attacks = Calculus I" endgame is declared as a type and an example, and is
**never built**. The literal `built: false` makes "unbuilt" a compile-time fact —
turning it on requires editing the type, not a stray boolean.

```ts
export interface AttackWaveDescriptor {
  id: string;
  label: string;
  calculus_concept: string;   // "limits" | "derivatives" | "integrals" | ...
}

export interface AttackSceneDescriptor {
  readonly built: false;      // architected-only: NEVER built at MVP
  concept_source: string;     // "Calculus I"
  example_waves: readonly AttackWaveDescriptor[]; // illustrative, non-exhaustive
}

export const ENDGAME_ATTACK_SCENE: AttackSceneDescriptor; // example seam, built:false
```

### 5.4 The neighborhood descriptor and the registry

```ts
export type NeighborhoodStatus = "populated" | "architected";

export interface NeighborhoodDescriptor {
  domain: DomainId;
  label: string;
  status: NeighborhoodStatus;           // "populated" ONLY for D1 at MVP
  layout: NeighborhoodLayoutDescriptor; // authored positions ([] when architected)
  building_archetypes: Readonly<Record<string, BuildingArchetypeId>>; // node -> archetype
  default_archetype: BuildingArchetypeId;
  storm: StormDescriptor;
  cosmetic_preview: CosmeticPreviewDescriptor;
  attack: AttackSceneDescriptor | null; // architected-only seam (D1 wires the example)
}

// A Record over DomainId forces ALL nine in-product domains to have a slot:
// omitting one is a compile error. D1 populated; D2-D9 architected/empty.
export const NEIGHBORHOOD_DESCRIPTORS: Record<DomainId, NeighborhoodDescriptor>;
export function getNeighborhoodDescriptor(domain: DomainId): NeighborhoodDescriptor;
```

### 5.5 The resolver — the single generic path

```ts
export interface ResolvedPlot {
  node_id: string;
  lesson_archetype: string | null;        // reusable lesson-interaction template (renamed from lesson_shell; code migration tracked); NOT the building `archetype` below
  position: PlotPosition;
  road_sources: readonly string[];        // registry prereqs ∩ this neighborhood
  archetype: BuildingArchetypeDescriptor; // building VISUAL archetype, resolved from the descriptor (distinct from lesson_archetype)
}

export interface ResolvedNeighborhood {
  domain: DomainId;
  label: string;
  status: NeighborhoodStatus;
  populated: boolean;                      // status === "populated"
  plots: readonly ResolvedPlot[];          // [] for architected slots
  storm: StormDescriptor;
  cosmetic_catalog: readonly CosmeticPreviewItem[];
  attack: AttackSceneDescriptor | null;
}

export function resolveNeighborhood(domain?: DomainId): ResolvedNeighborhood;
```

`resolveNeighborhood`:

1. Looks up the descriptor for `domain`.
2. Reads the domain's `product_scope: "mvp"` nodes **from the registry** (never a
   hard-coded list), in registry order.
3. Zips each node with the authored `plot_positions[index]`, deriving `road_sources`
   from that node's registry prereqs intersected with the neighborhood's own
   nodes, and resolving the node's archetype (explicit assignment, else
   `default_archetype`).
4. Returns the composed `ResolvedNeighborhood` plus storm/cosmetic/attack data.

**Self-verifying fence (fail loud):** the resolver throws if a resolved node has
no authored position (registry/layout desync), if a `populated` descriptor
resolves to zero nodes, or if an `architected` descriptor resolves to nonzero
nodes. Because only D1 carries `product_scope: "mvp"` nodes in the registry (and
`graph_invariants.py` pins `EXPECTED_MVP_COUNT = 6`), **D1 is structurally the
only neighborhood that resolves to a populated city**; D2-D9 resolve to zero
plots. The "only D1 is built" fence is thus enforced by data, not by an engine
`if (domain === "D1")`.

---

## 6. The MVP build fence: built vs. architected-only

| Surface | State at MVP | Mechanism |
| --- | --- | --- |
| **D1 neighborhood** | **BUILT** — 6 plots, construction states, blueprint ghosts, roads, storm, cosmetic preview, archetype visuals | `status: "populated"`, authored 6-position layout, node→archetype map, registry has 6 `mvp` nodes |
| **D2-D9 neighborhoods** | **ARCHITECTED-ONLY** — typed descriptor slots, shown as distant locked districts (scenery) | `status: "architected"`, empty layout, no `mvp` nodes in registry ⇒ resolve to 0 plots |
| **Endgame attack scene** | **ARCHITECTED-ONLY** — typed, example-populated, `built: false` | `AttackSceneDescriptor` type + `ENDGAME_ATTACK_SCENE`; no runtime scene, no renderer |
| **Persistent cosmetic economy** | **DEFERRED** to Contracts §8 (Gabe, Days 13-24) | Only a mastery-derived preview exists; no wallet/ledger/spend types |

The critical property (proof of the abstraction): **D1 is not a bespoke code
path.** It is the single populated row of a generic registry, resolved by the
same `resolveNeighborhood` a future D2 will use. Populating D2 later means:
author its descriptor (layout + archetypes + storm), flip its six nodes to the
built scope in the registry (and update the CI count expectation), and it renders
— **no engine change**.

---

## 7. Runtime, rendering, and session model

- **Pure engine → render-ready data.** `buildCityViewModel(input)` composes
  authoritative node states with `resolveNeighborhood(domain)` into a
  `CityViewModel`: buildings (with `construction_state`, `completion_status`,
  `blueprint`, `progress`, and now **`archetype`**), roads, locked districts, the
  storm view, and the cosmetic preview. It performs and implies **no writes**.
- **The renderer consumes descriptors generically.** `apps/web/src/city/three/`
  holds the only 3D rendering in the repo. Building appearance is a function of
  **`building.archetype`** (silhouette + accent, mapped web-side to shape/color)
  **combined with** `construction_state` (height + build-progress palette) —
  keyed by descriptor data, not by hard-coded D1 node ids. The scene falls back
  to a deterministic CSS/DOM backdrop if WebGL is unavailable.
- **DOM mirror carries all semantics.** Every building, the storm gate, and the
  cosmetic preview have focusable DOM equivalents; the archetype is surfaced in
  the DOM (detail panel + `data-archetype`) so it is not conveyed by canvas color
  alone (accessibility §10).
- **Session model = load-on-enter + refresh-on-event, no realtime** (Architecture
  §7). The surface loads state once on entry and re-reads authoritative state
  only after an explicit event (finished lesson, storm result). There is no live
  subscription bound to the render loop. The MVP demo session
  (`apps/web/src/city/citySession.ts`) is in-memory only: no persistence client, no
  network, no economy service.

---

## 8. Storm and the endgame "attack" seam

### 8.1 Storm (built at MVP, checkpoint-only)

The storm is the generic per-neighborhood checkpoint, tuned by the descriptor's
`StormDescriptor` and implemented by the pure state machine in
`engines/game/src/storm.ts`. Full behavior is in the D1 slice spec §7; the
invariants the blueprint fixes for **every** neighborhood:

- **Unlock** only when all the neighborhood's required nodes are mastered (`>= 2`)
  — a pure function of mastery (`isNeighborhoodReady`), never of economy state.
- **Clear = ≥ 80%** (the fixed rule; item count is tuning, default 5).
- **Soft timer → bonus only.** Expiry forfeits the speed bonus; it never fails
  the storm and causes no loss.
- **No loss, infinite retry** on a miss.
- **On clear, the one game write:** `neighborhood_state.checkpoint_cleared` via
  the game-owned `CheckpointWriter`, idempotent, gated on all nodes already
  mastered. The storm **never** writes/evidences mastery.

### 8.2 Endgame attack scene (architected-only)

The "Attacks = Calculus I" endgame reuses the *same seam shape* as the storm — a
neighborhood-scoped, **non-punishing** defensive set-piece — but is expressed
only as the `AttackSceneDescriptor` type and the `ENDGAME_ATTACK_SCENE` example
(`built: false`). D1's descriptor wires `attack: ENDGAME_ATTACK_SCENE` to prove
the seam is reachable, but nothing renders or runs it. When it is eventually
built it will: (a) remain non-punishing and cosmetic in consequence, (b) never
become a mastery writer or evidence source, and (c) be driven by declarative wave
descriptors, not new engine branches — the same discipline as neighborhoods.

---

## 9. Cosmetic preview at MVP; persistent economy deferred to Contracts §8

- **At MVP:** a pure function of mastery (`deriveCosmeticPreview`) yields a
  **display-only** projection — how many cosmetic rewards the current mastery
  *would* earn in the §8 expansion (one per mastered node, plus one per gold
  node) — plus a **non-interactive** catalog teaser sourced from the
  neighborhood descriptor's `cosmetic_preview.catalog`. No balance, no ownership,
  no spend. Because it is derived from mastery it can never gate learning or the
  storm.
- **Deferred to Contracts §8 (Gabe, Days 13-24):** the wallet, append-only grant
  ledger, atomic idempotent grant/spend, `cosmetic_catalog`/`owned_cosmetic`/
  `equipped_cosmetic`, and the economy service APIs — plus all economy tuning
  (earn rates, resource model, prices).
- **Hard invariants (MVP preview and §8 alike):** no real-money purchases; the
  economy never gates a lesson/node/storm/checkpoint/mastery; the economy is never
  mastery (it never writes `mastery`/`placement_estimate`/`completion_status`).
  These mirror Contracts §8 INV-COS-1..5 and are upheld by the boundary in §4.

---

## 10. Accessibility and resilience

- **Canvas is an enhancement, never a requirement.** The full loop — inspect a
  building, read its archetype/state/progress, launch a lesson, attempt/retry the
  storm, browse the cosmetic preview — is operable from the DOM alone, keyboard
  only, with correct roles and accessible names.
- **State never conveyed by color alone.** Construction state and building
  archetype both have word labels in the DOM mirror.
- **Reduced motion.** Respect `prefers-reduced-motion`: weather, construction, and
  reward animation are reduced/disabled and state changes apply instantly.
- **ARIA live regions.** Announce meaningful changes (selection, load, storm
  outcome) — polite for progress, assertive for the storm result.
- **Fail closed.** If state/scoring is unavailable, the city renders read-only
  from last-known state; no storm clear, reward, or checkpoint write is
  fabricated. Deterministic placeholder geometry stands in for any missing art.
- **Idempotent, event-driven refresh.** Re-entering or replaying a refresh
  re-reads authoritative state and never double-applies an effect; there is no
  optimistic UI.

---

## 11. Testing and verification strategy

- **Descriptor resolution is generic and D1 flows through it** (unit,
  `engines/game`): `resolveNeighborhood("D1")` yields exactly the registry's six
  `mvp` nodes in order, with archetypes, authored positions, and registry-derived
  roads (asserted equal to the registry, not to a hard-coded list).
- **Architected-only / type-level fence** (unit, `engines/game`): every in-product
  domain (D1-D9) has a descriptor slot (guaranteed by `Record<DomainId, …>`); D1
  is the **only** `populated` one; D2-D9 are `architected` and resolve to **zero**
  plots; and the endgame attack **type** exists with `built === false` (unbuilt).
- **No regressions in D1 behavior** (unit + React): existing plot/construction/
  storm/cosmetic-preview/city-view-model tests continue to pass against the
  descriptor path; the web surface renders each construction state, the
  archetype, keyboard nav, live-region announcements, and the fail-closed error
  path.
- **Frozen graph invariants stay green** (`graph_invariants.py`): unchanged
  registry; MVP count remains 6, MVP set remains dependency-closed and acyclic.
- **Full local gate (must pass):** `npm run check` (format:check, lint, typecheck,
  unit, browser, graph invariants), `npm run build`, and `npm run test -w @cr/web`.

---

## 12. Extension playbook — populating a future neighborhood (no engine change)

When D2 (or any domain) is built in the Days 13-24 expansion:

1. **Registry:** promote that domain's six built nodes to the built scope
   (`product_scope: "mvp"` in MVP terms) and update `EXPECTED_MVP_COUNT` /
   dependency-closure expectations in `graph_invariants.py`. Keep the registry
   the single source of node/edge truth.
2. **Descriptor:** fill that domain's `NEIGHBORHOOD_DESCRIPTORS` entry — set
   `status: "populated"`, author `layout.plot_positions` (one per node), map each
   node to a `BuildingArchetypeId`, set the `StormDescriptor`, and (optionally)
   its cosmetic-preview catalog.
3. **Nothing else.** `resolveNeighborhood`, `buildCityViewModel`, the R3F
   renderer, the DOM mirror, and the storm machine already handle it. Add tests
   mirroring the D1 fence for the new domain.

This is the payoff of the descriptor design: neighborhoods (and eventually the
attack endgame) are **content**, not engine forks.

---

## 13. Out of scope / deferred (explicit)

- Building/migrating the **persistent cosmetic economy** (Contracts §8, Gabe,
  Days 13-24) — MVP ships only the derived preview.
- **Playable D2-D9** content and the **endgame attack scene** as runnable
  features — architected-only here.
- Any **economy type in `@cr/state-schema`**, any **mastery/placement write** by
  the game, any **storm mastery evidence**.
- Realtime subscriptions, free placement/interiors/editable grid, graphs in the
  city canvas, runtime LLM/content generation, mobile QR upload (all per the D1
  slice spec §12 and Architecture §7).

---

## 14. References

- `docs/superpowers/specs/D1_City_Builder_Design_Spec.md` — the concrete D1 slice
  (worked example of this blueprint; not duplicated here).
- `docs/Contracts.md` — §1 state, §3 write-mapping (the frozen game boundary), §8
  cosmetic economy (deferred expansion).
- `docs/Mastery_Scoring_Spec.md` — mastery rule (§0), storm rule (§5), UI
  legibility (§10).
- `docs/Architecture.md` — §7 rendering + state-flow (no realtime) decisions.
- `docs/MVP_Definition.md` — depth-first D1 scope; §1 building-type/resource depth;
  §8a "Attacks = Calculus I" endgame vision.
- `packages/skill-graph/src/skill_graph.json` + `@cr/skill-graph` — node/edge/scope
  source of truth read by the resolver.
- `engines/game/src/descriptors.ts` — the descriptor model + `resolveNeighborhood`
  implemented from this blueprint; `engines/game/src/city-view-model.ts` — the
  composed view model; `apps/web/src/city/` — the React Three Fiber surface.
