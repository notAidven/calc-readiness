# Island assets: how to drop one in

**For Evan.** There are two shapes an island can arrive in, and **which one you have decides
which route you take**. Neither route touches rendering, navigation, camera or state code.

- **Typed terrain design** — palettes and scenery rules for the procedural island. This is what
  every island delivered so far has been, including eras three to seven in
  #668. Go to
  [Format §1](#1-typed-terrain-design--what-island-art-has-actually-been-delivered-as).
- **A model file** — an island delivered as geometry. Two steps:
  1. Copy it to **`apps/web/src/city/art/islands/island-era-02-neolithic.glb`**
  2. Change **one row** of **`apps/web/src/archipelago/islandManifest.ts`**

  Nothing uses this route yet; the slot exists so that a delivery does not have to wait for an
  interface to be negotiated.

Everything below explains the numbers in a row, what happens when something is missing, and how
to look at it. **`islandManifestEntry(eraId)` reports both shapes**, so the manifest is one place
to read whatever an era is wearing.

---

## The one row

`ISLAND_VISUALS` in `apps/web/src/archipelago/islandManifest.ts` has ten rows, one per era.
Every row is `PROCEDURAL_ISLAND` today. To deliver era two's island, that row becomes:

```ts
export const ISLAND_VISUALS: Readonly<Record<EraId, IslandVisual>> = {
  prehistoric: PROCEDURAL_ISLAND,
  neolithic: {
    format: "glb",
    file: "island-era-02-neolithic.glb",
    scale: 1,
    rotationY: 0,
    anchor: { x: 0, y: 0, z: 0 },
    seaLevelOffset: 0,
    // Optional for a long or cut-out silhouette:
    // pickingBounds: {
    //   kind: "box",
    //   min: { x: -30, y: -4, z: -18 },
    //   max: { x:  30, y: 12, z:  18 },
    // },
  },
  // …the other eight, untouched
};
```

The record is `Record<EraId, IslandVisual>`, so a missing era does not compile. `format` is a
closed union, so a format nobody wrote a loader for does not compile either.

> **Note.** The shipped `ISLAND_VISUALS` is currently written as a derivation over `ERA_SEQUENCE`
> (every era maps to `PROCEDURAL_ISLAND`). Replacing it with the literal ten-row object above is
> part of delivering the first island — the type is the same and `islandManifest.test.ts` asserts
> the record stays total either way.

### What each field means

| field | meaning |
|---|---|
| `file` | **Bare filename**, not a path and not a URL. Vite hashes the URL at build time, so a path written here would be wrong in production. |
| `scale` | Multiplied onto the model. `1` if the export is already in world units. |
| `rotationY` | Turn about **+Y in radians**, applied before `anchor`. |
| `anchor` | World-unit offset that moves the model's own origin onto the island's centre. `{0,0,0}` if the export is centred on its island. |
| `seaLevelOffset` | How far the waterline sits **below** the model origin, positive downward. The renderer lifts the model by this much so the shore meets the lagoon the game draws. |
| `pickingBounds` | *Optional.* Model-local sphere or box used for picking. Omit it and the island's own `landRadius` is used. A box is useful when a long/cut-out silhouette would make open water clickable. |
| `collisionBounds` | *Optional.* Separate model-local sphere or box for future physical collision. Omit it while the island is scenery; navigation and placement never infer physics from art. |
| `collisionRadius` | Legacy optional spherical shorthand. Prefer `pickingBounds` for a new drop. |

Everything else about an island — how far its land reaches, how big its lagoon is, the disc a
learner may build on, its complete footprint, what the camera has to fit, how big its mark is
on the bay overview, its palette, haze and finite fog bounds — is **derived** and is not yours
to write. `islandManifestEntry(eraId)` returns all of it. It is derived rather than restated so
a row cannot disagree with placement, picking, camera bounds or the citizens' walk.

---

## Coordinates and origin

- **Units** are world units. Era one's island is `landRadius` **30**, `seaRadius` **58**,
  buildable disc **22**, camera fit **34**.
- **+Y is up.** The ground plane is `y = 0` and the lagoon surface sits on it.
- **The island's centre is the world origin.** Buildings are placed on a grid centred there.
- **Facing**: the default camera looks along `−Z` (see `city/three/orbitCamera.ts`
  `VILLAGE_CAMERA`), so an island with a "front" wants that side toward `+Z`.

**Sizes per era, measured off `islandManifest()` rather than transcribed** — `sea` rounded:

| island | era | land | sea | buildable | camera fit | overview mark | ground authored |
|---|---|---|---|---|---|---|---|
| 1 | `prehistoric` | 30 | 58.0 | 22 | 34.0 | 30 | yes |
| 2 | `neolithic` | 38 | 73.5 | 30 | 42.0 | 32 | yes |
| 3 | `bronze_age` | 43 | 83.1 | 35 | 47.0 | 32 | yes |
| 4 | `classical` | 46 | 88.9 | 38 | 50.0 | 32 | yes |
| 5 | `medieval` | 46 | 88.9 | 38 | 50.0 | 30 | yes |
| 6 | `renaissance` | 46 | 88.9 | 38 | 50.0 | 32 | yes |
| 7 | `industrial` | 46 | 88.9 | 38 | 50.0 | 32 | yes |
| 8 | `atomic_age` | 46 | 88.9 | 38 | 50.0 | 35 | no |
| 9 | `information_age` | 46 | 88.9 | 38 | 50.0 | 33 | no |
| 10 | `cyberpunk` | 46 | 88.9 | 38 | 50.0 | 33 | no |

`islandManifestEntry(eraId)` is the authority; print it rather than trusting this table.
**"ground authored"** is whether that era's ground tones are designed yet or still wearing
`UNAUTHORED_TERRAIN` (`city/islandGround.ts`). Eras one through seven are authored after #668;
eras eight through ten are the named fallback population.

⚑ `land` is the **cumulative** land budget (`city/islandLand.ts`), which is why **seven of the
ten are clamped at 46** by `ISLAND_GROWTH_CEILING` and why islands four to ten are all the same
size. `overview mark` is the per-era figure instead (`archipelago/bayLayout.ts`, 30–35). Both are
on the entry so the gap is legible rather than buried. **Closing it is a change to
`islandLand.ts`**, which carries era one's pinned geometry digest — not a manifest change, and
not yours. Design to `land`, since that is what ships.

## Format — there are two, and the one you are using today is the first

⚑ **Read this section before the two-step at the top, because for terrain design the two-step is
not the route you want.**

### 1. Typed terrain design — what island art has actually been delivered as

Every island shipped so far is the procedural mass in `city/three/StarterIsland.tsx` dressed from
a **typed palette**: an `IslandTerrainTones` row (about twenty hex values — water, ground, earth,
shore, foliage, blades, reeds, rock) plus a ground pattern and its line colour. Eras one and two
live in `city/islandGround.ts`; **eras three to seven are authored by
#668 in `city/islandDesign.ts`**,
and that file is the pattern to copy for eras eight to ten.

If your delivery is palettes and scenery rules, **that is the route**: author the row, register it
in `ERA_ISLAND_GROUND`, and the island re-dresses. Nothing on this page's two-step applies, and
you touch no renderer either way.

The manifest still reports it. `islandManifestEntry(eraId).palette` hands back that era's live
tones and an `authored` flag, **derived from `islandGround.ts` rather than copied**, so an era
registered there shows up here the same commit with no manifest edit at all.

### 2. A model file — the slot, for an island delivered as geometry

**glTF-binary, `.glb`**, through the same `useGLTF` and the same `import.meta.glob(… "?url" …)`
resolution the 127 committed building models use, so an island resolves to a hashed,
CloudFront-served URL exactly as a building does. This is the two-step at the top of the page.

**Nothing uses it yet** — every row is `PROCEDURAL_ISLAND` — and it is here because a slot that
exists before it is needed is the difference between dropping a file and negotiating an interface.

### The one unresolved asset input

**The overview representation for a model-delivered island is unresolved.** The city can load
the existing `.glb` format through the narrow adapter above; the bay is an SVG composition and
cannot truthfully invent a thumbnail, sprite or second 3D renderer from that file. Until Evan
names that overview representation, the bay uses the typed manifest palette and procedural
silhouette. Do not add `.gltf` sidecars, FBX, USDZ or a guessed image convention: a new format
adds one typed union member and one adapter in review.

## Budgets

From #661 and the same-tip constrained run in this PR (`output/memory/`):

- The authored procedural graph may contain hundreds of named feature meshes, but the render
  adapter batches compatible opaque scenery. Era one's isolated render fell from **836 draw
  calls to at most 120**, and the full production city from **107,648 to 21,606 calls** in the
  same sample window.
- The 127 committed GLBs hold **24,983 `BufferGeometry` instances** in total; a session that
  visited every era could approach it. Island GLBs are selected-era only and are never
  preloaded as a ten-island set.
- A cold load into the city fetches **5.0MB over 86 requests** from a 105MB `dist`.

Drop budget: **≤3MB transferred GLB, ≤80 mesh primitives/draw groups, ≤150k triangles, at most
four 2048² textures, no 4K texture**. This leaves room under the 120-call isolated scene ceiling
for birds, transparent water and light/shadow passes the island does not own. Ten islands are
never loaded at once: the manifest eagerly inlines ten short URL strings, while `useGLTF(url)`
runs only for the selected era. A revisit may reload an evicted browser resource; it must never
make a visible model disappear.

---

## Preview it

```bash
npm run dev
# then open, with the bay flag on:
#   http://localhost:5173/?bay
```

`?bay` is the archipelago gate. It needs `import.meta.env.DEV` **and** the query parameter, so it
is off on the demo's own `?reset` URL and every branch behind it is compiled out of a
`vite build`. See `apps/web/src/archipelago/archipelagoFlag.ts`.

With `?bay` on: **☰ Menu → The bay** opens the overview. Your island's era shows as an island in
the arc; press it for its card, and **Sail to \<era\>** to stand on it.

The opening starts at the standing island and pans out. Selecting an island focuses it; Close,
Enter and Sail pan back in before returning to the normal city. Pointer, touch, keyboard and
toolbar controls issue the same typed camera command. With reduced motion, the same overview and
landed endpoints are reached without the in-flight frames.

To go straight to one era's island without the bay: `http://localhost:5173/?era=neolithic`.

## Replace one era safely — checklist

1. `cp your-island.glb apps/web/src/city/art/islands/island-era-<NN>-<era-slug>.glb`
2. Edit that era's row in `apps/web/src/archipelago/islandManifest.ts` — `file` first, then
   explicit `scale`, `rotationY`, `anchor` and `seaLevelOffset`. There are no guessed defaults.
   Add `pickingBounds` only if the derived land radius is a bad hit shape.
3. `npx vitest run apps/web/src/archipelago/islandManifest.test.ts` — this fails with a sentence
   naming your file if it did not land where the manifest looks, and lists every seating number
   that cannot seat anything.
4. `npm run dev`, open `?era=<era-slug>`, and look at it at **1024×580**. Adjust `scale`,
   `rotationY`, `anchor` and `seaLevelOffset` until the shore meets the water and the grid sits
   on the ground.
5. Open `?bay`, select the island, close its card, sail away and revisit it. Check overview,
   selected, mid-pan, landed and reduced-motion endpoints; no neighbouring island model should
   fetch merely because the bay opened.
6. `npx vitest run apps/web/src/archipelago` — in particular
   `assetSwapKeepsTheCity.test.ts` proves your change moved no byte of anybody's city.
7. `npm run typecheck && npm run lint`.

### What you never touch

`city/three/CityScene.tsx`, `city/three/StarterIsland.tsx`, the bay overview and its navigation
(`archipelago/ArchipelagoOverview.tsx`, `BayMap.tsx`, `IslandCard.tsx`), the ceremony
(`city/EraAdvanceCeremony.tsx`), or any state or persistence module. The model consumer is
`archipelago/IslandFromManifest.tsx`; the city fog and bay placeholder read only the derived
atmosphere/palette fields. All three already consume the row you edit.

`assetSwapKeepsTheCity.test.ts` holds that as a property rather than a promise: it asserts the
whole island layout byte-for-byte across a visual swap, and asserts that `islandManifest.ts` and
`islandState.ts` do not import each other in either direction. Injecting that import turns it
red.

## What happens when an asset is missing

**Nothing breaks, and it is visible.** A row naming a file that is not in
`city/art/islands/` resolves to the procedural island — that decision is in
`islandManifest.islandVisual`, so there is one implementation of "missing" — and
`islandManifestProblems()` reports it as a sentence naming your file and listing what did ship.
A half-finished drop is an island that looks unfinished, never a city that will not load.

While a delivered `.glb` is still arriving over the network the island is briefly absent rather
than procedural (one `Suspense` frame, the same fallback every placed building has). The
procedural mass is deliberately **not** built as a stand-in on a `glb` era, because building it
would pay the whole authored-graph cost of the thing being replaced.
