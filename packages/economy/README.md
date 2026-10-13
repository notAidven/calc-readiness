# `@cr/economy`

The **pure era-material rules core** — zero I/O. No database, no network, no
React/DOM. Both economy adapters (the in-memory dev adapter in
`apps/web/src/economy` and, later, the `services/economy-api` Lambda over Aurora)
call the **same** functions here, so grant/spend semantics can never drift between
the demo and production.

Design of record: `docs/superpowers/specs/2026-07-29-era-resource-model-design.md`.
The older `2026-07-25-resource-model-xp-gold-design.md` describes a two-currency
economy this package no longer has; read it as history.

## ⚑ This document was two rulings out of date, and both are folded in here

It described **XP and gold** as the two resources, an XP/gold asymmetry table, an
atomic gold spend on a cosmetic, and a cosmetics catalogue. Neither survives:

- **The gold-drop (2026-07-29)** retired `gold` as a currency and made the era's
  MATERIAL the one spendable thing. `gold` is now era five's material.
- **The shop and XP sunset (2026-08-03)** deleted the cosmetics catalogue, the
  purchase path and XP entirely. Team lead: *"sunset the cosmetic shop and xp
  systems completely - they dont really have a role in our game."* The names of what
  went are in `docs/Contracts.md` §8's superseding note and in the work log; this
  file names only what the package HAS, which is what a reader beside the code needs.

## The one resource

The **ten era materials** (`stone`, `grain`, `bronze`, `silver`, `gold`, `gems`,
`coal`, `electricity`, `silicon`, `data`), one per era. A ledger row is denominated
in a material and in nothing else, and every balance is reconstructed from the
append-only ledger (`balance = sum(grants) - sum(spends) ≥ 0`).

There used to be a second union beside it, holding the single non-material resource,
and the two had to be kept disjoint because `applyGrant` walks their concatenation.
There is one union now, so that whole failure mode — and the guard written for it —
is gone.

## The earn table

See [`src/earn.ts`](src/earn.ts). Two recipes, both paying the era's material:

| Recipe | Material |
| --- | :-: |
| `lessonCompleteGrant` (activity) | ✓ (the era total over the era's node count) |
| `interleavedGrant` (activity) | ✓ (flat, capped per set, bounded per era) |

A third row paid a mastery star, in XP alone, by the deliberate D-R3 asymmetry:
activities paid currency, depth paid XP. With XP gone it granted nothing, so the
recipe is deleted rather than kept as one that credits an empty set. The mastery
STARS over a building are untouched — they are a visual, not an economy row.

`interleavedGrant` used to pay `base + a repair portion scaled by island condition`.
**The condition clock is sunset** (2026-07-29), so the payout is flat and nothing in
this package reads wall-clock time to decide an amount — `clockless.test.ts` sweeps
for the shape.

## Public interface

Idempotency + atomicity live in two plain functions:

- `applyGrant(view, input)` — idempotent on `event_id` (replay ⇒ `applied:false`, no
  rows); an era-advance carry-forward credits two materials as **two rows under one
  id**; row 2 (interleaved) is clamped to one practice set's allowance.
- `applyMaterialSpend(view, input)` — atomic material spend, keyed on a placement id;
  insufficient funds leave state **untouched**. `applyRepairSpend` is the same debit
  with a ruin as its subject.

Plus: `buildEventId` + typed id builders (`lessonCompleteEventId`,
`interleavedEventId`, `buildEventIdFor`, `repairEventIdFor`); `withinCap` /
`capRemaining` / `capMaxFor` (row 2 only); `drillSetsRemaining`; and the ledger
derivations (`computeMaterialBalances`, `materialBalanceOf`, `hasEvent`,
`countInterleavedGrants`, `sumInterleavedGrants`).

## Era materials, capacities and the civic catalogue

- `materials.ts` — the ten era materials and the era cost ladder.
- `capacity.ts` — the two capacities (livability, happiness) and the solvency
  predicate. Livability is **one pool**; housing and food are inputs to it.
- `civicCatalogue.ts` — **the forty civic buildings**, four per era, as typed data.
  The authored source is the ten `docs/superpowers/specs/eras/*/civic-buildings.md`
  tables; `test/eraCivicCatalogueParity.test.ts` asserts the two agree row for row
  in both directions.
- `civicBuilding.ts` — purchase (O-4's sibling), teardown pricing (**O-4**) and
  legacy decay (**O-5**, `0.9 ^ eras behind`, floored at `0.5`). That decay is
  keyed on **eras advanced**, never on wall-clock time; it is not the sunset
  condition clock.

Types (deliberately **local** to this package — not added to the frozen
`@cr/state-schema` yet): `MaterialId`, `MaterialBalances`, `EconomyTxnKind`,
`LedgerEntry`, `LedgerView`, `GrantInput`/`GrantResult`,
`MaterialSpendInput`/`MaterialSpendResult`, `CivicBuildingDefinition`.

## INV-COS-1 (one-way)

This package must never be imported by a learning-path module (mastery service,
diagnostic engine, `isNeighborhoodReady`, lessons). Enforced by
[`src/one-way-invariant.test.ts`](src/one-way-invariant.test.ts).

The invariant outlives the cosmetics it was named for: it is about the DIRECTION of
the dependency edge, not about what is bought.
