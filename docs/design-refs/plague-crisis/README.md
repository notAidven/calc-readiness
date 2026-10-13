# The Plague — era six's crisis, photographed with the surface that ships it

Sixteen frames of `apps/web/src/plague/`, taken at **1024x580** under reduced motion by
`apps/web/src/plague/plagueCrisisAtlas.browser.test.tsx`. Regenerate with

```bash
VITE_PLAGUE_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/plague/plagueCrisisAtlas.browser.test.tsx
```

## These are the first pictures era six has, and they are a proposal

Era six's crisis had an engine and no surface. Its prompt sheet
(`output/imagegen/era-06-plague-crisis-scenes/README.md`) asks for fifteen reference frames and
**all fifteen are unrun**, so there is no art to build against and nothing here was matched to a
render. The sheet says what that costs: *"era six's crisis is unbuilt, so unlike era one nothing
here can be checked against shipped geometry […] treat these renders as the first draft of the
design rather than as pictures of it."* These frames are the other way round — the surface is
built, so they are pictures OF a design — and they are a **proposal the lead should judge and
overrule where he wants to**. The report on the pull request names which choices are least sourced.

**The viewport is half the evidence.** Every frame is the whole 1024x580 window, uncropped, because
every question worth asking of this surface is about what else is in shot: whether the key fits above
the fold, whether the read-out fits beside the town, whether the conclusion covers the board it is
commenting on. Two of those were answered wrongly by the first run and fixed by looking at it —
`plague.css` records both.

## The frames

| # | Frame | What it shows, and the board state that produced it |
| --- | --- | --- |
| 01 | `01-entry-the-ring` | What a player opens on: `four-on-the-square`, day one, the Covered Market already affected with a covered vessel at its threshold. Four bands inlaid in the paving, all open. |
| 02 | `02-route-proposed` | A route closure being considered on `two-courts-and-a-bridge`: the barrier stone drawn **see-through, whole**, and the read-out leading with what it separates. |
| 03 | `03-building-proposed-and-what-it-separates` | A building closure: a proposed stone across every route into the Painters' School at once, and the **enclosure** round the four buildings it would cut off. The outline encloses and does not fill. |
| 04 | `04-stone-one-band` | The bottom of the duration ladder: one raised band, bought at 0 or 1 of 3. |
| 05 | `05-stone-two-bands` | Two bands, bought at 2 of 3, with the stone's own face visible between them. |
| 06 | `06-stone-collar` | The top rung: a continuous collar, bought at 3 of 3, which is *shut until this is over*. |
| 07 | `07-stone-spent-no-band` | A stone whose hold ran out: present, carrying **no band at all**, over a band that is open again. A different silhouette from a stone that was never set. |
| 08 | `08-a-day-passed-with-nothing-shut` | The propagation: two bands notched from the source end, two more buildings marked. Letting the day pass without acting is a real play. |
| 09 | `09-the-hidden-half` | `the-hub-and-five` at entry. Two sources and one of them is not shown, so the honest count is 3 and the player's own list accounts for 2 — and the strip says so. |
| 10 | `10-the-bridge-separates-a-court-and-changes-nothing` | The frame that justifies §7.2's ordering: the bridge separates a whole court and leaves the terminal count **unchanged**, so a panel led by the count would call the best move in the crisis pointless. |
| 11 | `11-shuttered-and-barred` | The hub shut at the top rung: four stones with collars, and the building barred across every opening with a single horizontal cut bar on the door. |
| 12 | `12-marked-and-shut` | The row that must not merge: the Covered Market **marked at its threshold** and **shut across its openings**, two facts in two places. |
| 13 | `13-answering-a-real-question` | The batch: a real practice item from era six's three-age window, graded by the real checker, with the stone already chosen. |
| 14 | `14-the-dev-skip-in-the-corner` | The dev control the other fifteen frames hide: resolve a day at a chosen score, or run the outbreak out. Behind `isDevPersistenceEnabled`, so it ships to nobody. |
| 15 | `15-contained` | The ending, with the town still visible beside it: one of four affected, everything back in use, no bill. |
| 16 | `16-widespread` | The other ending: shut nothing and the outbreak reaches everything. It still meets its terminal condition, so it is an ending with consequences and not a loss. |

## An honest read of what is in them

**What works.** The notches in frame 08 are the strongest thing on the sheet: they are countable
cuts running along a line, from the end the sickness came from, and *reaching* is legible as a
one-word read at this size. **Frames 02 and 10 are the pair worth reading together**, because
between them they are §7.2's ordering justified twice over: 02 says *"it separates nothing"* beside
*"1, down from 2"*, and 10 says *"it cuts Town Square, Merchant Houses on the loggia, Covered Market
by the mint off"* beside *"2, unchanged"*. Those are the two ways the panel's most important lines
disagree, on one board, and a panel led by the count would get both of them backwards. The four
building states in 01, 08, 11 and 12 are told apart by different things in different places rather
than by one channel doing two jobs.

**What one round of looking already changed.** The proposed stone was drawn see-through in the
stone's own pale tone, and over pale paving it composited to a pale tint — so the one mark that says
*this has not happened yet* was the hardest thing on the board to find. It is cut from the dark end
of the stone family now, which is the prompt sheet's own instruction, and frame 02 is what made the
case. Two more of the same kind are recorded in `plague.css`: the conclusion sheet covered the town
it was commenting on, and the key's fourth line sat under the fold.

**What is marginal.** The duration ladder is countable at this camera and only just: compare 04
against 05 and the difference is two small dark bars against one. That is exactly owed item 4 on the
prompt sheet — *"whether one band, two bands and a collar are countable at the shipped camera"* — and
the answer this surface gives is **yes for one against two, comfortably for a collar against
either**, at a stone about 20px tall in a 1024px window. It would not survive being made smaller.

**What I would most like overruled.** The barrier stone at board scale reads as a dark object rather
than as dressed stone, because at this size the collar is most of it. And the buildings are
elevations rather than the isometric masses era six's style guide describes: a flat two-dimensional
board was the honest choice for a model with no places in it, and it is a long way from the
prompt sheet's *"isometric low-poly, one fixed camera tilted about 49 degrees down"*. If the lead
wants the island instead, the geometry is what `PLAGUE_PROPAGATION.owed` names and nothing in the
engine has to move.

## Four of the prompt sheet's owed items now have an answer

The sheet's owed list is *"owed to the lead, and not invented here"*, so these are answers a renderer
can give and nothing more — the ones that need a ruling are still open.

- **Owed item 2, how a flush band reads at the shipped camera.** *"Flush is the harder half to draw:
  a band level with the paving may vanish at the resting camera or may read as a painted stripe."*
  Measured: a single stroke DOES read as a painted stripe — that is what the first run came back
  with. What makes it read as inlay is the cut edge on both sides, so a band here is a wider line in
  the slab's lit tone under a narrower one in the darker cut, over paving whose own joints run up to
  it. Frames 01 and 04 are the evidence.
- **Owed item 4, whether one band, two bands and a collar are countable.** Yes at this camera, and
  only just for one against two: compare 04 with 05. A collar is unmistakable against either. It
  would not survive being made smaller, which is the finding rather than a reassurance.
- **Owed item 5, what a barrier stone measures.** *"Low, squared, knee height"* is now 22 by 36 units
  of a 620 by 420 board, which is about a third of a building's height and a fifth of its width.
  Proposed, not ruled.
- **Owed item 9, whether the band counts survive being drawn apart.** They are drawn by one
  component from one ladder, so they cannot come apart by construction — which is the answer a
  renderer can give to a question the sheet asked of a tiling job.

Still open and not touched: what the covered vessel IS (item 3, and it is drawn as a covered vessel
and nothing more specific), whether some links are unknown until used (item 7), and how many links
era six's real island should have (item 8, which belongs to whoever authors era six's land).

## Related

- `output/imagegen/era-06-plague-crisis-scenes/README.md` — the fifteen unrun reference frames, and
  the owed list these frames answer four items of
- `docs/superpowers/specs/2026-08-01-plague-crisis-art-brief.md` — the art brief
- `docs/superpowers/specs/crises/era-06-plague.md` — the presentation brief the surface is built to
- `apps/web/src/city/three/crisis/plague.ts` — era six's registry entry, its atmosphere preset and
  its twenty-four-row inventory
