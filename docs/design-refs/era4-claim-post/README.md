# Era four's claim post, photographed

Eight frames, all **1024x580**, all under `prefers-reduced-motion` (the island's two ambient
motions are not mounted), all uncropped. Taken by
`apps/web/src/city/three/successionRulingShots.browser.test.tsx` and
`apps/web/src/city/three/era4ClaimPostFitShots.browser.test.tsx`:

```
VITE_SUCCESSION_RULING_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/successionRulingShots.browser.test.tsx
VITE_ERA4_POST_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/era4ClaimPostFitShots.browser.test.tsx
```

The camera in every forum frame is driven with **the buttons the game gives the player** — zoom in,
zoom out, pan, rotate — in whole button presses, and the tilt is never touched. So a heading in
these frames is a heading a player can reach.

**These frames were re-taken over assets 1, 2, 5 and 6**, so the claimants, the hoist, the proposal
tone and the boundary stones' facing in them are the later ones and not the ones the post landed
against. Nothing about the post itself moved, and the two measurements this README quotes — the post's
own screen box and the value samples — are properties of the post and the rig rather than of the
frame, so they read the same either way. The one thing that did change in these pictures is the
enclosures: the stones are square to the paving now, and two districts' runs no longer overlap. See
`../era4-drift-warning/README.md`.

| Frame | What it is for |
| --- | --- |
| `01-post-contested-forum` | The post and the boards, together, as the board arrives |
| `02-post-claimed-forum` | The same building with the boards off and the same post standing |
| `03-post-against-boundary-stones-forum` | **The confusion**, at the shipped camera, with both objects in shot |
| `04-post-against-boundary-stones-zoomed-out` | The same, at the widest zoom the player has |
| `05-the-board-in-play` | The whole surface mid-crisis: the panel, the cards, the bank, the island |
| `06-post-mark-from-the-front` | The mark, close, at the heading the plot's corner faces |
| `07-post-mark-from-behind` | The same post half a turn round, which is where a one-sided plate showed nothing |
| `01-post-against-real-buildings` | The post at the plot corner of the four claimable era-four GLBs |

---

## Do the post and a boundary stone read apart?

**Yes, and not for the reason the sheet gives.** This is the question Claude Design's own author
flagged as the one they would most want measured, so it gets a straight answer and then the
correction.

The sheet separates them on **silhouette** — *"squat-in-the-floor against upright-on-the-floor is a
silhouette difference, so it survives zoom-out"* — and rules out value explicitly, because
`MARBLE #CCC8BD` and `LIMESTONE #D2C8AA` are under one percent of lightness apart.

Measured off `03-post-against-boundary-stones-forum`, at the shipped tilt:

| | screen width | screen height | ratio |
| --- | --- | --- | --- |
| claim post (cap + shaft) | 0.82u | 1.49u | **1.82 : 1** |
| boundary stone (top face + proud side) | 1.02u | 1.09u | **1.07 : 1** |

So the silhouette difference is real and it is modest: the post is about 37 percent taller on
screen and 20 percent narrower. On its own that is a distinction you have to look for.

**What you actually see first is value, and the frames are unambiguous about it.** Sampled from the
same frame: the post's shaft is `(111, 111, 106)` and a boundary stone's top face is
`(192, 190, 173)`. That is not a hue difference of one percent, it is a value difference of
roughly two to one, and it exists because **the two objects show the camera differently-oriented
faces.** `SUCCESSION_LIGHT` puts its key at about 77 degrees of elevation, so a horizontal face
takes nearly the whole 1.44 and a vertical face takes about `cos(77°)` of it. A set-in stone shows
a 49-degree camera mostly its top face; an upright shows it four vertical ones. Every vertical
stone face in the frame lands in the same band — the plinth's die at `(109, 104, 84)`, a stone's
side at `(106, 101, 81)` — so this is a property of the rig rather than of marble.

**The sheet's conclusion is right and its stated mechanism is incomplete.** *Upright against set-in*
does separate the two, but at this camera it separates them by converting orientation into value,
which is the channel the sheet ruled out. That matters for the next reader in one practical way:
the separation would survive a paler marble landing in a future `succession-tones.ts`, and it would
**not** survive anybody deciding that a post should lie down.

Two confirmations behind it, both visible in the frames and both asserted in
`apps/web/src/succession/successionClaimPost.test.ts`:

- **a stone is always one of a run and a post is always alone.** In `03` there are eight stones
  around the plinth and exactly one post at the plot corner;
- **the stone's mark is on its top face and the post's is on its sides.** In `03` and `06` the
  stones' chevrons are the most legible marks in the frame and the post's is the faintest, which
  is the same 77-degree key seen from the mark's side.

### The one place the sheet's claim does not hold

**At the widest zoom (`04`) neither mark reads, and neither does the post.** The sheet says the
silhouette difference *"survives zoom-out"*. At the end of the player's own zoom-out the post is a
couple of pixels and the stones are a scatter of pale flecks. The confusion cannot arise there
either — nothing is legible enough to be confused — so this is a limit on the claim rather than a
defect, but *"survives zoom-out"* is not what the frame shows.

---

## The mark says whose, and it does so from every heading

`06` and `07` are the same post half a turn apart. The chevron is legible on the shaft in both.
That is the property the four faces exist for, and it is the property the retired wall plate could
not have: a plate sits on one wall plane and is edge-on or hidden from half the orbit.

The mark is **faint** — about three pixels of groove at the shipped camera against about five on a
boundary stone — and it is the thinnest thing in this asset. It is legible in `06` and `07`, which
are taken at nine zoom notches in; at the distance `03` is taken from it reads as a dark nick
rather than as a chevron.

## What was found by taking these frames rather than by reasoning

**The island shipped with no shadow bias at all.** `CityLighting` has carried `shadow-bias`
and `shadow-normalBias` since it was written; `SuccessionIsland` is a separate canvas and never got
them, on the island that runs `shadowIntensity` at 1 and draws its detail in recesses a few
hundredths deep. A 30-unit shadow camera over a 2048 map is a texel of about 0.029 world units and
a mark is cut 0.045, so every groove in this crisis was inside one and a half texels of its own
surface. Fixed in `SuccessionIsland.tsx`, with the post's interior core also stopped from casting —
enclosed on four sides and capped above, the only surface its shadow could ever reach was its own
skin.

**A misreading worth recording, because it is the trap this frame set.** The post's shaft looked
mid-grey and was read as the groove core showing through a missing skin. It is not: it is correctly
lit marble on a vertical face, and the proof is that every vertical limestone face in the same frame
sits in the same value band. A `Box3` probe over the built post confirmed the four marble plates
enclose the core exactly as intended. The lesson is the one the QA rule states — the frame is the
evidence, and reading a value off it needs a control in the same frame.

## And two things these frames say about assets the post does not own

Recorded here because they were found in these frames and are the next things to fix, not because
this pull request touches them:

- **the shear-legs read as fallen timber lying over a plinth.** Visible in `03` and `05`. The
  lashing is a 3.5-unit beam crossing well past the apex on both sides and the sling is a pale
  three-pixel line against pale paving, so what a player sees is crossed sticks — which is exactly
  the *sacked city* confusion the sheet calls this era's costliest, on the object the sheet calls
  the crisis's most important;
- **a standing claimant reads as a dark monolith**, not as a figure with a raised arm. Visible at
  the right of `07`. Three boxes at this camera resolve to a wedge.

---

## One count in the sheet does not survive its own measurement

The sheet's author asked for its counting sentences to be checked rather than trusted — *"treat any
'N of these' sentence as the least trustworthy line on the page"* — so here is the one that fails, and
it is in this asset.

Asset 4's measurement table is followed by *"Four of ten fail, three of those because there is no door
to be beside."* Read against `../era4-frontage/frontage-measurements.json`, the four failures are the
Cottages, the Fountain, the Barracks and the Customs House, and **two** of those are doorless: the
third doorless building is the Wine Cellars, which passes the reach test at 2.26. The sheet's other
sentence, *"three of ten claimable buildings have no door"*, is the true one, and the two counts are
about different sets.

Nothing in this pull request depends on it — the post reads no frontage at all, which is the point of
the rebuild — but it is the fourth such slip across three rounds and it is the kind that survives
review because it sounds like a summary of the table above it.

The other counts check out. The four courses of the plinth are four boxes; both claimants are nine
parts each; the ten questions carry three refusals if `half refused` counts as one and one partial
answer, which is a defensible reading; *"three ways that no threshold fixes"* has three bullets;
*"four things to settle"* has four; and the nineteen plates are nineteen. The claim post's own
*"7 meshes"* is right for a chevron and wrong for a ring, which carries four more.

## And at world scale, beside the real models

`01-post-against-real-buildings` is the frame the retired plate's own frame
(`../era4-frontage/07-plate-against-real-buildings-1024x580.png`) should be read against. Same four
claimable civic types, each drawn through `PlacedBuilding` so it carries the contain-fit the city
gives it — the fit varies by more than three times across this era — and the post at each plot's
front corner at no scale of its own.

Left to right: the Grain Dock, the Cottages, the Baths, the Fountain. **The post is a proportionate
marker on all four**, which is the thing the plate was not on any of them: on the Cottages the plate
was as wide as a whole shopfront and on the Fountain it read as a monument in its own right. The
post is knee-to-waist beside every one of them, and beside the Fountain it is about the height of the
basin's own kerb — a mark on a building rather than a second building.

Its chevron is legible on each of the four at this framing, which is a closer camera than the forum's
own. The height is the same 1.48 on all four, because every one of them reports the forum's wall
and clamps to the floor of the band.
