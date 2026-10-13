# Island art parity and composition pass

## Scope

This pass fixes shared composition without entering Evan's art lanes. It is stacked on
`cursor/island-atlas-proportions-75cf` so the larger Atlas actors and explicit camera-only
preview remain intact.

In scope:

- restrain the persistent placement grid at rest while keeping the full high-contrast grid in
  placement and road-painting modes;
- add one non-colliding, ground-level civic plaza system around the existing Town Hall footprint;
- strengthen Town Hall focus framing without changing its frozen `3×2` placement footprint;
- make the Atlas use one shared renderer for registry-backed runtime miniatures, with a
  registry-backed SVG fallback;
- expose terrain and Hall art status so missing inputs are explicit rather than visually implied.

Out of scope:

- no new or replacement era 8–10 terrain definitions;
- no final Town Hall model, silhouette, or material authoring;
- no island GLB, no placement-footprint change, and no collidable prop on buildable ground;
- no merge, deploy, or cherry-pick from an Evan branch.

GitHub was refreshed on 2026-08-09. No open Evan art PR was visible. The related visible Evan
branches belong to already-merged PRs: island theme prose in #59, Atomic/Industrial concept art
in #600, and the era-one Town Hall assets in #86. Era 8–10 terrain and the missing Hall models
therefore remain named integration dependencies.

## Runtime art status

“Shipped runtime art” below means art already in the application and consumed unchanged by this
pass. “Dependency” means this pass reports and automatically consumes the future registry row or
asset; it does not invent a replacement.

| Era | Terrain / shoreline / dressing | Town Hall source | Status in this pass |
| --- | --- | --- | --- |
| 1 Prehistoric | Approved procedural island and bespoke camp | Existing Prehistoric GLB | Shipped runtime art, unchanged |
| 2 Neolithic | Authored typed terrain, worked plots, landing and water-edge treatment | Existing Neolithic GLB | Shipped runtime art, unchanged |
| 3 Bronze Age | Authored typed Dry Headland design | Existing Bronze Age GLB | Shipped runtime art, unchanged |
| 4 Classical | Authored typed Promontory design | Existing Classical GLB | Shipped runtime art, unchanged |
| 5 Medieval | Authored typed River Island design | Existing Medieval GLB | Shipped runtime art, unchanged |
| 6 Early Modern | Authored typed Estuary Island design | Prehistoric fallback | Terrain unchanged; Hall is a named dependency |
| 7 Industrial | Authored typed Coalfield design | Existing Industrial GLB | Shipped runtime art, unchanged |
| 8 Atomic | Deliberate neutral fallback | Prehistoric fallback | Terrain and Hall are named Evan dependencies |
| 9 Information | Deliberate neutral fallback | Prehistoric fallback | Terrain and Hall are named Evan dependencies |
| 10 Cyberpunk | Deliberate neutral fallback | Prehistoric fallback | Terrain and Hall are named Evan dependencies |

The civic plaza is shared procedural composition, not final era art. It uses the selected era's
already-resolved terrain tones, stays flush with the ground, carries no collision or placement
claim, and may be covered by a later building without changing legality.

## Shared architecture

`islandVisualProfile(eraId)` is the read model shared by the city-adjacent fallback and Atlas. It
derives:

- topology and radii from the same island manifest used by `CityScene`;
- terrain tones, ground pattern, shoreline and authored/fallback status from `islandGround`;
- requested Hall, actually shown Hall, model URL and authored/fallback status from
  `resolveEraTownHall`.

The production Atlas mounts all ten terrain miniatures in one demand-rendered React Three Fiber
canvas. Every terrain actor uses the procedural island builder the city uses. The focused actor
mounts its exact resolved Town Hall GLB; non-focused peers use compact silhouettes selected from
the same Hall resolver so the overview does not load six highly articulated Hall files at once.
It creates one WebGL context, not ten, and submits no idle frames. The non-WebGL path draws a
compact SVG from the same profile and shows the Hall that the resolver says is actually standing,
including the Prehistoric fallback. When Evan adds an era 8–10 terrain row or Hall asset to the
existing registries, both paths change without an Atlas-specific palette or Hall-status table.

## Guards and evidence

Red-first guards cover:

1. the rest grid must be materially quieter than the rejected persistent grid, while the complete
   placement grid remains gated on placement/road-painting mode;
2. every Hall gets a ground-level plaza larger than its building footprint, with no collision
   metadata and no occupancy change;
3. every Atlas/fallback miniature reports the same terrain and Hall status as the shared profile;
4. the Atlas production path has one canvas for ten registry-backed miniatures;
5. missing terrain and Hall inputs remain explicitly reported rather than promoted to authored.

Spatial claims are verified from full learner-mounted frames at 1024×580 and representative
390×580 frames. Unit dimensions and mesh bounds are guardrails, not substitutes for those frames.
