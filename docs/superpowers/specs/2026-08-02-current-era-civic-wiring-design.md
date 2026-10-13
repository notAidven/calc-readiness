# Current-Era Civic Wiring Design

**Status:** Implemented, 2026-08-03
**Design baseline inspected:** `evan/city-population-happiness@ae052f54`
**Implementation baseline:** `origin/integration@238a6ded`
**Implementation state:** Runtime, tests, authenticated persistence, migration, exporter, and
one existing production GLB are included. The asset clauses below were updated after review
found that the Terraced Fields had to be recomposed to satisfy its frozen 1x2 footprint.

## 1. Goal

Make civic buildings selectable, purchasable, placeable, restorable, movable, rendered, and counted in the era the city is currently wearing whenever that era has a complete bundled built-model set.

At the current tree this means:

- Prehistoric: four current-era civic buildings.
- Neolithic: four current-era civic buildings.
- Bronze Age: four current-era civic buildings.

An implementation is complete only when all of the following hold:

1. The Civic tab shows exactly the current era's four catalogue rows and no earlier or later era's rows.
2. Every shown row has a bundled built GLB and every bundled current-era row is shown.
3. Selecting a row produces the correct built thumbnail and built placement ghost.
4. A legal, paid purchase produces one persisted civic placement with the correct model, footprint, label, role, and vitality contribution.
5. The same placement restores through dev persistence and the authenticated city API, remains movable, and remains a bought non-skill building.
6. Wrong-era, unaffordable, unavailable, and spatially invalid attempts place nothing and debit nothing.
7. Era 1's current behavior and authored values remain unchanged.
8. No civic site or construction lifecycle is introduced.

## 2. Current state and root problem

The art registry is already wider than the gameplay path:

- `apps/web/src/city/civicBuildings.ts` resolves built models for civic rows in Eras 1, 2, and 3.
- The four Bronze Age built civic GLBs and the built Council Hall GLB are bundled and parse as non-empty glTF scenes.
- `scripts/export-era3-building-models.mjs` can reproduce all source-authored stages.

The purchasing path remains Era-1-specific:

- `CitySurface.tsx` renders `CIVIC_TYPE_IDS`, which is Era 1's four short type ids.
- `civic.ts`, `worldLayout.ts`, and `citySession.ts` accept or parse only `EraOneCivicTypeId`.
- `citizens.ts`, `engines/game/src/citizens.ts`, and `engines/game/src/city-vitality.ts` look civic data up through `ERA_ONE_CIVIC_TYPES`.
- `App.tsx` reads civic material and labels through `CURRENT_ERA_ID`.
- API city reads discard `kind = 'civic'` rows and API city writes have no civic collection.

Consequently, a Bronze Age civic row can resolve a built GLB in isolation but cannot enter the live placement state. A hand-injected Bronze Age civic placement is rejected by the parser, dropped on restore, assigned no catalogue footprint, and never reaches its model.

## 3. Product decisions

### 3.1 Current-era and capability-derived

The Civic tab is era-exclusive. Its population is:

1. `civicCatalogueForEra(eraId)`;
2. mapped through the civic catalogue-to-model identity adapter;
3. accepted only when every row in that era resolves a bundled `built` GLB.

Define an era as civic-model-backed only when:

- its catalogue has the authored four-row population;
- every row maps to exactly one runtime civic type;
- every mapped type resolves `kind: "glb"` with a non-empty built URL; and
- the four built URLs are distinct.

The menu must never silently shrink an era from four rows to three. A partially modelled era is unavailable as a whole and shows the existing empty-state treatment with explicit copy that this age's civic buildings are not available yet.

The model-backed era population is derived by filtering `ERA_SEQUENCE` through this predicate. It is not a written allowlist. At this tree it must include, in order:

- `prehistoric`
- `neolithic`
- `bronze_age`

When a later era gains all four built models, it joins automatically. Its tests must still require a deliberate acknowledgement that the derived population grew.

There is no cumulative civic rail. Earlier civic buildings remain standing, clickable, and movable after an advance, but their cards are not offered outside their purchase era. There is no Bronze-Age-only branch.

### 3.2 Built-only purchased buildings

A purchased civic building has one runtime model state: `built`.

- Build-menu thumbnail: built model.
- Placement ghost: built model.
- Confirmed placement: built model.
- Dev snapshot and API persistence: no stage field.
- Restored scene: built model.
- Move ghost: the same built model.

`resolveCivicModel(type, "site")` and `resolveCivicModel(type, "construction")` retain their procedural fail-closed descriptors unchanged, but no product call site requests them.

No civic `site` or `construction` GLBs are added to production assets.

### 3.3 Council Hall

The Bronze Age Council Hall remains a built-only era model:

- `resolveEraTownHall("bronze_age", ...)` resolves `townhall-bronze-age-built.glb`.
- Resting city state always requests `built`.
- The era ceremony's temporary scaffold continues to use the existing shared Era-1 Town Hall `construction` model.
- The ceremony never requests a Bronze Age Council Hall site or construction model.
- The existing Town Hall `site` path remains outside this feature.

No Town Hall stage vocabulary or ceremony behavior changes.

## 4. Preserved invariants

The implementation changes addressing and routing, not game design.

The following remain byte-for-byte or value-for-value unchanged:

- Catalogue ids and display names.
- Existing Era 1 short model keys and already-stored `civic:<type>:<sequence>` placement ids.
- Existing civic GLB basenames.
- Prices, materials, roles, contributions, and footprints.
- Duplicate purchases: the same type remains purchasable as many times as land and material allow.
- The shared bounds, overlap, road-cell, and walkable-reachability placement rules.
- Civic movement: no second charge, no refund, no contribution change.
- Civic buildings have no lesson, CFU, practice set, prerequisite, mastery, construction progress, or mastery stars.
- A civic purchase changes no `student_node_state`, learning gate, prerequisite state, trial state, or era-progression state.
- Population remains a function of learning state. Civic contributions affect vitality readouts and civic social role only.
- Era 1's free Smokehouse contribution remains exactly as it is today.
- Existing Era 1 civic behavior, copy, popup behavior, and movement.

Bronze Age values remain:

- The Terraced Fields: `bronze_age_terraced_fields`, food role, 1x2, 260 bronze, 80 livability and 0 happiness.
- The Walled Houses: `bronze_age_walled_houses`, dwelling role, 2x2, 340 bronze, 80 livability and 20 happiness.
- The Steam House: `bronze_age_bathhouse`, amenity role, 3x2, 460 bronze, 0 livability and 80 happiness.
- The Trading Post: `bronze_age_weigh_house`, blend role, 1x1, 520 bronze, 40 livability and 40 happiness.

For citizen presentation, `dwelling` maps to `residence`; `food`, `amenity`, and `blend` map to `civic`. No purchased civic row maps to `school`. This reproduces Era 1's existing role assignments.

### 4.1 Terraced Fields

The gameplay footprint remains 1x2.

The delivered source describes a 3x2 subject. Quarter-turning the original composition
produced an approximately `30 x 34` ground extent; under the real uniform contain-fit that
filled only 53.8% of the frozen plot's long axis.

`scripts/export-era3-building-models.mjs` now repeats the complete authored terrace
composition twice along that axis after the quarter-turn. Terrain, retaining walls,
irrigation, crop rows, and props are cloned together, producing an approximately `30 x 64`
subject without stretching any child. The committed
`civic-bronze-age-terraced-fields-built.glb` is regenerated from that composition. The
reproducible, uncommitted site and construction outputs receive matching digest updates.

The catalogue footprint and runtime uniform contain-fit remain unchanged.
`terracedFieldsFit.test.ts` parses the committed GLB's actual scene transforms and accessor
bounds, rejects the former 53.8% fill, and requires at least 85% fill on both plot axes
without spill or non-uniform scale. Visual acceptance still requires the rendered frame;
dimensions alone do not prove spatial fit.

## 5. Civic identity seam

One adapter owns the relationship between four identities:

1. Catalogue identity: `CivicBuildingDefinition.id`.
2. Runtime model type: the art key accepted by `resolveCivicModel`.
3. Placement identity: the unique instance id used by grid, movement, scene groups, crisis suspension, and ledger idempotence.
4. Display name: presentation only, never a persisted key.

### 5.1 Catalogue and model type

Add total helpers beside the existing civic identity code:

- `civicCatalogueRow(id)`: canonical catalogue id or legacy Era 1 model key to one catalogue row or `null`.
- `civicModelTypeFor(row)`: catalogue row to one runtime model type or `null`.
- `civicOptionsForEra(eraId)`: the complete four-row, built-model-backed menu population, each entry shaped as `{ row, modelType, builtModel }`.

Rules:

- Era 2 and Era 3 use their catalogue ids directly as model types.
- Era 1 retains its four existing short model types and filenames.
- Era 1's mapping is the existing name-based bijection between `ERA_ONE_CIVIC_TYPES` and the Prehistoric catalogue rows. This is necessary because `water_spring` maps to stable catalogue id `prehistoric_storage_pit`.
- Ambiguous or missing mappings return `null`; they are never guessed.
- Tests assert both directions, distinctness, a four-row floor per backed era, and equality of name, cost, footprint, and both contributions across the Era 1 bridge.

`CivicBuildCard`, placement state, and `onPlaceCivic` consume the canonical catalogue id/row. Only thumbnail, ghost, and scene model resolution consume `modelType`. No UI or purchase callback accepts `EraOneCivicTypeId` after this seam.

### 5.2 Placement ids and event ids

Existing placement ids remain valid. New placements retain the current structured shape but put the canonical catalogue id in the type segment:

`civic:<catalogue-id>:<sequence>`

The parser accepts:

- Era 1's existing short type segment as a legacy form.
- Canonical catalogue-id type segments for every new Era 1, Era 2, and Era 3 placement.
- A non-negative integer sequence.

It rejects malformed ids, unknown types, empty segments, and types without a catalogue mapping. Built-model availability is a separate purchase/menu capability and never determines whether an existing identity is retained.

No existing stored id is rewritten. A newly purchased Era 1 Spring therefore uses canonical id `prehistoric_storage_pit` in its placement id while an existing `civic:water_spring:3` remains valid, movable, and resolved to the same catalogue row and GLB.

The ledger event remains exactly:

`build:<placement-id>`

Port the delimiter-safe behavior from open PR #288, not the branch itself:

- Split the structured placement id into event-id parts.
- Validate every part as non-empty.
- Join those parts through the existing event builder.
- Do not replace delimiters with another character; substitution is not injective.

Because the current database constraint assumes every placement id is one colon-free event-id part, add `db/migrations/0006_civic_placement_ids.sql`:

- Keep skill and Town Hall placement ids colon-free.
- Permit only well-formed civic placement ids matching the structured civic grammar.
- Continue rejecting arbitrary or empty colon-delimited ids.
- Permit the same structured id as a `city_crisis_damage.subject` only when `subject_kind = 'civic'`; building and ground subjects retain their current grammar.
- Update the constraint comment to state that civic ids are validated as event-id parts rather than as one part.

### 5.3 Runtime and persistence representation

`CityLoad.civic` remains a distinct civic collection and does not enter skill `placements`.

Every civic entry carries:

- placement id as `nodeId`;
- transform `{ col, row, rot }`.

The type is recovered only through the civic parser. All consumers use the parser; none slices the string independently.

The generalized parser drives:

- footprint lookup;
- display label and popup data;
- model lookup;
- scene placement;
- movement;
- citizen role;
- vitality contribution;
- dev snapshot validation and restoration;
- API payload validation and restoration.

Dev restore drops malformed or unknown civic ids fail-closed rather than retyping them. Every id that resolves to a catalogue row is retained byte-for-byte even if a model asset is temporarily missing; missing art disables new purchases but never erases an existing paid placement. A retained known placement with a missing built GLB uses the existing neutral built fallback at its catalogue footprint and reports the unavailable art diagnostically. Authenticated reads use the stricter whole-city rule below.

## 6. API and dev persistence

### 6.1 Dev persistence

The dev snapshot continues to store civic transforms separately from skills.

- The civic parser validates every catalogue-backed id plus the legacy Era 1 forms.
- Restore keeps every valid catalogue-backed placement, including Eras 1 through 3.
- Restore drops malformed and unknown entries, but never a known placement merely because its model is temporarily unavailable.
- Sequence minting remains one above the highest valid restored sequence.

`civic_material_spent` becomes a legacy compatibility value:

- New purchases never increment it.
- A brand-new snapshot omits it.
- A restored non-zero legacy value remains readable and continues to net only against Prehistoric stone through the compatibility decorator.
- Saving a restored legacy session preserves that unchanged value until a later migration removes support.
- Ledger-backed purchases debit the ledger and never the compatibility counter, so the same purchase is not netted twice.

### 6.2 Authenticated API

Extend the authenticated city payload and service model with a separate `civic` collection.

API write entries carry the current civic transform. The service derives:

- `placement_id` from the civic placement id;
- `kind = 'civic'`;
- `subject_id` from the canonical catalogue id encoded in the placement id;
- transform from the placement;
- `era_built` from the insert-era parameter, never changed by a later move.

API read behavior:

- Select `placement_id` as well as `subject_id`.
- Return skill rows in `placements`, the hall in `town_hall`, and civic rows in `civic`.
- For a civic row, parse the canonical type segment, validate it against `CIVIC_CATALOGUE`, and require it to equal `subject_id`.
- Reject the whole city read on contradictory civic identity rather than returning a half-retyped building.

API write behavior:

- Accept valid structured civic placement ids.
- Validate `subject_id` against `CIVIC_CATALOGUE`.
- Validate placement-id type and `subject_id` agree.
- Accept legacy Era 1 short ids only in dev persistence. The authenticated API has never persisted civic rows, so its first civic write uses the canonical form and needs no server-side legacy name join.
- Upsert civic rows through the existing `city_placement` statement.
- Move updates transform only; it cannot rewrite `subject_id` or `era_built`.
- Duplicate types remain separate because their placement ids differ.

`CityWritePayload`, `CityRead`, `CityWrite`, `cityWriteFromLoad`, `snapshotFromLoad`, the API session wrapper, service parsers, read/write parity tests, and signed-in round-trip tests all include `civic`.

No new table is required.

## 7. Purchase transaction

Port the required payment behavior from open, dirty PR #288 onto the current tree. Do not merge that branch: its base and checks are stale and its Era-1-only types are insufficient.

The city session owns this ordered transaction:

1. Resolve the requested canonical building id to one catalogue row and model type.
2. Require `row.era === currentEra`.
3. Require the current era to be fully model-backed.
4. Resolve the row's built GLB.
5. Mint the next deterministic placement id without storing it.
6. Validate bounds, overlap, blocked ground, and whole-city walkable reachability.
7. Call the injected ledger payment with placement id and canonical catalogue id.
8. Commit the civic transform only when payment reports `spent` or `already_spent`.
9. Refresh city and economy read models.

All layout writes are serialized through the session while a civic transaction is in flight. The placement is revalidated immediately before commit. This prevents a concurrent move or placement from changing occupancy between validation and commit.

The payment ask contains only:

- placement id;
- canonical catalogue building id.

It never contains cost, material, contribution, footprint, or era. The economy adapter reads the live era and the catalogue.

The build menu reads price and material from the same current-era row and live wallet that payment uses. `App.tsx` must stop passing `CURRENT_ERA_ID` to civic stockpile and label reads; it passes the live wallet's `spendable` and `spendableMaterial`, while the card reads the catalogue row's authored cost.

`already_spent` means the debit exists and the placement write is the missing half. It is normalized to paid, uses the catalogue cost for copy, and commits the same placement idempotently. It never writes a second debit or a second placement.

Movement never calls payment.

## 8. Exact outcomes

### Successful and replayed purchases

- `spent`: one debit, one placement, result `built`.
- `already_spent`: no new debit; commit or retain the one matching placement; result `built`.

### Rejections

- `wrong_era`: known row outside the live era. No debit, no placement, no sequence consumed.
- `unavailable`: known row whose era is not fully model-backed or whose built URL is missing. No debit and no new placement. An already-persisted known placement remains present and uses the existing neutral built fallback.
- `unknown_type`: malformed or unknown civic type. No debit, no placement.
- `refused`: spatial refusal (`bounds`, `overlap`, blocked ground, or `unreachable`). Validation occurs before payment, so no debit.
- `insufficient_material`: ledger refusal. No debit and no placement.
- `invalid_cost` or `era_material_unauthored`: data/configuration failure normalized to unavailable for the UI, while retaining the exact economy status in diagnostics. No debit and no placement.

The menu's affordability note is advisory. The ledger result is authoritative.

An unavailable current era shows no partial roster. A direct call against one unavailable row is still rejected by the session and economy boundary.

## 9. Engine boundaries

The game engine must not import `@cr/economy`.

Replace Era-1-specific civic lookups at the boundary:

- `CityVitalityInput.civic` receives explicit `{ livability, happiness }` contribution rows.
- `CivicRosterInput` receives explicit `citizen_role`.

The web adapter resolves these values from the catalogue before calling the engine.

Engine behavior remains:

- Vitality sums explicit civic contribution rows with existing hub, residence, skill, and road rows.
- The existing free Era 1 Smokehouse contribution is prepended to vitality only, exactly as today; it is not invented as a placement or citizen-roster entry.
- Citizen roster appends a bought-building entry with the explicit role and zero residence/daytime capacity.
- Civic purchases do not change population, homes, visitors, mastery, or settled progression.

Agreement tests prove the generalized Era 1 adapter produces the exact same roles and capacities as `ERA_ONE_CIVIC_TYPES`.

## 10. Implementation surface

Primary web and engine files:

- `apps/web/src/App.tsx`
- `apps/web/src/city/CitySurface.tsx`
- `apps/web/src/city/civic.ts`
- `apps/web/src/city/civicBuildings.ts`
- `apps/web/src/city/civicEconomy.ts`
- `apps/web/src/city/citySession.ts`
- `apps/web/src/city/worldLayout.ts`
- `apps/web/src/city/citizens.ts`
- `apps/web/src/city/types.ts`
- `apps/web/src/city/apiCityLoad.ts`
- `apps/web/src/city/apiCitySession.ts`
- `apps/web/src/devPersistence/devSession.ts`
- `apps/web/src/economy/economyClient.ts`
- `apps/web/src/economy/economySession.ts`
- `engines/game/src/citizens.ts`
- `engines/game/src/city-vitality.ts`
- `packages/economy/src/materialSpend.ts`
- `services/diagnostic-api/src/reads.ts`
- `services/diagnostic-api/src/writes.ts`
- `db/migrations/0006_civic_placement_ids.sql`

The implementation plan must keep the work in one coherent sequence:

1. Identity and model-backed-era derivation.
2. Engine input generalization.
3. Ledger payment and placement transaction.
4. Current-era menu and scene wiring.
5. Dev/API persistence.
6. Rendered verification and full regression gates.

## 11. Test design

Every behavior change starts with a failing reproduction. Guard populations are defined by exhibited behavior, not by which abstraction currently implements it.

The required pre-implementation reds are the Era 2/3 menu census, Era 2/3 placement parsing and restore, the real ledger purchase from those eras, and the authenticated civic round trip. Era 1, built-only, URL-integrity, and Town Hall checks are regression guards over behavior that already exists; prove each by injecting the defect it claims to catch rather than presenting a newly green assertion as a reproduction.

### 11.1 Derived populations

Derive model-backed eras from `ERA_SEQUENCE`, catalogue rows, and actual built resolver results.

Guard the derivation itself:

- At least three eras are model-backed.
- Prehistoric, Neolithic, and Bronze Age are present in authored order.
- Every backed era has exactly four distinct catalogue rows, model types, and built URLs.
- No partially backed era enters.
- The union of each backed era's menu rows equals its catalogue rows exactly.
- The population beyond Era 1 has a floor of at least two eras, so a regression to the original layer fails.

### 11.2 Red reproductions and regressions

Add or broaden tests for:

1. **Era 1 regression:** exact four existing cards, ids, names, prices, footprints, contributions, models, purchase behavior, popup behavior, movement, and vitality effects.
2. **Era 2 current roster:** exactly the four Neolithic catalogue rows; no Prehistoric, Bronze Age, or later rows.
3. **Era 3 current roster:** exactly the four Bronze Age catalogue rows with bronze prices; no earlier or later rows.
4. **Wrong-era isolation:** for every backed era, the rendered set equals only that era's rows, and direct purchase of every other backed era's row returns `wrong_era`.
5. **Placement and restore:** every backed-era row can be bought at a derived legal cell, survives dev and API round trips, retains id and transform, resolves its own built GLB, and can move without a debit.
6. **Duplicate purchase:** two instances of one type have distinct placement/event ids and two catalogue-priced debits.
7. **Idempotence:** replaying one placement id produces one debit and one placement.
8. **Exact vitality:** each row changes livability and happiness by exactly its catalogue contribution.
9. **Role:** dwelling is residence; the other three roles are civic; neither changes population or capacity assignment.
10. **Learning-state identity:** compare node states, neighborhood state, prerequisite state, mastery, lesson stage, and era state byte-for-byte before and after purchase.
11. **Built URL guards:** every shown card, ghost, placed model, and moved model resolves the same non-empty built URL; distinct types have distinct URLs.
12. **Missing model:** removing one built URL makes the whole era unavailable and never produces a three-card menu; a pre-existing known placement remains restored, occupies its cells, and renders the neutral built fallback.
13. **Town Hall:** every era resolver returns `stage: "built"`; Bronze Age has only its built URL; resting state is built; ceremony construction still resolves the shared Era-1 construction model; no ceremony state requests `site`.
14. **API parity:** civic survives write/read with placement id, canonical `subject_id`, transform, and `era_built`; an id/subject mismatch is rejected.
15. **Legacy snapshot:** an Era 1 snapshot with `civic_material_spent` loads, keeps its debt exactly once, and new purchases create ledger rows without incrementing it.
16. **Structured-id constraints:** civic placement ids and civic suspension subjects pass the API/database grammar; the same strings under skill, Town Hall, building-damage, or ground-damage kinds are rejected.

### 11.3 Asset integrity

Derive the shipping Era 3 asset set:

- five skill buildings times three stages;
- four civic built models;
- one Council Hall built model.

Require all 20 URLs to parse as glTF 2, contain a non-empty scene, and have non-zero bounds. This is a binary-integrity guard, not rendered evidence.

The exporter check must continue to prove the eight absent civic early-stage outputs reproduce to their pinned digests.

## 12. Rendered verification

Rendered evidence uses a 1024x580 viewport and a checked non-demo port. Ports 5174 and 5412 are forbidden. A suitable example is 5483 after confirming it is free.

Capture full frames, including surrounding city where occlusion or placement is relevant:

1. Prehistoric Civic tab: exactly four Prehistoric cards.
2. Neolithic Civic tab: exactly four Neolithic cards.
3. Bronze Age Civic tab: exactly four Bronze Age cards, visibly priced in bronze.
4. One full-island valid placement frame for each Bronze Age civic building.
5. One post-confirmation full-island frame for each Bronze Age civic building, showing its authored built mass.
6. The Terraced Fields on its 1x2 plot with surrounding cells visible.

For each run record:

- viewport and port;
- zero page errors;
- zero unexpected console errors;
- all expected built GLB requests return success;
- no civic site or construction GLB request occurs;
- no Era 1 or Era 2 civic card appears in the Bronze Age menu.

Frames cropped only to the changed component do not prove menu isolation, plot fit, or island visibility and are not accepted.

## 13. Payload

No new production GLB is added. One existing production GLB is changed:

- `apps/web/src/city/art/models/civic-bronze-age-terraced-fields-built.glb` is
  deterministically recomposed to fit its existing 1x2 plot.

The eight Bronze Age civic `site` and `construction` outputs remain under `tmp/era3-all-stages` as reproducible authoring evidence only. They stay outside every production glob and outside Git.

Because current runtime requests only built civic URLs, adding those eight files would
increase build/deploy assets without changing initial or interaction network behavior. They
are explicitly excluded; the exporter check verifies their current exact digests instead of
copying a byte count into this document.

## 14. CI prerequisite separate from product behavior

At `ae052f54`, PR #273's `code-quality` failure is merge drift and is not evidence of a civic feature defect:

1. `test/cityCopyRegister.test.ts` reports six prohibited dash strings.
2. `CitySurface.civicSelect.test.tsx` still expects “not built yet” after integration changed valid unplaced-skill copy to “ready to build.”
3. `skillNames.test.ts` still exempts the TRG nodes as packless and retains the old packless floor after their lesson packs landed.

These failures must be repaired in parallel or before the civic implementation merges, because the branch must be green. They are not fixed by changing civic behavior, loosening civic assertions, or adding assets, and they are not part of this feature's acceptance semantics.

## 15. Scope and non-goals

In scope:

- Current-era civic menus for every fully model-backed era.
- Generic civic identity, purchase, placement, rendering, role, vitality, and persistence.
- Ledger-backed payment and idempotence.
- Dev and authenticated city round trips.
- Compatibility with existing Era 1 ids and legacy spend-counter snapshots.
- Deterministic recomposition of the existing Terraced Fields built GLB for its frozen 1x2
  footprint.

Out of scope:

- Civic site or construction gameplay stages.
- New civic GLB basenames or production site/construction assets.
- Council Hall stage art or ceremony redesign.
- A cumulative civic era rail.
- A one-off Bronze Age allowlist.
- Civic teardown.
- Renovation or redressing of old civic buildings.
- Legacy-decay changes.
- Material carry-forward changes.
- Population, housing, or progression redesign.
- Any footprint or catalogue rebalance.
- Later-era civic activation before all four built models exist.

## 16. Rollout and rollback

### Rollout

1. Land identity, engine-boundary, and red reproduction tests.
2. Land ledger transaction and event-id/database compatibility.
3. Land menu, scene, and persistence wiring.
4. Run unit, reachability, repository-invariant, browser, build, exporter, and API round-trip gates.
5. Review the required 1024x580 frames before enabling the merged result.

No feature flag is required because capability derivation fails closed. Eras without complete built art show no civic roster.

### Rollback

Rollback removes the generalized menu/purchase activation while preserving:

- catalogue data;
- existing placements and placement ids;
- ledger debit rows;
- built GLBs;
- API/database rows;
- legacy snapshot compatibility.

The safe rollback point is the capability predicate: returning unavailable for every era after Prehistoric restores the prior user-visible purchase surface without deleting or retyping data. Existing later-era civic placements still restore, render, and move so a rollback cannot erase a paid building.

Database rollback must not reintroduce a constraint that rejects already-stored structured civic placement ids. The migration is therefore forward-compatible and remains applied even if UI activation rolls back.

## 17. Acceptance statement

The reviewed design and implementation have no open product or technical choice. They
follow one path:

- current-era and capability-derived;
- all fully model-backed eras, currently 1 through 3;
- built-only civic runtime;
- ledger-backed purchase before placement commit;
- explicit engine contribution and role inputs;
- generic dev/API persistence;
- one existing built-asset recomposition, with no footprint or runtime-scale expansion.

Implementation began after review and was re-read against this updated specification before
publication.
