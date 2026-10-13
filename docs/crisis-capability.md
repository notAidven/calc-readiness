# Crisis capability hold

Crises are temporarily held out of ordinary account play. Their engines, renderers, state
schemas, persistence tables, and explicit review fixtures remain in the repository.

## Census at the hold boundary

The implemented population is derived independently in
`apps/web/src/crisisOrdinaryIsolation.test.tsx` from the four `*EntryChip.tsx` query-parameter
exports, with a floor of four, and compared with `CRISIS_PREVIEW_ROUTES`:

| Crisis | Trigger / entry | Runtime and durable effects |
| --- | --- | --- |
| Hard Winter (`winter`, Prehistoric) | `midEraCrisisCall` at `ceil(era nodes / 2)`; crisis call advisor; dev/demo `?winter`; dev menu chip | `HardWinterSurface` reducer and active-crisis music; temporarily blocks city controls while mounted; optional carry-back folds ruined buildings/cells into `CityDevSession.crisis_damage`; repairs spend era material |
| Succession (`succession`, Classical) | Same midpoint watcher; ordinary Classical menu chip; `?succession`; settled-battle resume/history load | `/api/succession` or `cr.succession.v1`; commands persist exact battle/revision; a settled exit can fold civic suspensions into city damage, reducing civic capacity until paid |
| Plague / Care House (`plague`, Renaissance) | Same midpoint watcher; dev/demo `?plague`; dev menu chip | `/api/plague` or `cr.plague-care-house.v*`; start and reducer events persist exact in-progress state; the in-city mount blocks ordinary city controls but emits no durable city-damage report |
| Intrusion (`intrusion`, Information Age) | Same midpoint watcher; dev/demo `?intrusion`; dev menu fixture and live-city chip when a Relay exists | In-memory encounter; final exit can fold an overwritten Relay record into city damage; one verification mutates that record; no separate crisis API |

### Automatic scheduling and progression hooks

- `engines/game/src/mid-era-crisis.ts` computes every era threshold from authored node counts.
- `apps/web/src/city/crisisCall.ts` watches the false-to-true mastery crossing, opens the
  advisor, plays `crisis-call`, and writes the assertive announcement. It resets per era and
  does not persist its answered latch.
- `CitySurface` feeds refreshed `node_states` to that hook after lesson/practice progression.
  It dispatches the earned call to Winter, Succession, Plague, or Intrusion by the live era.
- A city loaded already beyond the threshold does not announce; before this hold, its menu
  remained an alternate entry.
- `activeCrisis.ts` publishes mounted crisis identity to the soundtrack. It is declaration
  only and is intentionally not persisted.

### Economy, city, and progress side effects

- Crisis question reducers do not write mastery or lesson stages.
- Mounted crises make `crisisHasTheIsland` true. That disables build, placement, lesson,
  interleaved-practice, checkpoint, Bay/activity, and other city doors until exit.
- `recordCrisisDamage` is the only city-damage ingress. It folds a report without deleting
  placements or lowering mastery.
- Standing damage changes ordinary play even when no crisis is mounted: ruined cells block
  placement/roads, suspended civic buildings withhold capacity, scars and repair UI render,
  damage-derived achievements can be earned, and record verification is offered.
- `repairCrisisDamage` calls the economy `repairRuin` sink before clearing building, ground, or
  civic damage. Record verification changes city damage without spending material.
- Succession can persist civic suspension; Winter can persist building/ground ruin; Intrusion
  can persist an overwritten record; Plague currently produces no city damage.

### Alerts and advisor calls

- `CrisisCallAdvisor` and `CrisisCallNotice` are the automatic and menu-entry dialogue.
- `announcements.crisisCallMessage` writes the assertive live region.
- `playSfx("crisis-call")`, active-crisis music, per-action SFX, and crisis-specific advisor
  dress are all downstream of a call or mounted surface.
- Repair/recovery announcements and crisis-derived achievement notes are downstream of
  standing city damage.

### Routes, menus, and navigation

- `CRISIS_PREVIEW_ROUTES` owns `winter`, `succession`, `plague`, and `intrusion`.
- Exact `/demo` consumes that registry for the already-sent showcase URLs.
- Local development consumes the explicit query routes as review fixtures.
- `CitySurface`'s Other places menu mounts the four EntryChip implementations. Most were
  development-only already; Succession's `unlocked` form was an ordinary production door.
- `?succession` also bypassed the title screen and auto-opened the in-city briefing in ordinary
  account composition. Page fixtures were already restricted to demo/development.
- Presenter suppresses automatic calls and builds disposable sessions; this hold does not
  change Presenter or its routes.

### Persistence, resume, and API calls

- City damage is in `CityLoad.crisis_damage`, every archipelago island snapshot, the dev
  session `cr.devSession.v6.*`, `POST /api/city`, and `city_crisis_damage`.
- `CitySurface` reads damage on every initial load and refresh. Before this hold that alone
  could suppress capacity, block cells, show repairs, and award crisis records.
- Succession loads and commands `/api/succession` for account play or `cr.succession.v1`
  locally. `CitySurface` also loaded settled Succession state for aftermath/history when the
  encounter was not mounted.
- Plague loads and commands `/api/plague` for account play or
  `cr.plague-care-house.v<state-version>.<user>` locally.
- Hard Winter's standalone review route can write the dev city snapshot only after the
  explicit carry-back action. Intrusion and Winter otherwise keep encounter state in memory.
- Server routes and tables remain intact. The ordinary frontend capability prevents creating
  crisis API sessions or calling those routes while held; direct authenticated service
  contracts remain available for controlled testing and later restoration.

### Existing tests

The crisis-specific unit/browser suites cover trigger arithmetic and entry sequencing,
advisor/menu dispatch, each reducer and question pool, in-city rendering, damage carry-back,
repair spending, persistence, API command services, route reachability, active music, and demo
fixtures. The hold adds a separate behavior-level sweep across the independently derived
four-crisis population: fresh ordinary entry, threshold progression, stale city damage,
stale resumable sessions, refresh, direct ordinary query routes, and exact-demo isolation.

## Canonical gate and re-enable mechanism

`apps/web/src/crisisCapability.ts` is the one product capability decision. Ordinary account
play is fail-closed unless the build sets:

```text
VITE_CRISIS_CAPABILITY=enabled
```

The comparison is exact; missing, empty, or any other value is OFF. `App` resolves the
capability once and passes it down. The same decision controls automatic calls, ordinary
navigation/direct routes, crisis-session construction/API access, damage ingress/repair
callbacks, and whether persisted damage is projected into the ordinary city.

Exact `/demo` and its explicit crisis fixture URLs retain their pre-hold behavior independently
of the ordinary account default. Local development retains explicit crisis query fixtures as
an intentional review opt-in. Presenter keeps its existing suppression and disposable state.

To restore crises for ordinary users, set `VITE_CRISIS_CAPABILITY=enabled` in the intended
frontend build and run the isolation, crisis, demo, typecheck, and build suites before release.
No source edit or distributed set of booleans is required.

## Stale-user cleanup and migration behavior

The hold is non-destructive:

- Ordinary city loads project `crisis_damage` as `NO_CRISIS_DAMAGE` before any render-derived
  capacity, occupancy, achievement, repair, or navigation decision. The stored rows/blob and
  monotone damage mint are not rewritten.
- Ordinary composition does not create Succession or Plague sessions, so it neither loads nor
  resumes stale active encounters and makes no `/succession` or `/plague` request.
- Refresh repeats the same projection and cannot revive a stale encounter.
- Normal learning, city, economy, and island writes continue. They carry no new crisis report
  and cannot spend on a hidden repair.
- Re-enabling the single capability exposes the retained state again under the existing
  version validators. Invalid local envelopes continue to be discarded by their existing
  parsers; valid state is intentionally preserved rather than silently deleting a learner's
  record during a temporary hold.
