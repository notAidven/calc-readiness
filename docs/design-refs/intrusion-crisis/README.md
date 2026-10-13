# Era nine's Intrusion, photographed — the first visual record of this crisis

> Superseded by the approved Cut-or-Restore implementation and frames in
> `output/qa/era-09-intrusion-implementation/`. Kept as the shipped predecessor record.

**Fourteen frames, all at 1024x580, all under `prefers-reduced-motion: reduce`.** Taken with the
renderer that ships them, from `apps/web/src/intrusion/intrusionCrisisShots.browser.test.tsx`:

```
VITE_INTRUSION_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/intrusion/intrusionCrisisShots.browser.test.tsx
```

Off by default, on the measurement `winterCrisisShots.browser.test.tsx` records: a heavy browser
test left switched on in CI does not fail here, it starves an animation-timing assertion in some
other file, once per run, in a different file each time. **What runs in CI is every assertion
above the frames** — each state is constructed and asserted whether or not a picture is taken.

The same frames are copied to `output/design-refs/intrusion-crisis/`.

## ⚑ THESE ARE A PROPOSAL, NOT A CHECK AGAINST SOMETHING

**No reference art for era nine's crisis has ever been run.** Its imagegen sheet's own owed list
says so, and all fourteen of its frames are unrendered. Nothing under `apps/web/src/city/three/`
draws a matrix panel, a duct collar, an inspection cover or a blanking plate. So this surface was
built from prose, and these frames are the first pictures of it that exist.

**The section at the bottom names every visual decision the spec left open and says what was
chosen**, so a reviewer can overrule one line rather than a whole picture.

## Why 1024x580, and why nothing is cropped

`.cursor/rules/qa-verification.mdc`: a spatial claim owes a rendered frame somebody looked at,
taken at a short, realistic viewport and named beside it. That is the lead's own window, and it is
where a two-column split and a fixed corner panel cost the most. Nothing here is cropped to its
subject, on the same rule's other half: a crop of the thing that changed is a picture of the one
part nobody doubted.

## The frames

| # | File | What it shows, and what state produced it |
| --- | --- | --- |
| 1 | `01-announcement-1024x580.png` | §9.1's entry card. *"Something is in the systems"*, over a board that is already mounted underneath, so dismissing reveals rather than swaps |
| 2 | `02-opening-board-1024x580.png` | A fresh board. Every building `Not read.`, every panel lit and blank, every floor closed. **Unknown as a positive state** |
| 3 | `03-check-armed-1024x580.png` | A check armed. Cost first, then what it covers, then the ladder as reading quality. The target is FRAMED on the town rather than filled |
| 4 | `04-question-1024x580.png` | The question panel, over the real practice pool for era nine's window |
| 5 | `05-compromised-1024x580.png` | A firm compromised reading: three full-height bars, a doubled raised collar, and the cover the check lifted still up |
| 6 | `06-hedged-1024x580.png` | A hedge: two bars with the second at half height, a single raised collar. D-CRISIS-22's protected partial credit |
| 7 | `07-noisy-check-1024x580.png` | A check that returned nothing. The floor records the visit and the panel stays blank |
| 8 | `08-isolation-armed-1024x580.png` | The two-stage control, with the risk in full on the second press |
| 9 | `09-stale-board-1024x580.png` | **The crisis's sharpest moment.** Every reading still says what it said, dimmed, with a bar under the row and a notch across the collar |
| 10 | `10-sealed-building-1024x580.png` | A building cut off: blanking plates in its own module, a corner isolation plate, and the one dark panel in the town |
| 11 | `11-contained-1024x580.png` | The good ending. *"That was it."* and nothing left suspended |
| 12 | `12-unsolved-1024x580.png` | The other ending, with the pattern still broken where the player did not finish |
| 13 | `13-six-buildings-1024x580.png` | The widest authored board. **All five readings on screen at once**, which is the frame to judge countability from |
| 14 | `14-dev-skip-over-the-surface-1024x580.png` | The dev control unfolded, so what it covers is visible rather than argued |

Frames 1 to 13 have the dev control folded to its chip. That is a state a reviewer can reach with
one press, and it is folded here because open it sits over two of the four paving panels — so the
record of era nine's ground would have had the ground missing from it.

## An honest read of what came back

**What works.** The bar counts are countable at this size, including across the six-building board
where all five readings sit side by side. The doubled collar, the single raised collar and the
flush one are three different pieces of relief rather than three tones. A sealed building is
unmistakable and is unmistakable on the PANEL rather than on the mass, which is the fact
`building-states.png` exists to establish. The stale board reads as old news rather than as broken.

**What is weakest, in order.**

1. **The flush collar.** §3.3 warns it is *"the half most likely to be lost: it must read as
   deliberately level with the floor rather than as a collar that failed to draw."* At this size it
   is a faint ring and it is the closest thing here to a marker that failed to draw. It is the
   decision most likely to need overruling.
2. **The blanking plates.** They are the building's own material in its own module, which is what
   *sealed rather than boarded* requires, and the consequence is that they are subtle: on a sealed
   building the eye goes to the dark panel first and the plates second. That may be right and it
   may be too quiet.
3. **The barrier.** Quiet, which the ruling asks for, and at this size close to invisible. The void
   carries the frame exactly as the ruling intends, so this may be correct rather than weak.
4. **The empty band above the town.** The illustration keeps its own proportions inside a taller
   column, so there is dead space above it on a four-building board.

## Every visual decision the spec did not settle, and what was chosen

Each of these is a judgement rather than a ruling. Overruling one changes one function.

| Decision | What the spec says | What this chose |
| --- | --- | --- |
| **What a *probably clear* panel looks like** | `intrusion-tuning.ts` names the gap: §3.3's table has four rows and §4.2's ladder has five outcomes, and *"what a probably clear panel looks like is owed to the presentation lane"* | Two bars with the second at half height — the same hedged grammar as *likely compromised*, one rung lower on the count. So the count says how bad and the half bar says how sure |
| **What a collar does for a hedge leaning clean** | Unstated | A single raised collar, like the other hedge. Doubling is reserved for a firm compromised reading, so the strongest relief means the strongest news |
| **A building looked at with nothing to show** | §4.1 assumes a lifted cover and a reading travel together; the engine records that they come apart | *"Looked at, and the readings came back too noisy to use."* Saying only *"Not read."* would tell the player they still had that check to spend |
| **How far a raised collar stands proud** | Owed item 4: *"no geometry exists to measure"* | The collar's body and its lit top face are both `intrusion-tones.ts`'s. What this chose is that a RAISED collar shows the light top face and a FLUSH one shows only the dark cut, so the two separate on which face you can see rather than on size |
| **Which way the corner plate's cut bar runs** | Owed item 10, and it is a cross-era question: era six rules its door mark to be a single **horizontal** cut bar, and era four is now expressly *never a bar* | Horizontal, flagged at the drawing site as the choice most likely to be overruled. Two of the four crises now rule a bar out of their own marks and era nine rules it in |
| **The atmosphere's eight numbers** | §2.1 gives directions, not digits | Flagged `⚑ CHOSEN` at each field in `intrusionTones.ts`. The identifying one: the key goes DOWN to about 35 degrees of elevation, the first preset in the registry to go under the fair-weather rig |
| **The proportions of the drawn town** | Nothing; era nine's assets are unbuilt | Masses about half the frame's height, paving panels a third. Set off a frame after the first version rendered the buildings as thumbnails |
| **Which tone table this reads** | Owed item 1: *"there is no `intrusion-tones.ts`… so nothing pins them"* | There is one now, from the lane that owns the three crises' palettes, and this surface adopted it rather than shipping a second. **The two derivations were made independently and every overlapping value is identical**: body, glass, paving, deep cut, kerb, sky, haze, water, void, cover face, collar, barrier rail and barrier post |
| **A second panel for a lifted cover** | The sheet rules one mark to a panel and says nothing about where the second panel goes | Stacked under the first rather than beside it, so both keep the plot's full width. Side by side, the six-building board gave each mark 23 units across |

## What is NOT proposed here

**Era nine's scene assets.** These are a DOM surface: era nine's brief puts the subject there
itself (§5.3, *"the evidence board is the subject and the island is the illustration"*), and the
matrix panel on a three.js building, the duct collar in the island's paving, the inspection cover
and the blanking plate are all still unbuilt. The registry entry says `slice` for that reason.
