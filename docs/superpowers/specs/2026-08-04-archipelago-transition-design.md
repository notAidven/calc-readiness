# Archipelago transition: one unlock, then choose

Status: owner-approved replacement, 2026-08-09. This supersedes the former staged route and
multi-act ceremony.

## Sequence

1. The current-island unlock exam reaches its `2N` net target.
2. The runtime record moves to `reveal` before any external write.
3. The archipelago authority idempotently founds the next `ERA_SEQUENCE` island.
4. The destination is shown with its Town Hall visibly founded.
5. The learner chooses **Sail to the next island** or **Keep learning here**.

Founding and standing are deliberately separate. A pass makes travel possible; only Sail changes
`current_island` / `cr.city.era.v1`.

## Persistence

`ArchipelagoSession.unlockIsland(eraId)` captures the standing layout, checks the founded set
inside its serialized tail, applies the founding grant once, adds `foundingLayout()`, and publishes
the bay. Repeated calls and restored founded records are no-ops.

Local/demo play persists through `archipelagoStore`, whose exact `/demo` physical key is isolated
by `runtimeStorage`. Account play uses the existing city API shape: a destination founding is
posted with `island_era` set to the destination and `current_island` left on the standing era.

The destination's persisted initial layout has a Town Hall and no learner placements, roads,
civics, spend, or crisis damage. Existing islands are never rewritten by the unlock.

## Reveal

The reveal reuses the actual archipelago hero renderer against `foundingLayout()`, with the
destination Town Hall in its built founding state. It carries no exam question and no staged route.
At the choice phase it exposes exactly the two progression actions.

The reveal remains a modal learner surface. City build, lesson, and crisis controls stay blocked
until Keep Learning or Sail closes it. The ordinary standing-island canvas is not mutated under
the reveal.

## Revisiting

Every founded island remains in the carousel. Sailing back restores that island's own layout and
wallet while learner knowledge remains shared. Keep Learning leaves the newly founded destination
in this set, so the bay immediately shows both islands without changing standing.

## Diagnostic prefix

Diagnostic placement calls the same idempotent founding operation for each member of its derived
skipped prefix. It does not synthesize exam scores. The catch-up representation names the island
and Town Hall foundation once, with no old staged transition dependency.
