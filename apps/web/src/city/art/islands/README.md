# Island models — the drop directory

**Put a finished island `.glb` in this directory and name it in one row of
`apps/web/src/archipelago/islandManifest.ts`. That is the whole handoff.**

Full instructions, with a worked example and the conventions the exporter has to match:
[`docs/Island_Asset_Handoff.md`](../../../../../../docs/Island_Asset_Handoff.md).

## Why this is its own directory and not `art/models/`

`buildingAssets.ts` globs `./art/models/*.glb` non-recursively and maps **every** match, by bare
filename, into the per-node building registry. An island dropped in there would join that glob
and be offered as a building. `islandManifest.test.ts` asserts the two globs stay disjoint, in
both directions, so neither registry can quietly swallow the other's files.

## Naming

    island-era-<NN>-<era-slug>.glb

`NN` is the era's 1-based position in `ERA_SEQUENCE` and the slug is its `EraId`. So era two is
`island-era-02-neolithic.glb`. The name is not parsed by any code — the manifest row is what
binds a file to an era — so a name that breaks the pattern still works. It is a convention for
the humans reading `ls`, and `islandManifest.test.ts` warns rather than fails on a stray one.

## What ships today

**Nothing.** Every era is `PROCEDURAL_ISLAND`: the procedural mass in
`city/three/StarterIsland.tsx` dressed from that era's row of `city/islandGround.ts`. That is
the fallback, it is the default, and it is what a row that names a missing file falls back to —
so a half-finished drop is an island that looks unfinished rather than a city that will not load.
