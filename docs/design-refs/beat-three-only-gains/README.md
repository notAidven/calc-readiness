# Beat three only ever gains — 1024x580

**Viewport: 1024x580, reduced motion, a live `npm run dev` server.** Named, because a frame
whose viewport is unstated says nothing about anybody's screen, and every dimension on this
surface is viewport-relative.

The lead, watching the era-advance ceremony run: *"within a given beat, there shouldn't be
reversal of progress like with the town hall unscaffolding."*

## The headline

**`00-the-pair-either-side-of-a-miss.png`** is the whole thing on one sheet: the hall's scaffold
ring two checks into beat three, then after one real wrong answer inside the same beat, before
and after the fix, with a difference map under each pair.

|  | rail fill before the miss | rail fill after it | the ring, before → after |
| --- | --- | --- | --- |
| trunk `5b3bae73` | 0.67 | **0.33** | **2.74% of the crop moved** — a whole rung of lashed rail comes off the ring, and the difference map is the ring's own outline |
| this branch | 0.67 | **0.67** | **0.00%** — the hall does not move |

`data-banked` goes `2 → 1` in **both** columns. D-ET11's cost is unchanged; what changed is that
it stopped being paid in scaffolding.

## Walking the beat

Beat three is worth three checks at era one, so it is photographed at each of them, plus the
miss and the close. The walk is driven by the ceremony dev hatch's **`+1 check`** control, which
is the only way to stand a beat part-way through without answering real graded questions —
every other rung lands on a beat boundary.

| frame | what it shows | rail | `data-banked` |
| --- | --- | --- | --- |
| `01-beat-three-check-0` | beat three opens: the ring stands, no rungs climbed | 0.00 | 0 |
| `02-beat-three-check-1` | one check on | 0.33 | 1 |
| `03-beat-three-check-2` | two checks on: the ring is climbing, the stack is arriving | 0.67 | 2 |
| `04-beat-three-after-a-miss` | **a real wrong answer through the shipped checker** | 0.67 | 1 |
| `05-beat-three-done` | the beat closes and beat four opens | 0.00 | 0 |

Three captures per state:

- the **composite**, the whole window with the hatch folded to its chip — because cropped to
  the element that changed, a screenshot proves nothing about occlusion;
- **`island-only-`**, the same frame with the ceremony layer and the dev hatch hidden, because a
  WebGL canvas photographs stale under a full-screen overlay and the subject here is the surface
  behind, not the component;
- **`hall-`**, a 260x180 crop at `x400 y90` drawn at 2x, because the ring is about ninety pixels
  across at this lens and the rungs are the thing being claimed about.

`before/` is the same walk with `beatProgress` reading the live bank, which is what trunk
`5b3bae73` shipped.

## Also in here

`06-hatch-open-1024x580.png` is the dev hatch unfolded, for the reachability claim. Measured in
`measured-1024x580.txt`: the panel is `252x162` at `10,10`, **7.0% of the window**, and 9 of 9 of
its controls are hit-testable at their own centres. What is behind it is the catch-up dev hatch
and the HUD's MASTERED and CITY LIFE readouts — nothing of the ceremony's own: not the advisor,
not his bubble, not the beat rail, not the hall.

Regenerate with `npm run dev`, then

```bash
node scripts/qa/beat-three-only-gains.mjs http://localhost:5173 docs/design-refs/beat-three-only-gains
node scripts/qa/beat-three-compare.mjs docs/design-refs/beat-three-only-gains
```
