# `gridwork-modern/` — the original Gridwork building set, preserved and deliberately unwired

These 21 GLBs are the **original Gridwork isometric building models** that rendered the D1
city until 2026-07-28. They are kept here because they are a **later era's art**, not dead
weight: a stepped Deco tower, a modern glass slab and a brownstone terrace are roughly
Atomic-Age-to-Information-Age vocabulary, and D-ERA8 has every skill building re-dressed
per era rather than replaced once. They will come back.

**Nothing loads them. That is the point.** See "Why a subdirectory" below.

## Where they came from

`be9f00b` ("Era one's 21 building GLBs regenerated 18% lighter, and adopted") replaced all
21 files **in place** with the era-one prehistoric set, so from that commit onward these
models existed only in git history. Every file here was recovered from **`3fd580a`**,
`be9f00b`'s parent, and is **byte-identical** to its blob there — verified per file by both
`git hash-object` and `sha256`, 21/21 matching, at the commit that added this directory.

Total 6,658,200 bytes across 21 files. The original two-level layout is preserved on
purpose (18 skill models flat, the 3 hall stages under `townhall/`), so restoring them is a
copy rather than a re-derivation, and so the skill/hall split that the loaders treat as an
invariant is still legible here.

## What each file is

The six art masses, named by the `gridworkId` they were keyed under **at `3fd580a`**, with the
display names they carried there:

| Node | Mass at `3fd580a` | Original art | Display name at `3fd580a` |
| --- | --- | --- | --- |
| NUM.S | `deco` | tall stepped art-deco tower | City Bank |
| NUM.F | `slab` | wide modern glass block | Public Library |
| NUM.2 | `rowhouse` | residential brownstone terrace | Rowhouse Flats |
| NUM.3 | `school` | schoolhouse | Community School |
| NUM.4 | `park` | graded green lawn | Central Park |
| NUM.5 | `tower` | slender landmark tower | Clock Tower |
| — | `town-hall` | civic hall | Civic Center (hub) |

> **THE MASS COLUMN ABOVE IS HISTORY, AND IT IS KEPT RATHER THAN UPDATED**, because those five
> words *describe this directory's art* — `deco` really was an art-deco tower and `rowhouse`
> really was a brownstone terrace, which is the only reason the ids read the way they do. On
> 2026-07-29 the live ids in `buildingAssets.ts` were renamed onto the six ordinary types the ten
> era style guides share, one for one: **`deco` → `hall`, `slab` → `store`, `rowhouse` →
> `dwelling`, `school` → `workshop`, `park` → `yard`, `tower` unchanged.** So a reader matching
> this table against the live map should expect the right-hand names, and the table stops being a
> lookup for anything but `3fd580a`.
>
> **No file in this directory was touched by that rename**, and nothing here needs renaming when
> the set is eventually re-wired: every filename is built from the NODE ID, not from the mass.

Three stages per mass — `*-site.glb` (foundation), `*-construction.glb` (scaffold),
`*-built.glb` (finished) — which is the same three-stage contract the live loader uses, so
the shape of the set needs no translation when it is re-wired.

## Why a subdirectory, and why this one is safe

Every glob that reaches this directory's parent is **non-recursive**, so a subdirectory is
invisible to all of them. There were already two subdirectories exploiting exactly this:

- `buildingAssets.ts` globs `./art/models/*.glb` — the 18 skill URLs.
- `three/GridworkModelPreview.tsx` globs `../art/models/*.glb` — the dev model bench.
- `townHall.ts` globs `./art/models/townhall/*.glb` — the 3 hall stages, in a subdirectory
  precisely so the 18-URL count stays meaningful.
- `roadModels.ts` globs `./art/models/roads/*.glb` — the same trick again, for roads.

`buildingAssets.test.ts` pins the consequence: exactly 18 skill URLs, exactly 3 hall URLs,
and the two sets disjoint. That assertion is what proves this directory is unwired, and it
is why these files are also absent from a production `dist/` — nothing imports them, so
Vite never emits them.

### The failure mode if a glob is made recursive, measured rather than assumed

**The count guard is only half a defence, and this is worth understanding before anyone
touches those patterns.** With `buildingAssets.ts` switched to `**/*.glb`, **43 files match
but they collapse to 22 keys** — because the registry is keyed by **basename**, and
`gridwork-modern/num-2-built.glb` collides with the live `num-2-built.glb`.

Two consequences:

1. The skill count moves 18 → 22 and the guard **does** go red. But the +4 is `townhall/`
   and `roads/`, **not these files**. The preserved set is invisible to any count.
2. What it actually changes is **which file a basename resolves to**, decided purely by
   glob key order. `gridwork-modern/` sorts *before* `num-*`, so the live entry is written
   last and still wins — measured: `num-2-built.glb` → `/src/city/art/models/num-2-built.glb`.

**That ordering is luck, not a design.** A preserved directory named to sort *after* `num-`
would have swapped era one's art out silently, with the URL count unchanged and every test
green. Anything that eventually resolves models per era (**D-ERA22**) should key on the
**full path**, not the basename. And note the dev bench (`GridworkModelPreview.tsx`) has no
count guard at all.

## Assigning them to an era is not done, and is not a filename decision

This directory is named for **what the art is**, not for an era. Which era eventually wears
it is an open design decision, and encoding a guess in the path would smuggle that decision
in as a filename.

The mechanism for wearing it is **D-ERA22**: model resolution becomes three-way (node,
stage, era), and the literal 18-URL guard is replaced by a completeness assertion with a
count behind it. Until that lands there is nothing for these files to plug into. Do not
wire them up ad hoc.
