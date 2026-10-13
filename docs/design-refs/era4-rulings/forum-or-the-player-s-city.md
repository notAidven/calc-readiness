# Should era four's crisis stay on its own forum, now that era four has geometry?

**A recommendation with reasons. This is the lead's ruling and not mine to make.**

## The short answer

**Keep the forum for era four.** The arrival of twenty era-four models is a real change and it
does not move this decision — and it turns out to point the other way from the way the question
assumes, because the buildings that arrived cannot wear the marks this crisis has to put on
them. Two of the four claimable civic types fail the frontage rule outright, all four carry a
claim plate wider than their own entrance, and none of the four has the uniform bay module the
shuttered state is drawn on.

The strongest reason is not aesthetic at all: **moving the surface onto the player's island
would settle an open ruling that belongs to someone else.**

## What has and has not changed since #488 was judged

Both PRs are merged into `integration` — #488 at `2026-08-03T22:18:13Z` (`ba18f9ac`), #507 at
`2026-08-03T22:22:08Z` (`51ee2269`) — so this is a reading of the tree and not of two diffs.

| #488's reason | Status now |
| --- | --- |
| A district has no position for an island to be laid over | **Unchanged, and guarded.** `test/successionPropagation.test.ts` sweeps every source that can decide an allegiance for spatial tokens and self-tests its detector both ways. |
| Threading eight props through `CityScene` per crisis would put three agents in one file | **Unchanged.** A cost argument, and a real one, but it is about code structure rather than about the product. |
| The forum "may not be honest for era six" | **Unchanged, and it is era six's question.** Era six draws lines between districts, which needs positions era four does not have. |
| Era four had no dressed geometry to show | **Changed. #507 published twenty models.** |

So one of the four premises moved. Below is what happens when you follow it through.

## Why the new geometry argues for the forum rather than against it

### 1. The buildings that arrived cannot carry the crisis's three claim states

Measured at this tip, not argued — `../era4-frontage/README.md` and
`scripts/measure-era4-frontage.mjs` carry the full table, and
`../era4-frontage/07-plate-against-real-buildings-1024x580.png` is the frame.

The crisis needs three states on each district's one civic building: **open**, **claimed** (a
marble plate on the wall) and **contested** (shutter boards across every opening, plus a corner
marker). The four types it can claim are `grain_dock | cottages | baths | fountain`. Against the
real models:

| Claimable type | Frontage rule | Plate ÷ its own entrance | Bay module for the boards |
| --- | --- | --- | --- |
| Grain Dock | holds | 2.11× | four square-headed doors between pilasters |
| Cottages | **fails at every candidate bay** | 2.67× | an L-plan of shop fronts on four planes |
| Baths | holds | 1.40× | an arcade and a hall |
| Fountain | **fails — it has no door at all** | 1.73× | an aqueduct spur and a basin: no bays |

The forum's own `buildCivicBuilding` is not a building that happens to be simpler. It is a
**purpose-built carrier for three states**: five bays at a constant 1.15 module so boards can be
worked to it, both long faces glazed the same way so a shuttering reads from any heading, one
plate seat, one corner. Every one of those is a decision the crisis needed and none of them is a
decision a city building was authored to satisfy.

Putting the crisis on the real models therefore does not save work — it moves the work, from
"draw one carrier well" to "re-author four buildings so each can be shuttered, plated and
marked", and then to a fifth and sixth as later eras add civic types.

### 2. It would answer someone else's open question by implementing it

`succession-tuning.ts` is explicit twice over. On the boards:

> The authored boards below carry stand-in ids. A caller with a real city passes its own
> districts to `createSuccession`, exactly as a caller with a real city passes its own
> placements to `createHardWinter`.

and on the district count:

> **Q4 (§13) asks how many districts there are and whether they are authored or derived**, and it
> is open with whoever authors era four's land.

Two things follow. First, **the engine is already ready either way** — this is a renderer choice
and not an engine one, which is what makes it cheap to revisit later and expensive to get wrong
now. Second, a crisis rendered on the player's island *forces* the derived answer, because you
can only draw a district on a building the player actually owns. Civic buildings are **bought**,
so a player who bought none has no districts and no crisis; a player who bought two has a
two-district board whether or not two districts is a tuned encounter. The three authored boards
exist precisely because "a number tuned against one board is not a tuned number".

Deciding that by shipping a surface is the kind of ruling that is very hard to unmake.

### 3. The forum's weaknesses are not fixed by moving it

#488's own index lists what does not read: the boundary stones are the weakest thing in the
picture, the foreground is empty, the drift block is hard to separate at distance, the planning
panel does not fit in 580px. **Not one of those is caused by the surface being a forum.** The
boundary stones would still be pale cubes on the player's paving; the panel would still be the
same panel. The frames taken for the rulings in this directory bear that out — the block's
clearance helped and what still crowds it is the boundary run beside it, which travels with the
crisis wherever it is drawn.

## The honest case for moving it, which is not nothing

- **Stakes.** The player's city is the thing they built. A dispute over a forum they have never
  seen is abstract in a way a dispute over their own Baths is not, and era one's crisis gets real
  force from happening to buildings the player raised.
- **The visual argument for the forum has weakened.** Part of the reason for a bespoke surface
  was that nothing else looked like era four. That is no longer true: an era-four city now
  renders classical.
- **Two surfaces is two surfaces.** A separate scene with its own `<Canvas>` is a second thing to
  keep alive, and by era six there may be four of them.

None of these is answered by "no", and the third is the one that will eventually force the
question. What they do not do is make *era four* the right place to change it, with a demo on
Friday and the claim-state problem unsolved.

## A middle path worth naming

**Dress the forum with the real models where a model does not have to carry state.** The Senate
House (`townhall-classical-built.glb`) as the forum's backdrop, the real civic types standing in
the middle distance — while the four *claimable* buildings stay procedural, because those are the
ones that have to be shuttered, plated and marked.

That buys most of the "era four looks like era four" benefit at a fraction of the cost, and it is
reversible. Its price is a real one and should be said out loud: `successionScene.ts` currently
guarantees it loads **no `.glb` at all**, and that property is worth something — it is why the
crisis's geometry has no art dependency and why its frames are reproducible. Breaking it is a
decision, not a detail.

## What I would ask the lead to decide

1. **Era four: forum or island?** My recommendation is the forum, on the three reasons above.
2. **If the forum stays, does it get dressed with real models?** The middle path, and the cost is
   `successionScene.ts`'s no-art-dependency property.
3. **Q4, separately and before era six.** Whether districts are authored or derived is the ruling
   that actually decides this question for every later crisis, and it is currently open with
   whoever authors era four's land. Answering it deliberately is better than having a renderer
   answer it by accident.

## Evidence

| Claim | Where |
| --- | --- |
| Both PRs merged, and when | `gh pr view 507 --json mergedAt` / `488`, and the merge commits in `git log` |
| Two of four claimable types fail the frontage rule; all four carry an oversized plate | `../era4-frontage/README.md`, `measurement-run.txt`, `frontage-measurements.json` |
| What that looks like | `../era4-frontage/07-plate-against-real-buildings-1024x580.png`, 1024x580 |
| The engine takes a real city's districts, and Q4 is open | `engines/game/src/succession-tuning.ts`, `SuccessionCivicPlan.placement_id` and `SuccessionBoard` |
| The forum's civic building is a purpose-built state carrier | `apps/web/src/city/three/successionScene.ts`, `buildCivicBuilding` |
| A district has no position, enforced | `test/successionPropagation.test.ts` |
