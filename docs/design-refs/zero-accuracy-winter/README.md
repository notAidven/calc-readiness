# The zero-accuracy winter, rendered

What `HARD_WINTER.damage.ruin_at: 2` looks like at the bottom of the range, on the island, at the
window the lead reviews on. Produced because #374's own report flagged a consequence the lead ruled
for and nobody had seen:

> "answer nothing and lose everything" is literally true again: one cold round is a building and
> the frost reaches every band, so a zero-accuracy winter now ends with **nothing standing** and
> reads `lost` on screen where it read `mauled`.

**Nothing was retuned to produce these.** They are evidence for a decision, not a decision.

## How the state was reached

A live city of era one's six skill buildings plus the hub, played through the real question
surface for all five rounds, with every one of the fifteen answers really wrong (the real answer
key with a marker appended, so it fails through the real checker). The declaration is a fire on
the settlement's own heart every round, which at the `none` tier is lit and warms no ground. The
island in the frames is the board `WinterInCity` published to the canvas, not a board assembled
for the picture.

`apps/web/src/winter/winterZeroAccuracy.browser.test.tsx` holds it, and its always-on half asserts
the state the frames are of: the verdict is `lost`, all seven roll tiles read `in ruins`, the
island carries seven ruins at the moment the card is up, and the card really says
`You answered 0 of 15 right`.

## What each one is

Every frame is at **1024x580**, and the viewport is in the filename because a frame whose viewport
is unstated says nothing about anybody's screen.

| file | what it shows |
| --- | --- |
| `conclusion-lost-over-the-island-1024x580.png` | The conclusion screen, framed to show the island it is reporting on rather than cropped to the message. Seven tiles, all `in ruins`; `You answered 0 of 15 right, 0%`; a 420 material bill; and the carry-back offer over seven buildings. |
| `island-nothing-standing-1024x580.png` | The board at the end, same camera and same instant, with the crisis overlay hidden. Seven ruins and nothing standing. |
| `island-nothing-standing-zoomed-1024x580.png` | The same island at the player's own zoom control (three notches of `applyCameraAction`), where the ruins and their `lost` marks are legible. |

## What the frames say about the copy

The standing rule is that crisis copy never leads with the penalty and stays encouraging. Read
against the frames, at the one grade where the bill is largest:

- **It does not lead with the penalty.** The card opens with the event (`THE CRISIS IS OVER`), then
  the outcome (*"Nothing came through the winter."*), and the 420 material bill is on the far side
  of the card under the accuracy line. That ordering is asserted as DOM order in the test above, so
  it cannot drift.
- **The verdict is a report and not a scolding.** *"Nothing came through the winter."* names what
  happened in the player's own terms and blames nobody. There is no exclamation mark and no
  celebratory register, which `winterConclusion.test.ts` already sweeps for.
- **What is missing is the encouragement, and only at this grade.** Every sentence on the card is
  either an outcome or a price: the roll is seven crosses, the accuracy line is `0 of 15`, the bill
  is 420 material, and the carry-back note offers to mark all seven as ruins on the real island.
  Nothing on the screen tells the player what to do next except `New winter`. At the other four
  grades the outcome sentence carries its own consolation (*"The settlement held"*, *"Every
  building came through"*); at `lost` there is nothing to hold on to, and the card does not add
  anything.

That last point is the finding and the ruling on it is the lead's. It is a copy question rather
than a tuning one: the ladder is doing what it was ruled to do, and a single forward-looking
sentence at the `lost` grade would close it without touching a tuning value.

One thing that is unchanged behaviour rather than a finding: the island is still wearing the SEASON
in these frames (snow terrain, cold water, overcast sky) because the crisis layer is still mounted
while the card is up. The frost STATES are gone, which is what `thawWinterRows` takes off and what
`winterConclusionSheet.browser.test.tsx` asserts; the snow goes when the player leaves the winter.

## Regenerating them

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/winter/winterZeroAccuracy.browser.test.tsx
```

which writes to `apps/web/src/winter/__screenshots__/zero-accuracy/`. They are committed here for
the reason `crisis-panel-width/README.md` gives: `.gitignore` excludes `**/__screenshots__/`
because what lands there is regenerated on every run, and these are the same pixels kept because
the review turns on frames somebody looked at.
