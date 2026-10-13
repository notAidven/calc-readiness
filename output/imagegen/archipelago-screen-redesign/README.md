# Archipelago screen redesign: Codex ImageGen concept pass

**Pipeline stage:** 1 of 2, complete before the Claude Design refinement package.
**Source tree:** `integration` / `699519b826233e721e29f296067fac67c0982591`
**Run date:** 2026-08-06 UTC
**Production code changed:** none

## Inputs

The generated studies were image-conditioned on real 1024x580 learner captures, not on PR #688's
generic island drawings:

- `reference/real-era-one-1024x580.png` — the real
  `CitySurface → CityScene → IslandFromManifest → StarterIsland` path, with one placed skill
  building and the era-one Town Hall.
- `reference/real-era-two-1024x580.png` — the same renderer on the Neolithic island, with the
  Town Hall and no skill buildings.

Both were captured by the existing gated
`apps/web/src/archipelago/archipelagoNavigation.browser.test.tsx` harness at 1024x580 on the
learner mount. The exact source files used for generation are copied here because a WebGL capture
can differ at the pixel level on another GPU.

## Outputs

| File | Study | Useful finding | Do not carry forward |
| --- | --- | --- | --- |
| `01-harbor-ledger.png` | active actual island | The production island can remain the hero while fixed arrows, an Era + topic banner, standing-location note and one CTA remain legible around it. | It invents duplicate neighbouring island renders and rounds the arrows down below the requested prominent 92x170 target. |
| `02-tideglass-lock.png` | locked future | A future place can remain colourful and desirable while a perimeter grammar and explicit consequence carry the lock. | The beacon models, compass glyphs and corner mini-islands are invented assets. The final state uses a flat chart ring and words, not new 3D props. |
| `03-founding-tide.png` | ceremony / diagnostic empty | A temporary shoreline event can make a real empty island feel founded without drawing a bridge. The Town Hall remains the landmark. | The radiating glow is too close to reward spectacle, the retained city HUD competes with the carousel, and the wake is not visibly temporary in one still. |

ImageGen returned all three files at **1536x1024** despite the requested `16:9` aspect. They are
composition studies only. They are not the required final 1024x580 evidence and must never be
presented as fit-faithful frames.

## Direction handed to refinement

The refinement takes a deliberate hybrid:

1. **Harbor Ledger's hierarchy:** real renderer large in the frame, fixed arrows, compact banner,
   one CTA, standing-era note.
2. **Tideglass's positive lock:** full-colour actual future terrain, a bespoke chart perimeter,
   and explicit “preview available / building not yet available” copy. No padlock and no grey-out.
3. **Founding Tide's event:** shore pulses and a short-lived wake only during ceremony, with no
   bridge or permanent line between islands.

It rejects PR #688's Cormorant/Inter typography, navy/ivory/oxidised-copper instrument palette and
generic island silhouettes. The package uses the product's shipped **Fredoka Variable + Nunito
Variable** pairing, its existing ink/paper/signal tokens, and raster captures of the actual
in-game island renderer.

## Reproduction record

`RUN-RECORD.md` preserves each prompt, output dimensions and SHA-256. The ImageGen surface did not
expose a model revision or seed; those fields are recorded as unavailable rather than invented.

## Second-pass review (Claude Design revision)

The design revision re-opened all three studies against the refinement they produced. The three
"useful finding" columns above stand. Four things the first intake did not say, all visible in
the committed files:

1. **Every study puts a Town Hall on an island its own caption says is not settled.** Study 02
   reads `CHARTED · NOT YET SETTLED` over an island with a hall and a laid plot; study 03 reads
   `FOUNDING` over one that is already founded. The first intake caught this for study 03 only.
   The revision's closed and cleared frames therefore carry **no hall at all**, which is what
   made a purpose-built unfounded capture necessary rather than a borrowed one.
2. **Study 02's ring of dotted beacons is the direct ancestor of the treatment the lead
   rejected.** It is decorative rather than communicative: nothing on that frame says entering is
   withheld, and its only action is a relabelled `PREVIEW THIS ERA`. The revision keeps the
   positive, full-colour island and replaces the perimeter with one bespoke mark plus an entry
   control that is present and visibly refused.
3. **Study 03 kept the city HUD, and so did the first refinement pass — by a different route.**
   The study draws `MASTERED`, `CITY LIFE`, `POPULATION`, `Day` and `Menu` around the island; the
   refinement then composited over a whole-app screenshot in which the same HUD was legible
   through the hero at low opacity. Two different mistakes with one cause: a picture of the app
   is not a picture of the renderer. `capture/` exists so the distinction is mechanical.
4. **Study 01 captions island one "REAL NUMBERS".** The product's own label for that domain is
   "Real Numbers & Arithmetic". It travelled into the first refinement pass verbatim and is now
   re-derived from `NEIGHBORHOOD_LABELS` by the package check.

The one composition idea taken forward unchanged is study 01's hierarchy: the real island large
in the frame, fixed navigation at the edges, a compact era and topic banner, one clear action.
Its neighbour islands are not: they are the generic-island direction arriving by the side door,
and the revision replaces the overview with a ten-rung DOM ladder that costs no art at all.
