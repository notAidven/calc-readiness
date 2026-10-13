# Persistent civilizations: design record and build plan

*Read-only investigation at `origin/integration@cb43a096`, re-verified at `2a484b1b`
(2026-07-31). No implementation. Every figure below was measured, not recalled. Three
throwaway reproductions were written, run, and deleted; their output is quoted verbatim
and each is reconstructable from the description beside it.*

Owner lane: Gabe (economy shared types, tables, grants, migrations, service APIs) per
`OWNERS.md`. Evan owns game-side consumption; nothing here proposes an edit to
`CitySurface` internals beyond what the read model requires.

---

> ## ⚑ AMENDED 2026-07-31 — SIGN-IN IS REQUIRED BEFORE PLAY (team lead)
>
> **The ruling.** A learner signs in before they can play. There is no anonymous session,
> no play-then-sign-in, and no browser city to bring across.
>
> **The reasoning**, as put to the lead in §10 of the first version of this record: the
> question *"what happens to a learner's browser city when they sign in?"* had three
> answers, all of them costly — discard their work, import hand-editable ledger rows into
> an authoritative store, or build a choice UI and a set of conflict rules for a case that
> only exists during the transition. Requiring sign-in **dissolves the question instead of
> answering it**: a learner never has a browser city, so there is nothing to reconcile.
>
> **What this deletes.** The browser-city migration workstream is **deleted, not deferred**.
> No adopt path, no discard-with-warning, no choice at sign-in, no conflict rules, no
> import of any kind. §10 records what was cut so that nobody re-derives it in a month.
>
> **What this creates, and it is the larger half.** Until now the authenticated path was a
> *degraded* path with the `localStorage` path carrying every real session underneath it —
> which is precisely why none of the findings below surfaced in two weeks of QA. **Sign-in
> required makes the authenticated path the only path, with no fallback under it.** Every
> defect in §1, §4 and §5 therefore stops being a defect and becomes a launch blocker, and
> two obligations appear that did not exist before: the dev path has to survive without
> shipping (§11), and the demo needs an account or a bypass (§12).
>
> **The plan in §9 has been re-derived under the ruling** and now carries an explicit
> floor. It is not the floor that was expected — see §9.1.

---

## 1. Verdict

**The reframe is right: this is a persistence build, not an auth build.** Cognito works
end to end — the pool, the browser client, the JWT verifier, the `sub`-scoped read, the
401 on an absent token. Nothing in the sign-in path is missing.

**But the single biggest missing piece is bigger than "the server has nowhere to put the
civilization." The server also has no permission to write the two tables it already has.**

The runtime role `app_service` holds exactly these grants on the two city tables
(`db/migrations/0001_core_contracts.sql:115-118`):

```sql
grant select on public.student_node_state to app_service;
grant insert (student_id, node_id, placement_estimate)
  on public.student_node_state to app_service;
grant select on public.neighborhood_state to app_service;
```

No `update` on `student_node_state`. No `insert` or `update` on `neighborhood_state` at
all. And the code matches the grants — at this tip:

| Grep | Result |
|---|---|
| `update ... student_node_state` | **none** |
| `insert into / update ... neighborhood_state` | **none** |
| `insert into / update ... mastery_evidence \| raw_response_log` | **none** |

The only write to a city table anywhere is `aurora-placement-writer.ts`, an
`insert ... on conflict (student_id, node_id) do nothing` of `placement_estimate`.

So for a signed-in learner, **`mastery` is frozen at 0 forever**, `completion_status` is a
generated column over it and therefore permanently `locked`, `lesson_stage` is permanently
`not_started`, and `checkpoint_cleared` can never be recorded. The narrow read model is the
visible half of the gap. The absent write side is the other half, and it is not written
down anywhere in the repo.

That reframes the headline. It is not "six nodes of sixty-two are served." It is: **of the
eighteen kinds of state that make up a civilization, exactly one — the onboarding placement
estimate — survives a sign-in.**

### 1.1 What the sign-in ruling does to all of the above

Everything in this record was measured against a codebase where the authenticated path was
one of two paths. **It is now the only one**, and that changes the *severity* of every
finding without changing a single measurement.

The change is entirely in the quantifier:

| Finding | Before the ruling | After the ruling |
|---|---|---|
| Mastery frozen at 0 | for signed-in learners | **for every player.** There is no other kind |
| The wallet empties on reload | for signed-in learners | **for every player** |
| The city cannot be built (§4) | for signed-in learners | **for every player** |
| 17 of 18 kinds of state do not survive | for signed-in learners | **for every player** |

This is also the explanation for something that would otherwise be puzzling: **how did two
weeks of QA not find any of this?** Because QA never signed in. The `localStorage` path
carried every session — every screenshot, every crisis run, the whole era-two authoring
loop — and on that path all eighteen kinds of state persist correctly. The authenticated
path was not being exercised by anyone, so its being broken cost nothing and showed
nothing. The ruling removes the path that was hiding it.

**None of these are defects any more. They are launch blockers**, and §9 re-derives the
plan on that basis with an explicit floor.

Stated plainly, as asked. None of these changes the verdict.

1. **`economyPersistence.ts` is in `apps/web/src/devPersistence/`**, not `apps/web/src/economy/`.
   Its version is **3** (`ECONOMY_DEV_SCHEMA_VERSION = 3`); the city store is at **4**.
2. **There are eight application tables, not five.** The brief's list omits
   `mastery_evidence`, `raw_response_log`, and `assessment_administration_walk`. The
   conclusion is unaffected: none of the eight can hold placements, the town hall, roads,
   civic purchases, the ledger, era state, or crisis damage.
3. **`apps/web/src/economy/` has three test files across six modules, not zero across five.**
   The sharper version of the worry is true and worse — see §5.
4. **The two versioned stores are not the whole browser story.** There are **thirteen**
   `localStorage` keys in `apps/web/src`, and only **two** sit behind the
   `isDevPersistenceEnabled` gate. The era the city is standing in and the era-trial
   ceremony checkpoint write **unconditionally, signed in or not**. §3 has the full list.
5. **The TODO's severity assessment is understated, and it is understated in a way that
   matters.** It reasons about the hub ("a city missing its hub, not an unusable one") and
   notes placements are "equally absent". Driven rather than read, the signed-in city
   cannot be built at all. §4 has the reproduction.

---

## 2. What is verified, item by item

Every claim in the brief, checked at the tip.

**Re-verified at `2a484b1b` after #332 landed.** That merge touched 17 files — the winter
crisis lane plus two design docs — and **none of the sources cited below**. The one
citation in a file it did edit (`2026-07-29-mid-era-crisis-design.md:2230`, the citizens
claim in §3.4) is byte-identical at both SHAs, checked rather than assumed. The three
write-path greps in §1 were re-run against the new tree and still return zero.

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `GET /api/city` returns exactly `{ node_states, neighborhood_state }` | **CONFIRMED** | `CityRead`, `services/diagnostic-api/src/reads.ts:56-59`. Driven with a stub executor, the returned object's keys are literally `["neighborhood_state","node_states"]` |
| 2 | It builds `node_states` from `MVP_NODE_IDS` — six of sixty-two | **CONFIRMED, exactly** | `getNodesByScope("mvp")` over `skill_graph.json`: `{"mvp":6,"target":56,"excluded":4}`; mvp+target = **62**; 66 total. MVP ids `NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5` |
| 3 | `CityLoad` declares ~ten fields incl. `town_hall`, `placements`, roads, civic | **CONFIRMED (nine; no civic)** | `apps/web/src/city/types.ts:18-66` — `node_states`, `neighborhood_state`, `authoring_complete`, `placements`, `roads`, `road_gold_spent`, `town_hall`, `crisis_damage`. **Civic is not among them**: no civic field exists on integration at all (it is #273/#288 only) |
| 4 | `CitySurface` derives the hub from `load?.town_hall` | **CONFIRMED** | `CitySurface.tsx:651` — `useMemo(() => load?.town_hall ?? null, [load])` |
| 5 | `refresh()` discards it | **CONFIRMED** | `CitySurface.tsx:560-575` — `refresh` does a wholesale `setLoad(data)`. `placements`, `roads` and `crisis_damage` derive from the same `load` (lines 613, 629, 662), so all four are replaced together |
| 6 | There is a TODO in the file saying exactly this | **CONFIRMED** | `reads.ts:45-55`, and a matching backlog entry at `docs/Post_MVP_Backlog.md:49` (Tier 3, **Owner: Gabe**) |
| 7 | `App.tsx` inits the economy with an always-false flag | **CONFIRMED, and reproduced** | §5 |
| 8 | Ten of #288's sixteen files do not exist on integration | **CONFIRMED, exactly 10 of 16** | §7 |
| 9 | `neighborhood_state` holds zero rows | **CANNOT VERIFY — no database access from here** | §6. A structural argument that does not need the DB is given there |

---

## 3. The complete inventory of civilization state

Eighteen kinds of state. "Gated" means the write is suppressed when the app could ever be
server-backed (`isDevPersistenceEnabled`, which asks `!isServerBacked(true)`).

### 3.1 Already has a table

| # | State | Where it lives | Server can hold it | Winner on conflict |
|---|---|---|---|---|
| 1 | `placement_estimate` | `student_node_state`, and `cr.devSession.v4` | **Yes — and it is the only thing that works.** Insert-once, `on conflict do nothing` | Server |
| 2 | `mastery`, `mastery_updated_at` | column exists; browser snapshot (gated) | **Column yes, write path NO.** No `update` grant, no code | Server, and the server's value is permanently 0 |
| 3 | `completion_status` | generated column over `mastery` | Follows (2) automatically | Server; permanently `locked` |
| 4 | `lesson_stage` | column exists; browser snapshot (gated) | **Column yes, write path NO** | Server; permanently `not_started` |
| 5 | Neighborhood checkpoint | `neighborhood_state`; browser snapshot (gated) | **Table yes, write path NO.** `select`-only grant | Server; the row never exists |

### 3.2 Browser-only, behind the gate (`cr.devSession.v4` / `cr.devEconomy.v3`)

Every one of these is **discarded outright** for a signed-in learner: the store is inert by
design, and the server read carries no such field.

| # | State | Store | Server can hold it |
|---|---|---|---|
| 6 | Town hall placement | `cr.devSession.v4.town_hall` | **No** |
| 7 | Skill building placements | `cr.devSession.v4.placements` | **No** |
| 8 | Roads | `cr.devSession.v4.roads` | **No** |
| 9 | `road_gold_spent` (the netting counter) | `cr.devSession.v4` | **No** |
| 10 | Crisis damage — ruined buildings, scarred cells, suspended civic, **and the damage-id mint** | `cr.devSession.v4.crisis_damage` | **No** |
| 11 | The economy ledger — 11 resources (xp + ten era materials) | `cr.devEconomy.v3.entries` | **No** (tables ratified in Contracts §8, never migrated) |
| 12 | Prestige ownership | `cr.devEconomy.v3.owned_prestige` | **No** — but it re-derives from the XP balance on restore, so it needs no storage of its own |
| 13 | Equipped cosmetics (slot → cosmetic) | `cr.devEconomy.v3.equipped` | **No** — and this one genuinely cannot be derived |

### 3.3 Browser-only and **NOT** behind the gate

This class is not in the brief and it changes the plan. These write to `localStorage`
**even for a signed-in user**, so they are the one part of the civilization that already
"persists" under auth — per device, invisibly, with no server able to see or correct it.

| # | State | Key | Gated? |
|---|---|---|---|
| 14 | **The live era** | `cr.city.era.v1` | **No** |
| 15 | Era-trial ceremony beats kept | `cr.city.ceremony.beats.v1.<era>` | **No** (deliberate: OT-13 is open, `ceremonyCheckpoint.ts:28-41`) |
| 16 | Interleaved best streak | `cr.infinitePractice.bestStreak.era.<era>` | **No** |
| 17 | Onboarding demo seen / coach marks / crisis briefing seen | `cr.onboarding.demoSeen`, `cr.coach.*`, `cr.crisis.briefingSeen` | **No** |
| 18 | Audio preferences | `cr.audio.*`, `cr.lessonSound.muted` | **No** (deliberate — `audioPrefs.ts:14-21` argues the case) |

### 3.4 Two entries that are not what they look like

- **Civic buildings and what has been bought: nowhere at all.** `EconomyClient` carries
  `purchaseCivicBuilding` and `civicPurchasePath.test.ts` guards it, but at this tip
  **nothing calls it in production** — the only non-test references are the persistence
  wrapper and the road decorator forwarding it. `placeCivic`, `civicEconomy.ts` and
  `CityDevSnapshot.civic_material_spent` do not exist on integration. There is no civic
  state to persist yet; there is a primitive with no caller.
- **Citizens / population: derived, and unwired.** `cityCitizenRoster` takes
  `{viewModel, placements, seed}` and derives everything. The repo already records that
  *"the only importer of `cityCitizenRoster` anywhere in the tree is its own test"*
  (`2026-07-29-mid-era-crisis-design.md:2230`), confirmed here. So citizens need no table:
  they come free once **#7 placements** persist. This is the cheapest row in the inventory.

### 3.5 The coupling that decides the ordering

**The live era (#14) and the ledger (#11) are one atomic unit, and #14 is currently pinned
to a constant.**

`economySession.ts:25,72` reads the era from `CURRENT_ERA_ID` — the static *first*-era
constant in `eraDressing.ts` — **not** from the stored `eraState.ts`. `eraState.ts:38-48`
says so explicitly: `CURRENT_ERA_ID` is the default, only two of its call sites were
repointed at live era state, and the rest "must be decided separately". The economy is one
of the ones still reading era one. #288's own body confirms the consequence:
*"`applyCivicPurchase` would refuse them `wrong_era` only because `CURRENT_ERA_ID` is era
one."*

Every material grant, every spend, and every price is denominated by that read. So:

- Persist the ledger without persisting the era, and a returning learner gets a wallet
  denominated in a material their era does not use.
- Persist the era without repointing the economy's era read, and the wallet mints `stone`
  in era five while the city charges `gold` — the player's own buildings are refused.

#### THE CONSTRAINT, stated as one

> **The stored era and the persisted ledger must land in the same change, and the
> economy's four static-era reads must be repointed in that same change. No two of those
> three may ship apart.**

This is a hard ordering constraint on the plan, not an observation about it. §9 places it
in the floor for that reason.

**It is four call sites, not one**, measured at `2a484b1b` over the sixteen files that
reference the constant. The economy-relevant ones are:

| Site | What it denominates |
|---|---|
| `economy/economySession.ts:72` | what the wallet **mints and debits** |
| `economy/Shop.tsx:441` | the price the shop **displays** |
| `economy/materialWord.ts:27` | the material the UI **names** |
| `city/roadsEconomy.ts:92` | the affordability check the **road decorator** applies |

They have to move together. Repoint the wallet alone and the shop shows an era-one price
for a charge made at era-five scale — a disagreement between the number shown and the
number taken, which is worse than both being wrong in the same direction.

**Why this bites now rather than later.** Under sign-in-required the first era advance is
on the critical path for anyone who plays past era one. If the demo stays inside era one
the constraint is dormant; the moment it does not, the wallet refuses the player's own
buildings. That makes "does the demo cross an era boundary?" a scoping question worth
asking the lead explicitly, because the answer moves this item between §9's two tiers.

---

## 4. The signed-in city, driven rather than read

The brief asked whether the hub is "permanently undefined". It is, and the reproduction
found a second, independent failure stacked on top of it.

**Method.** A throwaway test drove the **real** `loadCityFromAurora` (the body behind
`GET /api/city`) over a stub Data API executor, straight into the **real** `CitySurface`,
wired exactly as `App.tsx` wires the signed-in path — note that `onPlaceSkill`,
`onMoveSkill`, `onMoveTownHall` and `onAttemptStorm` are passed **unconditionally**, unlike
the dev-mastery handlers which are gated on `authedCity`. Then it placed a building through
the ordinary build menu.

> The dev-mastery clause is history as of `#373`: those three props key on
> `isDevPersistenceEnabled()` now, not on auth (§11.3, RESOLVED). It made no difference to
> this reproduction, which never touched them, and it is noted here only because the sentence
> reads as a present-tense fact about `App.tsx`.

```
SERVER CityRead keys: ["neighborhood_state","node_states"]
town_hall: null          placements: null
roads: null              crisis_damage: null
node_states length: 6

HUB RENDERS FOR SIGNED-IN USER: false
CHOSE: NUM.S
onPlaceSkill CALLED WITH: [{"nodeId":"NUM.S","transform":{"nodeId":"NUM.S","col":-1,"row":-1,"rot":0}}]
DEV SESSION town_hall (which the server load does not carry): {"nodeId":"town-hall","col":-1,"row":-1,"rot":0}
IN-MEMORY SESSION placements after place: []
SERVER RE-READ placements after place: null
ISLAND PLOT STATES AFTER PLACING: ["empty","empty","empty","empty","empty","empty"]
ROSTER 'Built' BADGES AFTER PLACING: 0
```

Read the third and fourth lines together. **The surface chose cell `(-1,-1)` — the exact
cell the dev session's pre-seeded town hall occupies.** It chose it because occupancy is
computed from `load`, the server payload carries no `town_hall`, so the island centre looks
free. The write then goes to a session that *does* have a hall there, which silently
refuses it. The placement is lost before `refresh()` even gets a chance to discard it.

So there are two independent failures, either of which alone would be sufficient:

1. **The write is refused**, because the validity check and the write target disagree about
   what is on the island.
2. **Even if it landed**, `refresh()` replaces `load` wholesale with a payload that has no
   `placements` field.

The result is a city that cannot be built. `ROSTER 'Built' BADGES: 0` and six `empty`
plots after a successful-looking place action. The TODO's "skill buildings stay placeable"
is true of the button and false of the building.

This is a **live defect today**, not one that arrives with layout persistence. It is worth
the lead knowing before he decides how much of this lane is urgent.

---

## 5. The auth-gate landmine

### 5.1 Confirmed, and it still reads that way

`App.tsx:378-390`:

```tsx
const economyClientRef = useRef<EconomyClient | null>(null);
if (economyClientRef.current === null) {
  economyClientRef.current = createRoadSpendEconomy(
    createEconomyClient(authedCity !== null),
    () => session.roadGoldSpent(),
  );
}
```

`authedCity` is `useState<AuthedCity | null>(null)` at line 361, populated by the effect at
lines 400-428 which `await import("./auth/cognitoClient")` and then `await
getCurrentIdentity()`. So it is `null` on the first render by construction, and the ref
null-check means the expression is never re-evaluated.

**Reproduced**, with `VITE_COGNITO_USER_POOL_ID` and `VITE_DIAGNOSTIC_API_URL` both set and
a mocked Cognito client resolving a real `studentId` — i.e. a user who genuinely is signed
in on a genuinely server-backed deployment:

```
VITE_DIAGNOSTIC_API_URL set: true
VITE_COGNITO_USER_POOL_ID set: true
createEconomyClient CALL COUNT: 1
createEconomyClient ARGS: [false]

isEconomyServerBacked(true)  [the isDevPersistenceEnabled-style ask]: true
isEconomyServerBacked(false) [what the flag actually reports]: false
isDevPersistenceEnabled(): false
```

Constructed once, with `false`, while the correct answer is `true`. The moment a server
adapter is gated on that argument, **every signed-in user silently gets the in-memory
one.** Confirmed as a prerequisite, not a follow-up.

The trap is already documented — at the definition site. `economyClient.ts:299-306` spells
it out and names the right fix (`isEconomyServerBacked` asked with the strongest auth
state, "exactly as `isDevPersistenceEnabled` does"). **The call site says the opposite.**
`App.tsx:373-375` reads *"server-backed later behind the same gate (`createEconomyClient`)"*,
which invites precisely the wrong edit. Whoever writes the adapter will read the call site.

### 5.2 The consequence that is already live

The same run measured what a signed-in learner's economy has behind it **today**:

```
economy dev store .enabled for a signed-in user: false
city dev store .enabled (module-scope): false
WALLET xp after earning: 20 -> after a reload: 0
```

Both stores are correctly inert under auth (Contracts §3 — the Lambda is the only writer of
student state). But `createEconomyClient` returns the in-memory adapter regardless. So a
signed-in learner's wallet is pure memory with nothing behind it: **it empties on every
reload.** That is defect #96's shape, alive right now, for real users only — and it is
invisible in dev, because in dev the store is enabled and the wallet persists fine.

It compounds with §1: `reconcileProgress` re-derives earn grants from learning state on
every city load, which would normally rebuild some of the wallet — but for a signed-in user
mastery is frozen at 0, so there is nothing to re-derive either.

### 5.3 The coverage claim, corrected into something sharper

`apps/web/src/economy/` has **six** non-test modules and **three** test files, so "zero test
files across five modules" is false. What is true is worse:

| Module | Test files referencing it |
|---|---|
| `economySession.ts` | 5 |
| `useEconomy.ts` | 2 |
| `materialWord.ts` | 2 |
| `economyClient.ts` | 3 — **all `import type` only** |
| `Shop.tsx` | **0** |
| `EconomyHud.tsx` | **0** |

**`createEconomyClient` has zero call sites in any test in the repository.** Three separate
suites open an economy by re-implementing the composition root's body inline, each with a
comment saying so — *"Open the economy exactly as `createEconomyClient` does"*
(`economyMaterials.test.ts:50`), *"Open the economy as `createEconomyClient` does"*
(`civicPurchasePath.test.ts:47`), *"Open the economy exactly as `createEconomyClient` does"*
(`economyPersistence.test.ts:69`).

That is the guard-population failure this repo has catalogued thirteen times: the tests are
scoped to the *implementation they share* rather than the *behaviour that matters*, so the
one function that decides which adapter a real user gets is unguarded by construction.
Change its body and all three stay green. **The fix in §8 Step A is worthless without a
test that calls the real thing** — and the harness for one exists, because the reproduction
above is that test.

---

## 6. What the database can actually store

### 6.1 The eight tables, and which carry graded evidence

| Table | Kind | Can it hold civilization state? |
|---|---|---|
| `student_node_state` | **Learning record** | Mastery/stage columns exist; no write path |
| `neighborhood_state` | Game state (frozen §1) | Checkpoint column exists; no write path |
| `assessment_administration` | **Learning record — graded evidence** | No |
| `assessment_item_response` | **Learning record — immutable, graded evidence** | No |
| `mastery_evidence` | **Learning record** | No |
| `raw_response_log` | **Learning record** | No |
| `assessment_administration_progress` | Ephemeral engine state | No |
| `assessment_administration_walk` | Ephemeral engine state | No |

**The brief is right: there is nowhere to put placements, the town hall, roads, civic
purchases, the ledger, era state or crisis damage. This is a schema build, and that is the
single biggest fact in this report.**

### 6.2 Half the economy schema is already ratified — and it no longer matches the code

`docs/Contracts.md` §8 (all-hands ratified 2026-07-20) already specifies
`resource_wallet`, `resource_grant_ledger`, `cosmetic_catalog`, `owned_cosmetic`,
`equipped_cosmetic`, with illustrative DDL in
`Contracts_Amendment_Cosmetic_Economy.md` §4. **No migration was ever written.** That is a
real asset — the invariants, the ownership and the write-mapping rows are settled — but the
DDL cannot be transcribed, for two reasons:

1. **It is Supabase-shaped.** `references auth.users`, RLS `with check`, `auth.uid()`. The
   AWS-native migration deleted all of that in favour of app-layer scoping. §8's tables need
   the same re-port `0001` already did for §1/§2.
2. **It models a single generic `balance`; the shipped code does not.** `LedgerEntry` carries
   `resource_type` over eleven resources, keyed `(student_id, event_id, resource_type)`
   (D-R5 — one lesson-complete event writes two rows). §8's ledger PK is `event_id` alone,
   which the shipped shape breaks. §8's own "Open decisions" anticipated exactly this
   (*"a multi-resource variant would generalize `resource_wallet`/ledger to a
   `(student_id, resource_type)` key"*), so the decision was invited — but it still needs
   recording as an amendment rather than taken silently in a migration.

**Recommendation: build two economy tables, not five.** Derived from what the shipped core
actually does:

- `resource_grant_ledger` — **needed.** The single reconstructable source of truth.
- `equipped_cosmetic` — **needed.** `economySession.ts:90-93` calls `equipped` one of the
  two things "the ledger genuinely cannot express".
- `resource_wallet` — **recommend not building.** Every balance is derived from the ledger,
  and INV-COS-5 (`balance == sum(grants) - sum(spends)`) is satisfied by construction that
  way, where a stored column has to be kept in step. Add a materialized cache later only if
  reads measure slow.
- `owned_cosmetic` — **recommend not building.** `purchasedIds()` derives ownership from
  ledger `spend` rows carrying `cosmetic_id`. Prestige is the other half and is re-derived
  from the XP balance on every restore, deliberately.
- `cosmetic_catalog` — **recommend not building.** The catalog ships in code
  (`CosmeticDescriptor`, `civicCatalogue.ts`, 40 civic rows). A table would be a second
  source of truth for something with no runtime editor.

### 6.3 The tables that would need to exist

**Group A — grants only, on existing tables. NO new columns, NO learning-record widening.**

```sql
grant update (mastery, mastery_updated_at, lesson_stage, last_practiced_at)
  on public.student_node_state to app_service;
grant insert, update (checkpoint_cleared) on public.neighborhood_state to app_service;
```

`completion_status` is `generated always as ... stored`, so it follows `mastery` with no
grant. This is the whole of the change needed to unfreeze mastery.

**Group B — city layout (new; ordinary game state).**

- `city_placement (student_id, placement_id text, kind, subject_id text, col, row, rot,
  era_built, created_at)`, PK `(student_id, placement_id)`, `kind` an enum
  `('skill','town_hall','civic')`. One table for all three because the grid, the occupancy
  math and the move path are already one mechanism; `kind` keeps the hall out of the `N/6`
  roster count the way the app already does.
  **`placement_id` must be byte-identical to the string in the ledger's
  `build:<placement_id>` event id** — that join is what makes a civic purchase idempotent,
  and #288 found (and fixed) a colon-delimiter defect in exactly this seam. Write the
  constraint down in the migration comment.
- `city_road (student_id, col, row)`, PK on all three.
- `city_state (student_id, era_id, road_gold_spent, updated_at)` — the per-student scalars.

**Group C — crisis damage (new; ordinary game state, with one design improvement).**

- `city_crisis_damage (student_id, damage_id, subject_kind, subject, created_at)`,
  PK `(student_id, damage_id)`.
- **Do not port the mint.** The browser stores `next_damage_id` and guards it with a strict
  "greater than every issued id" invariant, because a browser has no atomic counter and a
  rewound mint re-issues an id the ledger already recorded a repair against — a ruin the
  economy believes is paid for and the player cannot clear (`devSession.ts:259-300`).
  Server-side, derive the next id from `max(damage_id)` within the row's own transaction,
  or use a per-student sequence. That deletes the failure mode rather than migrating it.

**Group D — economy (new).** `resource_grant_ledger` + `equipped_cosmetic`, per §6.2.

**Group E — era (new, tiny).** `city_state.era_id` covers the live era.
`city_era_ceremony (student_id, era_id, beats_kept)` would cover the trial checkpoint —
but **OT-13 is explicitly open** on whether that record belongs server-side at all, and
`ceremonyCheckpoint.ts:28-41` warns the answer "must not turn stage progress into a second
write nobody ratified". Do not decide it in a migration.

### 6.4 Which of this touches learning records

Stated explicitly, as asked.

- **Touches a learning record:** Group A's `student_node_state` grant, and only as a
  *grant*. It adds no column, changes no type, and touches no graded evidence.
- **Touches graded evidence:** **nothing.** No proposal here alters
  `assessment_administration`, `assessment_item_response`, `mastery_evidence` or
  `raw_response_log`. No item hash, no `scoring_model_version`, no
  `equivalence_checker_version`, no `routing_path`, no `seq`. The rescore procedure is
  untouched and no rescore is implied.
- **Ordinary game state:** Groups B, C, E, and `neighborhood_state`'s grant.
- **Economy:** Group D — governed by Contracts §8/INV-COS-1..5, and one-way by
  construction: nothing in it may be read by a progression decision.

### 6.5 Carrying the repurposed-id lesson into the server schema

`economyPersistence.ts:105-129` records the sharpest version of this. `flint` was
**retired**: it fell out of the allow-list, the blob was rejected and deleted, and no bump
was needed. `gold` was **repurposed** — the legacy currency became era five's material —
and it *passed* the allow-list, because a derived membership check cannot see that a
member's meaning moved. Only bumping the key version stopped a pre-drop wallet restoring as
an era-five stockpile for a player in era one.

**A server table has no key version to bump.** So the browser's escape hatch is unavailable
and the lesson has to be designed in instead:

1. **`resource_type` is a Postgres enum, never free text.** An added id is a migration; a
   *retired* id then fails loudly at write time, which is the `flint` case handled.
2. **Never repurpose an id — retire and add.** This is a rule, not a mechanism, because no
   constraint can catch it. Put it in the migration comment where the next author will read
   it, next to the `gold` story.
3. **Make each row self-describing so the rule has a backstop.** Carry `era_id` on the
   ledger row. Had `gold` rows existed in Aurora when the drop landed, an `era_id` column
   would have told a currency row from an era-five material row after the fact; without one,
   nothing downstream can recover the distinction — which is exactly what
   `economyPersistence.ts:118-121` says about `computeBalances` splitting on `resource_type`
   alone. One column, and it makes the one failure mode that has no automated defence
   recoverable rather than permanent.

---

## 7. The migration burden, and what I could not check

**I cannot reach the database, and I am not going to guess.** This VM has no AWS CLI, no
`~/.aws`, no AWS environment variables, and no `infra/cdk-outputs.json` (correctly — it is
gitignored and must stay that way). So the "zero rows" measurement is **claimed but
unverified** at this tip.

**A structural argument that does not need the database, and that is re-verifiable here:**

- `neighborhood_state` has a `select`-only grant and **no writer anywhere in the
  repository**. For it to hold a row, something outside this repo would have had to write
  it. That is not proof of zero, but it is a stronger argument than a remembered count, and
  it does not expire the way a row count does.
- `student_node_state` can only ever have received `placement_estimate` inserts, because
  that is the only statement that exists.
- **No table has a column that could hold layout, economy, era or crisis state**, so
  whatever rows do exist, none of them is civilization state. The migration burden for
  everything in Groups B-E is **structurally zero** regardless of what the row counts say.

**What still needs checking, by someone with credentials, before anyone relies on "no
migration burden" for Group A:** the row counts on `student_node_state`,
`assessment_administration`, `assessment_item_response`, `mastery_evidence` and
`raw_response_log`. `docs/Deployment.md` §3 documents the env vars; a read-only
`select count(*)` per table over the Data API answers it in one command. If those come back
non-zero with real learner data, Group A's grant change needs a "who is already mid-flight"
conversation. If they are empty apart from smoke-test residue, **there is no data migration
in this entire workstream**, which should be said loudly because it is the single biggest
cost reduction available.

---

## 8. How #273 and #288 relate to this plan

Both **OPEN**, both `mergedAt: null`, read at this tip.

- **#273** (`evan/city-population-happiness` → `integration`, 199 files, +29947/-654) is Evan's lane: buyable civic buildings, reachability, roads-as-happiness, citizens.
- **#288** (`cursor/civic-purchase-ledger-wiring-4394` → **`evan/city-population-happiness`**, 16 files) wires civic purchases through the ledger.

**The brief's claim is exact: ten of #288's sixteen files do not exist on integration.**
Verified file by file with `git cat-file -e` against `origin/integration`:

| Exists on integration (6) | Missing (10) |
|---|---|
| `App.tsx`, `city/citySession.ts`, `city/mockCity.ts`, `devPersistence/devSession.ts`, `packages/economy/src/materialSpend.ts` + `.test.ts` | `city/civicEconomy.ts` + `.test.ts`, `city/civicLedgerJoin.test.ts`, `city/civicLedgerPath.test.ts`, `city/civicPurchase.test.ts`, `city/placementReachability.test.ts`, `city/CitySurface.civic.test.tsx`, `city/CitySurface.civicSelect.test.tsx`, `economy/sinkStockpileParity.test.ts`, `city/art/building-sources/README.md` |

**How they relate, rather than duplicating them:**

1. **#288 is upstream of this plan and must not be re-done.** It establishes that a civic
   purchase is a **ledger row keyed by a stable `placement_id`**, not a session counter,
   precisely because a counter is not idempotent per placement. Group B's `city_placement`
   table adopts that key as its primary key. If #288 lands, the server schema inherits a
   settled idempotency story; if it does not, Group B has to invent one and will invent the
   same one.
2. **#288 already found the colon-delimiter defect in that key**
   (`civic:<type>:<sequence>` fed whole to `buildEventId`, which rejects a `:` inside a
   part — all four era-one types threw). Any server-side `build:<placement_id>` event id
   inherits that constraint. Group B's migration comment should name it.
3. **Neither PR is blocked by this work, and this work is not blocked by them.** The schema
   in §6.3 can be authored, reviewed and migrated against integration today; #273/#288 are
   the *game-side consumers* of Group B and D. The one hard dependency runs the other way:
   #288 cannot land until #273 does, because ten of its files are #273's.
4. **One thing this plan should NOT wait for.** #273 is 199 files. Sequencing the schema
   behind it would put the foundation behind the largest open PR in the repo. Author the
   schema against integration.

---

## 9. The plan, re-derived under the sign-in ruling

Ordered so each step is independently landable and nothing is half-migrated in between.
Parallel capacity is agents, so lanes that share no files are marked as concurrent.

### 9.1 The floor — and it is not the one that was expected

**The expectation put to me, to test rather than accept:** *"the grant plus the write side
for mastery is the true floor, because a learner who cannot accumulate mastery has no game
at all, while roads or crisis damage failing to persist is merely bad."*

The second half is right. **The first half is one item short, and the missing item sits
upstream of the one named.** Walking the loop a learner actually performs, on what is now
the only path:

| Step | What happens today | Blocked by |
|---|---|---|
| Sign in | Works | — |
| Land on the city | Six nodes at mastery 0, all `locked`; **no hall, no placements** | — |
| Open a lesson from the roster | **0 of 6 open** | nothing is placed |
| Place a building from the Build menu | Write **refused** — the ghost targets the hall's own cell | the read carries no `town_hall` |
| Earn mastery | **Unreachable — there is no lesson to earn it in** | the two rows above |
| Persist that mastery | Nothing to persist | — |

Measured, not argued. Driving the real server read into the real surface:

```
SKILLS ON THE ROSTER: 6
LESSONS A LEARNER CAN OPEN: 0
SKILLS OFFERING A PLACE ACTION: 0
MASTERY VALUES FROM THE SERVER: [0,0,0,0,0,0]
COMPLETION FROM THE SERVER: ["locked","locked","locked","locked","locked","locked"]
```

`openLessonPopup` returns early for an unplaced skill, and §4 shows placement itself is
refused. So **the mastery write path is a write path for evidence a learner has no way to
generate.** Ship the grant on its own and nothing observable changes: the number that was
frozen at zero is now writable and still nobody can move it.

> **THE FLOOR: the read model must carry the hall and the placements, the server must be
> able to store them, and mastery must be writable — in that order.** Layout is upstream
> of mastery, because a lesson is reachable only through a placed building.

### 9.2 Tier 1 — without this, nobody can play

Five items. This is the number for the two-week call.

| # | Item | Why it is in the floor |
|---|---|---|
| **T1** | **Schema** — Group A grants + Group B layout tables (§6.3) | Everything below needs somewhere to go. Nothing else in Tier 1 can start |
| **T2** | **`CityRead` carries `town_hall` + `placements`** | Without the hall, occupancy is computed from a payload that does not have it, so placement targets the hall's own cell and is refused (§4). This is what unblocks the very first thing a learner does |
| **T3** | **Layout write path** | Makes the placement stick. T2 without T3 is a read of an empty table |
| **T4** | **Mastery + lesson-stage write path** — the grant plus the mastery-service call | Makes progress real. Necessary, and not sufficient without T2/T3 |
| **T5** | **The auth-gate fix** (§5) | A **sequencing** prerequisite rather than a symptom. Its cost is zero if it lands first and "the entire economy lane silently does nothing for 100% of users" if it lands late |

T1 and T5 share no files and run concurrently. T2 and T3 follow T1. T4 follows T1 and is
concurrent with T2/T3.

### 9.3 The sixth item, and the one question that decides it

**T6 — ledger persistence + the stored era + the four era repoints, as one change (§3.5).**

This is in the floor **if and only if the demo crosses an era boundary**:

- **Inside era one:** the wallet still empties on reload, which is bad but playable. A
  learner completes lessons, buildings rise, mastery accumulates. The city-building half is
  degraded, not dead.
- **Past era one:** the economy is pinned to era one by four static reads while the city
  advances, so the learner earns `stone` and the catalogue refuses them `wrong_era`. Their
  own buildings become unbuyable. Not playable.

**This is the only thing standing between a five-item floor and a six-item one, and it is a
scoping question for the lead rather than a technical unknown.** Worth asking directly.

### 9.4 Tier 2 — without this, the game is worse

None of these blocks play. Ordered by how much they hurt.

| Item | What breaks without it | Note |
|---|---|---|
| **Ledger persistence** (if the demo stays in era one) | The wallet empties on reload; purchases vanish and material is refunded. Defect #96's loop | Highest-value Tier 2 item by some distance |
| **Roads + `road_gold_spent`** | Roads do not survive a reload | **Must persist together or neither** — see the correction below |
| **Crisis damage** | A crisis cannot outlive a sitting | With the crisis count capped at three this may be acceptable. It is a product answer |
| **Checkpoint write** | The storm never records as cleared | Genuinely Tier 2: `eraState.ts:31-36` is explicit that era advance consults no checkpoint, so nothing downstream is gated on it |
| **`equipped_cosmetic`** | A learner's chosen skin does not follow them | The one genuinely free deferral |
| **Era-trial ceremony beats** | A part-finished ceremony is not kept across a device | Already the ratified position; OT-13 is open |
| **Coach marks, onboarding, audio** | Nothing | Device preferences, not civilization state. Defer indefinitely |

#### Correction: roads are not coupled to the ledger

**The first version of this record said roads "cannot cleanly defer" because "persisting
the ledger without them refunds every road for free." That is wrong, and the correction
moves roads out of the floor.**

A road spend is **never a ledger row**. `roadsEconomy.ts:67-72` is explicit — *"`materials`
is the RAW per-material projection and forwards untouched — it is the ledger's own read,
and the road spend is not in the ledger. The netting happens on `spendable`."* So the
ledger and the road counter are independent: persisting one neither fixes nor breaks the
other.

The real coupling is narrower and much easier to honour: **roads and `road_gold_spent` are
one unit.** Persist one without the other and you get free roads, or material taken for
roads that are not there. The browser store already honours this — both live in the same
`CityDevSnapshot` — and the server schema must too (`city_road` and
`city_state.road_gold_spent` in the same change).

**The underlying debt is real and stays Tier 2.** Roads remain the last sink netted through
a client-side decorator rather than the ledger, the shape #288 moved civic buildings off,
and `roadsEconomy.ts:47-53` says so in as many words. Under a *server* economy that gets
worse than it is today: the server reports an authoritative balance and a client decorator
silently reduces it, so no server-side audit can reconcile the two. The fix is the
repeatable `spendMaterial({ amount, reason })` primitive `roadsEconomy.ts:42-45` already
names as the recommended follow-up. **After the floor, not in it.**

### 9.5 The waves

**Wave 0 — must land before anything else is safe**

These two share no files and can run **concurrently**. Nothing downstream is safe until
both are in.

**A. The auth-gate fix, with a guard that can fail** *(T5, `apps/web`)*
- `App.tsx` stops passing `authedCity !== null`. The client asks `isEconomyServerBacked(true)`
  — the strongest auth state — so the answer is synchronous and stable from the first frame,
  exactly as `isDevPersistenceEnabled` does.
- Correct the `App.tsx:373-375` comment, which currently points the next author at the wrong
  gate.
- **The test is the deliverable, not the edit.** `createEconomyClient` has zero call sites
  in any test; a fix with no caller is unguarded. The guard must call the real composition
  root under a signed-in env and assert which adapter came back. It must be shown red first
  — the reproduction in §5.1 is that test, and it prints `[false]` today.
- **Do this one first regardless of everything else.** It is a few lines, it is the only
  Tier 1 item with no dependencies, and its cost grows from nothing to "the whole economy
  lane silently does nothing" the moment an adapter lands ahead of it.

**B. The schema** *(T1, `db/migrations/`, Gabe's lane)*
- Group A grants; Groups B, C, D, E tables.
- Land it as **one migration** or as `0004`-`0007` split by group — but land the *whole*
  set before any writer, so no writer ships against a table that is still moving.
- Blocking sub-item: the §6.2 amendment to Contracts §8 (multi-resource ledger key; no
  `resource_wallet`/`owned_cosmetic`/`cosmetic_catalog`). Owner-gated, and it is Gabe's own
  lane, so it is a documentation step rather than a coordination one.
- **Before this lands:** the read-only row-count check in §7, so the "no data migration"
  claim is measured rather than assumed.

**Wave 1 — the read model, and the sign-in wall**

**C. Grow `CityRead` to carry the layout** *(T2, `services/diagnostic-api`, Gabe)*
Add `town_hall`, `placements`, `roads`, `road_gold_spent`, `crisis_damage` to the read.
This is the TODO's own obligation and `Post_MVP_Backlog.md:49`'s. `CitySurface` needs **no
change at all** — it already reads all five off `load`, which is why this stays inside the
read-model lane and out of Evan's. **`town_hall` is the load-bearing field**: it is what
stops placement targeting the hall's own cell (§4), so it is the single highest-value line
in the whole plan.

**D. The sign-in wall, and the dev/demo gates that go with it** *(`apps/web`)*
The ruling's own implementation, plus the three gate decisions in §11 and the demo answer
in §12. **It has to land with the dev-control re-key in §11.3**, or the entire Developer
stand-in panel disappears for the team on the day the wall ships.

C and D are concurrent.

**Wave 2 — the writers**

**E. Layout writes** *(T3)* — placements and the town hall. Closes the §4 defect and, with
C, removes the cause of the "chose the hall's own cell" refusal, because occupancy will
finally be computed from the same state the write targets. **Roads ride here or in Wave 3,
but `city_road` and `road_gold_spent` travel together either way** (§9.4).

**F. Mastery + lesson-stage writes** *(T4)*. Flows through Anthony's mastery service per
Contracts §3; Gabe owns the table and the grant.

E and F are concurrent and both follow B. **Neither is worth much without the other**: E
without F gives a city you can build whose buildings never progress, F without E gives a
mastery column nothing can move.

**G. Ledger + era, as one change** *(T6 — floor or not per §9.3)*. The economy service
behind Wave 0A's gate, the stored era, and the four era repoints of §3.5. **Not
separable.**

**Wave 3 — Tier 2, in the order of §9.4**

**H. Roads + `road_gold_spent`** — together, per the correction above.
**I. Crisis damage.** Follows G (a repair is a ledger spend keyed by `damage_id`), never
precedes it. Derive the mint server-side rather than porting it (§6.3 Group C).
**J. Checkpoint write.** One flag; `engines/game` remains the only writer.
**K. `equipped_cosmetic`.** The one genuinely free deferral — ownership and prestige both
derive and come along with G at no cost, so the deferrable surface is one table, not the
cosmetics feature.

---

## 10. RESOLVED — the product question, and the workstream it deletes

> **The question, as it was put:** *"A learner has been playing in their browser and then
> signs in for the first time. What happens to the city they already built?"*
>
> **The ruling, 2026-07-31 (team lead): sign-in is required before play.** He took the
> fourth option — the one that dissolves the question rather than answering it.

### 10.1 Why the question existed, kept as the record

The three answers on the table all cost something, which is why it went to the lead rather
than to whoever wrote the migration:

| Option | Cost |
|---|---|
| **Discard** — signing in starts fresh | Defensible, safe on integrity, and it takes a real learner's work away |
| **Import layout and era only** — never the ledger or mastery | Middle cost; imports nothing forgeable. Was the recommendation |
| **Import everything** | Best experience; accepts hand-editable ledger rows into an authoritative store. Not recommended |

The ledger was the sharp part. `economyPersistence.ts:56` is explicit that the browser
store *"is emphatically NOT a security boundary"* — a player can hand-edit it — so any
import path had to draw a line between what may cross and what may not, and then defend
that line. Requiring sign-in means the line never has to be drawn.

### 10.2 What is DELETED, not deferred

**A learner never has a browser city, so there is nothing to reconcile.** None of the
following will be built, and none of it should reappear in a backlog:

- No **adopt** path, and no importer of any kind — layout, era, ledger or mastery.
- No **discard-with-warning** dialogue, because there is nothing to warn about.
- No **choice at sign-in**, and so no UI, no copy, and no accessibility surface for one.
- No **conflict rules** — no "browser city vs account city" merge, no last-write-wins,
  no per-field precedence table.
- No **one-time migration window**, and no dated cut-off to communicate.

This is recorded rather than quietly removed because the reasoning is the valuable part: a
future reader who finds sign-in relaxed will need to know that this workstream was cut by a
*product* decision and comes back with it, not that it was forgotten.

### 10.3 What survives the ruling

**The local browser path stays** — see §11, which is now an obligation rather than a
recommendation. What changes is what it is *for*. It stops being "what a learner gets
before they sign in" and becomes "how the team runs the app without a backend". Two
consequences:

- The docs should stop calling it a fallback. `devSession.ts`'s own framing ("INERT UNDER
  REAL AUTH") is already right and needs no edit; it is the surrounding prose and the
  mental model that need to catch up.
- **`isDevPersistenceEnabled` needs no change at all.** It asks
  `!isServerBacked(true)` — i.e. "is an API endpoint configured" — which is exactly the
  right axis under the ruling and gives the right answer on both sides already. §11.1.

---

## 11. The dev path must survive, and must not ship

Every QA session, every screenshot, the whole era-two authoring loop and today's crisis
work run on the `localStorage` path. **Requiring sign-in for players must not mean
requiring sign-in for the team.** This is three separate gate decisions, not one, and only
one of them is new work. The repo already has every mechanism needed; nothing below invents
one.

### 11.0 The two gate classes already in the tree, and which is which

They are not interchangeable, and picking the wrong one is how a hatch ships.

| Mechanism | What it keys on | Reachable in a production build? |
|---|---|---|
| `import.meta.env.DEV` | Build mode. **Vite replaces it statically**, so a production bundle contains the literal `false` | **No — provably.** The branch is not in the artifact |
| `isServerBacked(true)` / `apiBaseUrl() !== null` | Deployment shape: is an API endpoint configured | Yes, but it is *false* wherever there is no backend |
| A bare query param (`?dev`, `?three`, `?graph`, `?winter`) | The URL | **Yes.** Anyone can type it |

`audioPrefs.ts:119-122` already made this call and wrote down the reasoning: it chose
`import.meta.env.DEV` and explicitly **rejected** `?dev` and the dev city session because
they are *"reachable in a production deployment, which would make this a feature"*. So
**`?winter` is the wrong precedent for anything that must not ship** — it is a route flag,
not a guard. Only `?mock` pairs a query param with `import.meta.env.DEV`, and that pairing
is the pattern to copy when a hatch needs both ergonomics and a hard floor.

### 11.1 The persistence gate — no change needed

`isDevPersistenceEnabled()` is `!isServerBacked(true)`, i.e. `apiBaseUrl() === null`. Under
the ruling that already gives the right answer on both sides, and it was measured:

- **Locally / in CI** there is no `VITE_DIAGNOSTIC_API_URL`, so dev persistence is **on**
  and the team keeps exactly the loop it has today.
- **In production** the URL is set, so it is **off** — measured in §5.2 as
  `isDevPersistenceEnabled(): false` with the env configured.

`devSession.ts:144-155` argues for asking the *strongest* auth state precisely so the
answer is synchronous from the first frame and *"wrong only in the safe direction"*. The
ruling does not disturb that reasoning; it vindicates it. **Do not touch this gate.**

### 11.2 The sign-in wall — must key on the same predicate

**The wall must be conditional on `apiBaseUrl() !== null`, not unconditional.** If it is
unconditional:

- a developer running `npm run dev` with no Cognito configured hits a wall they cannot
  pass, and the local loop dies outright;
- every test that mounts `App` hits it too.

Keying the wall on the deployment shape gives: production (API URL set) → wall; local and
CI (no URL) → no wall, dev session, today's behaviour exactly. This is the *same* axis the
persistence layer already uses, which is the point — `devSession.ts:145-146` says the
module *"deliberately has no second notion of environment"*, and a wall on a different
predicate would be that second notion. **This is the only genuinely new gate in this
section.**

### 11.3 ~~⚑ The dev-control gate — a live collision that must be fixed in the same change~~ RESOLVED 2026-08-01

> **RESOLVED by `#373` (Wave 2 E), and the analysis below is kept unedited as the record of
> why.** The three props no longer key on `authedCity`; they key on
> `isDevPersistenceEnabled()`, exactly as the fix paragraph prescribes. Read everything under
> this heading in the past tense: it describes `e53bf9cd` and no later tip. Two things
> discharged with it, both owed by this section by name:
>
> - **`CrisisSeedControl.tsx`'s docblock is corrected**, so the sentence quoted below no
>   longer appears in the tree. The "true today and false the day the wall ships" hazard is
>   closed rather than carried.
> - **The re-key is guarded, both ways.** `apps/web/src/city/devControlsAreNotAuthGated.test.tsx`
>   renders the panel with the props and without them (so withholding them is provably an
>   outage and not a cosmetic change), reads the population of dev props off
>   `CitySurfaceProps` rather than a written-down list, requires all of them to share one
>   predicate, and sweeps the web lane's own prose so no comment can start describing the gate
>   as auth-keyed again.
>
> The sign-in wall itself (§11.2) is still unbuilt, which is what made this safe to land
> early: the re-key is correct before the wall and correct after it.

`App.tsx:646-648` withholds the dev stand-ins from a signed-in user:

```tsx
onDevAdvanceMastery={authedCity ? undefined : session.advanceMasteryDev}
onDevLessonTaught={authedCity ? undefined : session.markLessonTaught}
onDevSetStage={authedCity ? undefined : session.setStageDev}
```

**Under the ruling `authedCity` is always non-null, so this withholds them from
everyone — including us.** And the whole Developer stand-in panel hangs off those three
props: `CitySurface.tsx:2235` builds `crisisSeedPlan` only when
`onPlaceSkill && onDevAdvanceMastery`, and the panel renders only when
`onSeedCrisis && crisisSeedPlan`.

Measured, by rendering the real surface both ways:

```
SIGNED-OUT  devtools panel present: true
SIGNED-OUT  crisis seed control present: true
SIGNED-IN   devtools panel present: false
SIGNED-IN   crisis seed control present: false
```

**There is a live consumer.** `CrisisSeedControl` is the dev-only control being built right
now, and its own docblock states its gate as a fact about signed-in *students*
(`CrisisSeedControl.tsx:12-13`: *"rendered exactly when the mastery stand-ins are, which
`App.tsx` withholds from a signed-in student"*). That sentence is true today and **false
the day the wall ships** — it will withhold from everyone. Whoever lands the wall owes that
correction along with the re-key.

> Corrected in `#373`, and it was not the only one. A sweep for the same staleness found
> **two more** live comments describing the dev gate as auth-keyed —
> `winter/WinterEntryChip.tsx` (which cited the panel's auth gate as the counter-example for
> its own choice of gate, so the re-key turns that foil into a precedent) and
> `winter/winterDevSkipIsGated.test.tsx`. Both fixed. The lesson for the next section like
> this one: a comment naming a gate is a copy of that gate, and there is usually more than
> one, so derive the set rather than fixing the instance somebody noticed.

**The fix: re-key those three props to the deployment-shape predicate, not to auth.** The
intent behind `authedCity ? undefined : ...` was always "don't show stand-ins to a real
learner"; auth was a serviceable proxy for that while anonymous play existed, and it stops
being one under the ruling. Asking `isDevPersistenceEnabled()` — or the same
`!isServerBacked(true)` directly — preserves the intent exactly: production withholds,
local shows. It also puts the dev controls on the same predicate as the dev persistence
they drive, which is the coherence `devSession.ts` asks for.

**A note for whoever writes it:** `CrisisSeedControl.tsx:14-16` observes there is *"no
production build split to hide behind here"*, which is why the panel is marked loudly
rather than compiled out. That remains true and remains the right call — the re-key keeps
the panel out of production by deployment shape, and the loud marking stays as the second
layer.

---

## 12. The demo needs an answer

If sign-in is required, a demo needs either a real account or a bypass. Naming it now
because it is small and becomes embarrassing at the worst possible moment.

### 12.1 Every bypass variant is worse than it looks

| Bypass | Why it fails |
|---|---|
| Gated on `import.meta.env.DEV` | **Cannot be used at the demo.** A production build contains the literal `false`, so the bypass is not in the artifact. A bypass that is safe is one that does not work |
| A bare query param (`?demo`) | **Works at the demo and ships to users.** It is a published URL with no wall behind it, and `audioPrefs.ts` already rejected this class for exactly that reason |
| A separate demo build behind its own `VITE_` flag | Works and is safe, but the demo then exercises **an artifact nobody ships**, which is the one thing a demo is supposed to rule out |

The first two are the dilemma: **a bypass that is safe does not work at the demo, and one
that works at the demo ships to users.** The third escapes it only by demoing something
other than the product.

### 12.2 Recommendation: a real seeded account

Seed one or more demo accounts against the real schema and drive the demo through the real
sign-in.

- **It exercises the path that ships.** If the demo works, the product works — which is
  what a demo is for.
- **It is a forcing function in the right direction.** An account cannot be seeded until
  the schema and the Tier 1 write paths are real, so the work it depends on is work that
  was in the floor anyway. Nothing is built twice.
- **The runner already exists.** `db/apply.mjs` is a Data API script that bootstraps a role
  and applies ordered SQL without a VPC or `psql`; a seed script is the same shape.
- **Cost:** one script, plus a Cognito user created the way `docs/Deployment.md` §4 already
  documents for smoke tests.

**Two things to decide with it**, neither hard:

1. **Reset between runs.** A shared demo account mutates as it is played. Seed fresh per
   demo, or give the seed script an idempotent reset. The `?reset` hatch is the existing
   precedent for the intent, though it is a browser-store mechanism and the server one
   would be its own.
2. **How much history to seed.** A brand-new account demos the empty-island opening; a
   part-built one demos the city. Probably both, as two accounts — it costs one extra row
   set and removes a live decision from the demo itself.

**The contingency, stated so it is a decision and not a scramble:** if Tier 1 slips and
there is no schema to seed against, the fallback is the separate demo build from the table
above — knowingly demoing a non-shipping artifact. That is a real cost and it should be
taken deliberately, not discovered on the day.
