# Island unlock exam contract

Status: owner-approved replacement, 2026-08-09. This document supersedes the former end-of-era
trial and four-stage ceremony contract.

## Population and eligibility

An island is an era from `ERA_SEQUENCE`. Every population in this flow comes from
`getEraNodes(eraId)`; `DomainId` is forbidden because domains span eras.

The next-island exam becomes available when at least
`ceil(0.80 × current-island skill count)` current-island skills have full mastery. Full mastery is
the mastery service's authoritative `MASTERY_BAR` (currently 2). Missing state rows count as zero.

Eligibility and completion are separate:

- 80% full mastery opens progression;
- 100% full mastery remains the completion/reward condition;
- the final era has no next-island exam and exposes the existing completion reward only at 100%.

## Exam pool and order

The exam uses the complete current-island practice pool, not the mastered subset. Every island
skill, including the unmastered remainder, must have at least one registered item. A missing skill
refuses the whole exam and names all missing skill ids. Another era's items are ignored.

Questions are interleaved by shuffled skill cycles:

1. each island skill appears once before any repeats;
2. a cycle boundary cannot repeat the prior skill when another skill exists;
3. a skill cannot immediately repeat its prior item when another item exists.

The shared `interleavedPoolItems`, `createInterleavedScheduler`, `practiceChecker`, answer-format
guards, and worked-solution visuals are the authorities. The unlock layer does not fork grading or
worked mathematics.

## Net score

The target is `2 × current-island skill count`.

- correct: `+1`;
- wrong: `−1`;
- Skip: `−1`;
- the running score floors at zero.

Wrong and Skip retain the ordinary worked-solution reveal. Reaching the target passes immediately.
The exam never writes mastery, placement, lesson completion, or diagnostic evidence.

## Founding, choice, and idempotency

For an account learner, each response is sent as one bounded, idempotent request and graded by the
authenticated API. The response that reaches the target atomically records the pass authority,
founds the destination island, persists its server-derived Town Hall, and applies the founding
grant in one database transaction. A lost response is replayed by response id. This write does not
change the standing island.

The reveal is one short destination-founding moment. It is followed by exactly:

- **Sail to the next island** — changes standing to the already-founded destination;
- **Keep learning here** — closes to the current island.

Earlier islands remain founded and revisitable. Their placements, roads, civic buildings, spend,
resources, damage, completion state, and Town Hall remain intact.

An in-progress attempt is stored under `cr.city.islandUnlockExam.v2.<era>`, through
`runtimeStorage`, so exact `/demo` receives `cr.demo.*` physical keys. The record contains the
score, current item, remaining shuffled cycle, response count, at most one bounded pending response,
and phase (`exam`, `reveal`, `choice`, `complete`). It never stores or resends unbounded response
history. Refresh and replay are idempotent.

Legacy `cr.city.ceremony.beats.v1.*` values have no score interpretation and are deleted at this
version boundary. No other key is migrated or cleared.

## Diagnostic placement

Diagnostic placement is the one progression bypass. Its skipped set is the contiguous
`ERA_SEQUENCE` prefix derived by `eraPlacementFromSeed`. Every skipped-prefix island is founded
idempotently without an exam. Catch-up uses one simple Town Hall founding representation and never
revives the former multi-stage state machine.

## Failure boundary

The browser and current API both support founding a destination without changing
`current_island`: local play writes the versioned archipelago store; account play relies on the
server-owned pass/diagnostic transaction and never posts a second client-authored founding layout.
An account build in `single-island` rollback mode treats a passed response as sufficient founding
confirmation even though it has no local archipelago mirror. Keep Learning closes safely; Sail uses
the authenticated `land_island` action, which requires both the destination island and Town Hall
before changing `current_island`.
