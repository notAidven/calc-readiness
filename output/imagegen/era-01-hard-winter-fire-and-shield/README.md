# Era 01, the Hard Winter: the fire, the shielded buildings and the ground bought back

**A retired prompt sheet, kept for its failure record.** It was image-generation prompts for the
mechanics era one's crisis ships without art direction, written against
`docs/superpowers/specs/2026-08-01-hard-winter-art-brief-addendum.md`, plates `07`, `08` and `09` in
`docs/superpowers/specs/crisis-reference-packs/hard-winter/`, and the shipped geometry in
`apps/web/src/city/three/`. It was restructured on 2026-08-01 at `integration` `50a917fa` after a Codex
pass returned five unusable images, and retired on 2026-08-02 at `0cb08e7e`.

> ## ⚑ SUPERSEDED 2026-08-02 as a prompt sheet. Do not generate from it
>
> **Era one's mechanics all render in the game, so they are being photographed directly rather than
> imagined**: the fire, the shield, the frost edge and the reclaimed ground exist in
> `apps/web/src/city/three/` and a screenshot of the real thing beats a generated picture of it every
> time. **What kept this sheet alive was that nobody had photographed them yet, and that is the work
> now in hand** — see *Photograph era one's real crisis*, which shoots them through the harness at
> `apps/web/src/city/three/winterCrisisShots.browser.test.tsx` into `docs/design-refs/`, the house's
> destination for photographed references.
>
> **The prompt material below is dead and the failure record is not.** Every section from "How to feed
> this to a generator" onward is superseded; the four measured passes recorded immediately below are
> the most useful thing in this file and they are **the evidence the three crisis-sheet rewrites of
> 2026-08-02 are founded on**, so they are kept in full and expanded rather than trimmed. The live
> sheets are now `output/imagegen/era-04-succession-crisis-scenes/`,
> `output/imagegen/era-06-plague-crisis-scenes/` and `output/imagegen/era-09-intrusion-crisis-scenes/`,
> which put their subjects on plain parchment and ask for no ground at all.

## The measured passes, kept rather than replaced

**This section is the record of what went wrong and it is not to be deleted.** The next pass is
cheaper if it knows what the last one did — and since era one's own prompts are retired, "the next
pass" now means eras four, six and nine.

**Four passes were run against this file and every one failed differently.** Three are measured in
detail below and the fourth is the corrective round that produced the two-frame pilot. **The floating
slab appeared in most of them**, across otherwise unrelated failures, which is what eventually
identified the ground itself as the cause rather than any one clause about it.

| Pass | What came back |
| --- | --- |
| **One**, against the six-prompt version | Almost perfectly compliant and almost entirely empty. **Two of five frames contained no subject at all.** |
| **Two**, against the fifteen-frame restructure | Subject present and correct in all fifteen, but at **1.4 to 9.3 percent of frame**, and **touching the left edge in 15 of 15**, on a plane stretching away from it. |
| **Three**, a two-frame pilot with the framing rule fed last | Subject centred at **682px and 743px** — and a **hearth about 100 pixels tall** under a smoke column carrying the total to 682. **The floating slab returned in both frames.** |

**The count is worth stating precisely, because the tree evidences three passes in detail and the
brief that commissioned the 2026-08-02 rewrite counts four.** The difference is whether the
two-frame pilot is counted apart from the corrective round that set it up. **Nothing turns on it**:
the three failure modes above are distinct, measured and independently sourced, and a fourth row
should be added here by whoever holds its output rather than inferred.

### Pass one, in detail

A Codex pass was run against the six-prompt version of this file, at commit `50a917fa`'s parent for
this directory. Five images came back, one each for prompts 1 to 5; prompt 6
(`ground-reclaimed.png`) is unaccounted for in the run's output. **The five PNGs are not in this
repository and were not in it at any commit** (checked across all refs), so what survives here is
the account rather than the artefacts. Whoever holds the files can match them by name:
`fire-four-states.png`, `fire-duration-in-the-fuel.png`, `held-ground-rim.png`,
`building-protection-states.png` and `crisis-status-badges.png`.

**The images were almost perfectly compliant and almost entirely empty.** Against a negative list
running to 41 prohibitions they broke barely any: no mastery gold, no bloom, no glow, no light
pools, no text, no people, flat three-tone shading, locked camera. What they lacked was the
subject:

| Image | What came back |
| --- | --- |
| `fire-duration-in-the-fuel.png` | Three empty snow slabs. **No hearths at all.** |
| `fire-four-states.png` | Hearths at about five percent of frame, no flame tongues, no smoke column, no held ground, and one panel empty. |
| `held-ground-rim.png` | Both halves drawn as pale blue ice, so the single contrast the frame exists to settle is absent. |
| `building-protection-states.png` | Compliant and under-committed, in the same way. |
| `crisis-status-badges.png` | Badges at wall level rather than above the roofline, and a closed X where a broken cross was required. |

**The generator satisfied the constraints and spent nothing on the content.** Two causes, and the
first is structural.

1. **Every prompt asked for a states-comparison sheet: the same object three or five times, side by
   side, differing in one property. That is a diagram.** But the shared direction simultaneously
   demanded *"a scene standing on the island rather than an object isolated on a background"* and
   banned everything diagrammatic. Those two pull against each other, and the generator resolved the
   tension by building the scene and dropping the objects. That is why the output was beautifully
   faceted snow terrain with nothing standing on it.
2. **Corrective passes made it worse.** Each round fixed a violation by adding prohibitions:
   camera, then shading, then the hexagon, then the amber, then spacing. By the fifth pass the
   prompt was mostly a list of things not to do, and roughly thirty lines of shared direction and
   negatives stood between the reader and the subject.

**The one frame that still broke rules is the one that seriously attempted its subject.**
`crisis-status-badges.png` put its badges at wall level and closed its cross, and it is also the
only frame that drew a badge at a size anyone could read. That is the tell: compliance and content
were trading against each other, and the prompt was buying compliance.

### Passes two and three, in detail

**These were measured in #411**, which was
open against `integration` when this sheet was retired and which corrected the framing rule this
sheet no longer feeds. **Its evidence is folded in here so it survives the retirement, and its two
live rules were carried into the three rewritten sheets.** What follows is that PR's finding rather
than a new one.

**Pass two fixed the empty frame and lost the camera.** Fed second, the framing rule was followed by a
preamble bullet describing faceted snow terrain in four tone values, and **the terrain description
overwrote it**: all fifteen frames came back as an expanse of ground with the subject at its near
corner, at 1.4 to 9.3 percent of frame, touching the left edge in every one. The fix `#411` reached
for was to feed the framing rule **last**, after the prohibitions, so nothing could overwrite it.

**Pass three, a two-frame pilot, centred the subject and brought the slab back.** Fed last, the same
prompts returned subjects at 682 and 743 pixels — and the floating slab in both. `#411` diagnosed the
cause precisely: a draft of the rule had asked for *"only a few cells of ground at most"*, **which
reads as permission to draw ground with a visible edge.** That phrasing is named as deleted and must
not be reintroduced anywhere.

**Pass three also produced the measurement error worth keeping.** Its 682-pixel subject was **a hearth
about 100 pixels tall under a smoke column**, which satisfied the height floor and missed the point.
**Height is measured on the built object only** — a plume, a hoist, a ghost or a badge above it does
not count.

**Two of `#411`'s three changes survive the retirement and one does not.**

- **Height measured on the built object only** is background-independent, so it is carried verbatim
  into the shared direction of all three rewritten sheets.
- **The deletion of *"only a few cells of ground at most"*** is carried into all three ground sections,
  named as deleted for the same reason.
- **Feeding the framing rule last does not survive, and the reason is that the parchment retires the
  conflict rather than resolving it.** The reorder existed because a terrain description could overwrite
  a framing rule fed before it. **The rewritten sheets describe no terrain**, so there is nothing left
  to overwrite the framing with, and the framing is a bullet in the shared direction rather than a block
  whose position has to be argued. The finding is kept here because it is what identified the terrain
  description as the thing doing the damage.

### The plates were teaching it

**The pack plates the prompts told a generator to match draw the same failure**, which is measured
rather than asserted and is why all three rewritten sheets now cite a plate for **shape only**.

Measured at `0cb08e7e` over the twenty-seven plate PNGs, all 1400 by 900:

- **Era one's own pack draws its seven detail plates with no horizon at all**, and their subjects
  occupy **18.2 to 25.0 percent** of frame.
- **The succession, plague and intrusion packs give every plate a horizon**, spending **68 to 72
  percent of frame height on sky and water**, and their detail-plate subjects occupy **3.9 to 15.6
  percent** — with the single exception of `plague/03-long-link-not-adjacency.png` at 24.8, which is
  island-scale by design.
- **The two sets do not overlap.** The worst horizonless plate beats the best horizoned one.
  `intrusion/02-lifted-cover-and-barrier.png` is the smallest subject in any plate at **3.9 percent**,
  and `succession/03-district-boundary-on-paving.png` is **5.5** — inside the band pass two came back
  at.

**The horizon is what eats the frame**, and removing it roughly triples the subject even in plates
that already exist. Reproduce with:

```python
# python3 measure.py docs/superpowers/specs/crisis-reference-packs/*/0*.png
# Background = every colour on the extreme left and right columns (sky, haze, water,
# shore, ground, deep ground). Everything else is drawn subject.
import sys
from PIL import Image
for path in sys.argv[1:]:
    im = Image.open(path).convert('RGB'); w, h = im.size; px = im.load()
    bg = {px[1, y] for y in range(h)} | {px[w - 2, y] for y in range(h)}
    ground = px[1, h - 3]
    sky = next(y for y in range(h) if max(abs(a-b) for a, b in zip(px[1, y], ground)) < 10)
    subj = sum(1 for y in range(h) for x in range(w) if px[x, y] not in bg)
    print(f'{100*sky/h:3.0f}% sky+water   {100*subj/(w*h):5.1f}% subject   {path}')
```

### What the four passes add up to

**Every failure above is a failure of ground.** The empty frame was terrain drawn instead of a subject;
the 1.4 percent subject was terrain given the frame; the left-edge placement was a subject parked at the
near corner of a receding plane; the floating slab was terrain with an edge. **Four corrective rounds
fought each of those separately, and each fix moved the failure rather than removing it.**

**So the 2026-08-02 rewrite removed the ground instead of the clauses about it**, following
`output/imagegen/era-02-neolithic-building-briefs/README.md`, whose ten building briefs put the object
on the Art Bible's parchment `#ECE4D3` with no ground in the picture and produced usable images. **None
of the four failure modes above can occur when there is nothing underfoot to draw.** Whether that holds
is untested for eras four, six and nine, and each of their sheets carries it as the last item on its
owed list.

## What the restructure changed

**One state per image.** No prompt below asks for a multi-panel comparison. Each asks for a single
subject in a single frame, filling it, and the comparison sheets are composited afterwards from the
individual renders (see "How the comparison sheets get assembled"). That dissolves the
diagram-versus-scene tension entirely and gives the subject the whole frame.

Four consequences:

- **Six prompts became fifteen.** The subjects are unchanged; what changed is that each state gets
  its own frame instead of a fifth of one.
- **Every prompt leads with its subject.** The first thing a prompt says is what is in the picture.
  The palette, the light and the shading model moved into a preamble that is fed *after* the
  subject, and is fed once rather than restated fifteen times.
- **The negative list went from 41 prohibitions to 8.** The rule that cut it, and the reason each
  survivor survived, are in "The negative list" below. Forty prohibitions is self-defeating: it is
  what taught the generator that this was a compliance exercise.
- **The framing is now stated concretely**, including an explicit prohibition of the floating slab,
  which every one of the five failed images produced and which no prohibition covered.

## The propagation job: creeping, and why these four sheets must not converge

**Added on the same pass that restructured eras four, six and nine, so the four-way separation is legible
from any of the four sheets rather than only from the pack document.**
`docs/superpowers/specs/crisis-reference-packs/README.md:176-181` rules the four apart as a fact about the
**picture** rather than about the mechanics:

| Era | What propagates | Along what | What the player watches | The read |
| --- | --- | --- | --- | --- |
| **1 Hard Winter** | **Frost** | **Tile adjacency.** A front, advancing inward from the rim | **An edge, and which way it is moving** | **Creeping** |
| 4 Succession | Allegiance | Nothing spatial at all | An object arriving at a plinth | **Tipping** |
| 6 Plague | Infection | Authored links between buildings | A line in the floor, and what has travelled along it | **Reaching** |
| 9 Intrusion | Compromise | Nothing visible | A table of readings, and how old each one is | **Suspecting** |

**Read down the fourth column: they are four different visual jobs.** Watch an edge, watch an object
appear, watch a line, read a board. `README.md:183-186` says **nothing in this pass may blur those four.**

**Which is a live risk for this restructure specifically, and era one is where it starts.** All four
sheets now share an architecture, because the other three took this one's: the same feed order, framing
rule, compositing method and cut rule. **That convergence is deliberate and confined to process.** Those
are facts about how a render is produced. **The subject matter must stay four different jobs**, and if a
reviewer can read this sheet's prompts and era six's and not tell which crisis they belong to, the
restructure has done the damage the separation exists to prevent.

### Era one's row, argued from the other three briefs, which are where it is written down

Era one's own brief predates the four-way table, so its side of each comparison is quoted from whichever
brief argues it:

- **Against era four.** *"The frost's question is 'how far has it got'; era four's is 'which one is
  next'."* Era one has an **edge** and the player watches which way it moves; era four has no edge and
  nothing to watch move (`2026-08-01-succession-crisis-art-brief.md:236-240`).
- **Against era six.** *"The visual test is the sharpest in the set: era six's board has lines on it and
  era one's has none."* And the consequence for a player is opposite: **in era one a building is safer for
  being far from the edge, and in era six distance means nothing at all**
  (`2026-08-01-plague-crisis-art-brief.md:249-256`).
- **Against era nine.** *"The visual test: era one's board is full before the player acts and era nine's
  is empty."* In era one the player looks at the world and reasons about it; in era nine the player looks
  at their own notes (`2026-08-01-intrusion-crisis-art-brief.md:331-334`).

### Which frames carry the propagation job

**Frames 7 and 8 are the propagation, and they are a matched pair.** Frame 7 is the frost's edge: a hard
stepped boundary following the ground grid exactly, with a ridge of shove ice standing just beyond it
**marking the row the frost takes next**, which is the *which way is it moving* half. Frame 8 is the
ground a fire holds against it, whose rim is feathered precisely because it is **not** another cell.

**The two frames exist to be different kinds of edge**, and that is why the composited
`held-ground-rim.png` is the sheet's most load-bearing check. **The failed run drew both halves as pale
blue ice**, which is the propagation job destroyed outright: with no contrast between a counted boundary
and an uncounted one, era one's whole visual grammar collapses into a coloured area. **Render frames 7 and
8 first, and composite them before spending anything on the buildings.**

## The fifteen frames

| # | Subject | Image |
| --- | --- | --- |
| 1 | A burning hearth, at full fuel | `fire-burning.png` |
| 2 | A proposed hearth, not yet built | `fire-proposed.png` |
| 3 | A hearth declared and never caught | `fire-declared-not-caught.png` |
| 4 | A burnt-out hearth, its ground closed over | `fire-burnt-out.png` |
| 5 | A burning hearth, two logs left | `fire-fuel-two-logs.png` |
| 6 | A burning hearth, one log left | `fire-fuel-one-log.png` |
| 7 | The frost's edge, on the cell line | `frost-edge-on-the-cell-line.png` |
| 8 | The fire's held ground, feathered | `held-ground-feathered-rim.png` |
| 9 | A threatened building | `building-threatened.png` |
| 10 | A proposed storm roof | `building-shield-proposed.png` |
| 11 | A protected building | `building-protected.png` |
| 12 | A frosted building | `building-frosted.png` |
| 13 | A lost building | `building-lost.png` |
| 14 | Shielded and threatened at once | `building-shielded-and-threatened.png` |
| 15 | Ground given up and ground bought back | `ground-reclaimed.png` |

**Frame 1 is the anchor and is used twice.** A burning hearth at full fuel is both the burning state
in the fire's four-state sheet and the first step in the duration sheet, so frames 5 and 6 draw only
the two shorter steps. Render frame 1 first: frames 2 to 6 are all the same hearth and are easier to
hold consistent against a render than against a paragraph.

**Frame 15 is deliberately not split, and that is the one exception to one-state-per-image.** Its
whole claim is that a viewer cannot find the boundary between reclaimed ground and ground that was
never given up. Continuity across a single surface is what makes that checkable; two separately
generated renders could never be compared closely enough to settle it, because no two generations of
"plain tussock" are the same picture. So frame 15 stays one continuous band, and its subject is a
surface rather than an object, which is also why the floating-slab failure does not apply to it.

---

> ## ⚑ EVERYTHING BELOW THIS LINE IS SUPERSEDED PROMPT MATERIAL. Do not generate from it
>
> **It is kept as the record of what was tried**, and because passes two and three above are only
> legible beside the framing rule they broke. **It does not carry `#411`'s corrections**, which are
> recorded in "Passes two and three, in detail" instead, so the framing rule below is the pass-two
> version that lost the camera. Era one's pictures now come from the game — see the banner at the head
> of this file. For a live sheet in the current style, read
> `output/imagegen/era-04-succession-crisis-scenes/README.md`.

## How to feed this to a generator

**Four blocks, in this order: the subject, the framing rule, the preamble, the eight
prohibitions.** The order is the fix rather than a preference: the previous version put thirty lines
of palette and prohibition ahead of the subject, and the generator spent its effort on the part it
read first.

1. **The subject** is the prompt block under one of the fifteen headings below. It comes first,
   always, and it is the only part that changes between renders.
2. **The framing rule** comes next, because it is about where the subject sits in the frame and is
   meaningless before the subject is named.
3. **The preamble** carries the camera, the shading model, the palette and the light. It is factored
   out so it can be corrected in one place. It is not optional and not a summary: feed it in full.
4. **The eight prohibitions** come last, which is where a short list can afford to be.

Blocks 2, 3 and 4 are identical for every render bar frame 15, which replaces the preamble's weather
and says so.

## How the comparison sheets get assembled

The five comparison sheets are **composited from the single renders and never generated**. This is
a step someone has to perform, and it is a layout job rather than an art job: no retouching, no
regeneration, no relighting. Every render is already 1400 by 900 at the same camera, the same light
and the same scale, which is what makes a straight tile legal.

| Sheet | Tiled from, in this order | Panels |
| --- | --- | --- |
| `fire-four-states.png` | 2, 3, 1, 4 | 4 |
| `fire-duration-in-the-fuel.png` | 1, 5, 6 | 3 |
| `held-ground-rim.png` | 7, 8 | 2 |
| `building-protection-states.png` | 9, 10, 11, 12, 13 | 5 |
| `crisis-status-badges.png` | 9, 13, 14 | 3 |

Compositing rules:

- **Tile, do not scale.** Each panel keeps its own 1400 by 900 frame at full size, laid side by
  side in the order above, so the sheet is 1400*n by 900. Scaling a panel down is what made the
  subjects five percent of frame the first time.
- **No gutter, no rule, no border and no caption.** The panels butt. The reading key is this
  document, which is the pack convention: *"Each pack's README names the states left to right"*
  (`docs/superpowers/specs/crisis-reference-packs/README.md:206-209`).
- **Check the sheet against the claim in "What must read" for the sheet, not for the panel.** Those
  claims are the reason the sheets exist and they can only be checked once the panels are adjacent.
  They are listed with the sheets below.

### What each assembled sheet must read

- **`fire-four-states.png`.** Four states of one object. The proposed hearth is obviously a proposal
  and not a small fire; the declared one is obviously a real built thing doing nothing, rather than
  an empty ring of stones or a hearth that failed to draw; and the burnt-out one is obviously the
  same fire later, with two things changed at once, the stones darkening **and** the ground
  reverting.
- **`fire-duration-in-the-fuel.png`.** The middle hearth is **the same fire later** rather than **a
  smaller fire**. The held ground must be measurably identical across all three panels, because
  duration is not width. If the eye reads the third as covering less ground, the fuel step is doing
  too much work. This is the sheet the compositor must check hardest, since the three panels are
  three separate generations of the same patch.
- **`held-ground-rim.png`.** The frost's boundary is counted and the fire's is not, and the two are
  visibly different kinds of edge. A viewer must never mistake the right rim for another grid step
  or the left edge for a soft one.
- **`building-protection-states.png`.** Five different outlines, with the labels covered. The pair
  to watch is **protected against frosted**, because both put a pale mass over a building. If a
  storm roof and a frosted base read as the same pale shape, the oversail is not deep enough and the
  ridge is not proud enough.
- **`crisis-status-badges.png`.** Two badge silhouettes told apart by shape alone with the colours
  ignored, neither mistakable for the mastery stars they replace, and a third panel in which one
  building carries **two facts on two channels that do not collide**: the shield on the building's
  own geometry, the threat on a badge above everything the shield added.

---

## Preamble: the house direction

The third block. Fed in full and unchanged, after the subject and the framing rule.

- One fixed camera tilted about 49 degrees down, no horizon tilt, no perspective drama, framed 1400
  by 900. Matches `VILLAGE_CAMERA.polarAngle` at 0.72 rad.
- Flat-shaded low-poly forms only. Every surface is one solid colour in three tone steps per
  volume: top face lightened 26 percent, left face the base hue, right face darkened 28 percent.
  This is computed rather than eyeballed, from `City_Art_Bible.md` section 2 and `palette.ts`'s
  `faceTones`.
- Prehistoric village under snow: buildings in terracotta rammed earth and daub `#C98A5E` with
  muted timber `#B08968`, directional thatch and reed, and sparse cool-grey undressed stone at
  ground level. Battered walls, external load-bearing structure, visible lashings, softened corners.
- The ground is faceted snow-toned terrain: lit snow `#EEF5F4`, mid `#E2EAEA`, shade `#D9E3E2`,
  deep `#CBD7D8`, with drifts banked against every vertical. Churned earth and slush is `#9A8874`
  over `#6F6357`.
- Frozen ground is pale ice blue `#C8DFEF`, its leading edge one step colder at `#9FC0D8`, and the
  advancing front is the one dark value in the cold palette at `#3C7FA0`. Ground a fire is holding
  is the island's own bare earth ochre `#C9A06A`.
- Overcast winter light: one near-white key `#F4F7F6` well down in intensity and raised in angle so
  shadows stay present but shallow, a fill that rises so the key-to-fill ratio is about 1.7 to 1, a
  flat grey-white sky `#DCE0DE` with zero blue in it, and haze `#D5DAD8` pulled in close so the sea
  dissolves into grey rather than staying teal. Cold water is `#2F5A63`.
- One key light for the whole frame, and it is the only light in it.
- Flame is spent as a heat ramp: an outer ember skirt `#D9622E` glowing toward `#FF9A37`, a mid body
  `#FF9A37` glowing toward `#FFDCA6`, and a small near-white core `#FFDCA6`, hottest at the core,
  so the outer tongues keep enough shading to facet.
- Every side of every object reads, because the camera orbits a full circle. There is no front and
  no hidden back.

Tone values are read off `apps/web/src/city/three/winterTones.ts` (`WINTER_SCENE_TONES`,
`WINTER_GROUND_TONES`, `WINTER_LIGHT`) rather than off a plate.

## The framing rule

The second block, fed straight after the subject. Every clause here is one the failed run broke.

- **The subject fills the frame.** It occupies at least two thirds of the frame's height, centred,
  with clear ground around it and nothing clipped at any edge. A subject at five percent of frame is
  a failed render, not a wide shot.
- **The subject stands on ground that runs to all four frame edges.** No floating slab, no detached
  tile of terrain, no plinth of ground, no island of snow with visible sides, and no void, backdrop
  or empty colour behind or beneath the ground. **All five failed images produced a floating slab**,
  and no prohibition covered it.
- **One subject per frame.** No second copy of it, no row, no pair, no panel division, no gutter,
  no dividing line and no side-by-side arrangement of any kind. If the frame contains two of the
  thing, the render is wrong however good either one is.
- **Nothing in the frame is a label.** No caption, no legend, no annotation, no leader line, no
  arrow, no numeral and no text of any kind. The reading key is this document.

## The negative list

**Eight prohibitions, down from 41.** Both figures and the metric behind each are in "The count,
and what it measures" below, because they are not the same metric and pretending they were would be
the same trick that produced the forty.

**The rule that cut it: a prohibition survives only if it encodes a ruling recorded in the tree or
in a dated spec, or if the failed run actually broke it. Everything else went.** The measured
ground for dropping the rest is that the failed run held essentially all of them without being
asked: no text, no people, no bloom, no light pools, flat three-tone shading, locked camera. A
prohibition a generator was never going to break costs nothing to omit and costs a great deal to
keep, because it is one more line between the reader and the subject.

### The eight, as fed

The fourth and last block. This is the whole of the prohibition a generator is given: feed it
verbatim and add nothing to it.

> - A flame lights nothing: no light pool, no lit wall, no glow on a neighbouring surface, no local
>   light anywhere.
> - No bloom, glow halo, lens flare, gradient or soft shading.
> - No mastery gold `#FFB703`.
> - A badge is screen-facing and floats clear above the building's measured roofline: never at a
>   corner, at ground level, against a wall or on a post.
> - The lost mark is a broken cross with a gap at its centre. It never closes.
> - No amber on any crisis mark.
> - No hexagon, and no badge on a standing unthreatened building.
> - The subject stands on ground, never on a floating slab.

### Why each survived

For the reader and the reviewer, not for the generator. **A prohibition added to the block above
without one of these two justifications is a regression**, and this section is what makes that
checkable: the list cannot silently regrow if every member has to name its warrant.

1. **A flame lights nothing.** *A ruling*: the winter has one key light and no local light
   (`apps/web/src/city/three/winterTones.ts`, `WINTER_LIGHT`), and a flame is a bright face rather
   than a lamp. **Untested by the failed run**, which held it by drawing no flame at all, so it is
   still owed a real test.
2. **No bloom, glow halo, lens flare, gradient or soft shading.** *A ruling*: the three-tone face
   model is the house's whole shading model and is computed rather than eyeballed
   (`docs/superpowers/specs/crisis-reference-packs/README.md:215-218`). Post-processing destroys the
   facets it depends on. Held by the failed run, and kept anyway, because it is the one piece of
   render hygiene the house has actually ruled on.
3. **No mastery gold `#FFB703`.** *A ruling*: it is what keeps a crisis badge from being mistaken for
   the mastery stars it replaced (`CrisisStatusMarker.tsx:59-61`). Note the scope: the prohibition is
   on the crisis marks, not on the board. A standing unthreatened building **keeps** its stars
   through the winter (`CityScene.tsx:300-304`), and no frame here draws one, so no frame here has
   gold in it.
4. **A badge is screen-facing and floats clear above the building's measured roofline.** *A ruling
   and a measured failure*: the split-pair ruling puts the shield on the building's own geometry and
   the threat on a billboard above the roofline (`CrisisStatusMarker.tsx:46-49`, with the measurement
   and margin at lines 117-118 and 217-233), and **the failed run broke it**, placing badges at wall
   level.
5. **The lost mark is a broken cross that never closes.** *A ruling and a measured failure*: the gap
   is in the geometry (`CrisisStatusMarker.tsx:148-170`, `gap = 0.09`), and **the failed run broke
   it**, drawing a closed X.
6. **No amber on any crisis mark.** *A ruling*: the island spends its one warm swatch on `warded`,
   glossed *"a fire is holding this"* (`winterTones.ts:81`, `warded: 0xc9a06a`), so warm on this
   board already means protected and an amber threat would land in the protection family and read as
   reassurance (`CrisisStatusMarker.tsx:90-95`, and the durable argument at
   `2026-08-01-hard-winter-art-brief-addendum.md:287-292`).
7. **No hexagon, and no badge on a standing unthreatened building.** *A ruling*: `CRISIS_STATUSES` is
   `["threatened", "lost"]` (`CrisisStatusMarker.tsx:78`) and `crisisDressing` hands `null` up for a
   standing unthreatened building (`CityScene.tsx:329-333`). Ruled off 2026-08-01.
8. **The subject stands on ground, never on a floating slab.** *A measured failure and nothing else*:
   no ruling anywhere in the tree covers it, and all five failed images produced one. Stated in full
   in "The framing rule" above and repeated in the fed block because it is the failure that cost the
   run.

**What this list deliberately does not do.** It does not restate the preamble's positive direction as
prohibitions, because *"flat-shaded in three tone steps"* and *"no smooth shading"* are the same
instruction and only the first tells the generator what to draw. And it does not prohibit the many
things the failed run declined to draw unprompted. **If a future run breaks one of them, add it here
with the render that broke it named**, which is the only thing keeping this list at eight.

### The count, and what it measures

The two figures come from different metrics and the difference matters, so both are given rather
than the flattering one.

- **Before: 41.** A token count over the previous version's unnumbered run-on negative prose, which
  is the only count that list admits of. Reproducible at the merge this branch came off:
  `git show 50a917fa:output/imagegen/era-01-hard-winter-fire-and-shield/README.md | sed -n '56,90p' | grep -oiE '\b(no|never|nothing)\b' | wc -l`
  returns 41. Two of the 41 are not prohibitions (*"there is no front and no hidden back"*), so read
  it as 39 prohibitions in 41 tokens. Each prompt then carried its own paragraph on top: frame 1's
  ran to another 30 tokens by the same rule, so a single prompt was under **71**.
- **After: 8.** A count of entries in the fed block above, which is a list and therefore countable
  directly. The same token rule over that block returns **13** (`rg -n '^> - ' README.md` finds its
  eight lines), the extra five coming almost entirely from the first entry, which spells out what "a
  flame lights nothing" means in four sub-clauses. **13 against 41 is the honest comparable**, and 8
  against 39 is the honest count of rulings. No prompt below carries a negative paragraph of its own
  beyond the two or three clauses specific to its subject.

---

## 1. A burning hearth, at full fuel: `fire-burning.png`

> **Subject: one burning hearth, filling the frame, standing on snow-covered village ground.**
>
> The hearth is **a ring of nine hand-laid squared stones** of uneven height, alternating `#B4AC98`
> and `#8D8878`, each stone turned slightly off the ring so it reads as laid by hand rather than
> poured. **Three logs lie across each other inside the ring** in `#8D6648`, `#5F4730` and char
> `#3A342C`.
>
> **Seven faceted flame tongues** rise out of the fuel, each lathed at five segments so its outline
> breaks at every height, twisted and leant so no two match: an outer skirt of short wide tongues in
> ember `#D9622E`, a taller middle group in `#FF9A37`, and one tall narrow core tongue in near-white
> `#FFDCA6`. A **low seven-sided ember bed** sits under them at the coolest tone.
>
> A **smoke column** stands above the hearth, about nine times the hearth's own height, made of
> eleven separate faceted puffs in `#AEB7B8` over `#828E90`, leaning steadily downwind as it rises.
>
> Beneath and around the hearth, a **patch of ochre held ground** `#C9A06A` where the snow has
> thawed back to bare earth, its rim feathered: pulled back off the cell lines and sunk slightly
> below the snow around it. Faceted snow `#EEF5F4` over `#E2EAEA` runs from the patch to every frame
> edge, with drifts banked against the stones.
>
> The hearth and its flame stand about three units tall and the hearth's stone ring fits inside one
> ground cell. The smoke column may leave the top of the frame; the hearth, the flame and the held
> ground may not be clipped.
>
> **The flame is never one flat value**: no solid orange cone, no flat orange square, no single
> triangle, no billboard flame facing the camera, nothing that looks like a candle. **The flame
> lights nothing.** No sparks drawn as bright points, no smoke ring, no steam, no fog.
>
> Take the hearth, the fuel and the tongues from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/07-fire-four-states.svg`, third mass
> (`ps1:1857`), and the smoke column's proportions from `05-fire-smoke-column.svg` in the same
> directory. **Use the SVG rather than the PNG beside it**: the previous version of this sheet
> recorded that the two are different pictures. That finding is carried over and was **not
> re-verified** in this pass, so treat it as a caution rather than a measurement.
>
> The nine stones, the three logs, the seven tongues and the heat ramp are all in
> `apps/web/src/city/three/winterFire.ts`.

---

## 2. A proposed hearth, not yet built: `fire-proposed.png`

> **Subject: one proposed hearth, filling the frame, standing on snow-covered village ground.**
>
> The whole hearth of frame 1, **see-through at about half opacity**: the same nine-stone ring, the
> same three logs, the same seven flame tongues, the same silhouette, nothing simplified. It stands
> on a **see-through patch of ochre held ground** `#C9A06A` in the same feathered treatment a real
> one gets.
>
> Its flame is present and **visibly damped**, glowing noticeably less than a burning hearth's. It
> casts no shadow and never hides anything behind it. There is no smoke column.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge.
>
> **What must read: a proposal, and not a small fire.** The proposal is never a different colour
> from a real fire, never a frame or box around the cell, never dashed, dotted or hatched, and must
> not resemble a hologram, a projection, a blueprint or a UI overlay. It is the same object at
> reduced opacity and nothing else. It must stay clearly visible against the near-white snow and
> near-white sky rather than washing out into a faint smear.
>
> Take the ghosted hearth from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/07-fire-four-states.svg`, first mass.
> The ghost's opacity ramp is `apps/web/src/city/three/winterFireGhost.ts`.

---

## 3. A hearth declared and never caught: `fire-declared-not-caught.png`

> **Subject: one built hearth that is doing nothing, filling the frame, standing on snow-covered
> village ground.**
>
> A **solid, fully built hearth with no ember, no flame, no smoke and no held ground.** The
> nine-stone ring of frame 1 in `#B4AC98` and `#8D8878`, fully opaque, fully built. The three logs
> are laid and pale: `#8D6648`, `#5F4730` and a third in `#B08968` rather than char.
>
> **The snow runs right up to the stones, unbroken and unthawed**, faceted `#EEF5F4` over `#E2EAEA`,
> to every frame edge, with drifts banked against the ring. There is no ochre anywhere in the frame.
>
> **What must read, and the absence is the state: a real built thing that is doing nothing**, rather
> than an empty ring of stones, a ruin, or a hearth that failed to draw. The stones are clean and
> undamaged, the logs are whole and unburnt, and the workmanship is the same as a burning hearth's.
> Nothing is broken, nothing is scattered and nothing is missing from the ring.
>
> Take the hearth from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/07-fire-four-states.svg`, second mass.

---

## 4. A burnt-out hearth, its ground closed over: `fire-burnt-out.png`

> **Subject: one spent hearth with the frost closed back over its ground, filling the frame,
> standing on snow-covered village ground.**
>
> The nine-stone ring of frame 1 with its **stones gone dark**, the fuel spent to char `#3A342C`,
> and **a thin wisp of smoke or none at all**. No flame tongues and no ember bed.
>
> **The held ground has closed over again by pale frost** `#C8DFEF`, so the ochre is gone: where
> frame 1 has a patch of bare earth, this frame has pale ice, at the same size and in the same
> place, so the reversion is legible as the same ground in a later state.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge.
>
> **What must read: the same fire later, with two things changed at once**, the stones darkening
> **and** the ground reverting. The ring is still a complete ring of nine laid stones: darkened, not
> collapsed, scattered or broken.
>
> Take the burnt-out hearth from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/07-fire-four-states.svg`, fourth mass.

---

## 5. A burning hearth, two logs left: `fire-fuel-two-logs.png`

> **Subject: one burning hearth with two logs left in it, filling the frame, standing on
> snow-covered village ground.**
>
> Frame 1's hearth exactly, with **two logs** rather than three: the stack sits lower and **the
> flame is shorter with it**, its tongues fewer and closer to the ember bed, still in the heat ramp
> of ember `#D9622E`, body `#FF9A37` and near-white core `#FFDCA6`. The low seven-sided ember bed is
> unchanged.
>
> **The patch of ochre held ground `#C9A06A` is identical to frame 1's**: the same size, the same
> shape, the same feathered rim, at the same distance from the hearth. This is the one thing in the
> frame that must not change, and the sheet these frames assemble into exists only to settle it.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge. The smoke column is present as in
> frame 1.
>
> **What must read: the same fire later, and not a smaller fire.** The fuel stack and the flame
> height are the only channels that move. The held ground never shrinks, never fades, never changes
> tone and never gains or loses a rim. **Nothing in the frame says how long is left except the fuel
> stack itself**: no dial, no gauge, no hourglass, no tally and nothing floating over the hearth.
>
> Take the middle step from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/08-fire-duration-in-the-fuel.svg`,
> second hearth (`ps1:1870`, `-Fuel 2`). The tiers this ladder covers are `burn_rounds_by_tier` at
> `engines/game/src/hard-winter-tuning.ts:530-535`, which runs 1, 2, 2, 3.

---

## 6. A burning hearth, one log left: `fire-fuel-one-log.png`

> **Subject: one burning hearth with a single log left in it, filling the frame, standing on
> snow-covered village ground.**
>
> Frame 1's hearth exactly, with **one log** rather than three: the stack is at its lowest and **the
> flame is at its shortest**, sitting close down on the low seven-sided ember bed, still in the heat
> ramp of ember `#D9622E`, body `#FF9A37` and near-white core `#FFDCA6`.
>
> **The patch of ochre held ground `#C9A06A` is identical to frames 1 and 5**: the same size, the
> same shape, the same feathered rim, at the same distance from the hearth. A viewer must not be
> able to read this hearth as covering less ground than a full one.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge. The smoke column is present as in
> frame 1, thinner if anything.
>
> **What must read: a fire about to go out, still holding exactly as much ground as a fresh one.**
> Duration is not width. The same prohibition as frame 5 applies: the fuel stack is the only channel
> in the frame, with no dial, gauge, hourglass, tally or floating mark of any kind.
>
> Take the last step from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/08-fire-duration-in-the-fuel.svg`.

---

## 7. The frost's edge, on the cell line: `frost-edge-on-the-cell-line.png`

> **Subject: the boundary where frozen ground meets unfrozen snow, filling the frame, seen close on
> the village's own ground.**
>
> A block of frozen ground in pale ice blue `#C8DFEF` meets unfrozen snow along a **hard, straight,
> stepped edge that follows the ground grid exactly**, corner to corner, with no softening anywhere.
> The last row of frozen cells before the snow is one step colder at `#9FC0D8`. Standing just beyond
> it is **a low ridge of shove ice** in the one dark value of the cold palette `#3C7FA0`, marking
> the row the frost takes next.
>
> The frozen block and the snow beside it both run to the frame edges, on the same square grid of
> ground cells, faceted `#EEF5F4` over `#E2EAEA` over `#D9E3E2` on the snow side. **The stepped edge
> crosses the middle of the frame** and the cells against it are large enough to count.
>
> **What must read: a counted boundary.** A viewer must be able to count the cells against this
> edge. It is never feathered, blurred, dithered, faded or antialiased into the snow, and never a
> circle, a spotlight pool, a painted zone, a coloured overlay, a heatmap, a contour line or a map
> region. No outline stroke, no border, no dashed line and no glow anywhere along it.
>
> Take the frost's cell edge and its front from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/02-ground-treatment.svg`.

---

## 8. The fire's held ground, feathered: `held-ground-feathered-rim.png`

> **Subject: the patch of bare earth a fire holds, filling the frame, seen close on the village's
> own ground.**
>
> A patch of **bare ochre earth `#C9A06A`** thawed out from under the snow, with a hearth of nine
> laid stones standing in it. Its **rim is feathered: pulled back off the cell lines and sunk
> slightly below the snow around it**, so the patch's boundary is soft-edged and irregular rather
> than stepped.
>
> **It is feathered but still bounded.** A viewer must still be able to tell which ground cells are
> inside the patch, because this is the one thing in the crisis a player aims. The cell grid is
> legible in the snow around the patch and legible under the ochre.
>
> The patch is the subject and takes the middle of the frame; faceted snow `#EEF5F4` over `#E2EAEA`
> over `#D9E3E2` surrounds it and runs to every frame edge. The hearth may be burning or spent as
> convenient, and is not the subject: **the rim is.**
>
> **What must read: an edge that is not a cell boundary.** A viewer must never mistake this rim for
> a grid step. It is never fully soft, never a smooth radial fade, and never so vague that the cells
> under it are unreadable. It is not a circle drawn on the ground, a spotlight pool, a painted zone,
> a coloured overlay, a heatmap or a map region, and it carries no outline, border stroke or glow.
>
> Take the held ground and its hearth from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/07-fire-four-states.svg`, third mass.

---

## 9. A threatened building: `building-threatened.png`

> **Subject: one prehistoric village building carrying the mark for a building the frost reaches
> this round, filling the frame, standing on snow-covered ground.**
>
> The building is a rammed-earth and daub mass in terracotta `#C98A5E` with battered walls, muted
> timber `#B08968` framing, visible lashings and softened corners, snow lying on its roof and drifts
> banked against its walls. It is as built: whole silhouette, nothing added to its geometry.
>
> **A screen-facing badge floats clear above its measured roofline**, in the slot the mastery stars
> use the rest of the time: **two chevrons stacked one above the other, both pointing downward**,
> each with a pointed rather than blunt apex, face `#3C7FA0` on a dark backing plate `#3A342C` about
> a quarter larger than the face, so the shape keeps an outline against the near-white sky.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge. The building and its badge are
> both large in frame and neither is clipped: leave headroom above the badge.
>
> **The badge points downward**, because the frost arrives from outside and comes in, and it is
> never drawn pointing up. **It is above the roofline and nowhere else**: never at the building's
> corner, never at ground level, never leaning against a wall, never on a post. No exclamation mark,
> no warning triangle, no shield outline, no star of any kind. **No amber**: the badge is the ice
> front's own blue and nothing else.
>
> The badge's shape and tones are `apps/web/src/city/three/CrisisStatusMarker.tsx`: `chevronShape`
> at lines 132-145, `MARKER_TONES.threatened` at line 98, and the roofline measurement and margin at
> lines 117-118 and 217-233. Take the building mass from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/09-building-protection-states.svg`,
> first mass.

---

## 10. A proposed storm roof: `building-shield-proposed.png`

> **Subject: one prehistoric village building with a proposed storm roof over it, filling the frame,
> standing on snow-covered ground.**
>
> The building of frame 9, as built, carrying the storm roof of frame 11 drawn **see-through at
> about two thirds opacity, in the dark end of the timber palette rather than the pale end**. It
> casts no shadow and never hides the building's own roofline behind it. There is no badge above the
> roofline and no banked earth at the walls.
>
> The ghosted roof is **the same shape as a built one**: a gable of two raking slopes meeting at a
> hard ridge, its eaves oversailing the walls, its proud ridge beam and its three battens all
> present in the ghost.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge.
>
> **What must read: the same shape as a built shield, and obviously not built.** It must stay
> clearly visible against the near-white snow and near-white sky rather than washing out into a
> faint smear, which is why it is raised in opacity and pulled to the dark end of the palette:
> alpha composites against what is behind it, and behind a roof here is near-white snow or a
> near-white overcast sky (`2026-08-01-hard-winter-art-brief-addendum.md:280-285`). The
> proposal is never a different colour from the real shield, never a frame or box around the
> building, never dashed, dotted or hatched, and must not resemble a hologram, a projection, a
> blueprint or a UI overlay. **The building itself is untouched and is not a ruin**: whole
> silhouette, no collapse, no missing wall, no gap in the outline, no rubble.
>
> The ghost is `ghostWinterShield` at `apps/web/src/city/three/winterShield.ts:333`: the same
> geometry at reduced opacity, not a second object. Take the arrangement from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/09-building-protection-states.svg`,
> third mass, and **the gable silhouette from frame 11 below rather than from that plate**, for the
> reason in "Three corrections to the sources".

---

## 11. A protected building: `building-protected.png`

> **Subject: one prehistoric village building under a built storm roof, filling the frame, standing
> on snow-covered ground.**
>
> The building of frame 9 with **a storm roof laid over its own roof, and it is a gable**: two
> raking slopes meeting at a hard ridge line, in `#8D6648`, its **eaves oversailing the walls by
> about a quarter of the wall span** on every side.
>
> **A squared beam stands proud along the ridge** in `#5F4730`, turned corner-up so the top of the
> silhouette has real thickness, running past both gable ends. **Three battens** cross the roof in
> `#B08968`, each one a pair of bars lying flat on the two slopes and meeting at the ridge rather
> than a single bar spanning the width. **A squared stone weight hangs at the foot of every batten**
> in `#8D8878`, just past the eave, bumping the lower outline.
>
> **A wedge of banked earth** `#6F6357` leans up against the visible walls, higher at the wall and
> spreading out at its foot, with **two leaning brush stakes** in `#5F4730` pinning each bank,
> standing outside the wall where the drifts are.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge, with drifts banked against the
> walls and the earth banking.
>
> **What must read: a built timber roof over a roof, and an outline change on the building itself.**
> The oversail and the proud ridge are the silhouette, so both must be unmistakable. The storm roof
> is not a tarpaulin, a tent, a sheet, a canopy, an awning, a lean-to or a snow cap, and it is not
> tinted, not coloured differently from the village's own timber and never green, red or amber: **no
> state here is carried by colour.** The banked earth is not a plinth the building was always
> standing on, which is what the leaning stakes are for.
>
> The geometry is `apps/web/src/city/three/winterShield.ts`: the gable decision at lines 119-121,
> `OVERSAIL = 1.24` at line 70, the proud ridge at lines 164-178, `BATTENS = 3` at line 79 with the
> weights at lines 202-212, and the banking and its stakes at lines 223-286. Take the arrangement
> from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/09-building-protection-states.svg`,
> second mass, and **the gable silhouette from this description rather than from that plate**, for
> the reason in "Three corrections to the sources".

---

## 12. A frosted building: `building-frosted.png`

> **Subject: one prehistoric village building with frost crusted round its base, filling the frame,
> standing on snow-covered ground.**
>
> The building of frame 9 as built, with **a crust of pale ice** `#C8DFEF` hugging its base all the
> way round, standing slightly proud of the walls so it reads as a crust rather than as a lower
> wall, topped by **a thin leading lip one tone step colder** `#9FC0D8` standing a little proud of
> the crust's top edge.
>
> **The crust is low: a rimed base and never a white block.** It is sized against **the height of
> the building it is on**, never against the tallest building in the village, and it reaches at most
> four tenths of that building at the worst damage stage. Draw it at about a quarter of this
> building's own height, so **the whole silhouette above it is untouched.** No badge, no storm roof,
> no banked earth.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge.
>
> **What must read: ice on a building that is otherwise exactly as built.** This frame is the one
> most likely to be confused with a protected building, since both put a pale mass on a building, so
> the crust must be unmistakably **at the base and low**, and the roofline must be unmistakably
> **bare**. The building is not a ruin: whole silhouette, no collapse, no missing wall, no gap in the
> outline, no rubble.
>
> Take the frosted mass from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/09-building-protection-states.svg`,
> fourth mass, or from `04-building-three-states.svg` in the same directory.

**The crust's proportion is a correction, and the old wording was the bug.** The previous version of
this sheet asked for a crust "rising to roughly a sixth of the tallest building in the village",
which is `MAX_BUILD_HEIGHT * 0.16` and is exactly the substitution `frostStage.ts` was changed on
2026-08-01 to remove. `MAX_BUILD_HEIGHT` is a **ceiling on how tall a model may render and not the
height of anything**: era one's seven placements render between 1.828u and 9.769u and nothing comes
within 14u of the cap, so that formula put a 2.56u crust on a 1.828u Workshop and rendered era one's
two shortest buildings as a featureless pale cube with a badge over it
(`apps/web/src/city/three/frostStage.ts:50-73`). The shipped rule bands the crust against **its own
building**: `MAX_SHELL_RATIO = 0.4` of the height that building actually renders at
(`frostStage.ts:41-45` and `77-92`), with `frostCrustSilhouette.browser.test.tsx` asserting that a
crust never reaches half its building.

---

## 13. A lost building: `building-lost.png`

> **Subject: one prehistoric village building that is gone, carrying the mark for it, filling the
> frame, standing on snow-covered ground.**
>
> The building's **silhouette collapsed**: the mass broken down into a low irregular heap in a cold
> neutral tone, still occupying its plot, with no roof and no standing wall.
>
> **A screen-facing badge floats clear above the heap**, in the same slot a standing building's
> badge uses: **a broken cross**, four short straight arms radiating diagonally from a centre, with
> **a clear gap where they would meet so the cross never closes**, face `#3A342C` on a backing plate
> `#6F6357` about a quarter larger than the face.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge, drifted against the heap.
>
> **What must read: a ruin and its mark, which are one state rather than two.** A lost building is a
> ruined building carrying the broken cross: `crisisDressing` returns `status: "lost"` exactly when
> `ruined` is true (`apps/web/src/city/three/CityScene.tsx:329-333`), so there is no ruin without the
> badge and no lost badge over a standing building.
>
> **The cross never closes.** The gap at the centre is the mark: a closed X, a closed cross, a
> saltire, a crucifix or four arms that touch is a different mark and is wrong. **The failed run
> drew a closed X**, which is why this is stated twice. No skull, no warning symbol and no icon from
> any interface. **No mastery gold `#FFB703`** and no star of any kind.
>
> The badge is `brokenArmShape` at `apps/web/src/city/three/CrisisStatusMarker.tsx:148-170`, with
> `gap = 0.09` holding the centre open and the four rotations at lines 177-182;
> `MARKER_TONES.lost` is at line 99. The addendum's §5.1 ladder gained this rung in the same
> 2026-08-01 amendment and gives the reason a ruin needs a badge at all: the broken mass is legible
> beside its neighbours and much less legible at the settlement scale the crisis camera frames
> (`2026-08-01-hard-winter-art-brief-addendum.md:258` and `260-266`). Take the ruined mass and its
> badge from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/09-building-protection-states.svg`,
> fifth mass (`ps1:1884-1885`), or the mass alone from `04-building-three-states.svg`.

---

## 14. Shielded and threatened at once: `building-shielded-and-threatened.png`

> **Subject: one prehistoric village building that has been reinforced and is about to be hit,
> filling the frame, standing on snow-covered ground.**
>
> The building of frame 11, carrying **the built storm roof on its own geometry**: a timber gable in
> `#8D6648` with a proud ridge beam `#5F4730`, three battens `#B08968`, a stone weight `#8D8878` at
> the foot of each, eaves oversailing the walls by about a quarter of the wall span, and banked earth
> `#6F6357` with leaning brush stakes at the visible walls.
>
> **And the threatened badge floating clear above the storm roof rather than through it**: two
> chevrons stacked one above the other, both pointing downward, face `#3C7FA0` on a dark backing
> plate `#3A342C`.
>
> Faceted snow `#EEF5F4` over `#E2EAEA` runs to every frame edge. Leave headroom above the badge:
> the badge sits above the shield, so this frame is the tallest of the fifteen.
>
> **What must read, and this is the frame most likely to turn to mush: two separate facts on two
> channels that do not collide.** The shield is on the building's own geometry, an outline change to
> the object. The threat is a billboard above everything the shield added. **Nothing floats over the
> building except that one badge, and it does not intersect the storm roof at any point.**
>
> The separation is deliberate and is described at
> `apps/web/src/city/three/CrisisStatusMarker.tsx:38-53`, which calls the pair "deliberately split"
> and this frame "the frame most likely to turn to mush". The badge measures the group containing
> the model **and** its shield, so it rides above the storm roof rather than through it
> (`CrisisStatusMarker.tsx:51-53`, and `winterShield.test.ts` asserts the separation off the real
> boxes). There is no plate for this frame: take the building and the shield from frame 11 and the
> badge from frame 9.

---

## 15. Ground given up and ground bought back: `ground-reclaimed.png`

**This is the only frame here that is not under snow, and that is the subject rather than a
liberty.** A reclaim is paid for on the island after the thaw, so the preamble's weather does not
apply to it: read the light, the sky, the water and the ground from this prompt instead, and
everything else from the preamble.

**It is also the one frame that is not one state**, for the reason given in "The fifteen frames":
its whole claim is that a boundary is invisible, and continuity across one surface is what makes
that checkable.

> **Subject: a band of island ground in three consecutive stretches, filling the frame, on a
> prehistoric island in ordinary fair weather.** Two of the three stretches must be
> indistinguishable from each other, and that is the whole subject.
>
> A single unbroken band of square ground cells runs across the frame from left to right, following
> the island's rim, four units to a cell. The three stretches:
>
> 1. **Left, about a third of the band: given up and not yet paid for.** Each cell is a **full-cell
>    slab of grey ash `#8D8A82`**, filling its cell corner to corner, **worn into the ground rather
>    than set down on it**: flush with the tussock, only its top face showing, its sides swallowed
>    by the ground. Across each slab runs a **hatch of straight parallel bars at 45 degrees** in the
>    same ash a value step darker `#76736C`, coarse and widely spaced, each bar stopping exactly at
>    the edge of its own cell so nothing bleeds into the cell beside it. Adjacent scarred cells read
>    as one continuous churned surface with the hatch running through them.
> 2. **Middle, about a third: bought back.** **Plain tussock.** No ash, no hatch, no patch, no seam,
>    no discolouration, no outline, no worn ring, no difference of any kind.
> 3. **Right, the rest of the frame: ground the settlement never gave up.** Also plain tussock, with
>    the island's ordinary bare-earth worn routes running over it exactly as they do everywhere else.
>
> The island's own ground is vivid sun-dried tussock grass `#A8B850` over a paler cut `#C2CC68`,
> faceted, with bare earth `#C9A06A` worn through it along the walked routes and a deeper cut
> `#B2854F` where it is worn hardest. The water is pale at the shore `#A8D4D8` and deepens outward
> to `#3F7F92`. Ordinary daylight, a plain sky, ordinary shadows: **there is no snow anywhere in
> this frame, no frost, no ice and no drift.**
>
> **What must read, and this frame exists only to settle it: the first stretch is unmistakable and
> the second and third are one surface.** A viewer told there are three stretches must be able to
> point at where the ash ends and must be **unable** to point at where the reclaimed ground ends,
> because a cell that has been paid for is the island's own ground again and keeps nothing.
>
> The ash must read as **spoiled ground that somebody owes work on**, churned and gone to ash, and
> **never as a hole in the island, a void, missing land, water, a pit or a shadow**: it is the
> darkest thing on the ground and it is still ground, standing at the same height as the tussock
> around it. It is a mid-value grey, never a near-black or a char, fully desaturated and carrying no
> hue, so it borrows nothing from the frost's blues or the fire's ochre. The hatch is a value step
> off the slab and never a second colour, so it survives being read in greyscale, and it is **flat**:
> no raised ridges, no relief, no spoil heaped up, nothing casting its own shadow.
>
> **A cell is either fully scarred or fully ordinary ground, with nothing in between.** There is no
> faded, healed, patched, re-turfed, paler, greener or partly-hatched cell anywhere. No fence,
> marker, stake, rope or boundary line, and no outline, border stroke or glow around any part of the
> band.
>
> The scar's slab, its hatch, its two tones and its bedding are in
> `apps/web/src/city/three/ScarredGround.tsx` (`SCAR_PLACEHOLDER_TONE`, `SCAR_HATCH_NAME`,
> `HATCH_BAR`, `HATCH_PITCH`); the island's own fair-weather ground tones are `ERA_ONE_TERRAIN` in
> `apps/web/src/city/islandGround.ts`. Take the camera and the island's shape from
> `docs/superpowers/specs/crisis-reference-packs/hard-winter/01-wide-master.svg` and **nothing else
> from that plate**, which is under snow.

**Why the middle stretch is empty, and why that is a frame rather than a joke.** This prompt was
blocked until 2026-08-01 because era one's brief called given-up ground *"the only state on the board
with no way back"* while `abandon.reclaim_cost_per_cell` bought it back at 3. The reading that would
have reconciled them is that a permanent scar survives the repurchase, and it was measured and it
does not: `clearRuinedCell` drops the cell out of `crisis_damage.ruined_cells`
(`engines/game/src/crisis-damage.ts:234-239`), that array is what the scar layer is handed
(`apps/web/src/city/CitySurface.tsx:669-672` into `three/CityScene.tsx:1060`), and
`buildScarredGroundGroup` draws one tile per key it is given and nothing per key it is not. **So the
honest prompt for M21 is a frame in which the reclaimed stretch is indistinguishable from ground that
was never given up**, and that is a checkable claim rather than an absence: if a viewer can pick out
which cells were bought back, the renderer has left something behind. Section 3.5 of era one's brief
carries the dated correction, and `apps/web/src/city/three/ruinSeam.test.ts` pins the measurement.

---

## Three corrections to the sources

**All three re-read at `50a917fa`, and two of the three turned out to be corrections this file owed
rather than corrections the sources owed.** The previous version of this section asserted that both
the addendum and plate `09` were out of date on the badge. Measured at this tip, both have been
amended and **this file was the stale copy.** Only the gable is still divergent.

1. **There is no `safe` badge, and the correction is landed everywhere but here.**
   `CRISIS_STATUSES` is `["threatened", "lost"]`
   (`apps/web/src/city/three/CrisisStatusMarker.tsx:78`), and the file says in terms that it
   "deliberately does NOT contain a safe or unthreatened member" (line 76). The `safe` hexagon
   shipped in #381 and **the lead ruled
   it off on 2026-08-01**: the ruling is the third row of the addendum's own amendment table
   (`2026-08-01-hard-winter-art-brief-addendum.md:34`, *"The hexagon is removed, `CrisisStatus` is
   now two values, and an unthreatened standing building keeps the stars it had before the
   winter"*), the §5.1 ladder was corrected in place (line 253), the plate generator records it
   (`tools/generate-winter-crisis-references.ps1:443-445`), and the removal itself is commit
   `f53e3836`, *"Take the safe hexagon off, so a crisis badge means something happened"*. Two
   things follow: the presence of a badge now **means** something, and a standing unthreatened
   building **keeps its mastery stars** through the winter, because `crisisDressing` hands `null` up
   for it (`apps/web/src/city/three/CityScene.tsx:300-304` and `329-333`). **The previous version of
   this file still specified a level six-sided hexagon as the first of four badges. It is gone, and
   the badge sheet is three panels rather than four.**
2. **The threat mark is a screen-facing badge above the roofline in `#3C7FA0`, never an amber corner
   marker, and this too is landed everywhere but here.** The addendum's amendment table settles it
   in the code's favour (`2026-08-01-hard-winter-art-brief-addendum.md:32`: *"a standing marker at
   the building's front corner, in amber"* against *"a billboard above the roofline, in the ice
   front's own `#3c7fa0`"*, and the last column reads *"the code"*), §5.1a carries the colour
   argument as "the durable half" (line 287), and **the plate generator has been amended to match**
   (`tools/generate-winter-crisis-references.ps1:447-451` and `572-582`, which draw
   `CrisisStatusBadge` above the roofline and record why the amber came off). In the tree:
   `CrisisStatusMarker.tsx:46-49` for the billboard-above-the-roofline ruling and line 98 for the
   tone, which is `WINTER_GROUND_TONES.frostFront`, `0x3c7fa0` at `winterTones.ts:69`.
   **Amber is spoken for**: the island spends its one warm swatch on `warded`, `0xc9a06a` at
   `winterTones.ts:81`, glossed *"a fire is holding this"*, so warm on this board already means
   protected and an amber threat would read as reassurance (`CrisisStatusMarker.tsx:90-95`).
   **What was stale was this file's evidence**: it claimed plate `09` draws the amber marker "in
   `#C2751B`, `#8C530F` and `#A86215` at `tools/generate-winter-crisis-references.ps1:491-493`".
   At `50a917fa` those three hex values appear nowhere in that generator, and lines 491-493 are the
   lost badge's polygon loop. Frames 9 and 14 draw the shipped badge.
3. **The storm roof is a gable with a proud ridge, not the flat oversailing diamond plate `09`
   draws, and this one is still live.** The code decides it: "A GABLE rather than a hip, and that is
   the whole silhouette decision", for a hard ridge line and two raking eaves
   (`apps/web/src/city/three/winterShield.ts:119-121`), with the ridge beam standing proud of the
   apex at lines 164-178 and `OVERSAIL = 1.24` at line 70. The addendum agrees, in §5.1's
   *Protected* row: *"a gable where there was none, and an eave that oversails"* (line 256).
   **The plate has not followed.** `tools/generate-winter-crisis-references.ps1:560-567` still draws
   the shield as a flat oversailing diamond plate with two skirt faces and no ridge, and the row is
   not in the addendum's amendment table. Frames 10, 11 and 14 draw the gable, and take its
   silhouette from `winterShield.ts` rather than from the plate.

Point at plate `09` for the **arrangement** of the states (`ps1:1877-1888`: threatened, protected,
ghosted, frosted, ruined-with-its-badge) and take the shield's own silhouette and tones from
`winterShield.ts`.

**The shield and the threat marker did land, and the addendum already says so**, which is a third
claim the previous version of this file had backwards. §5 still opens with
*"`origin/game/winter-shield-and-threat` designed this and it has NO PULL REQUEST"* and *"nothing
anywhere draws it"* (lines 227-229), and that paragraph is immediately followed by a **CLOSED
2026-08-01** note recording that the branch landed as `#381` at `091a729a` and that the paragraph is
"kept as the record of what was found rather than as a description of the tree" (lines 232-236).
Measured independently: `#381` merged at `2026-08-01T19:15:24Z`, and `winterShield.ts` and
`CrisisStatusMarker.tsx` are both in the tree at `50a917fa`. So the geometry is measurable rather
than proposed, and every hex value in frames 9 to 14 is read off the shipped tables rather than off
a plate.

## How the subjects were derived

**Fifteen renders over six subjects, and the six is the number that was walked from the inventory.**
The renders are a production decision, taken after the failed run: one state per image. The subjects
are a coverage decision and are unchanged, bar the `safe` badge coming off. Six subjects map onto
the fifteen frames as: the fire (1 to 6), the two ground edges (7 and 8), the buildings (9 to 14),
and the reclaim (15).

**Walked from the 24-row mechanic inventory at
`docs/superpowers/specs/crisis-reference-packs/README.md` section 3, against the addendum's own
status column at `2026-08-01-hard-winter-art-brief-addendum.md` section 1.** Era one is the crisis
that ships, so the question that decides a row is not whether it is designed but whether a player
can see it.

**Nine of the 24 rows are marked as owed a document in that table**, reading down its fourth column:
M2, M11, M12, M13, M14, M15, M16, M20 and M21. Of those, **M2 is not art** and the addendum says so:
the gap is a durable crisis call and it is engineering. That leaves **eight art rows owed**.

> **The addendum's own count of that table is low.** It says "Five rows are owed"
> (`2026-08-01-hard-winter-art-brief-addendum.md:113`) and then names six in the same sentence,
> before adding M20 and M21 two lines later. Read off the table itself the figure is eight. Recorded
> rather than corrected in place, because that document is not this pass's to edit. **Re-read at
> `50a917fa`, where the sentence is at line 113 rather than the line 79 the previous version of this
> file cited**; the addendum has been amended since and every line reference into it needed
> re-taking.

Of the eight:

- **M11 and M13 are one subject.** The fire's proposed state **is** its pre-commit preview: the
  ghost of the result is one of the four fire states, so the fire's frames discharge both. Plate
  `07` already makes that call and this follows it. Frames 1 to 4.
- **M12 is one subject in two frames**, because the decision in that row is a **comparison** rather
  than a state: held ground is not another cell, and the feathered rim only means anything beside
  the frost's hard cell edge. Frames 7 and 8, assembled into `held-ground-rim.png`, which is where
  the comparison is made. Rendering them separately is what lets each edge fill a frame; the failed
  run drew both halves as pale blue ice, which is what happens when one frame has to hold two
  grounds.
- **M14 is one subject in three frames.** The three fuel steps are the tiers the tuning already has:
  `burn_rounds_by_tier` runs 1, 2, 2, 3 at `engines/game/src/hard-winter-tuning.ts:530-535`, so
  three steps covers the whole range without inventing a number. Frames 1, 5 and 6.
- **M15 is one subject in four frames**, and the ghosted proposal is one of them rather than an
  afterthought, because that is what `ghostWinterShield` is (`winterShield.ts:333`): the same object
  at reduced opacity, not a second geometry. Frames 10, 11, 12 and 13.
- **M16 is one subject and it is not the one the addendum expects.** The threatened building's
  carrier shipped as a badge rather than as a corner marker, and the frame that matters most is the
  one neither plate nor addendum has: a building that is shielded **and** threatened at once.
  `CrisisStatusMarker.tsx:38-53` calls that pair "deliberately split" and "the frame most likely to
  turn to mush", which is the argument for drawing it. Frames 9 and 14.

**The `safe` badge was a third state of M16 and is now none of them**, per correction 1. The badge
sheet went from four panels to three.

**M20 is excluded and M21 was, both with reasons rather than silently.** Both are the aftermath
rather than the crisis: repair and reclaim happen on the island after the thaw, outside the subject
named for this pass. M20 stays out, and is still owed a treatment before it could be prompted at all.

**M21 was excluded for a second reason and it no longer holds, which is why frame 15 exists.** It
was **not promptable as it stood**, on the addendum's own finding: given-up ground was drawn as "the
only state on the board with no way back" while `abandon.reclaim_cost_per_cell` buys it back at 3, so
"those two sentences cannot both be the direction". That looked like a design decision and it was a
measurable question. **Measured on 2026-08-01: a reclaimed cell keeps nothing**, so the prose was the
wrong half, era one's section 3.5 carries a dated correction, and the frame that settles M21 is one
where the reclaimed stretch is indistinguishable from ground that was never given up. The resolution
is at `2026-08-01-hard-winter-art-brief-addendum.md` section 6.

## Owed, and not invented here

1. **What a mended building looks like.** M20 owes "frost coming off a wall", which only ever happens
   on the island after the thaw, and it has no treatment. Named in the addendum's section 6 as owed
   to the lead, and it is why M20 has no frame here while M21 does.
2. **Whether a fire's remaining rounds get a rail channel as well as the fuel stack.** Named as owed
   in the addendum's section 8, on the ground that the fuel stack may be enough at the resting
   camera and is certainly not enough at full zoom-out. Frames 5 and 6 draw the fuel stack and
   nothing else, which is that document's recommendation and not a ruling.
3. **The copy that announces a spent shield.** Shielded is binary on screen, so a spent shield and a
   never-shielded building are the same picture by ruling (`winterShield.ts:59-66`). **No frame above
   draws a spent shield**, because there is nothing to draw: the sentence lives in the rail and is
   owed in the addendum's section 8.
4. **Whether plate `09` gets regenerated to the shipped gable.** This is what is left of an owed
   item that used to name three divergences. Measured at `50a917fa`, the badge's position and hue
   and the hexagon's removal have all landed in both the addendum and the plate generator, so **only
   the gable is still divergent**: `ps1:560-567` draws a flat oversailing diamond where
   `winterShield.ts:119-121` rules a gable with a proud ridge. The divergence is recorded in "Three
   corrections to the sources" rather than fixed, because the plates are generated files. Somebody
   owns deciding whether the plate is regenerated, and until it is, plate `09` is a reliable
   reference for the **arrangement** of the five states and an unreliable one for the shield's
   silhouette.
5. **Whether the one-state-per-image restructure holds.** It is a diagnosis of one failed run rather
   than a measured rule, and the evidence for it is that the run's only frame with a legible subject
   is also its only frame that broke a ruling. **The next pass is the test**, and if the fifteen
   frames come back with their subjects in them, this belongs in
   `crisis-reference-packs/README.md` section 5 as a pack convention, beside the side-by-side
   convention it partly displaces.

## Related

- `docs/superpowers/specs/2026-08-01-hard-winter-art-brief-addendum.md`: the owed rows, and the
  document these prompts serve
- `docs/superpowers/specs/2026-07-30-hard-winter-crisis-art-brief.md`: era one's original brief
- `docs/superpowers/specs/crisis-reference-packs/hard-winter/`: plates 01 to 09 and the reading key
- `docs/superpowers/specs/crisis-reference-packs/README.md`: the mechanic inventory and the pack
  conventions, including the side-by-side convention this sheet now reads differently
- `apps/web/src/city/three/winterShield.ts`: the storm roof, the banking and the ghost, with the
  gable decision and the opacity floor
- `apps/web/src/city/three/CrisisStatusMarker.tsx`: the two badge shapes, `MARKER_TONES`, and the
  ruling that took the hexagon off
- `apps/web/src/city/three/winterFire.ts`: the nine-stone ring, the three logs, the seven tongues and
  the heat ramp
- `apps/web/src/city/three/winterTones.ts`: `WINTER_SCENE_TONES`, `WINTER_GROUND_TONES` and
  `WINTER_LIGHT`
- `output/imagegen/era-01-prehistoric-civic-buildings/README.md`: the house format this mirrors
