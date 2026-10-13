# The CITY LIFE panel says what is wrong, and the people leave

> ## ⚑ SUPERSEDED IN PART, 2026-08-05: the people do not leave
>
> This is the record of the review that built the departure mechanic, and half of what it
> photographs no longer ships. The team lead withdrew the consequence himself — *"maybe just
> remove the actual consequences just tell them their people are unhappy?"* — and it was settled
> as a product decision: **citizens do not leave. Departures are removed as a mechanic,
> entirely.**
>
> **What is still current:** every frame and every judgement about the PANEL. The alarmed state,
> the four cues, the `--brick` caveat below and the deleted-glass defect at `00` are all live,
> because the indicator half of his brief was never in question.
>
> **What is superseded:** the copy, the population row and the island frames. `UNHAPPY_WARNING`
> is now *"The people are unhappy, and want more built for them."*; the population row's
> `N people have left` line is gone and that row can no longer be alarmed at all; and frames
> `07`–`11` photograph a shoreline nothing stages any more. `departureShots.browser.test.tsx`
> is deleted with the mechanic, so those five frames cannot be retaken.
>
> **The island section at the bottom is the part worth reading anyway**, and it is why nothing
> was lost by the removal: it records, measured, that six seven-pixel figures did not read at
> the game's own framing. The panel was carrying the state at a glance the whole time.
> `test/departuresAreWired.test.ts` now holds the tree to the ruling.

**Every frame is 1024x580 under reduced motion**, era one, day lighting. The viewport is
named because it is half the evidence: at the game's default framing a citizen is about
seven screen pixels tall on a 580px viewport against about eleven on a 1400x900 one, so a
comfortable developer window would flatter the island half of this by roughly half again.

## What the lead asked for

> *"make the deficiencies in these screens more apparent; if the people are unhappy, it
> should say so and indicate that people are gonna start leaving. there needs to be clear
> consequence and indicator of discontent (and same with livability)"*, and then *"there
> needs to be an actual mechanic of people leaving."*

His replacement copy, used verbatim at the time: **`The people are unhappy, and will start
leaving soon!`** — **retired 2026-08-05**, see the note at the top.

## How each frame was taken

| Frames | How |
|---|---|
| `01`–`06` | The **running dev server**, real HUD over the real island: `node scripts/qa/city-life-distress-shot.mjs http://localhost:5183 output/city-life-review`. `?mock&paths` for the calm states (with one Campfire bought through the build menu for `Content`), `?mock&mastered` for the unhappy one. |
| `07`–`11` | `VITE_DEPARTURE_SHOTS=1 npm run test:browser` (`apps/web/src/city/three/departureShots.browser.test.tsx`), which pinned the camera so the island pairs were the same island at the same camera with and without the six people who are away. **The script is deleted and this row cannot be re-run**, because nobody stands off the settlement any more. |

## The three panel states

`04-panel-states-compared.png` is the one to look at first: `Content`, `Settling in` and
the unhappy state, side by side, same panel, same city, same window.

**Content** (44 of 44 reached) and **Settling in** (27 of 44) are cool cream panels with
ink labels and ink figures. Nothing in either is red and nothing is emphasised.

**Unhappy** (9 of 44) is a different object at a glance. The whole panel is warm-tinted and
warm-bordered; the HAPPINESS row is a salmon block with a 4px brick rule
down its left edge; its label and figure are brick; it carries a warning triangle; and its
unreached cells go from grey to pink, so thirty-five people the city does not reach are visible
as a pink bar rather than as absent ink. **In these frames the POPULATION row is alarmed
alongside it, and that is the superseded half**: the row was alarmed because people had left,
and it can no longer be alarmed at all.

**Does it read as alarming at a glance, or only on reading?** At a glance. The colour shift
is pre-verbal and it is what you see first; the triangles and the red figures are the
second beat, and the sentence is third. The one caveat worth having a view on: `--brick` is
a warm terracotta rather than a hazard red, so the panel reads as *wrong* rather than as
*danger*. That is deliberate — D-CIT13 forbids the panel shaming the learner and the
surrounding palette is warm — but it is a dial, and if it should be louder that is one
token.

## `00-the-glass-was-deleted-1024x580.png` is a defect, kept

The first version of the distressed state set `background` on `.hud-vitality`, which shares
the shell's glass rule with every other HUD panel. Setting it REPLACED `--glass-fill`, so
the island showed straight through the panel and every label in it dropped to unreadable.
No test caught it and no test could have: the DOM was correct, the data attributes were
correct, the classes were correct. It is kept here because it is the answer to *"why does a
styling change need a frame"*.

## The island

`11-the-shore-compared-3x.png` is the pair cropped and magnified: the same ground with
nobody leaving and with six leaving. The six stand out near the water, on ground no
ordinary citizen is ever placed on, while the settlement's own crowd is packed at its
doorsteps at the top of the frame.

**And the limitation, stated rather than left to be found.** Compare `07` and `08`, the
same pair at the game's own default framing: **the departure does not read at full
zoom-out.** Six seven-pixel figures against an island scattered with props and trees is not
something anybody spots. At a glance the PANEL is what carries the loss; the island is what
carries it once you look. That is why the lead asked for both, and it is worth knowing
which one is doing the work.
