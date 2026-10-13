# City Art Bible (warm "parchment city" — the one visual language for D1)

> ## 2026-07-27 AMENDMENT — the camera is a free orbit, not four fixed snaps (supersedes below)
>
> The camera in the **"Locked decisions (from the user)"** line below was **reversed,
> now confirmed by the user.** Where this banner disagrees with any section below,
> **the banner wins** — and the locked-decisions line and §5 are **annotated but kept
> for provenance**, so the record shows a decision that was *made and then changed*
> rather than one that was never made.
>
> **The camera clause did not survive or fail as a unit, so read points 3 and 4 before
> concluding anything about it.** Its rotation half is superseded; its rubber-band half
> was lost in the migration and has since been **built as originally asked for**. Three
> states, not two: locked → reversed in code → part honoured, part superseded.
>
> 1. **What was locked:** **FOUR fixed snap-rotations** (SimCity-2000 style),
>    **explicitly replacing free-orbit rotate**, keeping pan + zoom with a **gentle
>    rubber-band**. §5 spells it out: `Q`/`E` cycling four `Orientation` quarter-turns,
>    and "**Never a free orbit**."
> 2. **What ships (this is the reversal):** drei **`MapControls`** with the polar
>    **tilt pinned** at `0.72` rad (~49° elevation) by `minPolarAngle ===
>    maxPolarAngle`, and the **azimuth free through the full 360°** — continuous under
>    drag, `Math.PI / 12` (~15°) per discrete `Q`/`E` or button step. **Pan and zoom
>    are both bounded**: the pan target is held inside a square play area on x/z
>    ("you can't lose the base") and the dolly to **0.5×–2.6×** the default distance.
>    Those bounds are **elastic**, not walls — see point 3. **Damping** (`0.08`) is
>    **disabled under reduced motion**. Live source: `three/orbitCamera.ts`
>    (`VILLAGE_CAMERA`), `three/applyOrbit.ts`, `three/CityScene.tsx`.
> 3. **The rubber-band was lost with it — and is now HONOURED, not superseded.** The
>    locked line asked for pan and zoom with a *gentle rubber-band*. The migration
>    dropped it: what shipped was a **hard clamp**, and §5's `softClamp`, `OVERSCROLL`
>    and `settle` existed nowhere but this document. When that was written up on
>    2026-07-27 the user's answer was to **build it** rather than ratify the wall, so
>    the elastic edge is now real:
>
>    - Dragging past the island bound **resists** on the standard rubber-band curve
>      (`overscrollResistance`, iOS's `0.55` initial give) instead of stopping dead,
>      and releasing **settles** smoothly back onto the bound (`settleOvershoot`,
>      exponential, frame-rate independent).
>    - It applies to **both** clamps the camera actually has: the island pan bound
>      (up to `panOverscrollRatio` = 12% past it) and the dolly limits (8%).
>    - **It is OFF under reduced motion**, per §11, which names the rubber-band
>      specifically as something reduced motion removes. The allowance becomes `0`,
>      which collapses the same code path back into the old hard clamp — the rule is
>      expressed as "no give" rather than as a second branch that could drift.
>
>    Mechanics differ from §5's original description — a resistance curve and an
>    exponential settle rather than `softClamp` / `OVERSCROLL` / `settle` — because
>    those named a 2D scene container that no longer exists. **The behaviour the clause
>    asked for is what shipped**; only its implementation is new. Live source:
>    `three/orbitCamera.ts`, `three/applyOrbit.ts`.
> 4. **What survives of the original intent: the ban on free *tilt*.** Locking the
>    polar angle is what the four-snap rule was really protecting — a fixed oblique
>    view that keeps the city legible and the art readable. The shipped camera still
>    guarantees it (`minPolarAngle === maxPolarAngle`); only the **heading** opened up.
>    So this is a narrowing of the decision, not an abandonment of it.
> 5. **The other two locked decisions are UNTOUCHED and still binding:** the WARM
>    parchment/terracotta base (§1) and MODERATE juice (§6, never screenshake). This
>    amendment reverses the camera clause only.
>
> **Why this matters beyond camera feel — the reason it is worth a banner rather than a
> footnote.** Four authored views license designing a building as a handful of flat
> faces with unseen backs. Under a free 360° azimuth **every side is seen**, so every
> side has to be modelled. This bible is the document an artist actually reads, which
> makes it the worst possible place for the four-view framing to survive.
> `docs/Game_Visual_Design_Brief.md` §4.5 already carries the same correction; they
> should stay consistent.
>
> **Recorded after the fact, which is the useful thing for a future reader to know.**
> The code changed first — the camera became a free orbit during the React Three Fiber
> migration — and this record is catching up. So the gap between this banner's date and
> the commit that actually reversed the decision is real, and the design record was
> wrong in the interval rather than merely incomplete. The rendering-stack correction
> below noted the discrepancy on 2026-07-27; this banner is the formal supersession of
> the user's decision, and is the authoritative statement of the camera.
>
> **And the two halves were settled in opposite directions, deliberately.** Writing the
> drift down is what surfaced that the rubber-band had gone missing rather than been
> decided against — nobody had ever chosen the wall. Presented with that, the user kept
> the free orbit and asked for the rubber-band back. So a record that trailed its code
> ended up changing the code, which is the argument for keeping these banners honest
> rather than tidy: **point 3 exists because point 1 was still written down.**

_The locked visual design of record for the isometric calc-readiness city. It
turns the researched art direction into buildable, testable rules: **one** iso
angle, **one** lighting model, **one** palette (with switchable environments),
**one** icon style, **one** type ramp. Everything visible encodes one fact about
the student's mastery; nothing is decorative-only._

**Status:** locked for the Evan lane re-skin; implemented in `apps/web/src/city` — **as
amended by the 2026-07-27 banner above** (the camera is a free-azimuth orbit at a locked
tilt, not four snap-rotations) and as corrected by the rendering-stack note below.
**Owner:** Evan (`apps/web/src/city`; `@cr/game` stays pure/framework-free).
**Research (do not duplicate — read for rationale):**
`/Users/<user>/.cursor/projects/<project>/canvases/art-direction-proposal.canvas.tsx`
— the three-study synthesis (SimCity "art = UI", Supercell readability, Monument
Valley calm) this bible commits to.
**Builds against (those win on conflict):**
`Immersive_City_Shell_Spec.md`, `Game_Architecture_Blueprint.md`,
`D1_City_Builder_Design_Spec.md`, `docs/Contracts.md` §1/§3/§8.

**Locked decisions (from the user):** WARM parchment/terracotta base · FOUR fixed
snap-rotations (SimCity-2000 style) replacing free-orbit rotate, keeping pan +
zoom with gentle rubber-band · MODERATE juice (soft bounces, gentle poofs, mastery
glow; never screenshake).

> **The camera clause above is PART-SUPERSEDED by the 2026-07-27 amendment (banner at
> top).** Its four-snap rotation is superseded — the tilt is locked but the azimuth
> orbits freely. Its **gentle rubber-band is honoured**: lost in the migration, and
> since built for real on both the pan and zoom bounds (off under reduced motion).
> Kept as recorded, unedited, so both the reversal and the restoration stay visible.
> The parchment base and MODERATE juice clauses are unaffected and still binding.

> ## RENDERING-STACK CORRECTION (2026-07-27)
>
> This bible was written against the **PixiJS 2.5D** city, whose buildings were drawn
> as projected iso tiles. The city was migrated to **React Three Fiber** (React +
> three.js / WebGL) and now renders **true 3D** geometry from authored GLB models.
>
> **The art direction survives the migration and is still the design of record:** the
> palette LUT and its day/night/colorblind variants (§1), three-tone faces lit by one
> soft key light, chunky readable silhouettes, the icon style, the type ramp, and the
> rule that everything visible encodes one fact about mastery. Isometric is now the
> **look**, not the projection.
>
> **What no longer describes what ships:**
>
> - **The camera** (§0's old "snaps between four honest views", §5 in full, and the
>   four-snap locked decision above). **Now recorded formally in the 2026-07-27
>   amendment at the top of this document**, which supersedes the user's locked
>   decision and is the authoritative statement of what the camera does; it is not
>   restated here, so there is one record rather than two that can drift apart.
> - **Three module names, which do not exist:** `camera.ts` and its `cameraReducer`,
>   `cityScene.ts`, and `CityCanvas.tsx`. Their replacements are `three/orbitCamera.ts`
>   (fixed tilt + key→intent mapping), `three/applyOrbit.ts`, `three/CityScene.tsx`
>   (the world), and `three/CityCanvasHost.tsx` (the mount). `worldLayout.ts` **does**
>   survive and is still the shared layout/bounds source, but its
>   `orientedBuildingPoints` four-orientation re-projection is gone with the snap
>   camera.
>
> **What this costs an artist, which is the reason for both banners:** designing for
> four authored views licenses a building with a few flat faces and unseen backs. Under
> a free 360° azimuth **every side is seen**. Model all of them. (Stated at length in
> the amendment above, and the same correction as `docs/Game_Visual_Design_Brief.md`
> §4.5.)

---

## 0. One-line direction

A stylized, low-fidelity, meaning-dense isometric **toy city on warm parchment**:
calm and instantly legible, satisfying but never manipulative. Buildings are chunky
silhouettes lit by one soft key light; gold is earned, not decorative; the camera
holds one locked tilt and orbits freely around it; motion is gentle and always
optional.

---

## 1. Palette (warm, calm, LUT-driven)

The palette is shipped as a runtime **look-up table** (`apps/web/src/city/palette.ts`)
so the whole city recolors from one place and alternate environments come nearly
free. Colors are `0xRRGGBB` numbers, which three.js accepts directly; `hexString()`
renders any for the DOM.

### 1.1 Calm base (60 / 30 / 10)

| Role | Name | Hex |
| --- | --- | --- |
| Ground / terrain | Parchment | `#ECE4D3` |
| Tile shade / deep ground | Parchment deep | `#D9CCB2` |
| Parks / plazas / advanced glow | Sage | `#B9C4A9` |
| Roads / water / distant scenery | Slate mist | `#8FA9B8` |
| **HUD anchor (dark)** | Ink | `#14202E` |

### 1.2 Per-district hue families (low-saturation, warm → cool)

> **SUPERSEDED 2026-07-28 by D-ERA27 — hue is an ERA property, not a domain property.** The table
> below is kept as the record of the retired axis; it is no longer the rule.
>
> **Why it is retired rather than corrected.** Under one city and ten eras, every domain shares
> one island, and **every building freezes in the palette of the era it was built** — so a
> per-domain hue has nothing left to express. See `2026-07-27-era-progression-design.md` §5.3.
>
> > **AMENDED 2026-07-29, and the retirement is UNAFFECTED — only its reasoning was half wrong.**
> > This paragraph said skill buildings *"re-dress into their era's palette at every advance"*
> > against civic buildings freezing. **The team lead has since ruled that skill buildings do not
> > re-dress at all** (era design §6.1, §6.4a: *"everything should stay the same because of the
> > art overhead, with the exception of the town hall, which should retheme"*), so both classes
> > freeze and the contrast is gone.
> >
> > **D-ERA27 survives either way, and is if anything better supported:** a per-domain hue was
> > retired because hue belongs to the era, and now that a building's palette is fixed at
> > construction, **the era is the only thing a body hue can mean.** The one building that still
> > changes palette is the **Town Hall**.
> >
> > **What this DOES change for whoever draws to this Bible:** the ten era palettes must read
> > well **side by side on one island**, not only one at a time. Under re-dressing the city wore
> > a single palette at any moment; now an era-one thatch tone stands next to era-ten neon
> > permanently. §3's share-the-body-hue-differ-by-silhouette rule was written for *within* one
> > palette and still is — what is new is that **between** palettes now has to work too, and
> > nothing in this document yet says how. Flagged, not decided; it is Evan's.
>
> **This also dissolves the D10 gap rather than filling it.** The table has nine rows and no
> Geometry row, which for a while read as an omission to fix — it was not. Geometry needs **no
> colour of its own**, because no domain does. The `D10: 0x9a9a9a` placeholder in
> `palette.ts:103` and the Limestone `#BFB199` proposal in `Game_Visual_Design_Brief.md:173`
> both become **moot rather than wrong**: sound answers to a question that has been withdrawn.
>
> **What survives from this section**, and it survives unchanged: *within* any one palette,
> buildings **share the body hue and differ by silhouette plus accent** (§3), never by a second
> body colour. That rule now applies per era instead of per district.
>
> **The per-era palettes live in `eras/era-NN-*/style-guide.md`.** Era one is terracotta
> `#C98A5E` — the same hue this table gave D1, which is a coincidence that happens to suit rammed
> earth. The other nine are PROPOSED for review.
>
> **Retiring the axis in code is a follow-up PR**, not done here: `DISTRICT_HUES`
> (`palette.ts:92`), `districtHue` (`:212`), its consumer at `:261`, and
> `buildingFaces(domain, …)` (`:275`) — which has no production caller, only
> `palette.test.ts:58`, because the city renders per-node GLB models rather than palette-tinted
> faces.

Each district owns one hue family; **D1 (terracotta) is the only built one at MVP**,
the rest are authored so a future district renders in its family with no renderer
change. Within a district, buildings share the body hue and differ by **silhouette
+ accent** (see §3), never by a second body color.

| Domain | Family | Hex | Domain | Family | Hex |
| --- | --- | --- | --- | --- | --- |
| D1 Real Numbers | Terracotta | `#C98A5E` | D6 Functions | Eucalyptus | `#7E9C8B` |
| D2 Exponents | Clay | `#C9A15E` | D7 Linear Fns | Dusty blue | `#7E93A9` |
| D3 Linear Eqns | Ochre | `#B0A45E` | D8 Exp/Log | Muted indigo | `#8483A8` |
| D4 Polynomials | Sage-green | `#8FA97E` | D9 Trigonometry | Muted violet | `#9585A8` |
| D5 Rational | Teal-sage | `#6FA091` | | | |

### 1.3 Meaning & moments (reserved)

> **CORRECTED 2026-07-28 — the gold BODY treatment was retired and never shipped. The
> reservation of `#FFB703` stands; the claim that a body ever renders gold does not.**
>
> This row previously read: *"**Reserved** — a body is gold **only** when mastered (mastery =
> 3)"*, and the secondary row listed *"Gilding, pennants"* among its uses. Four shipped files
> agree that treatment is gone: `masteryVisuals.ts:16` — *"Stars REPLACE the retired gold
> body-tint: mastery is never shown by repainting the building gold, only by earning stars above
> it"*; `buildingAssets.ts:28-31` — *"there is no gold-mastered stage and no gold tint"*;
> `three/PlacedBuilding.tsx:32`; and `palette.ts:81`, where gold is commented *"reserved: reward
> / UI accent"* and `:234` says *"MasteryStars, never a gold building."*
>
> **What mastery actually looks like:** floating **stars above a topped-out building**, 0-3 of 3,
> turning gold and celebratory at 3/3 (`masteryVisuals.ts:46`). Stars are gated on the building
> having topped out, so a site foundation or construction scaffold shows none. There is also **no
> "comes alive" lit-windows or body-glow treatment** (`masteryVisuals.ts:10`,
> `PlacedBuilding.tsx:37`).
>
> **§4's stage table carries the same error** and has its own banner. The rows below are corrected
> rather than left standing, because this is a normative rules table that a designer reads
> directly.

| Role | Hex | Rule |
| --- | --- | --- |
| **Mastery gold (primary)** | `#FFB703` | **Reserved — the mastery accent.** Carried on the **stars** above a topped-out building (gold at 3/3) and on UI accents (Build button, readiness). **A building body is never gold**, in any era. |
| Mastery gold (secondary / warm) | `#F4A261` | Reward tokens, focus/selection ember. |
| Success (sparing) | `#2DC653` | Storm-cleared chip only; never a building body. |

Archetype **accent trims** (small area, aid answer-type ID): numeric → deep teal
`#4E7C8A`, multiple-choice → plum `#7E5A7A`, constructed-response → burnt amber
`#CC7A3B`, generic → slate `#6C7A88`. Accents are trims/markers, never the body.

---

## 2. Fixed 3-tone face lighting model

**One** soft key light for the whole city — no runtime lights. Every building
face is one of three tones of a **single** hue:

- **Top face — light:** `lighten(hue, 0.26)`
- **Left wall — mid:** `hue`
- **Right wall — dark:** `darken(hue, 0.28)`

`faceTones(hue)` and `buildingFaces(domain, state, variant)` derive this
deterministically (`palette.ts`). The model is variant-independent: only the
resolved hue changes (day/night/colorblind), never the top>left>right ordering,
so the light direction reads identically everywhere.

**Baked contact shadow / AO:** each plot draws a soft, offset **elliptical**
contact shadow (`drawContactShadow`, two stacked low-alpha ellipses in a warm
`#5B4A38` by day / cool near-black by night) *before* the volume, grounding it.
No runtime/dynamic shadows.

---

## 3. Buildings: silhouette-first, meaning-dense

One dominant shape + one accent, readable at max zoom-out. The engine holds an
abstract `silhouette` family (framework-free); the web layer maps it to geometry
(`FOOTPRINTS` in `cityScene.ts`):

| Archetype (answer-type) | Silhouette | Read |
| --- | --- | --- |
| `numeric` | **hall** | Wide, low, gabled ridge |
| `multiple_choice` | **tower** | Tall, narrow, pyramidal cap + finial |
| `constructed_response` | **workshop** | Medium block, sawtooth roof |
| `generic` | **block** | Simple cube, parapet |

Each building = 3-tone volume (§2) + baked shadow + a single accent trim band on
the sunlit wall + roof detail per silhouette + node label. **One visual state =
one mastery fact** (never decoration).

### 4. Milestone construction-stage upgrade language

> **CORRECTED 2026-07-28 — this table is stale in four ways, and the `gold-mastered` row
> describes a treatment that does not exist.** The corrected table follows; the original rows
> are quoted here so nothing vanishes silently.
>
> 1. **`gold-mastered` was RETIRED and never shipped.** It read *"`gold` (mastery = 3) | Gilded
>    body (`#FFB703`), finial, pennant, warm glow bloom"*. Mastery is shown by **floating stars
>    above a topped-out building**, 0-3 of 3, gold at 3/3 — never by repainting the body. See
>    §1.3's banner for the four files that agree.
> 2. **`advanced`'s "gentle sage grounding glow" is also gone.** There is **no** body-glow or
>    "comes alive" treatment (`masteryVisuals.ts:10`, `PlacedBuilding.tsx:37`). `advanced` is a
>    real state name but it **reuses the `built` model** (`buildingAssets.ts:28`).
> 3. **`HEIGHT_FACTOR` does not exist** anywhere in the tree, so "heights step per state
>    (`HEIGHT_FACTOR`)" describes nothing. `buildStageFor()` **does** exist — exported from
>    **`apps/web/src/city/palette.ts`**, not from `engines/game/src/construction.ts`, which
>    only mentions the name in a comment and exports no such function.
> 4. **The stage NAMES have moved.** The shipped model stages are three, not five:
>    `ModelStage = "site" | "construction" | "built"` (`ModelStage` in
>    `apps/web/src/city/buildingAssets.ts`) — note `construction`, not `under-construction`.
>    Each node ships its own model per stage, so a building rises **as itself** rather than
>    through a generic scaffold, which also retires the shared "muted timber, posts + rails, a
>    small bobbing crate" description below.
> 5. **A FIFTH item, found 2026-07-28 in review: `teaching` was on the wrong row of the
>    corrected table below.** It was listed under `construction`; `buildStageFor` returns
>    **`"site"`** for `teaching`, pinned by `palette.test.ts`
>    (`expect(buildStageFor("teaching")).toBe("site")`). Mid-lesson is deliberately still a
>    foundation — the scaffold appears when the learner reaches `practice`. The table now
>    matches. **Worth knowing why this was easy to get wrong:** `buildingAssets.ts`'s own
>    header comment annotated its `construction` GLB row *"(teaching / practice)"*, so the
>    code disagreed with itself. `buildStageFor` plus its test is the behaviour, and
>    **that comment is now FIXED** — `teaching` moved onto the `site` row where
>    `buildStageFor` puts it, in the city lane where the change belonged. No open item
>    remains here.
>
> The five-tier engine `construction_state` vocabulary is a separate axis and still stands; what
> changed is how many distinct MODELS it resolves to.

Discrete stages (like Clash of Clans town-hall levels), not a continuous morph —
the building visibly **accretes** as the skill is mastered. `buildStageFor()`
(`apps/web/src/city/palette.ts`) maps the engine's construction state to one of **three**
model stages (`ModelStage` in `apps/web/src/city/buildingAssets.ts`), and each node has its
own model at each:

| Model stage | From `construction_state` | Look |
| --- | --- | --- |
| **site** | `not_started`, `teaching`, `preview` | The node's own foundation model, plus a translucent blueprint ghost while placing. **Mid-lesson (`teaching`) is still a site** — the scaffold is earned at `practice` |
| **construction** | `practice` | The node's own scaffold model — it rises as itself, so the finished silhouette is already readable |
| **built** | `unfinished`, `complete`, `gold` | The finished model. `advanced` (mastery ≥ 2) and full mastery **reuse this same model** — there is no separate gilded or glowing version |

**Mastery rides above the building, not on it.** Once a building tops out, 0-3 filled stars of 3
float over its roofline, turning gold and celebratory at 3/3. A site or scaffold shows **no**
stars. The `advanced` tier remains in the state vocabulary for finer-grained mastery later, and
everything stays data-driven (never a hard-coded node id).

---

## 5. Camera: four fixed snap-rotations + pan/zoom

> **SUPERSEDED by the 2026-07-27 amendment (banner at top).** That banner, not this
> section, is the authoritative record of the camera: the tilt is locked and the
> azimuth orbits freely through 360°. This section is kept for the snap design and its
> rationale; `camera.ts`, `cameraReducer`, and `orientedBuildingPoints` no longer exist.
>
> **Pan, zoom, reduced-motion and keyboard parity below are still the intent**, and
> **the gentle rubber-band is live again** — it was missing for a while after the
> migration and was rebuilt on 2026-07-27, so the *rule* stated below holds even though
> its named machinery does not. `softClamp`, `OVERSCROLL` and `settle` never existed
> outside this document; the working equivalents are `overscrollResistance` and
> `settleOvershoot` in `three/orbitCamera.ts`, applied to the pan bound and to the
> dolly limits, and disabled under reduced motion exactly as the bullet below says.
>
> **Every number in this section is pre-migration**, including `OVERSCROLL = 150` and
> the `[0.55, 4.5]` zoom scale: the live overscroll is a ratio of each bound (12% of
> the pan bound, 8% of the dolly limits) and the zoom clamp is a 0.5×–2.6× distance
> ratio. Take the behaviour from here and the magnitudes from `VILLAGE_CAMERA`.

SimCity-2000 style. Rather than rotate the 2D scene container (which distorted the
2:1 iso tiles), each plot's grid cell is rotated about the neighborhood's grid
centroid and **re-projected** (`worldLayout.ts` `orientedBuildingPoints`). Because
the pivot is the centroid, the projected **center is invariant** across the four
orientations: a snap turns the city **in place**, keeps pan/zoom, and re-sorts iso
depth (front↔back genuinely flip at the opposite view).

- **Rotate:** `Q` / `E` and on-screen **Rotate view left/right** buttons cycle the
  four `Orientation` quarter-turns (`cameraReducer` `rotateCw`/`rotateCcw`, wrapping
  0→1→2→3→0). Never a free orbit.
- **Pan:** pointer drag + arrow keys / WASD. **Zoom:** wheel/pinch + `+`/`-` +
  buttons, clamped `[0.55, 4.5]`, default `2.4`.
- **Gentle rubber-band:** pointer pan may overshoot the world bounds with strong
  diminishing resistance (`softClamp`, max `OVERSCROLL` = 150 world units); on
  release `settle` eases exactly back. Keyboard steps hard-clamp.
- **Reduced motion:** no rubber-band (hard clamp), no eased glide — the rendered
  camera **snaps** to target; rotations are already instant.
- **Parity:** camera math is a pure reducer (`camera.ts`); every control is
  keyboard-operable when the map viewport is focused, and rotations are announced
  politely for screen-reader users (the DOM mirror is unchanged by a view turn).

---

## 6. MODERATE juice (calm, low-amplitude, reduced-motion-gated)

Never screenshake. Helpers live in `city/three/` (the world) + CSS (`styles.css`).

- **Button press:** squash to **95%** on `:active`, **elastic settle to ~102%**
  over **~150ms** via `cubic-bezier(0.34, 1.56, 0.64, 1)` (`.city-action`,
  `.city-chip`, `.city-icon-button`).
- **Skill complete:** a soft **bounce** (ease-out-back scale settle on the
  building), a gentle **poof** (8 warm puffs expand + fade), and a soft **chime**
  (synthesized E5→B5, `chime.ts`, best-effort/no asset).
- **Reward → HUD arc:** a `+1` gem token arcs from the world to the readiness
  counter, then fades (`.city-reward-arc`).
- **Mastery stars:** a topped-out building carries 0-3 filled stars of 3 floating above
  its roofline, turning gold `#FFB703` and celebratory at 3/3 (`three/MasteryStars.tsx`).
  *(**CORRECTED 2026-07-28** — this bullet read "**Mastery glow bloom:** complete/gold
  buildings carry a soft breathing glow (warm gold for gold, sage for advanced), drawn as
  stacked low-alpha ellipses behind the volume." It named the retired gold body stage and a
  body-glow treatment that was never shipped — `masteryVisuals.ts:10` states there is no
  "building comes alive" (lit-windows / body-glow) treatment. §1.3's banner has the rest;
  this bullet and §7's pennant were missed by that pass.)*
- **Reduced motion:** bounce/poof/chime/reward-arc are **all skipped**; the stars hold
  static; presses don't transform.

---

## 7. Ambient life (slow, sparse, frozen under reduced motion)

Procedural, capped, cheap: 4 slow **drifting clouds**, a **crate bob** on construction
sites, a gentle **selection bob** on the focused plot, and a few **traffic dots** +
**citizen drifters**. Everything non-essential **freezes** under
`prefers-reduced-motion` (the ticker is not even added). The city is fully legible
static.

*(**CORRECTED 2026-07-28** — this list also included "pennant **flutter** on mastered
buildings". The pennant belonged to the retired gold-mastered treatment, which never
shipped; see §1.3's banner.)*

---

## 8. HUD: dark frosted, contextual, sticker icons, one type ramp

- **Dark frosted "drafting glass"** panels over the warm world (fill
  `rgba(20,32,46,.72)`, warm hairline `rgba(244,162,97,.26)`, anchored to corners
  + the lower roster). Bright color only for notifications / celebration.
- **Sticker icons** (`HudIcon.tsx`): one icon = one meaning, **always paired with a
  text label** — meaning is never carried by the glyph alone.
- **One type ramp:** *Anybody Variable* for display/headings, *Commissioner
  Variable* for body/data; contrast panels behind text; warm light `#F4ECD9` /
  `#D8CBB2` on the dark HUD. **This pair is CONFIRMED as the ramp and is to be
  self-hosted — DECIDED (Evan, 2026-07-28), recorded app-wide in
  `docs/Game_Visual_Design_Brief.md` §4.8.1**, not here, because typography reaches
  the whole shell rather than just the city. The shipped ramp currently uses Fredoka
  and Nunito, which are **to be replaced**; these two are installed but never
  imported, so today they render as a system fallback. That record carries the exact
  change list, which is Gabriel's to land.
- **Never color alone:** construction state, storm phase, readiness, archetype all
  carry word labels in the DOM mirror (the semantic source of truth).

---

## 9. Runtime palette LUT — night + colorblind variants

`buildPalette(variant)` returns the whole concrete palette for a variant, switched
live from the HUD (day → night → colorblind), announced politely, and reflected on
`.city-surface[data-palette]`:

- **day:** the warm parchment identity above.
- **night:** a warm dusk — every color mixed ~42% toward indigo `#1B2740` and
  slightly dimmed; warmer lit-window accents; darker sky.
- **colorblind:** deuteranopia-friendly — lifted lightness and a blue-shifted
  "success" so hue is never the only cue (shape + word labels still carry meaning).

Gold `#FFB703` and the dark HUD anchor `#14202E` are held across all variants.

---

## 10. Global finishing pass

**One** overlay container (`.city-finishing`) carries the cohesion pass over the
whole scene: a subtle warm **gradient wash**, a soft **vignette**, and a faint
**grain** (inline SVG `feTurbulence`, ~4.5% opacity), `mix-blend-mode: multiply`,
`pointer-events: none`, below the HUD. Night/colorblind get their own tint.
**No** depth-of-field / tilt-shift blur (explicitly avoided per the research).

---

## 11. Accessibility (non-negotiable, preserved)

- The keyboard-navigable **DOM mirror is the semantic source of truth**; the canvas
  is `aria-hidden` progressive enhancement and fails closed to a warm DOM backdrop.
- **Reduced motion** freezes ambient life, drops juice + transitions, and snaps the
  camera (no glide, no rubber-band).
- **Never color alone**; **visible focus** ring (gold ember) on every control;
  roster nav vs. camera keys never conflict (different focus targets).

---

## 12. Enforcement — one art bible

One iso angle, one 3-tone lighting model, one palette LUT, one icon style, one type
ramp. New building types add a `silhouette` + `accent` token (engine) and a
footprint (web); new districts add a hue-family entry — no second lighting model,
no bespoke palette, no icon-only affordance.

---

## 13. Module map (`apps/web/src/city`)

- `palette.ts` — **new, pure:** warm LUT, 3-tone `faceTones`, district hues, gold,
  build-stage mapping, day/night/colorblind variants.
- `worldLayout.ts` — **pure:** layout, depth, world bounds. (The four-orientation
  re-projection went out with the snap camera.)
- `three/orbitCamera.ts` — **pure:** the fixed-tilt camera constants + the keyboard
  intent mapping (WASD/arrows pan, `+`/`-` zoom, Q/E orbit the azimuth, 0 recenters);
  `three/applyOrbit.ts` drives drei `MapControls` imperatively.
- `three/CityScene.tsx` — the world: 3-tone GLB buildings, contact shadows, stages,
  juice (poof/bounce/glow), ambient life.
- `chime.ts` — gated, synthesized skill-complete chime.
- `HudIcon.tsx` — sticker-icon set (label-paired, `aria-hidden`).
- `three/CityCanvasHost.tsx` / `CitySurface.tsx` — mount + variant/celebrate wiring;
  HUD, DOM mirror, camera controls, palette toggle, reward arcs, finishing overlay.
- `styles.css` — warm tokens, finishing pass, button-press + reward-arc juice,
  sticker layout, reduced-motion gating.
