# The five winter protection states, photographed WITHOUT the safe hexagon

The rendered evidence behind the lead's ruling of 2026-08-01 that an unthreatened building gets
nothing added, which took `CrisisStatusMarker`'s stone `safe` hexagon off every standing building.

## Why these are committed, when `__screenshots__/` is gitignored

`.gitignore` excludes `**/__screenshots__/` because what lands there is regenerated on every run and
is meaningless afterwards. These are the same pixels kept for the opposite reason.
#381 proved the five states mutually
distinguishable and **took every one of its frames with the hexagon present**, so that proof is
about a board that no longer ships: three of the five conditions lost a badge they had when the
separation was last photographed, and the hexagon could have been carrying some of the separation by
giving the eye a baseline *ordinary building* reading the other states departed from. Whether it was
is a question about a picture, so the answer has to be one. A cloud agent has no way to inline an
image into a pull request.

## The five conditions, and what each is told apart by

Read with the labels covered, which is the only way this evidence is worth anything: nothing in these
frames is captioned, and the conditions are derived from a real `HardWinterState` rather than set by
hand (`apps/web/src/city/three/winterProtectionStates.browser.test.tsx` carries the derivation and
the census that pins it).

| condition | what you see | confusable with? |
| --- | --- | --- |
| **protected** | the one gable on the board: a brown storm roof oversailing its walls, ridge proud, battens and stone weights bumping the eave line, its mastery stars above it | **no.** Nothing else on the island has a ridge line |
| **spent** and **never shielded** | an ordinary pale-timber hut with its stars | **with each other, by ruling.** The rail's spent-shield notice is the whole of the difference |
| **threatened** | a blue double chevron driving downward on a billboard above the roofline, no stars | **no.** The only mark with that outline, and the only building with no stars |
| **frosted** | the lookout tower with a pale ice crust climbing its base, on its blue plinth, stars above | **no.** Pale ice against the storm roof's brown, and a rimed base rather than a gable |
| **lost** | a dark broken cross over dark rubble | **no.** The only broken silhouette, and the only dark badge |

**The one thing the removal changed about the reading, and it is an improvement rather than a
cost.** Under the hexagon, every standing building carried a badge and the eye had to compare
badge SHAPES across the settlement. Without it, presence of a badge means something is happening,
so *threatened* and *lost* are found before they are identified, and the three quiet states are
found by their stars.

## What each file is

The viewport is in every filename, because a frame whose viewport is unstated says nothing about
anybody's screen. All seven are **1024x580**, the lead's short laptop window.

| file | what it shows |
| --- | --- |
| `in-game-five-conditions-1024x580.png` | **The claim rests on this one.** The real island with the real crisis sidebar over it and the `?dev` panel where a reviewer has it, all five conditions on one board. It is the surface rather than the component, per the evidence rule |
| `island-five-conditions-1024x580.png` | The same camera and the same instant with the overlay hidden, so the buildings behind the sidebar's own column can be read too. Only the overlay moves, so the pair is one picture asked two questions |
| `in-game-five-conditions-zoomed-1024x580.png` | The same board at two notches of the player's own zoom control. Four of the five: the threatened building is the corner one at rim depth 1 and no reachable zoom holds it and the storm roof in one close frame |
| `island-five-conditions-zoomed-1024x580.png` | The zoomed frame with the overlay hidden |
| `read-2.4x-of-island-five-conditions-1024x580.png` | A 2.4x magnification of the settlement out of `island-five-conditions`, kept because the buildings are small at this viewport and a reviewer should not have to zoom the file themselves. **It is a reading aid and not the evidence**: the full frame beside it is, since a crop cannot say what is visible around an element |
| `before-stars-inside-storm-roof-1024x580.png` | **The defect the first re-take found**, kept because it is the reason a frame was worth taking. See below. This one is deliberately NOT re-taken after `#389`: it is a photograph of a line of code that no longer exists, and re-taking it would mean re-introducing the defect |
| `read-2.4x-of-before-stars-inside-storm-roof-1024x580.png` | The same magnification of that one, where the buried star row is actually visible |

## The defect these frames found, which no test was going to

Taking the hexagon off gives a **shielded** building its mastery stars back, and that state was
unreachable before: a shielded building always wore the hexagon. The hexagon measures the DRESSED
group and cleared the storm roof; `MasteryStars` measured the bare model, and `STAR_MARGIN` is 2.6
world units against a 2x2 storm roof standing about 3.05 over the roofline it is bedded onto. So the
star row hung **inside the gable**, which is visible in
`read-2.4x-of-before-stars-inside-storm-roof-1024x580.png` as one gold point and one grey point
showing through a brown roof, and in nothing else. Measured afterwards in the drawn scene: the row
sat at 9.10 against a cap top of 11.40.

Fixed by giving the stars the same group the badge measures, which is a one-line change, and pinned
by *"a SHIELDED building's mastery stars ride above the storm roof, not inside it"* in
`apps/web/src/city/three/winterShieldAndThreat.browser.test.tsx`. That assertion was watched failing
at those two numbers before the line changed.

## RE-TAKEN 2026-08-01 AFTER `#389`, AND WHAT THAT DID AND DID NOT CHANGE

#389 landed the same three fixture
repairs this branch had made, and its version of this file's fixture is the one that ships. The five
frames above were re-taken on the merged result rather than carried over, because a frame taken
before a merge is evidence about a tree that no longer exists.

**The board is unchanged and the reading is unchanged**, which was measured rather than assumed.
`#389` derives the constants where this branch had them as literals and lands on the same values:
`FROSTED_DAMAGE` is `damage.ruin_at - 1`, which is 1; the protected shield is
`shield_by_tier.steady`, which is 4; the spent building carried `shield_by_tier.weak`, which is 2.
So `winterDamageStage` reads the frosted building at stage 2 of 3 either way and the crust is the
same 2.56u on a 9.769u Lookout. The frames differ byte-for-byte, as two GPU renders of falling snow
will, and the five conditions read identically.

One of `#389`'s values is taken over this branch's and is worth naming: the frosted building's
`cold_rounds` is 2, not 1. Nothing renders it, but 1 is not a state the engine can reach, since one
point of damage after a single cold round needs a one-point shield and shields come in 2, 4 and 6.

**`#392` IS NOT IN THIS TREE, so these frames say nothing about it and it says nothing about them.**
#392 re-bands the crust against each
building's own measured height and is **open, `mergedAt: null`**. Read off its head for scale only:
it would put the Lookout's stage-two crust at `9.769 * 0.4 * 2/3`, which is **2.605u against this
tree's 2.56u**, a difference of 0.045u or 1.76% on the one building the frosted condition stands on.
That is a statement about a diff rather than about the tree, and it is far too small to move the
comparison these frames are evidence for. Whoever lands `#392` inherits the re-take, not a
correction.

## Regenerating them

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/winterProtectionStates.browser.test.tsx
```

which writes the four full frames to `apps/web/src/city/three/__screenshots__/winter-protection/`.
The always-on half of that file is the census, and it runs in CI; the photographs are behind the flag
for the reason `winterCrisisShots.browser.test.tsx` records, which is that two shadow-mapped scenes
with seven GLBs each, left switched on, starve an animation-timing assertion somewhere else once per
run. The two `read-2.4x-*` files are magnifications of the committed frames and are not produced by
the suite.
