# Crisis reference packs, and the mechanic inventory every crisis art brief owes

**Date:** 2026-08-01
**Measured at:** `integration` `e53bf9cd`, with `art/winter-crisis-reference-pack`
(#369, open, `mergedAt: null`) merged
into the branch this was written on, because this pack extends that PR's generator.
**Scope:** the four shipping crises, at eras 1, 4, 6 and 9. Presentation only, and no code outside
`tools/`.

One directory per crisis, each with its plates, its contact sheet and its image-generation prompt
sheet:

| Pack | Crisis | Era | Plates |
| --- | --- | --- | --- |
| [`hard-winter/`](./hard-winter/) | The Hard Winter | 1 Prehistoric | 9 |
| [`succession/`](./succession/) | The Succession | 4 Classical | 6 |
| [`plague/`](./plague/) | The Plague | 6 Early Modern | 6 |
| [`intrusion/`](./intrusion/) | The Intrusion | 9 Information | 6 |

---

## 1. Where the renderer constraints live, and why they are not here

**They live at [`../crises/README.md`](../crises/README.md), under *"The hard boundary, shared by
all nine"* and *"What is available, which is the more useful half"*, and this document does not
restate them.**

That is a decision rather than an omission, and the reason is that a second copy of a measured
boundary is a second thing to keep true. Four lights, no post-processing, no image textures, no
environment map, nothing that tints a building at runtime, distance-only fog and one shadow map are
facts about `apps/web/src/city/three/`. They belong beside the nine briefs that already cite them,
and every brief in this pass points at that section by name rather than paraphrasing it.

**What this document adds is the layer above the boundary**: the mechanic inventory in section 3,
the propagation reading in section 4, and the pack conventions in section 5. None of those is a
renderer fact, and none of them was written down anywhere before.

### 1a. The shared boundary re-measured at `e53bf9cd`, with four corrections

`../crises/README.md` was measured at `952a0983` and the tree has moved. Per the repository's own
rule that a finding expires when the tree moves, every claim the three new briefs lean on was
re-taken at this tip. **The boundary itself holds in full**: the sweep for `pointLight`,
`spotLight` and `rectAreaLight` under `apps/web/src` still returns nothing,
`@react-three/postprocessing` is still not a dependency (`apps/web/package.json` carries
`@react-three/drei` and `@react-three/fiber` and no third), `apps/web/public` still holds one
folder and it is `audio`, the sweep for `TextureLoader`, `useTexture`, `<Environment`, `envMap`,
`RGBELoader`, `.png`, `.jpg` and `.webp` in non-test sources still returns nothing, and `faceTones`
and `buildingFaces` are still referenced only by `palette.ts` and `palette.test.ts`.

**Four things that section says are now wrong, and each of them makes a brief easier rather than
harder.**

1. **The lighting preset is no longer a proposal: it SHIPPED.** That section calls the nine
   lighting numbers *"the highest-leverage lever available to every one of these nine briefs"* and
   treats adding a crisis entry as hypothetical. `WINTER_LIGHT` exists at
   `apps/web/src/city/three/winterTones.ts:243` and is read by `CityLighting.tsx` and
   `CityScene.tsx`. So era one has walked this path and the three unbuilt crises can copy its
   shape rather than argue for it.
2. **The preset carries MORE than nine numbers, and the extra ones matter.** Beside the nine, the
   shipped shape carries **renderer exposure** (`exposure: 0.92`), **shadow intensity**
   (`key.shadowIntensity: 0.55`), a **key and fill position ratio** so the light ANGLE moves with
   the preset (`posRatio`), and **fog near and far as ratios** rather than as the fixed
   `radius x 3` to `radius x 20`. Every brief written against "nine numbers" understated the lever
   by four controls, one of which (the key's angle) several of those briefs then asked for in prose.
3. **`#296` is CLOSED, not open.** That section says *"#296 is OPEN and would move five era body
   hues"* and prints a pending column. Read from the API: `state: CLOSED`, `mergedAt: null`.
   **Those pending values are historical and superseded.** The live guides carry era four
   `#D2C8AA`, era six's warm-buff body `#C7A48E` under dark slate/sheet lead `#596675`, and
   era nine `#96A1AB`. The packs use the live guide values.
4. **The emissive guard was loosened, and it was loosened the way that section's own argument
   asked for.** Era one's brief listed *"emissive anywhere in the winter layer"* as blocked by
   `winterGround.test.ts` and said loosening it owed a demonstration. That is done:
   `winterGround.test.ts:1445` now asserts emissive is zero on everything **except a named flame
   face**, and it asserts the exemption in both directions, so an exempt material that stops being
   emissive fails too. **Era nine leans on this hardest** and can now cite a precedent rather than
   a request.

**`#298` is still OPEN** (`mergedAt: null`), so the per-era buildable radii are still design
figures and the clipping obligation in that section still stands, unchanged.

---

## 2. What went wrong with era one's brief, stated plainly, because it is the reason this exists

The team lead's words: *"make sure that it includes every possible mechanic/feature we would want
in the crisis; for example, the last brief for the Hard Winter didn't design what the fire would
look like, or the shielded buildings."*

**He is right about the brief and the diagnosis generalises past his two examples.** Era one's
brief spends its length on atmosphere and on damage states, both thoroughly, and it treats the
things the player OPERATES as either finished or as somebody else's section. Measured against that
brief:

- **The fire has a section (§4) and it is about the fire's own read**, not about its states in
  play: no aimed-coverage footprint, no pre-commit preview, and duration named only as a
  recommendation in one line (§4.4).
- **The shield has no section at all.** *"Reinforce"* appears in that brief only as a card in §5
  and as a copy line in §7.3. There is no geometry, no state, and no mention of what a spent
  shield looks like.
- **Nor does the threatened building**, which is the state that makes the shield a decision.

**The failure has a shape and it is worth naming, because it is what an inventory is for.** A brief
written by walking the six atmosphere axes gets a thorough mood and a thorough hazard, because both
are properties of the WORLD. Everything the player does is a property of the LOOP, and the loop has
no axis list. So the interactive half is not argued away, it is never reached, and an omission that
is never reached is invisible in review: a reader checking that brief against its own table of
contents finds nothing missing.

**The inventory below is the missing table of contents.** Its whole job is to make an omission
visible, and it does that by requiring a row for every mechanic and by requiring the row to say
either what the player sees or that this crisis has no analogue. **A blank row fails; a row saying
"no analogue, because ..." passes.**

---

## 3. THE MECHANIC INVENTORY, derived from era one's built code

**Derived, not invented.** Era one is the only crisis that exists, so its mechanics are the honest
answer to *"what can a crisis in this game even have"*. Every row below names where it lives in the
tree at `e53bf9cd`, so the list can be re-derived rather than trusted, and so a reader can tell a
built mechanic from a designed one.

**Twenty-two rows.** Three of them are era one's own gaps and are marked; those are the addendum's
subject (`../2026-08-01-hard-winter-art-brief-addendum.md`).

| # | Mechanic | Era one's instance | Where it lives at `e53bf9cd` |
| --- | --- | --- | --- |
| **M1** | **The crisis call**, on the city, before the player enters | A chip on the city HUD plus briefing slides in the era advisor's voice | `apps/web/src/city/crisisCall.ts`, `crisisBriefingFor` |
| **M2** | **The city while a call is unanswered.** D-CRISIS-35 freezes building and leaves learning alone | **Unbuilt.** `useCrisisCall` fires on the mastery crossing and is session-local and transition-only, so a learner who loads a city already past the trigger is called by nothing | `crisisCall.ts`, `useCrisisCall`; the gap is the crisis spec's O-13 chain |
| **M3** | **Entry and exit**, as a change on screen | The lighting preset swaps in; `thaw.ts` reverts the weather and keeps the damage | `winterTones.ts` `WINTER_LIGHT`, `apps/web/src/winter/thaw.ts` |
| **M4** | **The atmosphere**: light, sky, fog, exposure | Overcast, key down to 0.58 and raised in angle, sky `0xdce0de`, fog pulled in to 1.4 and 10 | `winterTones.ts:243`, `CityLighting.tsx`, `CityScene.tsx` |
| **M5** | **Ground under the crisis** | A snow course on the shared decal ladder, plus drifts banked against verticals | `WinterGround.tsx`, `winterScene.ts` |
| **M6** | **Water and shoreline under the crisis** | The lagoon goes to `WATER_COLD` and the sea dissolves into the fog | `winterTones.ts` |
| **M7** | **Vegetation under the crisis** | Snow caps on the plant archetypes | `winterScene.ts`, `StarterIsland.tsx` |
| **M8** | **The hazard's own body, and its stages** | Frost, three stages, drawn by relief rather than by tone | `winterFrost.ts`, `HARD_WINTER.frost` |
| **M9** | **The propagation, and its leading edge** | The frost line, one rung up and one tone colder, advancing on `spread` | `winterFrostFront.ts`, `HARD_WINTER.spread` (`base: 1`, `step: 1`, `accelerate_every: 4`) |
| **M10** | **The player's counter-mechanic, as an object** | A hearth of stone and fuel with a smoke column that reads over rooftops | `winterFire.ts` |
| **M11** | **Its own states**: proposed, declared but inert, working, spent | The hearth with no ember is a declaration that bought nothing; a burnt-out one is blackened | `winterFire.ts`, `WinterGround.tsx` (`radius === null`) |
| **M12** | **Its aimed coverage**, and the footprint that coverage takes | The warded patch, feathered at its rim so it is not another cell edge, sized by `radius_by_tier` | `WinterGround.tsx` `TERRAIN.warded`, `winterFireGhost.ts` `WARDED_TERRAIN` |
| **M13** | **Its pre-commit preview** | A ghost of the RESULT: ghosted hearth, ghosted held ground, damped flame heat | `winterFireGhost.ts` |
| **M14** | **Its duration** | `burn_rounds_by_tier` runs 2 / 2 / 3 and **nothing draws it.** `WinterFire`'s view carries `rounds_left` and no mesh reads it | `HARD_WINTER.fire.burn_rounds_by_tier`; **GAP** |
| **M15** | **Protection**, and how much is left | A storm roof oversailing the wall, battens, a berm up the visible walls; shielded is binary on screen and the magnitude is deliberately not drawn | `origin/game/winter-shield-and-threat`, `winterShield.ts`; **no pull request exists**, so nothing has landed |
| **M16** | **The threatened-but-unprotected building** | A standing marker at the building's corner, in an amber placed outside the correctness palette | same branch, `CrisisStatusMarker.tsx`, `winter/buildingThreat.ts`; **not landed** |
| **M17** | **Accumulating damage short of destruction, and the threshold** | Frost climbing the building in three appearances; `ruin_at: 6` with bites of 2, 2, 2, 3, 3 | `frostStage.ts`, `HARD_WINTER.damage` |
| **M18** | **The ruin** | A stage swap to the ruin template: silhouette collapse, still a click target, still carrying its lesson | `ruinStage.ts` |
| **M19** | **Ground lost for good** | Scarred ground on the island's `worn` rung, in the island's own hearth ash `#8D8A82` under a 45-degree hatch. **Nothing in era one is lost for good**, and the row's title is the inventory's generic one: this ground is durable rather than permanent, and M21 is what ends it | `ScarredGround.tsx`, `winterTones.ts` `WINTER_GROUND_TONES.abandoned` |
| **M20** | **Repair and rebuild**, as an action and as a visible result | Material spent on the island afterwards; `repair_cost_per_point` derived as `rebuild_cost_per_ruin / ruin_at` | `apps/web/src/city/crisisRepair.ts`, `HARD_WINTER.damage` |
| **M21** | **Giving ground up, and buying it back** | The pull-back, and `abandon.reclaim_cost_per_cell: 3`. **A reclaimed cell keeps no mark**: it leaves `ruined_cells`, so the layer draws nothing for it and the ground is the island's own again | `HARD_WINTER.abandon`, `crisisRepair.ts`, `ruinSeam.test.ts` |
| **M22** | **The accuracy ladder, read off the board** rather than off a card | Three nested footprints drawn as raised outlines with a tier badge, so the player sees what is already frozen inside the band they are considering | `WinterGround.tsx` `WINTER_PREVIEW_TONES`, `hw-cell__need` |
| **M23** | **Ambient motion** | Falling snow as posed instanced meshes, gated on `prefers-reduced-motion` | `winterSnowfall.ts` |
| **M24** | **The conclusion**, as a screen with a derived verdict | A standalone sheet with a building tile per building and the accuracy in one sentence | `winterConclusionSheet.browser.test.tsx`, `HardWinterSurface.tsx`; D-CRISIS-30 |

**How to use it.** Each brief in this pass carries the same 24 rows in its own section 1, with two
columns: **what the player sees** and **how it is told apart from its neighbours at a glance**.
Where a crisis has no analogue the row says so and says why, and that sentence is the deliverable
for that row. Section 4 of each brief then designs the rows the crisis actually has.

**One rule about the "no analogue" answer, because it is the row most likely to be abused.** *"Era
four has no hazard object"* is a legitimate answer and it changes what the brief owes: it means the
atmosphere has to be carried by a city that has stopped working, and the brief has to say that
instead. *"Era four has no propagation"* would be a false answer, because a district drifting to a
claimant is propagation with an unusual topology. **The test is whether the PLAYER meets the
mechanic, not whether the crisis implements it the way era one does.**

---

## 4. The propagation reading, shared by all four

D-CRISIS-8 separated the propagation crises on deliberate axes so a player does not meet the same
mental model twice. That separation is stated in the crisis spec as a fact about the mechanics.
**It has never been stated as a fact about the picture**, and the picture is where a player meets
it. So this is the one paragraph all three new briefs point at rather than each deriving:

| Era | What propagates | Along what | What the player watches | The one-word read |
| --- | --- | --- | --- | --- |
| **1** Hard Winter | Frost | **Tile adjacency.** A front, advancing inward from the rim | **An edge, and which way it is moving** | **Creeping** |
| **4** Succession | Allegiance | **Nothing spatial at all.** A district decides, on its own, in favour of whoever is currently strongest | **An object arriving at a plinth before the decision lands** | **Tipping** |
| **6** Plague | Infection | **Authored links between buildings people use.** Two linked buildings need not touch | **A line in the floor, and what has travelled along it** | **Reaching** |
| **9** Intrusion | Compromise | **Nothing visible.** Status is hidden per building and the only way to learn it is to read a panel | **A table of readings, and how old each one is** | **Suspecting** |

**Read down the fourth column and the four are four different visual jobs**, which is the point:
watch an edge, watch an object appear, watch a line, read a board. **Nothing else in this pass may
blur those four**, and each brief's section 4 says how its own propagation reads differently from
the frost and from the other two.

**Two collisions this reading exists to prevent, both of them named in the sources.**

- **Era six against era seven.** The crisis spec warns that D-CRISIS-8 moved the Plague onto a link
  layer the Boiler Cascade also wants, and that an identical visual language would invite a player
  to sever era seven's network, which is correct in era six and destructive in era seven. Era
  seven is shelved and the warning is still live, because a shelved design comes back. **Era six's
  links are IN the floor and era seven's are ON it**, and plate `02` of the plague pack draws both
  once so nobody has to imagine the difference.
- **Era six against era nine.** Era six's infections are hidden and era nine's statuses are hidden,
  and the two hide different things. **Era nine has no edge layer at all**, and drawing one would
  import era six's topology into a crisis that does not have one. Era nine's own brief says this in
  its section 2.2 and this pass holds to it: era nine's marks say *where evidence was found*, not
  *what is connected to what*.

---

## 5. Pack conventions

**The plates are renders, not annotated diagrams.** No plate carries a word. Era one's six set that
register and there are two reasons to hold it: the rasteriser draws no text, and a states question
is settled better by putting the states side by side in one frame than by labelling them. **Each
pack's README names the states left to right**, and that is where the reading key lives.

**Every plate is 1400 x 900, at the fixed camera.** Tilt reads as about 49 degrees, matching
`VILLAGE_CAMERA.polarAngle` (0.72 rad). No plate pitches the camera toward the horizon, because the
locked tilt is in the AVOID list of `docs/Game_Visual_Design_Brief.md` §4.11.

**Every mass is shaded by the three-tone face model**, computed rather than eyeballed: top is
`lighten(hue, 0.26)`, left is the hue, right is `darken(hue, 0.28)`, from `City_Art_Bible.md` §2
and `palette.ts`'s `faceTones`. So a plate cannot promise a shading relationship the authored
direction does not have.

**No mass in any plate is a building design.** Island design, building design and the civic
catalogues are Evan's lane per `docs/Content_Authoring_Split.md` §11 and this pass writes none of
it. The masses are stand-ins carrying the era's body hue, its roof idiom and its dark ground-level
element, so a crisis mark has something era-correct to sit on. **A reviewer who reads a mass here
as a proposal should read it as a placeholder instead**, exactly as era one's pack already says.

**Reserved colour is respected.** Mastery gold `#FFB703` appears in no plate. `CIVIC` green and
`BRICK` red are the correctness palette and carry no crisis state here. Where a crisis needs a
standing mark of its own, it takes the amber that `../crises/README.md` places outside the
correctness palette on purpose.

**No plate is drawn with a stroke.** Every line, band, batten and notch is a filled polygon. That
is not a style preference: see section 6.

### 5a. The generator, and how to re-run it

**Every file in every pack is generated**, including the PNGs, by
`tools/generate-winter-crisis-references.ps1`. An edit to an `.svg` is lost on the next run.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate-winter-crisis-references.ps1
```

It takes `-Pack hard-winter|succession|plague|intrusion|all` (default `all`) and `-SkipRaster`.

**It was extended rather than forked**, on the reasoning that ground, camera, shadow direction and
the face model are properties of the renderer and not of a crisis, so four scripts would have
drifted on all four. Era one's six plates are unchanged by the extension: **regenerating over the
committed files leaves all six byte-identical**, which is the property that lets this diff be read
as three packs added rather than four packs rewritten.

---

## 6. What is measured about the tooling, because two things about it are wrong

**Both were found by running it, and neither is fixed for era one's committed plates**, because
those are an open pull request's files and this pass is not the place to rewrite them.

### 6a. Era one's plates reproduced on Windows and on no other platform. Fixed here

`Set-Content -Encoding UTF8` means UTF-8 **with** a BOM on Windows PowerShell 5.1 and **without**
one on PowerShell 7, and the line terminator it appends is the host's. Measured: re-running the
original script under pwsh 7.4.6 on Linux rewrote all six SVGs and the contact sheet, differing in
**the BOM and the final terminator and in nothing else**.

The committed bytes are UTF-8 with a BOM, an LF body and a single trailing CRLF.
`Write-Utf8BomCrlfTerminated` now writes exactly those bytes on every platform, so the pack README's
byte-stability claim is true everywhere rather than on one platform. **Verified by regenerating on
Linux over the committed files: the six SVGs come back byte-identical.**

### 6b. The committed PNGs are not what a browser draws, and the divergence has one cause

`System.Drawing` is Windows-only from .NET 6, so the PNG pass cannot run on Linux or macOS at all.
It now probes by constructing a bitmap (loading the assembly succeeds and then throws at first use,
so an `Add-Type` that returns proves nothing), warns, and names the fallback:
`tools/rasterise-crisis-references.mjs`, which drives the repository's own Playwright Chromium and
so adds nothing to install.

**The two rasterisers disagree wherever a `<polygon>` carries a stroke**, because SVG closes a
polygon's outline and `Graphics.DrawLines` does not. **Measured, and there is exactly one instance
in the tree:** era one's `05-fire-smoke-column.svg` renders as a closed leaf-shaped column in
Chromium and as an open zigzag ribbon in the committed `05-fire-smoke-column.png` beside it. The
same construct is in `01-wide-master`. Since `index.html` loads the SVG, **a reviewer opening the
contact sheet and a reviewer opening the PNG are looking at different smoke.**

**Two consequences a reader has to be told rather than left to discover.**

- **The winter pack now holds PNGs from two rasterisers.** Plates 01 to 06 are the committed
  `System.Drawing` renders and are untouched here. Plates 07 to 09 are Chromium renders, because
  there was no other way to produce them on this machine. **This is a wart and it is recorded
  rather than hidden.**
- **Nothing added in this pass uses a stroke**, so every new plate renders the same under both.
  The recommendation to whoever owns #369 is to rasterise the whole pack through Chromium and drop
  the `System.Drawing` path, which would make the PNGs agree with the SVGs and remove the mixture.
  **That is a change to an open PR's files and is deliberately not made here.**

---

## 7. Related

- [`../crises/README.md`](../crises/README.md): the shared renderer boundary, the carrier set, the
  shutter plate, the copy rules and the per-era decal reach. **The boundary is stated there and
  nowhere else.**
- [`../crises/era-04-succession-crisis.md`](../crises/era-04-succession-crisis.md),
  [`era-06-plague.md`](../crises/era-06-plague.md),
  [`era-09-intrusion.md`](../crises/era-09-intrusion.md): the merged presentation briefs for the
  three unbuilt crises. **The art briefs in this pass extend these and do not replace them.**
- `../2026-07-30-hard-winter-crisis-art-brief.md` and
  `../2026-08-01-hard-winter-art-brief-addendum.md`: era one's brief, and the three mechanics it
  never designed.
- `../2026-07-30-winter-crisis-scene-assets.html`: **the scene-asset sheet era one's art direction
  was turned into** — nine assets, and the layer between a brief and a commit. It is not a plate pack
  and nothing in it ships as HTML: asset 1 is a table of lighting numbers, assets 2 to 9 are three.js
  source, and the page is only the carrier. **Listed here because it was reachable from no index at
  all.** Until this entry its only references anywhere in the tree were three code comments —
  `apps/web/src/city/three/winterTones.ts:142`, `winterScene.ts:10` and `ruinStage.ts:25` — each of
  which finds it only if you are already inside the file that wired it.
- `../2026-08-01-winter-crisis-mechanics-scene-assets.html`: **batch 2, and the sibling of the sheet
  above.** Five assets for the five mechanics era one shipped without art direction — the fire's four
  states, duration in the fuel, held ground against the frost's edge, the five protection states, and
  the two crisis badges. Same nature as batch 1: procedural three.js and plain numbers, nothing that
  ships as HTML, and no tone added to any table. **It arrived bundled and carries five defects from
  the bundler rather than from the design; §7a lists them, and says which one had to be fixed.**
- `../2026-07-29-mid-era-crisis-design.md`: the ruled mechanics, D-CRISIS-8's propagation axes, and
  D-CRISIS-33's set of four.
- `../2026-07-30-era-palette-ladder.md` and `../eras/era-0N-*/style-guide.md`: the body hues and
  floors these packs are drawn in.
- `docs/Game_Visual_Design_Brief.md` §2 and §4: the tone bans and the locked art direction,
  including the reserved meaning colours. **Read as binding; not amended by this pass.**

---

### 7a. Batch 2 arrived bundled: four defects recorded, and one that had to be fixed

`../2026-08-01-winter-crisis-mechanics-scene-assets.html` is a design hand-back. **Its content was
checked and its content is right** — the five traps it was briefed around are all handled correctly,
including the `safe` hexagon, the blue threat badge and the gable, and all fourteen entries in its
tone table match the tree by name and by value. What is wrong with it was done by the bundler it was
delivered in, so it is listed rather than edited: a hand-back that gets silently corrected stops
being a record of what was handed back.

**1. Six camelCase identifiers are mangled in the code blocks, and the code will not compile until
they are fixed at the wiring site.** The bundler rewrote binding positions and left call sites alone,
so each name still appears correctly a few lines away. The pattern is `sc-camel-a-b` → `aB`, and this
is the whole population: of 131 binding-position declarations across the five blocks, exactly six
hold a multi-word camelCase name and all six are mangled, with **no intact counter-example**.

| Line | Mangled | Should be | Asset |
| --- | --- | --- | --- |
| 302 | `sc-camel-wind-deg` | `windDeg` | 1, the fire's four states |
| 302 | `sc-camel-top-y` | `topY` | 1, the fire's four states |
| 483 | `sc-camel-on-rim` | `onRim` | 3, held ground against the frost's edge |
| 593 | `sc-camel-wall-span` | `wallSpan` | 4, the five protection states |
| 597 | `sc-camel-shield-rise` | `shieldRise` | 4, the five protection states |
| 926 | `sc-camel-parent-y` | `parentY` | 5, the two crisis badges |

**2. Its provenance line names a commit where the thing it rules on was still true.** The header says
*"measured at integration `091a729a`"*, which is #381's merge. The `safe` hexagon was removed later,
by #388 (`mergedAt`
2026-08-01T21:24:14Z) and #400
(2026-08-01T22:23:40Z), so at `091a729a` `MARKER_TONES` still carried three entries including
`safe: { face: W.STONE, edge: W.STONE_DARK }`. **The document's ruling is the current one and its
citation is the stale one**, which is the more dangerous way round only because it reads as checked.
Trust the body, not the header, and re-measure against the tip.

**3. Three bundler-local URLs survive and resolve to nothing.** A `<script src="74329038-527c-…">`
in the head where batch 1 names `./support.js`, fifteen `@font-face` rules whose `src` points at
bundled UUIDs, and a bare `preconnect` to `https://fonts.googleapis.com` with no stylesheet behind
it. **Measured in Chromium: zero off-machine requests, and two dead local ones**
(`ERR_FILE_NOT_FOUND`). They are inert rather than merely harmless: stripping all of them renders
**pixel-identical** to leaving them, same page height and same box on every element measured, because
`font-display: swap` falls straight through to the fallback face. So they cost nothing and were left
as delivered.

**4. It cites a directory that does not exist.** *"The five frames in `failed-codex-pass/`"* — that
path is in no commit on any ref. It is a **negative** citation, naming image-gen output the sheet
deliberately did not derive from, so nothing in the sheet depends on it; but a reader cannot check
the claim either.

**5. One defect was FIXED rather than recorded, because it broke `npm run lint`.** The bundler
dropped the `lang` attribute batch 1 carries, leaving `<html><head>`, and `biome.json` excludes
`**/*.dc.html` but not plain `**/*.html` — so both sheets are linted, batch 1 passes only because it
has `lang="en"`, and batch 2 failed `lint/a11y/useHtmlLang` with exit 1. A red trunk is not a thing
to preserve for the record, and this is the `<html>` wrapper rather than the `<x-dc>` payload the
hand-back consists of, so `lang="en"` was restored to match batch 1. **The edit is one line and
provably touches nothing else**: the `<x-dc>` payload is byte-identical either side (72,004 bytes,
`sha256 f9d662a1…`) and the rendered page is pixel-identical (screenshot `sha 4e775732…`). Every
other defect above was left exactly as delivered.
